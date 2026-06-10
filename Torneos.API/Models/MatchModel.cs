using Microsoft.EntityFrameworkCore;
using Torneos.API.Entities;

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
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Where(m => m.TournamentId == tournamentId && m.IsPlayed)
            .ToListAsync();
    }

    /** Obtiene un torneo con sus equipos inscritos. Usado antes de generar el fixture. */
    public async Task<Tournament?> GetTournamentWithTeamsAsync(int tournamentId)
    {
        return await _context.Tournaments
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
}
