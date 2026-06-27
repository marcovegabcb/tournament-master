using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Torneos.API.DTOs;
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
    public async Task<ActionResult> GetTeams([FromQuery] int? sportId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _teamModel.GetAllAsync(sportId, page, pageSize);
        return Ok(new
        {
            items = result.Items.Select(t => new
            {
                t.Id,
                t.Name,
                t.CaptainName,
                t.CaptainId,
                t.LogoUrl,
                t.GroupLabel,
                t.PrestigePoints,
                t.SportId,
                Sport = t.Sport != null ? new { t.Sport.Id, t.Sport.Name, t.Sport.ColorHex } : null,
                t.StadiumId,
                Stadium = t.Stadium != null ? new { t.Stadium.Id, t.Stadium.Name, t.Stadium.City } : null,
                TeamTournaments = t.TeamTournaments.Select(tt => new {
                    tt.TeamId,
                    tt.TournamentId,
                    Tournament = tt.Tournament != null ? new { tt.Tournament.Id, tt.Tournament.Status } : null
                })
            }),
            result.TotalCount,
            result.Page,
            result.PageSize,
            result.TotalPages
        });
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
            Sport = team.Sport != null ? new { team.Sport.Id, team.Sport.Name, team.Sport.ColorHex } : null,
            team.StadiumId,
            Stadium = team.Stadium != null ? new { team.Stadium.Id, team.Stadium.Name, team.Stadium.City } : null,
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
                Sport = tt.Tournament.Sport != null ? new { tt.Tournament.Sport.Name } : null
            }),
            Matches = matches.Select(m => new
            {
                m.Id,
                m.MatchDate,
                m.HomeTeamId,
                HomeTeam = new { Name = m.HomeTeam?.Name ?? "Unknown" },
                m.AwayTeamId,
                AwayTeam = new { Name = m.AwayTeam?.Name ?? "Unknown" },
                m.HomeScore,
                m.AwayScore,
                m.IsPlayed,
                m.Stage,
                TournamentName = m.Tournament?.Name ?? "Unknown"
            })
        };

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Team>> CreateTeam(CreateTeamRequest request)
    {
        var team = new Team
        {
            Name = request.Name,
            CaptainName = request.CaptainName,
            LogoUrl = request.LogoUrl,
            SportId = request.SportId,
            StadiumId = request.StadiumId,
            CaptainId = request.CaptainId
        };
        var created = await _teamModel.CreateAsync(team);
        return CreatedAtAction(nameof(GetTeams), new { id = created.Id }, created);
    }

    [HttpDelete("{teamId}/tournaments/{tournamentId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RemoveTeamFromTournament(int teamId, int tournamentId)
    {
        var removed = await _teamModel.RemoveFromTournamentAsync(teamId, tournamentId);
        if (!removed) return NotFound(new { message = "Team is not enrolled in this tournament." });
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteTeam(int id)
    {
        var deleted = await _teamModel.DeleteAsync(id);
        if (!deleted) return NotFound(new { message = "Team not found." });
        return NoContent();
    }
}
