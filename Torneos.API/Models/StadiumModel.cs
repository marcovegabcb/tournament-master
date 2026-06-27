using Microsoft.EntityFrameworkCore;
using Torneos.API.DTOs;
using Torneos.API.Entities;

namespace Torneos.API.Models;

public class StadiumModel
{
    private readonly ApplicationDbContext _context;

    public StadiumModel(ApplicationDbContext context)
    {
        _context = context;
    }

    /** Lista estadios paginados con su deporte y equipos locales. Si se pasa sportId, filtra por deporte. */
    public async Task<PagedResult<Stadium>> GetAllAsync(int? sportId, int page = 1, int pageSize = 20)
    {
        var query = _context.Stadiums
            .AsNoTracking()
            .Include(s => s.Sport)
            .Include(s => s.Teams)
            .AsQueryable();

        if (sportId.HasValue)
            query = query.Where(s => s.SportId == sportId.Value);

        query = query.OrderBy(s => s.Id);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return new PagedResult<Stadium> { Items = items, TotalCount = total, Page = page, PageSize = pageSize };
    }

    /** Obtiene un estadio con deporte, equipos locales y torneos asociados (con el deporte de cada torneo). */
    public async Task<Stadium?> GetByIdWithDetailsAsync(int id)
    {
        return await _context.Stadiums
            .AsNoTracking()
            .AsSplitQuery()
            .Include(s => s.Sport)
            .Include(s => s.Teams)
            .Include(s => s.TournamentStadiums)
                .ThenInclude(ts => ts.Tournament)
                    .ThenInclude(t => t.Sport)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    /** Crea un estadio, lo guarda en BD y carga la referencia a Sport para devolverlo completo. */
    public async Task<Stadium> CreateAsync(Stadium stadium)
    {
        _context.Stadiums.Add(stadium);
        await _context.SaveChangesAsync();
        await _context.Entry(stadium).Reference(s => s.Sport).LoadAsync();
        return stadium;
    }

    /** Elimina un estadio por id. Devuelve false si no existe. */
    public async Task<bool> DeleteAsync(int id)
    {
        var stadium = await _context.Stadiums.FindAsync(id);
        if (stadium == null) return false;

        _context.Stadiums.Remove(stadium);
        await _context.SaveChangesAsync();
        return true;
    }
}
