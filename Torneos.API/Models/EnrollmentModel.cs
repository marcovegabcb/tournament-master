using Microsoft.EntityFrameworkCore;
using Torneos.API.Entities;

namespace Torneos.API.Models;

public class EnrollmentModel
{
    private readonly ApplicationDbContext _context;

    public EnrollmentModel(ApplicationDbContext context)
    {
        _context = context;
    }

    /** Busca un equipo por id para validar que existe antes de inscribirlo. */
    public async Task<Team?> GetTeamByIdAsync(int teamId)
    {
        return await _context.Teams.FindAsync(teamId);
    }

    /** Busca un equipo con sus jugadores para validar el mínimo de jugadores por equipo. */
    public async Task<Team?> GetTeamWithPlayersAsync(int teamId)
    {
        return await _context.Teams
            .Include(t => t.Players)
            .FirstOrDefaultAsync(t => t.Id == teamId);
    }

    /** Busca un torneo por id para validar que existe y comprobar el prestige mínimo. */
    public async Task<Tournament?> GetTournamentByIdAsync(int tournamentId)
    {
        return await _context.Tournaments.FindAsync(tournamentId);
    }

    /** Comprueba si un equipo ya está inscrito en un torneo (evita duplicados). */
    public async Task<bool> IsAlreadyEnrolledAsync(int teamId, int tournamentId)
    {
        return await _context.TeamTournaments
            .AnyAsync(tt => tt.TeamId == teamId && tt.TournamentId == tournamentId);
    }

    /** Crea la inscripción equipo-torneo en la tabla intermedia TeamTournament y la guarda. */
    public async Task EnrollAsync(int teamId, int tournamentId)
    {
        _context.TeamTournaments.Add(new TeamTournament
        {
            TeamId = teamId,
            TournamentId = tournamentId
        });
        await _context.SaveChangesAsync();
    }
}
