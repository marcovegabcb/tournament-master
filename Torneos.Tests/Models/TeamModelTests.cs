using Microsoft.EntityFrameworkCore;
using Torneos.API.Entities;
using Torneos.API.Models;
using Torneos.Tests.TestSupport;

namespace Torneos.Tests.Models;

public class TeamModelTests
{
    // ----------------------------------------------------------------------
    // CreateAsync - prestigio por defecto
    // ----------------------------------------------------------------------

    [Fact]
    public async Task CreateAsync_DefaultPrestige_AssignsHundredWhenZero()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        await context.SaveChangesAsync();
        var model = new TeamModel(context);
        var team = new Team { Name = "Equipo A", SportId = 1, PrestigePoints = 0 };

        // Act
        var created = await model.CreateAsync(team);

        // Assert
        Assert.Equal(100, created.PrestigePoints);
    }

    [Fact]
    public async Task CreateAsync_ExplicitPrestige_IsRespected()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        await context.SaveChangesAsync();
        var model = new TeamModel(context);
        var team = new Team { Name = "Equipo B", SportId = 1, PrestigePoints = 250 };

        // Act
        var created = await model.CreateAsync(team);

        // Assert
        Assert.Equal(250, created.PrestigePoints);
    }

    // ----------------------------------------------------------------------
    // CreateAsync - asigna capitan
    // ----------------------------------------------------------------------

    [Fact]
    public async Task CreateAsync_WithCaptainId_AssignsCaptainTeamId()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        // Un jugador previo (sin equipo real todavia). TeamId se actualizara al crear el equipo.
        var player = new Player { Id = 10, FirstName = "Leo", LastName = "Messi", TeamId = 99 };
        context.Players.Add(player);
        await context.SaveChangesAsync();

        var model = new TeamModel(context);
        var team = new Team { Name = "Equipo Capitan", SportId = 1, CaptainId = 10 };

        // Act
        var created = await model.CreateAsync(team);

        // Assert
        var reloaded = await context.Players.FindAsync(10);
        Assert.NotNull(reloaded);
        Assert.Equal(created.Id, reloaded!.TeamId);
    }

    // ----------------------------------------------------------------------
    // RemoveFromTournamentAsync
    // ----------------------------------------------------------------------

    [Fact]
    public async Task RemoveFromTournamentAsync_RegistrationOpen_RemovesAndReturnsTrue()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        context.Teams.Add(new Team { Id = 1, Name = "Equipo", SportId = 1 });
        context.Tournaments.Add(new Tournament { Id = 1, Name = "Liga", SportId = 1, Status = TournamentStatus.RegistrationOpen });
        context.TeamTournaments.Add(new TeamTournament { TeamId = 1, TournamentId = 1 });
        await context.SaveChangesAsync();
        var model = new TeamModel(context);

        // Act
        var result = await model.RemoveFromTournamentAsync(1, 1);

        // Assert
        Assert.True(result);
        Assert.Empty(await context.TeamTournaments.ToListAsync());
    }

    [Theory]
    [InlineData(TournamentStatus.InProgress)]
    [InlineData(TournamentStatus.Finished)]
    public async Task RemoveFromTournamentAsync_NotRegistrationOpen_Throws(TournamentStatus status)
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        context.Teams.Add(new Team { Id = 1, Name = "Equipo", SportId = 1 });
        context.Tournaments.Add(new Tournament { Id = 1, Name = "Liga", SportId = 1, Status = status });
        context.TeamTournaments.Add(new TeamTournament { TeamId = 1, TournamentId = 1 });
        await context.SaveChangesAsync();
        var model = new TeamModel(context);

        // Act + Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => model.RemoveFromTournamentAsync(1, 1));
        Assert.Single(await context.TeamTournaments.ToListAsync());
    }

    [Fact]
    public async Task RemoveFromTournamentAsync_EnrollmentNotFound_ReturnsFalse()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        context.Teams.Add(new Team { Id = 1, Name = "Equipo", SportId = 1 });
        context.Tournaments.Add(new Tournament { Id = 1, Name = "Liga", SportId = 1, Status = TournamentStatus.RegistrationOpen });
        await context.SaveChangesAsync();
        var model = new TeamModel(context);

        // Act
        var result = await model.RemoveFromTournamentAsync(1, 1);

        // Assert
        Assert.False(result);
    }

    // ----------------------------------------------------------------------
    // DeleteAsync
    // ----------------------------------------------------------------------

    [Fact]
    public async Task DeleteAsync_NoActiveTournaments_DeletesTeamAndPlayers()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        context.Teams.Add(new Team { Id = 1, Name = "Equipo", SportId = 1 });
        context.Players.Add(new Player { Id = 1, FirstName = "A", LastName = "A", TeamId = 1 });
        context.Players.Add(new Player { Id = 2, FirstName = "B", LastName = "B", TeamId = 1 });
        await context.SaveChangesAsync();
        var model = new TeamModel(context);

        // Act
        var result = await model.DeleteAsync(1);

        // Assert
        Assert.True(result);
        Assert.Null(await context.Teams.FindAsync(1));
        Assert.Empty(await context.Players.Where(p => p.TeamId == 1).ToListAsync());
    }

    [Theory]
    [InlineData(TournamentStatus.RegistrationOpen)]
    [InlineData(TournamentStatus.InProgress)]
    [InlineData(TournamentStatus.Finished)]
    public async Task DeleteAsync_TeamInTournament_ThrowsWithTournamentName(TournamentStatus status)
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        context.Teams.Add(new Team { Id = 1, Name = "Equipo", SportId = 1 });
        context.Tournaments.Add(new Tournament { Id = 1, Name = "Copa Mundial", SportId = 1, Status = status });
        context.TeamTournaments.Add(new TeamTournament { TeamId = 1, TournamentId = 1 });
        await context.SaveChangesAsync();
        var model = new TeamModel(context);

        // Act + Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => model.DeleteAsync(1));
        Assert.Contains("Copa Mundial", ex.Message);
        Assert.NotNull(await context.Teams.FindAsync(1));
    }

    [Fact]
    public async Task DeleteAsync_TeamNotFound_ReturnsFalse()
    {
        // Arrange
        using var context = TestDb.NewContext();
        var model = new TeamModel(context);

        // Act
        var result = await model.DeleteAsync(999);

        // Assert
        Assert.False(result);
    }

    // ----------------------------------------------------------------------
    // GetRecentMatchesAsync
    // ----------------------------------------------------------------------

    [Fact]
    public async Task GetRecentMatchesAsync_ReturnsHomeAndAwayOrderedByDateDescLimited()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        context.Teams.Add(new Team { Id = 1, Name = "Mi Equipo", SportId = 1 });
        context.Teams.Add(new Team { Id = 2, Name = "Rival", SportId = 1 });
        context.Tournaments.Add(new Tournament { Id = 1, Name = "Liga", SportId = 1 });

        // Equipo 1 como local
        context.Matches.Add(new Match { Id = 1, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 1, MatchDate = new DateTime(2026, 1, 1) });
        // Equipo 1 como visitante (mas reciente)
        context.Matches.Add(new Match { Id = 2, HomeTeamId = 2, AwayTeamId = 1, TournamentId = 1, MatchDate = new DateTime(2026, 3, 1) });
        // Equipo 1 como local (el mas reciente)
        context.Matches.Add(new Match { Id = 3, HomeTeamId = 1, AwayTeamId = 2, TournamentId = 1, MatchDate = new DateTime(2026, 5, 1) });
        // Partido que NO involucra al equipo 1
        context.Teams.Add(new Team { Id = 3, Name = "Otro", SportId = 1 });
        context.Matches.Add(new Match { Id = 4, HomeTeamId = 2, AwayTeamId = 3, TournamentId = 1, MatchDate = new DateTime(2026, 6, 1) });
        await context.SaveChangesAsync();
        var model = new TeamModel(context);

        // Act
        var result = await model.GetRecentMatchesAsync(1, take: 2);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal(3, result[0].Id); // mayo, mas reciente
        Assert.Equal(2, result[1].Id); // marzo
        Assert.DoesNotContain(result, m => m.Id == 4);
    }

    // ----------------------------------------------------------------------
    // GetAllAsync
    // ----------------------------------------------------------------------

    [Fact]
    public async Task GetAllAsync_FilterBySportId_ReturnsOnlyMatching()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        context.Sports.Add(new Sport { Id = 2, Name = "Basketball" });
        context.Teams.Add(new Team { Id = 1, Name = "F1", SportId = 1 });
        context.Teams.Add(new Team { Id = 2, Name = "F2", SportId = 1 });
        context.Teams.Add(new Team { Id = 3, Name = "B1", SportId = 2 });
        await context.SaveChangesAsync();
        var model = new TeamModel(context);

        // Act
        var result = await model.GetAllAsync(sportId: 1);

        // Assert
        Assert.Equal(2, result.TotalCount);
        Assert.All(result.Items, t => Assert.Equal(1, t.SportId));
    }

    [Fact]
    public async Task GetAllAsync_Pagination_ReturnsCorrectPageAndTotal()
    {
        // Arrange
        using var context = TestDb.NewContext();
        context.Sports.Add(new Sport { Id = 1, Name = "Football" });
        for (int i = 1; i <= 5; i++)
            context.Teams.Add(new Team { Id = i, Name = $"T{i}", SportId = 1 });
        await context.SaveChangesAsync();
        var model = new TeamModel(context);

        // Act
        var page2 = await model.GetAllAsync(sportId: null, page: 2, pageSize: 2);

        // Assert
        Assert.Equal(5, page2.TotalCount);
        Assert.Equal(2, page2.Items.Count);
        Assert.Equal(3, page2.Items[0].Id); // ordenado por Id, pagina 2 con pageSize 2 -> ids 3,4
        Assert.Equal(4, page2.Items[1].Id);
    }
}
