using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Torneos.API.Models;

namespace Torneos.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EnrollmentsController : ControllerBase
{
    private readonly EnrollmentModel _enrollmentModel;

    public EnrollmentsController(EnrollmentModel enrollmentModel)
    {
        _enrollmentModel = enrollmentModel;
    }

    [HttpPost("enroll")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> EnrollTeam([FromQuery] int teamId, [FromQuery] int tournamentId)
    {
        var team = await _enrollmentModel.GetTeamWithPlayersAsync(teamId);
        var tournament = await _enrollmentModel.GetTournamentByIdAsync(tournamentId);

        if (team == null) return NotFound(new { message = "El equipo especificado no existe." });
        if (tournament == null) return NotFound(new { message = "El torneo especificado no existe." });

        if (team.PrestigePoints < tournament.MinPrestigeRequired)
        {
            return BadRequest(new { 
                message = $"Inscripción denegada. Tu equipo '{team.Name}' tiene {team.PrestigePoints} pts de prestigio, pero el torneo '{tournament.Name}' exige un mínimo de {tournament.MinPrestigeRequired} pts." 
            });
        }

        if (tournament.MinPlayersPerTeam > 0 && (team.Players == null || team.Players.Count < tournament.MinPlayersPerTeam))
        {
            return BadRequest(new {
                message = $"Inscripción denegada. El equipo '{team.Name}' tiene {team.Players?.Count ?? 0} jugadores, pero el torneo '{tournament.Name}' exige un mínimo de {tournament.MinPlayersPerTeam} jugadores por equipo."
            });
        }

        if (tournament.MaxPlayersPerTeam > 0 && (team.Players == null || team.Players.Count > tournament.MaxPlayersPerTeam))
        {
            return BadRequest(new {
                message = $"Inscripción denegada. El equipo '{team.Name}' tiene {team.Players?.Count ?? 0} jugadores, pero el torneo '{tournament.Name}' permite un máximo de {tournament.MaxPlayersPerTeam} jugadores por equipo."
            });
        }

        bool alreadyEnrolled = await _enrollmentModel.IsAlreadyEnrolledAsync(teamId, tournamentId);

        if (alreadyEnrolled)
        {
            return BadRequest(new { message = $"El equipo '{team.Name}' ya está inscrito en este torneo." });
        }

        await _enrollmentModel.EnrollAsync(teamId, tournamentId);

        return Ok(new { message = $"¡Enhorabuena! El equipo '{team.Name}' ha sido inscrito con éxito en '{tournament.Name}'." });
    }
}
