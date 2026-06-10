using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Torneos.API.Entities;
using Torneos.API.Models;

namespace Torneos.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StadiumsController : ControllerBase
{
    private readonly StadiumModel _stadiumModel;

    public StadiumsController(StadiumModel stadiumModel)
    {
        _stadiumModel = stadiumModel;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetStadiums([FromQuery] int? sportId = null)
    {
        var stadiums = await _stadiumModel.GetAllAsync(sportId);

        var result = stadiums.Select(s => new
        {
            id = s.Id,
            name = s.Name,
            city = s.City,
            capacity = s.Capacity,
            length = s.Length,
            width = s.Width,
            sportId = s.SportId,
            sport = s.Sport != null ? new { id = s.Sport.Id, name = s.Sport.Name, colorHex = s.Sport.ColorHex } : null,
            teams = s.Teams.Select(t => new { id = t.Id, name = t.Name }).ToList()
        });

        return Ok(result);
    }

    [HttpGet("{id}/details")]
    public async Task<ActionResult> GetStadiumDetails(int id)
    {
        var stadium = await _stadiumModel.GetByIdWithDetailsAsync(id);

        if (stadium == null)
            return NotFound(new { message = "Stadium not found." });

        var result = new
        {
            stadium.Id,
            stadium.Name,
            stadium.City,
            stadium.Capacity,
            stadium.Length,
            stadium.Width,
            stadium.SportId,
            Sport = new { stadium.Sport!.Id, stadium.Sport.Name, stadium.Sport.ColorHex },
            Teams = stadium.Teams.Select(t => new { t.Id, t.Name, t.PrestigePoints }),
            Tournaments = stadium.TournamentStadiums.Select(ts => new
            {
                ts.Tournament.Id,
                ts.Tournament.Name,
                ts.Tournament.Format,
                ts.Tournament.Status,
                Sport = new { ts.Tournament.Sport!.Name }
            })
        };

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Stadium>> CreateStadium(Stadium stadium)
    {
        var created = await _stadiumModel.CreateAsync(stadium);
        return CreatedAtAction(nameof(GetStadiums), new { id = created.Id }, created);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteStadium(int id)
    {
        var deleted = await _stadiumModel.DeleteAsync(id);
        if (!deleted) return NotFound(new { message = "Stadium not found." });
        return NoContent();
    }
}
