using Microsoft.EntityFrameworkCore;
using Torneos.API;
using Torneos.API.DTOs;
using Torneos.API.Entities;
using Torneos.API.Models;
using Torneos.API.Stats;
using Torneos.Tests.TestSupport;

namespace Torneos.Tests.Models;

public class MatchModelTests
{
    // ----------------------------------------------------------------------
    // GetAllAsync
    // ----------------------------------------------------------------------

    [Fact]
    public async Task GetAllAsync_NoTournamentId_ReturnsAllOrderedById()
    {
        // Arrange
        using var context = TestDb.NewContext();
        SeedBasic(context);
        context.Matches.Add(new Match { Id = 2, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 1 });
        context.Matches.Add(new Match { Id = 1, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 1 });
        context.Matches.Add(new Match { Id = 3, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 2 });
        await context.SaveChangesAsync();
        var model = new MatchModel(context);

        // Act
        var result = await model.GetAllAsync(null);

        // Assert
        Assert.Equal(3, result.Count);
        Assert.Equal(new[] { 1, 2, 3 }, result.Select(m => m.Id).ToArray());
    }

    [Fact]
    public async Task GetAllAsync_WithTournamentId_FiltersByTournament()
    {
        // Arrange
        using var context = TestDb.NewContext();
        SeedBasic(context);
        context.Matches.Add(new Match { Id = 1, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 1 });
        context.Matches.Add(new Match { Id = 2, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 2 });
        await context.SaveChangesAsync();
        var model = new MatchModel(context);

        // Act
        var result = await model.GetAllAsync(1);

        // Assert
        Assert.Single(result);
        Assert.Equal(1, result[0].TournamentId);
    }

    // ----------------------------------------------------------------------
    // GetExistingMatchesCountAsync
    // ----------------------------------------------------------------------

    [Fact]
    public async Task GetExistingMatchesCountAsync_ReturnsCountForTournament()
    {
        // Arrange
        using var context = TestDb.NewContext();
        SeedBasic(context);
        context.Matches.Add(new Match { Id = 1, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 1 });
        context.Matches.Add(new Match { Id = 2, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 1 });
        context.Matches.Add(new Match { Id = 3, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 2 });
        await context.SaveChangesAsync();
        var model = new MatchModel(context);

        // Act
        var count = await model.GetExistingMatchesCountAsync(1);

        // Assert
        Assert.Equal(2, count);
    }

    // ----------------------------------------------------------------------
    // DeleteByTournamentAsync
    // ----------------------------------------------------------------------

    [Fact]
    public async Task DeleteByTournamentAsync_DeletesMatchesAndResetsFlag()
    {
        // Arrange
        using var context = TestDb.NewContext();
        SeedBasic(context);
        var tournament = await context.Tournaments.FindAsync(1);
        tournament!.IsFixtureGenerated = true;
        context.Matches.Add(new Match { Id = 1, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 1 });
        context.Matches.Add(new Match { Id = 2, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 2 });
        await context.SaveChangesAsync();
        var model = new MatchModel(context);

        // Act
        await model.DeleteByTournamentAsync(1);

        // Assert
        Assert.Empty(await context.Matches.Where(m => m.TournamentId == 1).ToListAsync());
        Assert.Single(await context.Matches.Where(m => m.TournamentId == 2).ToListAsync());
        Assert.False((await context.Tournaments.FindAsync(1))!.IsFixtureGenerated);
    }

    // ----------------------------------------------------------------------
    // MarkFixtureGeneratedAsync
    // ----------------------------------------------------------------------

    [Fact]
    public async Task MarkFixtureGeneratedAsync_SetsFlagTrue()
    {
        // Arrange
        using var context = TestDb.NewContext();
        SeedBasic(context);
        await context.SaveChangesAsync();
        var model = new MatchModel(context);

        // Act
        await model.MarkFixtureGeneratedAsync(1);

        // Assert
        Assert.True((await context.Tournaments.FindAsync(1))!.IsFixtureGenerated);
    }

    // ----------------------------------------------------------------------
    // UpdateResultWithStatsAsync
    // ----------------------------------------------------------------------

    [Fact]
    public async Task UpdateResultWithStatsAsync_SetsScoreAndSavesFootballStats()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        context.Tournaments.Add(new Tournament { Id = 1, Name = "Liga", SportId = 1, Format = TournamentFormat.League });
        context.Teams.Add(new Team { Id = 1, Name = "Local", SportId = 1 });
        context.Teams.Add(new Team { Id = 2, Name = "Visitante", SportId = 1 });
        context.Players.Add(new Player { Id = 1, FirstName = "P1", LastName = "L1", TeamId = 1, MatchesPlayed = 0 });
        context.Players.Add(new Player { Id = 2, FirstName = "P2", LastName = "L2", TeamId = 2, MatchesPlayed = 3 });
        context.Matches.Add(new Match { Id = 1, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 1 });
        await context.SaveChangesAsync();
        var model = new MatchModel(context);

        var stats = new List<PlayerStatDto>
        {
            new() { PlayerId = 1, Stats = new() { ["goals"] = 2, ["assists"] = 1, ["yellowCards"] = 1, ["redCards"] = 0 } },
            new() { PlayerId = 2, Stats = new() { ["goals"] = 0, ["assists"] = 0, ["yellowCards"] = 0, ["redCards"] = 1 } }
        };

        // Act
        var result = await model.UpdateResultWithStatsAsync(1, 3, 1, stats);

        // Assert
        Assert.True(result);
        var match = await context.Matches.FindAsync(1);
        Assert.Equal(3, match!.HomeScore);
        Assert.Equal(1, match.AwayScore);
        Assert.True(match.IsPlayed);

        var footballStats = await context.FootballStats.ToListAsync();
        Assert.Equal(2, footballStats.Count);
        var p1Stats = footballStats.Single(s => s.PlayerId == 1);
        Assert.Equal(2, p1Stats.Goals);
        Assert.Equal(1, p1Stats.Assists);
        Assert.Equal(1, p1Stats.YellowCards);
        Assert.Equal(0, p1Stats.RedCards);
        var p2Stats = footballStats.Single(s => s.PlayerId == 2);
        Assert.Equal(1, p2Stats.RedCards);

        // MatchesPlayed incrementado en 1 para cada uno
        Assert.Equal(1, (await context.Players.FindAsync(1))!.MatchesPlayed);
        Assert.Equal(4, (await context.Players.FindAsync(2))!.MatchesPlayed);
    }

    [Fact]
    public async Task UpdateResultWithStatsAsync_CalledTwice_DoesNotDuplicateStats()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        context.Tournaments.Add(new Tournament { Id = 1, Name = "Liga", SportId = 1, Format = TournamentFormat.League });
        context.Teams.Add(new Team { Id = 1, Name = "Local", SportId = 1 });
        context.Teams.Add(new Team { Id = 2, Name = "Visitante", SportId = 1 });
        context.Players.Add(new Player { Id = 1, FirstName = "P1", LastName = "L1", TeamId = 1 });
        context.Matches.Add(new Match { Id = 1, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 1 });
        await context.SaveChangesAsync();
        var model = new MatchModel(context);

        var firstStats = new List<PlayerStatDto>
        {
            new() { PlayerId = 1, Stats = new() { ["goals"] = 1 } }
        };
        var secondStats = new List<PlayerStatDto>
        {
            new() { PlayerId = 1, Stats = new() { ["goals"] = 5 } }
        };

        // Act
        await model.UpdateResultWithStatsAsync(1, 1, 0, firstStats);
        await model.UpdateResultWithStatsAsync(1, 5, 0, secondStats);

        // Assert: las stats viejas se borran, no se duplican
        var footballStats = await context.FootballStats.Where(s => s.MatchId == 1).ToListAsync();
        Assert.Single(footballStats);
        Assert.Equal(5, footballStats[0].Goals);
    }

    [Fact]
    public async Task UpdateResultWithStatsAsync_MatchNotFound_ReturnsFalse()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        await context.SaveChangesAsync();
        var model = new MatchModel(context);

        // Act
        var result = await model.UpdateResultWithStatsAsync(999, 1, 0, new List<PlayerStatDto>());

        // Assert
        Assert.False(result);
    }

    // ----------------------------------------------------------------------
    // UpdateResultWithStatsAsync - avance de bracket (Knockout)
    // ----------------------------------------------------------------------

    [Fact]
    public async Task UpdateResultWithStatsAsync_KnockoutSemifinal_AdvancesWinnerToFinalHome()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        context.Tournaments.Add(new Tournament { Id = 1, Name = "Copa", SportId = 1, Format = TournamentFormat.Knockout });
        for (int i = 1; i <= 4; i++)
            context.Teams.Add(new Team { Id = i, Name = $"T{i}", SportId = 1 });

        // Semifinales: 2 partidos (indices 0 y 1 por orden de Id)
        context.Matches.Add(new Match { Id = 1, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 1, Stage = "Semifinales" });
        context.Matches.Add(new Match { Id = 2, HomeTeamId = 3, AwayTeamId = 4, TournamentId = 1, Stage = "Semifinales" });
        // Final: 1 partido sin equipos asignados todavia
        context.Matches.Add(new Match { Id = 3, HomeTeamId = null, AwayTeamId = null, TournamentId = 1, Stage = "Final" });
        await context.SaveChangesAsync();
        var model = new MatchModel(context);

        // Act: gana el equipo 1 (local) en la primera semifinal (indice 0 -> Home de la final)
        await model.UpdateResultWithStatsAsync(1, 2, 0, new List<PlayerStatDto>());

        // Assert
        var final = await context.Matches.FindAsync(3);
        Assert.Equal(1, final!.HomeTeamId);
        Assert.Null(final.AwayTeamId);
    }

    [Fact]
    public async Task UpdateResultWithStatsAsync_KnockoutSecondSemifinal_AdvancesWinnerToFinalAway()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        context.Tournaments.Add(new Tournament { Id = 1, Name = "Copa", SportId = 1, Format = TournamentFormat.Knockout });
        for (int i = 1; i <= 4; i++)
            context.Teams.Add(new Team { Id = i, Name = $"T{i}", SportId = 1 });

        context.Matches.Add(new Match { Id = 1, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 1, Stage = "Semifinales" });
        context.Matches.Add(new Match { Id = 2, HomeTeamId = 3, AwayTeamId = 4, TournamentId = 1, Stage = "Semifinales" });
        context.Matches.Add(new Match { Id = 3, HomeTeamId = null, AwayTeamId = null, TournamentId = 1, Stage = "Final" });
        await context.SaveChangesAsync();
        var model = new MatchModel(context);

        // Act: gana el equipo 4 (visitante) en la segunda semifinal (indice 1 -> Away de la final)
        await model.UpdateResultWithStatsAsync(2, 0, 3, new List<PlayerStatDto>());

        // Assert
        var final = await context.Matches.FindAsync(3);
        Assert.Equal(4, final!.AwayTeamId);
        Assert.Null(final.HomeTeamId);
    }

    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------

    private static void SeedBasic(ApplicationDbContext context)
    {
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        context.Tournaments.Add(new Tournament { Id = 1, Name = "T1", SportId = 1 });
        context.Tournaments.Add(new Tournament { Id = 2, Name = "T2", SportId = 1 });
        context.Teams.Add(new Team { Id = 1, Name = "A", SportId = 1 });
        context.Teams.Add(new Team { Id = 2, Name = "B", SportId = 1 });
    }
}
