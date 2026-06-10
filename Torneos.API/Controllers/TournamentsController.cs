using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Torneos.API.DTOs;
using Torneos.API.Entities;
using Torneos.API.Models;

namespace Torneos.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TournamentsController : ControllerBase
{
    private readonly TournamentModel _tournamentModel;

    public TournamentsController(TournamentModel tournamentModel)
    {
        _tournamentModel = tournamentModel;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Tournament>>> GetTournaments()
    {
        return await _tournamentModel.GetAllAsync();
    }

    [HttpGet("{id}/teams")]
    public async Task<ActionResult> GetEnrolledTeams(int id)
    {
        var tournament = await _tournamentModel.GetByIdWithTeamsAsync(id);

        if (tournament == null)
            return NotFound(new { message = "Tournament not found." });

        var teams = tournament.TeamTournaments.Select(tt => new
        {
            tt.Team.Id,
            tt.Team.Name,
            tt.Team.PrestigePoints,
            tt.Team.CaptainName
        }).ToList();

        return Ok(teams);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Tournament>> CreateTournament([FromBody] CreateTournamentRequest request)
    {
        var tournament = await _tournamentModel.CreateAsync(request);
        return CreatedAtAction(nameof(GetTournaments), new { id = tournament.Id }, tournament);
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTournamentStatusRequest request)
    {
        var updated = await _tournamentModel.UpdateStatusAsync(id, request.Status);
        if (!updated)
            return NotFound(new { message = "Tournament not found." });

        return Ok(new { message = $"Tournament status updated to {request.Status}." });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteTournament(int id)
    {
        var deleted = await _tournamentModel.DeleteAsync(id);
        if (!deleted)
            return NotFound(new { message = $"Tournament with ID {id} not found." });

        return NoContent();
    }
}
