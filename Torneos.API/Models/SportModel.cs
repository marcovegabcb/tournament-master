using Microsoft.EntityFrameworkCore;
using Torneos.API.Entities;

namespace Torneos.API.Models;

public class SportModel
{
    private readonly ApplicationDbContext _context;

    public SportModel(ApplicationDbContext context)
    {
        _context = context;
    }

    /** Lista todos los deportes disponibles. */
    public async Task<List<Sport>> GetAllAsync()
    {
        return await _context.Sports.AsNoTracking().ToListAsync();
    }

    /** Crea un nuevo deporte y lo guarda en BD. */
    public async Task<Sport> CreateAsync(Sport sport)
    {
        _context.Sports.Add(sport);
        await _context.SaveChangesAsync();
        return sport;
    }
}
