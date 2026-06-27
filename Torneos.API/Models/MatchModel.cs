using Microsoft.EntityFrameworkCore;
using Torneos.API.DTOs;
using Torneos.API.Entities;
using Torneos.API.Services;
using Torneos.API.Stats;

namespace Torneos.API.Models;

public class MatchModel
{
    private readonly ApplicationDbContext _context;

    public MatchModel(ApplicationDbContext context)
    {
        _context = context;
    }

    /** Lista todos los partidos con equipo local y visitante. Si se pasa tournamentId, filtra por torneo. */
    public async Task<List<Match>> GetAllAsync(int? tournamentId)
    {
        var query = _context.Matches
            .AsNoTracking()
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .AsQueryable();

        if (tournamentId.HasValue)
            query = query.Where(m => m.TournamentId == tournamentId.Value);

        return await query.OrderBy(m => m.Id).ToListAsync();
    }

    /** Obtiene los partidos ya jugados de un torneo. Usado para calcular la clasificación. */
    public async Task<List<Match>> GetPlayedMatchesAsync(int tournamentId)
    {
        return await _context.Matches
            .AsNoTracking()
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Where(m => m.TournamentId == tournamentId && m.IsPlayed)
            .ToListAsync();
    }

    /** Obtiene un torneo con sus equipos inscritos. Usado antes de generar el fixture. */
    public async Task<Tournament?> GetTournamentWithTeamsAsync(int tournamentId)
    {
        return await _context.Tournaments
            .AsNoTracking()
            .AsSplitQuery()
            .Include(t => t.TeamTournaments)
                .ThenInclude(tt => tt.Team)
            .Include(t => t.TournamentStadiums)
            .FirstOrDefaultAsync(t => t.Id == tournamentId);
    }

    /** Cuenta cuántos partidos existen ya para un torneo. Si > 0, no se puede regenerar el fixture. */
    public async Task<int> GetExistingMatchesCountAsync(int tournamentId)
    {
        return await _context.Matches
            .Where(m => m.TournamentId == tournamentId)
            .CountAsync();
    }

    /** Guarda una lista de partidos en BD (usado al generar el fixture completo). */
    public async Task CreateRangeAsync(List<Match> matches)
    {
        _context.Matches.AddRange(matches);
        await _context.SaveChangesAsync();
    }

    /** Elimina todos los partidos de un torneo y resetea el flag isFixtureGenerated. */
    public async Task DeleteByTournamentAsync(int tournamentId)
    {
        var matches = await _context.Matches
            .Where(m => m.TournamentId == tournamentId)
            .ToListAsync();
        _context.Matches.RemoveRange(matches);
        var tournament = await _context.Tournaments.FindAsync(tournamentId);
        if (tournament != null)
        {
            tournament.IsFixtureGenerated = false;
        }
        await _context.SaveChangesAsync();
    }

    /** Marca un torneo como con fixture generado. */
    public async Task MarkFixtureGeneratedAsync(int tournamentId)
    {
        var tournament = await _context.Tournaments.FindAsync(tournamentId);
        if (tournament != null)
        {
            tournament.IsFixtureGenerated = true;
            await _context.SaveChangesAsync();
        }
    }

    private static string TieMessage(string sportName)
    {
        if (SportRules.UsesPenaltyShootout(sportName))
            return "El cruce terminó empatado. Introduce el resultado de los penaltis para decidir quién avanza.";
        if (SportRules.UsesGoldenSet(sportName))
            return "El cruce está empatado a un partido por equipo. Introduce el golden set (a 15) para decidir quién avanza.";
        return "El cruce de eliminatoria no puede quedar empatado. Juega la prórroga necesaria y ajusta el marcador hasta que haya un ganador.";
    }

    /** Actualiza el resultado de un partido y guarda las estadísticas de los jugadores.
        En eliminatorias decide y propaga al ganador; si el cruce queda empatado sin desempate,
        lanza InvalidOperationException y no persiste nada (la operación es atómica). */
    public async Task<bool> UpdateResultWithStatsAsync(int matchId, int homeScore, int awayScore, List<PlayerStatDto> playerStats, int? homeTiebreak = null, int? awayTiebreak = null, int homePoints = 0, int awayPoints = 0)
    {
        var match = await _context.Matches
            .Include(m => m.Tournament)
                .ThenInclude(t => t.Sport)
            .FirstOrDefaultAsync(m => m.Id == matchId);

        if (match?.Tournament?.Sport == null) return false;

        // La vuelta no puede rellenarse antes que su ida: el desempate global (penaltis) se
        // introduce en la vuelta, así que rellenarla primero dejaría un empate irresoluble.
        if (match.Tournament.Format == TournamentFormat.Knockout && match.Stage.Contains(" - Vuelta"))
        {
            string baseStage = BaseStage(match.Stage);
            var idaMatches = await _context.Matches
                .Where(m => m.TournamentId == match.TournamentId && m.Stage == baseStage + " - Ida")
                .OrderBy(m => m.Id)
                .ToListAsync();
            var vueltaMatches = await _context.Matches
                .Where(m => m.TournamentId == match.TournamentId && m.Stage == baseStage + " - Vuelta")
                .OrderBy(m => m.Id)
                .ToListAsync();
            int crossIdx = vueltaMatches.FindIndex(m => m.Id == match.Id);
            if (crossIdx >= 0 && crossIdx < idaMatches.Count && !idaMatches[crossIdx].IsPlayed)
                throw new InvalidOperationException("Debes rellenar primero el partido de ida de este cruce.");
        }

        match.HomeScore = homeScore;
        match.AwayScore = awayScore;
        match.HomePoints = homePoints;
        match.AwayPoints = awayPoints;
        match.HomeTiebreak = homeTiebreak;
        match.AwayTiebreak = awayTiebreak;
        match.IsPlayed = true;

        // Resolver el cruce ANTES de persistir: si hay empate irresoluble, lanza y no se guarda nada.
        if (match.Tournament.Format == TournamentFormat.Knockout)
            await ResolveKnockoutAsync(match, match.Tournament.Sport.Name);

        await DeleteStatsByMatchAsync(matchId);
        SavePlayerStats(matchId, match.Tournament.Sport.Name, playerStats);

        var playerIds = playerStats.Select(p => p.PlayerId).Distinct().ToList();
        var players = await _context.Players.Where(p => playerIds.Contains(p.Id)).ToListAsync();
        foreach (var player in players)
        {
            player.MatchesPlayed++;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    /** Decide el ganador del cruce (partido único o ida/vuelta) y lo propaga a la siguiente ronda. */
    private async Task ResolveKnockoutAsync(Match match, string sportName)
    {
        bool isTwoLeg = match.Stage.Contains(" - Ida") || match.Stage.Contains(" - Vuelta");
        if (isTwoLeg)
            await ResolveTwoLegAsync(match, sportName);
        else
            await ResolveSingleLegAsync(match, sportName);
    }

    private async Task ResolveSingleLegAsync(Match match, string sportName)
    {
        if (match.HomeTeamId == null || match.AwayTeamId == null) return; // bye o cruce incompleto

        // Solo el fútbol desempata por penaltis; en los demás el empate se resuelve en el marcador (prórroga).
        bool usesPenalties = SportRules.UsesPenaltyShootout(sportName);
        int? homeTie = usesPenalties ? match.HomeTiebreak : null;
        int? awayTie = usesPenalties ? match.AwayTiebreak : null;

        int? winner = KnockoutResolver.ResolveSingleLeg(
            match.HomeTeamId.Value, match.AwayTeamId.Value,
            match.HomeScore, match.AwayScore,
            homeTie, awayTie);

        if (winner == null) throw new InvalidOperationException(TieMessage(sportName));

        match.WinnerTeamId = winner;

        var currentRound = await _context.Matches
            .Where(m => m.TournamentId == match.TournamentId && m.Stage == match.Stage)
            .OrderBy(m => m.Id)
            .ToListAsync();
        int crossIdx = currentRound.FindIndex(m => m.Id == match.Id);
        if (crossIdx < 0) return;

        await PlaceWinnerInNextRoundAsync(match.TournamentId, GetNextKnockoutStage(match.Stage), crossIdx, winner.Value, twoLeg: false);
    }

    private async Task ResolveTwoLegAsync(Match match, string sportName)
    {
        string baseStage = BaseStage(match.Stage);

        var idaMatches = await _context.Matches
            .Where(m => m.TournamentId == match.TournamentId && m.Stage == baseStage + " - Ida")
            .OrderBy(m => m.Id)
            .ToListAsync();
        var vueltaMatches = await _context.Matches
            .Where(m => m.TournamentId == match.TournamentId && m.Stage == baseStage + " - Vuelta")
            .OrderBy(m => m.Id)
            .ToListAsync();

        // Ida y vuelta del mismo cruce comparten posición (mismo índice) en sus stages.
        int crossIdx = match.Stage.Contains(" - Ida")
            ? idaMatches.FindIndex(m => m.Id == match.Id)
            : vueltaMatches.FindIndex(m => m.Id == match.Id);
        if (crossIdx < 0 || crossIdx >= idaMatches.Count || crossIdx >= vueltaMatches.Count) return;

        var ida = idaMatches[crossIdx];
        var vuelta = vueltaMatches[crossIdx];

        // Solo se resuelve cuando ambos partidos están jugados y tienen los dos equipos.
        if (!ida.IsPlayed || !vuelta.IsPlayed) return;
        if (ida.HomeTeamId == null || ida.AwayTeamId == null || vuelta.HomeTeamId == null || vuelta.AwayTeamId == null) return;

        int? winner;
        if (SportRules.UsesGoldenSet(sportName))
        {
            // Vóley: se decide por partidos ganados (sets de cada pierna); si 1-1, golden set de la vuelta.
            winner = KnockoutResolver.ResolveTwoLegByLegWins(
                ida.HomeTeamId.Value, ida.AwayTeamId.Value, ida.HomeScore, ida.AwayScore,
                vuelta.HomeTeamId.Value, vuelta.AwayTeamId.Value, vuelta.HomeScore, vuelta.AwayScore,
                vuelta.HomeTiebreak, vuelta.AwayTiebreak);
        }
        else
        {
            // Solo el fútbol desempata el global por penaltis (en la vuelta); el resto, por prórroga en el marcador.
            bool usesPenalties = SportRules.UsesPenaltyShootout(sportName);
            int? vueltaHomeTie = usesPenalties ? vuelta.HomeTiebreak : null;
            int? vueltaAwayTie = usesPenalties ? vuelta.AwayTiebreak : null;

            winner = KnockoutResolver.ResolveTwoLeg(
                ida.HomeTeamId.Value, ida.AwayTeamId.Value, ida.HomeScore, ida.AwayScore,
                vuelta.HomeTeamId.Value, vuelta.AwayTeamId.Value, vuelta.HomeScore, vuelta.AwayScore,
                vueltaHomeTie, vueltaAwayTie);
        }

        if (winner == null) throw new InvalidOperationException(TieMessage(sportName));

        vuelta.WinnerTeamId = winner; // el partido decisivo es la vuelta

        // Posición real del cruce en el cuadro: hay que contar los byes de la ronda (partidos a una
        // sola pierna, con el nombre de ronda sin sufijo) porque ocupan hueco en el bracket aunque no
        // tengan vuelta. crossIdx solo sirve para emparejar ida/vuelta; para el avance vale el slot real.
        var slotIds = await _context.Matches
            .Where(m => m.TournamentId == match.TournamentId
                && (m.Stage == baseStage || m.Stage == baseStage + " - Ida"))
            .OrderBy(m => m.Id)
            .Select(m => m.Id)
            .ToListAsync();
        int slotIdx = slotIds.IndexOf(ida.Id);
        if (slotIdx < 0) return;

        await PlaceWinnerInNextRoundAsync(match.TournamentId, GetNextKnockoutStage(baseStage), slotIdx, winner.Value, twoLeg: true);
    }

    /** Coloca al ganador de un cruce en la siguiente ronda (en ambas piernas si es a doble partido). */
    private async Task PlaceWinnerInNextRoundAsync(int tournamentId, string? nextBaseStage, int crossIdx, int winnerId, bool twoLeg)
    {
        if (nextBaseStage == null) return; // era la final → campeón, no hay siguiente ronda

        int nextCrossIdx = crossIdx / 2;
        bool isHomeSide = crossIdx % 2 == 0;

        if (!twoLeg)
        {
            var nextRound = await _context.Matches
                .Where(m => m.TournamentId == tournamentId && m.Stage == nextBaseStage)
                .OrderBy(m => m.Id)
                .ToListAsync();
            if (nextCrossIdx < nextRound.Count)
            {
                if (isHomeSide) nextRound[nextCrossIdx].HomeTeamId = winnerId;
                else nextRound[nextCrossIdx].AwayTeamId = winnerId;
            }
            return;
        }

        var nextIda = await _context.Matches
            .Where(m => m.TournamentId == tournamentId && m.Stage == nextBaseStage + " - Ida")
            .OrderBy(m => m.Id)
            .ToListAsync();
        var nextVuelta = await _context.Matches
            .Where(m => m.TournamentId == tournamentId && m.Stage == nextBaseStage + " - Vuelta")
            .OrderBy(m => m.Id)
            .ToListAsync();

        if (nextCrossIdx < nextIda.Count)
        {
            if (isHomeSide) nextIda[nextCrossIdx].HomeTeamId = winnerId;
            else nextIda[nextCrossIdx].AwayTeamId = winnerId;
        }
        if (nextCrossIdx < nextVuelta.Count)
        {
            // En la vuelta se invierten local y visitante respecto a la ida.
            if (isHomeSide) nextVuelta[nextCrossIdx].AwayTeamId = winnerId;
            else nextVuelta[nextCrossIdx].HomeTeamId = winnerId;
        }
    }

    private static string BaseStage(string stage) =>
        stage.Replace(" - Ida", "").Replace(" - Vuelta", "");

    private static string? GetNextKnockoutStage(string stage)
    {
        return stage switch
        {
            "Octavos de final" => "Cuartos de final",
            "Cuartos de final" => "Semifinales",
            "Semifinal" => "Final",
            "Semifinales" => "Final",
            _ => null
        };
    }

    /** Repara brackets de torneos eliminatorios existentes, propagando byes y resultados. */
    public async Task<int> FixExistingBracketsAsync()
    {
        int updated = 0;
        var tournamentIds = await _context.Tournaments
            .Where(t => t.Format == TournamentFormat.Knockout)
            .Select(t => t.Id)
            .ToListAsync();

        foreach (var tid in tournamentIds)
        {
            var matches = await _context.Matches
                .Where(m => m.TournamentId == tid)
                .OrderBy(m => m.Id)
                .ToListAsync();

            bool changed = false;

            for (int i = 0; i < matches.Count; i++)
            {
                var m = matches[i];
                if (m.HomeTeamId == null || m.AwayTeamId != null) continue;

                var nextStage = GetNextKnockoutStage(m.Stage);
                if (nextStage == null) continue;

                var currentRoundMatches = matches.Where(x => x.Stage == m.Stage).ToList();
                int idxInRound = currentRoundMatches.IndexOf(m);
                if (idxInRound < 0) continue;

                int nextMatchIdx = idxInRound / 2;
                bool isHome = idxInRound % 2 == 0;

                var nextRoundMatches = matches.Where(x => x.Stage == nextStage).ToList();
                if (nextMatchIdx < nextRoundMatches.Count)
                {
                    var next = nextRoundMatches[nextMatchIdx];
                    if (isHome && next.HomeTeamId == null) { next.HomeTeamId = m.HomeTeamId; changed = true; }
                    else if (!isHome && next.AwayTeamId == null) { next.AwayTeamId = m.HomeTeamId; changed = true; }
                }
            }

            foreach (var m in matches.Where(m => m.IsPlayed && m.HomeTeamId != null && m.AwayTeamId != null))
            {
                int winnerId = m.HomeScore > m.AwayScore ? m.HomeTeamId!.Value : m.AwayTeamId!.Value;

                var nextStage = GetNextKnockoutStage(m.Stage);
                if (nextStage == null) continue;

                var currentRoundMatches = matches.Where(x => x.Stage == m.Stage).OrderBy(x => x.Id).ToList();
                int idxInRound = currentRoundMatches.IndexOf(m);
                if (idxInRound < 0) continue;

                int nextMatchIdx = idxInRound / 2;
                bool isHome = idxInRound % 2 == 0;

                var nextRoundMatches = matches.Where(x => x.Stage == nextStage).OrderBy(x => x.Id).ToList();
                if (nextMatchIdx < nextRoundMatches.Count)
                {
                    var next = nextRoundMatches[nextMatchIdx];
                    if (isHome && next.HomeTeamId == null) { next.HomeTeamId = winnerId; changed = true; updated++; }
                    else if (!isHome && next.AwayTeamId == null) { next.AwayTeamId = winnerId; changed = true; updated++; }
                }
            }

            if (changed)
                await _context.SaveChangesAsync();
        }

        return updated;
    }

    private async Task DeleteStatsByMatchAsync(int matchId)
    {
        var football = await _context.Set<FootballStats>().Where(s => s.MatchId == matchId).ToListAsync();
        _context.Set<FootballStats>().RemoveRange(football);
        var basketball = await _context.Set<BasketballStats>().Where(s => s.MatchId == matchId).ToListAsync();
        _context.Set<BasketballStats>().RemoveRange(basketball);
        var tennis = await _context.Set<TennisStats>().Where(s => s.MatchId == matchId).ToListAsync();
        _context.Set<TennisStats>().RemoveRange(tennis);
        var volleyball = await _context.Set<VolleyballStats>().Where(s => s.MatchId == matchId).ToListAsync();
        _context.Set<VolleyballStats>().RemoveRange(volleyball);
    }

    private void SavePlayerStats(int matchId, string sportName, List<PlayerStatDto> playerStats)
    {
        switch (sportName.ToLower())
        {
            case "football":
                foreach (var ps in playerStats)
                {
                    _context.Set<FootballStats>().Add(new FootballStats
                    {
                        PlayerId = ps.PlayerId,
                        MatchId = matchId,
                        Goals = ps.Stats.TryGetValue("goals", out var g) ? g : 0,
                        Assists = ps.Stats.TryGetValue("assists", out var a) ? a : 0,
                        YellowCards = ps.Stats.TryGetValue("yellowCards", out var yc) ? yc : 0,
                        RedCards = ps.Stats.TryGetValue("redCards", out var rc) ? rc : 0
                    });
                }
                break;
            case "basketball":
                foreach (var ps in playerStats)
                {
                    _context.Set<BasketballStats>().Add(new BasketballStats
                    {
                        PlayerId = ps.PlayerId,
                        MatchId = matchId,
                        Points = ps.Stats.TryGetValue("points", out var p) ? p : 0,
                        Rebounds = ps.Stats.TryGetValue("rebounds", out var r) ? r : 0,
                        Assists = ps.Stats.TryGetValue("assists", out var a) ? a : 0
                    });
                }
                break;
            case "tennis":
                foreach (var ps in playerStats)
                {
                    _context.Set<TennisStats>().Add(new TennisStats
                    {
                        PlayerId = ps.PlayerId,
                        MatchId = matchId,
                        Aces = ps.Stats.TryGetValue("aces", out var ac) ? ac : 0,
                        DoubleFaults = ps.Stats.TryGetValue("doubleFaults", out var df) ? df : 0,
                        Winners = ps.Stats.TryGetValue("winners", out var w) ? w : 0
                    });
                }
                break;
            case "volleyball":
                foreach (var ps in playerStats)
                {
                    _context.Set<VolleyballStats>().Add(new VolleyballStats
                    {
                        PlayerId = ps.PlayerId,
                        MatchId = matchId,
                        Kills = ps.Stats.TryGetValue("kills", out var k) ? k : 0,
                        Blocks = ps.Stats.TryGetValue("blocks", out var b) ? b : 0,
                        Aces = ps.Stats.TryGetValue("aces", out var ac) ? ac : 0
                    });
                }
                break;
        }
    }
}
