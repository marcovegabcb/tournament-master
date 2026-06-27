using Microsoft.EntityFrameworkCore;
using Torneos.API.DTOs;
using Torneos.API.Entities;

namespace Torneos.API.Models;

public class TournamentModel
{
    private readonly ApplicationDbContext _context;

    public TournamentModel(ApplicationDbContext context)
    {
        _context = context;
    }

    /** Lista todos los torneos con su deporte, estadios asignados y equipos inscritos. */
    public async Task<List<Tournament>> GetAllAsync()
    {
        return await _context.Tournaments
            .AsNoTracking()
            .AsSplitQuery()
            .Include(t => t.Sport)
            .Include(t => t.TournamentStadiums)
                .ThenInclude(ts => ts.Stadium)
            .Include(t => t.TeamTournaments)
                .ThenInclude(tt => tt.Team)
            .OrderBy(t => t.Id)
            .ToListAsync();
    }

    /** Obtiene un torneo con sus equipos inscritos. Usado para la vista de equipos del torneo. */
    public async Task<Tournament?> GetByIdWithTeamsAsync(int id)
    {
        return await _context.Tournaments
            .AsNoTracking()
            .Include(t => t.TeamTournaments)
                .ThenInclude(tt => tt.Team)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    /**
     * Crea un torneo a partir de un request DTO.
     * Si el venueConfig es NeutralVenue y hay stadiumIds, crea las relaciones TournamentStadium.
     * Devuelve el torneo creado con la referencia a Sport cargada.
     */
    public async Task<Tournament> CreateAsync(CreateTournamentRequest request)
    {
        var sport = await _context.Sports.FindAsync(request.SportId)
            ?? throw new InvalidOperationException("The selected sport does not exist.");

        // Tenis se juega siempre en sede neutral: forzamos la configuración aunque llegue otra cosa.
        var venueConfig = Torneos.API.Services.SportRules.IsNeutralVenueOnly(sport.Name)
            ? VenueType.NeutralVenue
            : request.VenueConfig;

        // Vóley sí admite doble partido (se decide por partidos ganados + golden set). Tenis nunca
        // llega aquí a doble partido porque IsNeutralVenueOnly lo fuerza a sede neutral más arriba.

        var tournament = new Tournament
        {
            Name = request.Name,
            MinPrestigeRequired = request.MinPrestigeRequired,
            MinPlayersPerTeam = request.MinPlayersPerTeam,
            MaxPlayersPerTeam = request.MaxPlayersPerTeam,
            Format = request.Format,
            VenueConfig = venueConfig,
            SportId = request.SportId,
            Status = TournamentStatus.RegistrationOpen
        };

        if (venueConfig == VenueType.NeutralVenue && request.StadiumIds.Count > 0)
        {
            foreach (var stadiumId in request.StadiumIds)
            {
                tournament.TournamentStadiums.Add(new TournamentStadium
                {
                    StadiumId = stadiumId
                });
            }
        }

        _context.Tournaments.Add(tournament);
        await _context.SaveChangesAsync();
        await _context.Entry(tournament).Reference(t => t.Sport).LoadAsync();

        return tournament;
    }

    /** Actualiza el estado del torneo (RegistrationOpen → InProgress → Finished). Devuelve false si no existe. */
    public async Task<bool> UpdateStatusAsync(int id, TournamentStatus status)
    {
        var tournament = await _context.Tournaments.FindAsync(id);
        if (tournament == null) return false;

        tournament.Status = status;
        await _context.SaveChangesAsync();
        return true;
    }

    /** Elimina un torneo por id. Devuelve false si no existe. */
    public async Task<bool> DeleteAsync(int id)
    {
        var tournament = await _context.Tournaments.FindAsync(id);
        if (tournament == null) return false;

        _context.Tournaments.Remove(tournament);
        await _context.SaveChangesAsync();
        return true;
    }
}
