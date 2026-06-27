using Microsoft.EntityFrameworkCore;
using Torneos.API.DTOs;
using Torneos.API.Entities;
using Torneos.API.Stats;

namespace Torneos.API.Models;

public class PlayerModel
{
    private readonly ApplicationDbContext _context;

    public PlayerModel(ApplicationDbContext context)
    {
        _context = context;
    }

    /** Lista jugadores paginados con su equipo. Acepta filtros opcionales por teamId y sportId. */
    public async Task<PagedResult<Player>> GetAllAsync(int? teamId, int? sportId, int page = 1, int pageSize = 20)
    {
        var query = _context.Players
            .AsNoTracking()
            .Include(p => p.Team)
                .ThenInclude(t => t!.Sport)
            .AsQueryable();

        if (teamId.HasValue)
            query = query.Where(p => p.TeamId == teamId.Value);
        if (sportId.HasValue)
            query = query.Where(p => p.Team!.SportId == sportId.Value);

        query = query.OrderBy(p => p.Id);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PagedResult<Player> { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
    }

    /** Obtiene un jugador con su equipo y el deporte del equipo. Usado para la vista de detalle. */
    public async Task<Player?> GetByIdWithDetailsAsync(int id)
    {
        return await _context.Players
            .AsNoTracking()
            .Include(p => p.Team)
                .ThenInclude(t => t!.Sport)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    /** Crea un jugador, lo guarda en BD y carga la referencia a Team para devolverlo completo. */
    public async Task<Player> CreateAsync(Player player)
    {
        _context.Players.Add(player);
        await _context.SaveChangesAsync();
        await _context.Entry(player).Reference(p => p.Team).LoadAsync();
        return player;
    }

    /** Elimina un jugador por id. Devuelve false si no existe. */
    public async Task<bool> DeleteAsync(int id)
    {
        var player = await _context.Players.FindAsync(id);
        if (player == null) return false;

        _context.Players.Remove(player);
        await _context.SaveChangesAsync();
        return true;
    }

    /** Obtiene las estadísticas agregadas de un jugador (suma total de cada campo). */
    public async Task<PlayerStatsSummary?> GetStatsAsync(int playerId, int? tournamentId)
    {
        var player = await _context.Players
            .AsNoTracking()
            .Include(p => p.Team)
                .ThenInclude(t => t!.Sport)
            .FirstOrDefaultAsync(p => p.Id == playerId);

        if (player?.Team?.Sport == null) return null;

        string sport = player.Team.Sport.Name.ToLower();

        var summary = new PlayerStatsSummary
        {
            Sport = player.Team.Sport.Name,
            MatchesPlayed = player.MatchesPlayed
        };

        switch (sport)
        {
            case "football":
            {
                var agg = await _context.Set<FootballStats>()
                    .Where(s => s.PlayerId == playerId)
                    .GroupBy(s => 1)
                    .Select(g => new
                    {
                        Goals = g.Sum(s => s.Goals),
                        Assists = g.Sum(s => s.Assists),
                        YellowCards = g.Sum(s => s.YellowCards),
                        RedCards = g.Sum(s => s.RedCards)
                    })
                    .FirstOrDefaultAsync();
                summary.Stats["goals"] = agg?.Goals ?? 0;
                summary.Stats["assists"] = agg?.Assists ?? 0;
                summary.Stats["yellowCards"] = agg?.YellowCards ?? 0;
                summary.Stats["redCards"] = agg?.RedCards ?? 0;
                break;
            }
            case "basketball":
            {
                var agg = await _context.Set<BasketballStats>()
                    .Where(s => s.PlayerId == playerId)
                    .GroupBy(s => 1)
                    .Select(g => new
                    {
                        Points = g.Sum(s => s.Points),
                        Rebounds = g.Sum(s => s.Rebounds),
                        Assists = g.Sum(s => s.Assists)
                    })
                    .FirstOrDefaultAsync();
                summary.Stats["points"] = agg?.Points ?? 0;
                summary.Stats["rebounds"] = agg?.Rebounds ?? 0;
                summary.Stats["assists"] = agg?.Assists ?? 0;
                break;
            }
            case "tennis":
            {
                var agg = await _context.Set<TennisStats>()
                    .Where(s => s.PlayerId == playerId)
                    .GroupBy(s => 1)
                    .Select(g => new
                    {
                        Aces = g.Sum(s => s.Aces),
                        DoubleFaults = g.Sum(s => s.DoubleFaults),
                        Winners = g.Sum(s => s.Winners)
                    })
                    .FirstOrDefaultAsync();
                summary.Stats["aces"] = agg?.Aces ?? 0;
                summary.Stats["doubleFaults"] = agg?.DoubleFaults ?? 0;
                summary.Stats["winners"] = agg?.Winners ?? 0;
                break;
            }
            case "volleyball":
            {
                var agg = await _context.Set<VolleyballStats>()
                    .Where(s => s.PlayerId == playerId)
                    .GroupBy(s => 1)
                    .Select(g => new
                    {
                        Kills = g.Sum(s => s.Kills),
                        Blocks = g.Sum(s => s.Blocks),
                        Aces = g.Sum(s => s.Aces)
                    })
                    .FirstOrDefaultAsync();
                summary.Stats["kills"] = agg?.Kills ?? 0;
                summary.Stats["blocks"] = agg?.Blocks ?? 0;
                summary.Stats["aces"] = agg?.Aces ?? 0;
                break;
            }
        }

        return summary;
    }
}
