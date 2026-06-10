using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Torneos.API.Entities;
using Torneos.API.Models;

namespace Torneos.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TeamsController : ControllerBase
{
    private readonly TeamModel _teamModel;

    public TeamsController(TeamModel teamModel)
    {
        _teamModel = teamModel;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Team>>> GetTeams([FromQuery] int? sportId)
    {
        return await _teamModel.GetAllAsync(sportId);
    }

    [HttpGet("{id}/details")]
    public async Task<ActionResult> GetTeamDetails(int id)
    {
        var team = await _teamModel.GetByIdWithDetailsAsync(id);

        if (team == null)
            return NotFound(new { message = "Team not found." });

        var matches = await _teamModel.GetRecentMatchesAsync(id);

        var result = new
        {
            team.Id,
            team.Name,
            team.CaptainName,
            team.CaptainId,
            Captain = team.Captain != null ? new
            {
                team.Captain.Id,
                team.Captain.FirstName,
                team.Captain.LastName,
                team.Captain.JerseyNumber
            } : null,
            team.LogoUrl,
            team.GroupLabel,
            team.PrestigePoints,
            team.SportId,
            team.Sport,
            team.StadiumId,
            team.Stadium,
            Players = team.Players.Select(p => new
            {
                p.Id,
                p.FirstName,
                p.LastName,
                p.JerseyNumber,
                p.MatchesPlayed
            }),
            Tournaments = team.TeamTournaments.Select(tt => new
            {
                tt.Tournament.Id,
                tt.Tournament.Name,
                tt.Tournament.Format,
                tt.Tournament.Status,
                tt.Tournament.SportId,
                Sport = new { tt.Tournament.Sport!.Name }
            }),
            Matches = matches.Select(m => new
            {
                m.Id,
                m.MatchDate,
                m.HomeTeamId,
                HomeTeam = new { m.HomeTeam.Name },
                m.AwayTeamId,
                AwayTeam = new { m.AwayTeam.Name },
                m.HomeScore,
                m.AwayScore,
                m.IsPlayed,
                m.Stage,
                TournamentName = m.Tournament.Name
            })
        };

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Team>> CreateTeam(Team team)
    {
        var created = await _teamModel.CreateAsync(team);
        return CreatedAtAction(nameof(GetTeams), new { id = created.Id }, created);
    }

    [HttpDelete("{teamId}/tournaments/{tournamentId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RemoveTeamFromTournament(int teamId, int tournamentId)
    {
        try
        {
            var removed = await _teamModel.RemoveFromTournamentAsync(teamId, tournamentId);
            if (!removed) return NotFound(new { message = "Team is not enrolled in this tournament." });
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteTeam(int id)
    {
        try
        {
            var deleted = await _teamModel.DeleteAsync(id);
            if (!deleted) return NotFound(new { message = "Team not found." });
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
