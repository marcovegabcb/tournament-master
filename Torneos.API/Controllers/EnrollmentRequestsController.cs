using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Torneos.API.Models;

namespace Torneos.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EnrollmentRequestsController : ControllerBase
{
    private readonly EnrollmentRequestModel _enrollmentRequestModel;

    public EnrollmentRequestsController(EnrollmentRequestModel enrollmentRequestModel)
    {
        _enrollmentRequestModel = enrollmentRequestModel;
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll()
    {
        var requests = await _enrollmentRequestModel.GetAllAsync();
        return Ok(requests);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEnrollmentRequestDto dto)
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? "anonymous@guest.com";

        if (dto.TeamId.HasValue && dto.TeamId.Value > 0)
        {
            // Existing team request
            try
            {
                var request = await _enrollmentRequestModel.CreateWithExistingTeamAsync(dto.TeamId.Value, dto.TournamentId, email);
                return Ok(new { message = "Enrollment request submitted." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        else
        {
            // New team request
            if (string.IsNullOrWhiteSpace(dto.NewTeamName))
                return BadRequest(new { message = "Team name is required for new team requests." });

            var playersJson = System.Text.Json.JsonSerializer.Serialize(dto.NewTeamPlayers ?? new List<NewTeamPlayerDto>());

            try
            {
                var request = await _enrollmentRequestModel.CreateWithNewTeamAsync(
                    dto.TournamentId,
                    email,
                    dto.NewTeamName,
                    dto.NewTeamCaptainName ?? "",
                    dto.NewTeamLogoUrl ?? "",
                    dto.NewTeamStadiumId,
                    playersJson
                );
                return Ok(new { message = "Enrollment request submitted." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    [HttpPatch("{id}/approve")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Approve(int id)
    {
        var (success, message) = await _enrollmentRequestModel.ApproveAsync(id);
        if (!success)
            return BadRequest(new { message });
        return Ok(new { message });
    }

    [HttpPatch("{id}/reject")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Reject(int id)
    {
        var (success, message) = await _enrollmentRequestModel.RejectAsync(id);
        if (!success)
            return BadRequest(new { message });
        return Ok(new { message });
    }
}

public class CreateEnrollmentRequestDto
{
    public int? TeamId { get; set; }
    public int TournamentId { get; set; }
    public string? NewTeamName { get; set; }
    public string? NewTeamCaptainName { get; set; }
    public string? NewTeamLogoUrl { get; set; }
    public int? NewTeamStadiumId { get; set; }
    public List<NewTeamPlayerDto>? NewTeamPlayers { get; set; }
}
