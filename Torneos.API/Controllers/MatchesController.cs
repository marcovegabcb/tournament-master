using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Torneos.API.DTOs;
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

        // Acumula la clasificación en una sola pasada sobre los partidos jugados.
        var rows = new Dictionary<int, StandingRow>();

        StandingRow Row(int teamId, string teamName)
        {
            if (!rows.TryGetValue(teamId, out var row))
            {
                row = new StandingRow { TeamId = teamId, TeamName = teamName };
                rows[teamId] = row;
            }
            return row;
        }

        foreach (var m in matches)
        {
            if (m.HomeTeamId is int homeId && m.HomeTeam != null)
            {
                var row = Row(homeId, m.HomeTeam.Name);
                row.Played++;
                row.GoalsFor += m.HomeScore;
                row.GoalsAgainst += m.AwayScore;
                row.PointsFor += m.HomePoints;
                row.PointsAgainst += m.AwayPoints;
                if (m.HomeScore > m.AwayScore) row.Wins++;
                else if (m.HomeScore < m.AwayScore) row.Losses++;
                else row.Draws++;
            }
            if (m.AwayTeamId is int awayId && m.AwayTeam != null)
            {
                var row = Row(awayId, m.AwayTeam.Name);
                row.Played++;
                row.GoalsFor += m.AwayScore;
                row.GoalsAgainst += m.HomeScore;
                row.PointsFor += m.AwayPoints;
                row.PointsAgainst += m.HomePoints;
                if (m.AwayScore > m.HomeScore) row.Wins++;
                else if (m.AwayScore < m.HomeScore) row.Losses++;
                else row.Draws++;
            }
        }

        foreach (var team in tournament.TeamTournaments.Select(tt => tt.Team))
        {
            if (!rows.ContainsKey(team.Id))
                rows[team.Id] = new StandingRow { TeamId = team.Id, TeamName = team.Name };
        }

        var standings = rows.Values.Select(r => new
        {
            TeamId = (int?)r.TeamId,
            r.TeamName,
            r.Played,
            r.Wins,
            r.Losses,
            r.Draws,
            r.GoalsFor,
            r.GoalsAgainst,
            GoalDifference = r.GoalsFor - r.GoalsAgainst,
            // Puntos (vóley) / juegos (tenis) sumados de los sets. Desempate tras la diferencia de sets.
            r.PointsFor,
            r.PointsAgainst,
            PointsDifference = r.PointsFor - r.PointsAgainst,
            Points = r.Wins * 3 + r.Draws
        }).ToList();

        bool allZero = standings.All(s => s.Points == 0 && s.GoalsFor == 0 && s.GoalsAgainst == 0);
        if (allZero)
            return Ok(standings.OrderBy(s => s.TeamName).ToList());

        return Ok(standings
            .OrderByDescending(x => x.Points)
            .ThenByDescending(x => x.GoalDifference)     // diferencia de sets (goles en fútbol)
            .ThenByDescending(x => x.PointsDifference)   // vóley: dif. puntos · tenis: dif. juegos (0 en otros)
            .ThenByDescending(x => x.PointsFor)          // puntos/juegos a favor
            .ThenByDescending(x => x.GoalsFor)           // sets/goles a favor (último criterio)
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

    [HttpPost("fix-brackets")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> FixExistingBrackets()
    {
        int updated = await _matchModel.FixExistingBracketsAsync();
        return Ok(new { message = $"Fixed {updated} bracket entries across all knockout tournaments." });
    }

    [HttpPatch("{id}/result")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateResult(int id, [FromBody] UpdateMatchResultRequest request)
    {
        var updated = await _matchModel.UpdateResultWithStatsAsync(id, request.HomeScore, request.AwayScore, request.PlayerStats, request.HomeTiebreak, request.AwayTiebreak, request.HomePoints, request.AwayPoints);
        if (!updated) return NotFound("Match not found.");
        return Ok(new { message = "Match result updated successfully!" });
    }

    /** Acumulador mutable para construir la clasificación en una sola pasada. */
    private sealed class StandingRow
    {
        public int TeamId { get; init; }
        public string TeamName { get; init; } = "";
        public int Played { get; set; }
        public int Wins { get; set; }
        public int Losses { get; set; }
        public int Draws { get; set; }
        public int GoalsFor { get; set; }
        public int GoalsAgainst { get; set; }
        public int PointsFor { get; set; }      // puntos (vóley) / juegos (tenis) a favor
        public int PointsAgainst { get; set; }  // puntos (vóley) / juegos (tenis) en contra
    }
}
