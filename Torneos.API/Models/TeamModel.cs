using Microsoft.EntityFrameworkCore;
using Torneos.API.Entities;

namespace Torneos.API.Models;

public class TeamModel
{
    private readonly ApplicationDbContext _context;

    public TeamModel(ApplicationDbContext context)
    {
        _context = context;
    }

    /** Lista todos los equipos con su estadio, deporte y torneos. Si se pasa sportId, filtra por deporte. */
    public async Task<List<Team>> GetAllAsync(int? sportId)
    {
        var query = _context.Teams
            .Include(t => t.Stadium)
            .Include(t => t.Sport)
            .Include(t => t.Players)
            .Include(t => t.Captain)
            .Include(t => t.TeamTournaments)
                .ThenInclude(tt => tt.Tournament)
            .AsQueryable();

        if (sportId.HasValue)
            query = query.Where(t => t.SportId == sportId.Value);

        return await query.ToListAsync();
    }

    /** Obtiene un equipo con estadio, deporte, jugadores, torneos inscritos y el deporte de cada torneo. */
    public async Task<Team?> GetByIdWithDetailsAsync(int id)
    {
        return await _context.Teams
            .Include(t => t.Stadium)
            .Include(t => t.Sport)
            .Include(t => t.Players)
            .Include(t => t.Captain)
            .Include(t => t.TeamTournaments)
                .ThenInclude(tt => tt.Tournament)
                    .ThenInclude(t => t.Sport)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    /** Obtiene los últimos partidos de un equipo (como local o visitante), ordenados por fecha descendente. */
    public async Task<List<Match>> GetRecentMatchesAsync(int teamId, int take = 20)
    {
        return await _context.Matches
            .Include(m => m.HomeTeam)
            .Include(m => m.AwayTeam)
            .Include(m => m.Tournament)
            .Where(m => m.HomeTeamId == teamId || m.AwayTeamId == teamId)
            .OrderByDescending(m => m.MatchDate)
            .Take(take)
            .ToListAsync();
    }

    /** Crea un equipo. Si no se especifican prestige points, asigna 100 por defecto. Carga el deporte asociado. */
    public async Task<Team> CreateAsync(Team team)
    {
        if (team.PrestigePoints == 0) team.PrestigePoints = 100;

        _context.Teams.Add(team);
        await _context.SaveChangesAsync();

        if (team.CaptainId.HasValue)
        {
            var captain = await _context.Players.FindAsync(team.CaptainId.Value);
            if (captain != null)
            {
                captain.TeamId = team.Id;
                await _context.SaveChangesAsync();
            }
        }

        await _context.Entry(team).Reference(t => t.Sport).LoadAsync();
        await _context.Entry(team).Reference(t => t.Captain).LoadAsync();
        return team;
    }

    /** Elimina un equipo de un torneo (TeamTournament). Solo permitido si el torneo está en RegistrationOpen. */
    public async Task<bool> RemoveFromTournamentAsync(int teamId, int tournamentId)
    {
        var tt = await _context.TeamTournaments
            .Include(x => x.Tournament)
            .FirstOrDefaultAsync(x => x.TeamId == teamId && x.TournamentId == tournamentId);
        if (tt == null) return false;

        if (tt.Tournament.Status != TournamentStatus.RegistrationOpen)
            throw new InvalidOperationException(
                $"Cannot remove team from tournament '{tt.Tournament.Name}' because it is not in registration phase.");

        _context.TeamTournaments.Remove(tt);
        await _context.SaveChangesAsync();
        return true;
    }

    /** Elimina un equipo por id. Devuelve false si no existe.
        Lanza InvalidOperationException si el equipo está inscrito en un torneo con estado RegistrationOpen, InProgress o Finished. */
    public async Task<bool> DeleteAsync(int id)
    {
        var team = await _context.Teams
            .Include(t => t.Players)
            .Include(t => t.TeamTournaments)
                .ThenInclude(tt => tt.Tournament)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (team == null) return false;

        if (team.TeamTournaments.Any(tt =>
            tt.Tournament.Status == TournamentStatus.RegistrationOpen ||
            tt.Tournament.Status == TournamentStatus.InProgress ||
            tt.Tournament.Status == TournamentStatus.Finished))
        {
            var names = string.Join(", ", team.TeamTournaments
                .Where(tt => tt.Tournament.Status == TournamentStatus.RegistrationOpen
                          || tt.Tournament.Status == TournamentStatus.InProgress
                          || tt.Tournament.Status == TournamentStatus.Finished)
                .Select(tt => $"'{tt.Tournament.Name}'"));
            throw new InvalidOperationException(
                $"Cannot delete team '{team.Name}' because it is participating in the following tournaments: {names}. " +
                "Remove the team from these tournaments first or wait until they are closed.");
        }

        _context.Players.RemoveRange(team.Players);
        _context.TeamTournaments.RemoveRange(team.TeamTournaments);

        _context.Teams.Remove(team);
        await _context.SaveChangesAsync();

        return true;
    }
}
