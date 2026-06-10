using Microsoft.EntityFrameworkCore;
using Torneos.API.Entities;

namespace Torneos.API.Models;

public class PlayerModel
{
    private readonly ApplicationDbContext _context;

    public PlayerModel(ApplicationDbContext context)
    {
        _context = context;
    }

    /** Lista todos los jugadores con su equipo. Si se pasa teamId, filtra por equipo. */
    public async Task<List<Player>> GetAllAsync(int? teamId)
    {
        var query = _context.Players
            .Include(p => p.Team)
                .ThenInclude(t => t!.Sport)
            .AsQueryable();

        if (teamId.HasValue)
            query = query.Where(p => p.TeamId == teamId.Value);

        return await query.ToListAsync();
    }

    /** Obtiene un jugador con su equipo y el deporte del equipo. Usado para la vista de detalle. */
    public async Task<Player?> GetByIdWithDetailsAsync(int id)
    {
        return await _context.Players
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
}
