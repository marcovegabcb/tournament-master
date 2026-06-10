using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    public async Task<ActionResult<IEnumerable<Player>>> GetPlayers([FromQuery] int? teamId)
    {
        return await _playerModel.GetAllAsync(teamId);
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
            Team = player.Team != null ? new
            {
                player.Team.Id,
                player.Team.Name,
                player.Team.PrestigePoints,
                Sport = new { player.Team.Sport!.Name }
            } : null
        };

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Player>> CreatePlayer(Player player)
    {
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
