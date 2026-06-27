using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Torneos.API.DTOs;
using Torneos.API.Entities;
using Torneos.API.Models;

namespace Torneos.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlayersController : ControllerBase
{
    private readonly PlayerModel _playerModel;

    public PlayersController(PlayerModel playerModel)
    {
        _playerModel = playerModel;
    }

    [HttpGet]
    public async Task<ActionResult> GetPlayers([FromQuery] int? teamId, [FromQuery] int? sportId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        return Ok(await _playerModel.GetAllAsync(teamId, sportId, page, pageSize));
    }

    [HttpGet("{id}/details")]
    public async Task<ActionResult> GetPlayerDetails(int id)
    {
        var player = await _playerModel.GetByIdWithDetailsAsync(id);

        if (player == null)
            return NotFound(new { message = "Player not found." });

        var result = new
        {
            player.Id,
            player.FirstName,
            player.LastName,
            player.JerseyNumber,
            player.MatchesPlayed,
            player.TeamId,
            Team = new
            {
                player.Team.Id,
                player.Team.Name,
                player.Team.PrestigePoints,
                Sport = new { player.Team.Sport!.Name }
            }
        };

        return Ok(result);
    }

    [HttpGet("{id}/stats")]
    public async Task<ActionResult> GetPlayerStats(int id, [FromQuery] int? tournamentId)
    {
        var stats = await _playerModel.GetStatsAsync(id, tournamentId);
        if (stats == null) return NotFound(new { message = "Player not found." });
        return Ok(stats);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Player>> CreatePlayer(CreatePlayerRequest request)
    {
        var player = new Player
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            JerseyNumber = request.JerseyNumber,
            TeamId = request.TeamId
        };
        var created = await _playerModel.CreateAsync(player);
        return CreatedAtAction(nameof(GetPlayers), new { id = created.Id }, created);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeletePlayer(int id)
    {
        var deleted = await _playerModel.DeleteAsync(id);
        if (!deleted) return NotFound(new { message = "Player not found." });
        return NoContent();
    }
}
