using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Torneos.API.Entities;
using Torneos.API.Models;

namespace Torneos.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SportsController : ControllerBase
{
    private readonly SportModel _sportModel;

    public SportsController(SportModel sportModel)
    {
        _sportModel = sportModel;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Sport>>> GetSports()
    {
        return await _sportModel.GetAllAsync();
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<Sport>> CreateSport(Sport sport)
    {
        var created = await _sportModel.CreateAsync(sport);
        return CreatedAtAction(nameof(GetSports), new { id = created.Id }, created);
    }
}
