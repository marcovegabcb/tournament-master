using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Torneos.API.Entities;
using Torneos.API.Models;
using Torneos.API.Services;

namespace Torneos.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MatchesController : ControllerBase
{
    private readonly MatchModel _matchModel;
    private readonly FixtureService _fixtureService;

    public MatchesController(MatchModel matchModel, FixtureService fixtureService)
    {
        _matchModel = matchModel;
        _fixtureService = fixtureService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Match>>> GetMatches([FromQuery] int? tournamentId)
    {
        return await _matchModel.GetAllAsync(tournamentId);
    }

    [HttpGet("standings/{tournamentId}")]
    public async Task<ActionResult> GetStandings(int tournamentId)
    {
        var tournament = await _matchModel.GetTournamentWithTeamsAsync(tournamentId);
        if (tournament == null) return NotFound("Tournament not found.");

        var matches = await _matchModel.GetPlayedMatchesAsync(tournamentId);

        var standings = matches
            .SelectMany(m => new[]
            {
                new { TeamId = m.HomeTeamId, TeamName = m.HomeTeam.Name, GoalsFor = m.HomeScore, GoalsAgainst = m.AwayScore },
                new { TeamId = m.AwayTeamId, TeamName = m.AwayTeam.Name, GoalsFor = m.AwayScore, GoalsAgainst = m.HomeScore }
            })
            .GroupBy(x => new { x.TeamId, x.TeamName })
            .Select(g =>
            {
                var wins = matches.Count(m => (m.HomeTeamId == g.Key.TeamId && m.HomeScore > m.AwayScore) ||
                                               (m.AwayTeamId == g.Key.TeamId && m.AwayScore > m.HomeScore));
                var losses = matches.Count(m => (m.HomeTeamId == g.Key.TeamId && m.HomeScore < m.AwayScore) ||
                                                  (m.AwayTeamId == g.Key.TeamId && m.AwayScore < m.HomeScore));
                var draws = matches.Count(m => (m.HomeTeamId == g.Key.TeamId || m.AwayTeamId == g.Key.TeamId) &&
                                                m.HomeScore == m.AwayScore);
                return new
                {
                    TeamId = g.Key.TeamId,
                    TeamName = g.Key.TeamName,
                    Played = g.Count(),
                    Wins = wins,
                    Losses = losses,
                    Draws = draws,
                    GoalsFor = g.Sum(x => x.GoalsFor),
                    GoalsAgainst = g.Sum(x => x.GoalsAgainst),
                    GoalDifference = g.Sum(x => x.GoalsFor) - g.Sum(x => x.GoalsAgainst),
                    Points = wins * 3 + draws
                };
            })
            .ToList();

        var enrolledTeams = tournament.TeamTournaments.Select(tt => tt.Team).ToList();
        var standingTeamIds = new HashSet<int?>(standings.Select(s => s.TeamId));
        foreach (var team in enrolledTeams)
        {
            if (!standingTeamIds.Contains(team.Id))
            {
                standings.Add(new
                {
                    TeamId = (int?)team.Id,
                    TeamName = team.Name,
                    Played = 0,
                    Wins = 0,
                    Losses = 0,
                    Draws = 0,
                    GoalsFor = 0,
                    GoalsAgainst = 0,
                    GoalDifference = 0,
                    Points = 0
                });
            }
        }

        bool allZero = standings.All(s => s.Points == 0 && s.GoalsFor == 0 && s.GoalsAgainst == 0);
        if (allZero)
            return Ok(standings.OrderBy(s => s.TeamName).ToList());

        return Ok(standings
            .OrderByDescending(x => x.Points)
            .ThenByDescending(x => x.GoalDifference)
            .ThenByDescending(x => x.GoalsFor)
            .ToList());
    }

    [HttpPost("generate/{tournamentId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GenerateFixture([FromRoute] int tournamentId)
    {
        var tournament = await _matchModel.GetTournamentWithTeamsAsync(tournamentId);
        if (tournament == null) return NotFound("Tournament not found.");

        var teamsOfTournament = tournament.TeamTournaments.Select(tt => tt.Team).ToList();

        if (teamsOfTournament.Count < 2)
            return BadRequest("This tournament does not have enough teams.");

        var existingMatches = await _matchModel.GetExistingMatchesCountAsync(tournamentId);

        if (existingMatches > 0)
        {
            await _matchModel.DeleteByTournamentAsync(tournamentId);
        }

        var stadiumIds = tournament.TournamentStadiums.Select(ts => ts.StadiumId).ToList();

        var generatedMatches = _fixtureService.Generate(
            tournamentId, teamsOfTournament, tournament.Format, tournament.VenueConfig, stadiumIds);

        await _matchModel.CreateRangeAsync(generatedMatches);
        await _matchModel.MarkFixtureGeneratedAsync(tournamentId);

        return Ok(new { message = "Fixtures generated successfully!" });
    }
}
