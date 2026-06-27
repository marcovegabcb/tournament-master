using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Torneos.API;
using Torneos.API.Controllers;
using Torneos.API.Entities;
using Torneos.API.Models;
using Torneos.API.Services;
using Torneos.API.Services.FixtureGenerators;
using Torneos.Tests.TestSupport;
using Xunit;

namespace Torneos.Tests.Controllers;

/// <summary>
/// Pruebas del endpoint GetStandings de MatchesController.
/// Se centran en la logica de puntuacion (V=3, E=1, D=0) y el orden de la tabla.
/// </summary>
public class StandingsTests
{
    // ----- Helpers -----

    private static MatchesController BuildController(ApplicationDbContext db)
    {
        var matchModel = new MatchModel(db);
        var fixtureService = new FixtureService(
            new LeagueFixtureGenerator(),
            new KnockoutFixtureGenerator(),
            new GroupsFixtureGenerator());
        return new MatchesController(matchModel, fixtureService);
    }

    /// <summary>
    /// Inserta un torneo con los equipos dados inscritos (TeamTournament -> Team).
    /// Devuelve el id del torneo.
    /// </summary>
    private static async Task<int> SeedTournamentAsync(ApplicationDbContext db, params Team[] teams)
    {
        var tournament = new Tournament
        {
            Name = "Test Tournament",
            Format = TournamentFormat.League,
            VenueConfig = VenueType.SingleRound,
            Status = TournamentStatus.InProgress
        };
        db.Tournaments.Add(tournament);
        db.Teams.AddRange(teams);
        await db.SaveChangesAsync();

        foreach (var team in teams)
        {
            db.Set<TeamTournament>().Add(new TeamTournament
            {
                TeamId = team.Id,
                TournamentId = tournament.Id
            });
        }
        await db.SaveChangesAsync();

        return tournament.Id;
    }

    private static async Task AddPlayedMatchAsync(
        ApplicationDbContext db, int tournamentId, int homeTeamId, int awayTeamId, int homeScore, int awayScore)
    {
        db.Matches.Add(new Match
        {
            TournamentId = tournamentId,
            HomeTeamId = homeTeamId,
            AwayTeamId = awayTeamId,
            HomeScore = homeScore,
            AwayScore = awayScore,
            IsPlayed = true
        });
        await db.SaveChangesAsync();
    }

    private static JsonElement GetStandingsArray(ActionResult actionResult)
    {
        var ok = Assert.IsType<OkObjectResult>(actionResult);
        var json = JsonSerializer.Serialize(ok.Value);
        // El documento se conserva vivo a traves del JsonElement clonado.
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }

    private static JsonElement FindRow(JsonElement rows, string teamName)
    {
        foreach (var row in rows.EnumerateArray())
        {
            if (row.GetProperty("TeamName").GetString() == teamName)
                return row;
        }
        throw new Xunit.Sdk.XunitException($"No se encontro la fila para el equipo '{teamName}'.");
    }

    // ----- Tests -----

    [Fact]
    public async Task GetStandings_TorneoInexistente_DevuelveNotFound()
    {
        // Arrange
        using var db = TestDb.NewContext();
        var controller = BuildController(db);

        // Act
        var result = await controller.GetStandings(999);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetStandings_VictoriaDaTresPuntos_DerrotaCero()
    {
        // Arrange
        using var db = TestDb.NewContext();
        var teamA = new Team { Name = "A" };
        var teamB = new Team { Name = "B" };
        var tournamentId = await SeedTournamentAsync(db, teamA, teamB);
        await AddPlayedMatchAsync(db, tournamentId, teamA.Id, teamB.Id, 2, 1);
        var controller = BuildController(db);

        // Act
        var rows = GetStandingsArray(await controller.GetStandings(tournamentId));

        // Assert
        var a = FindRow(rows, "A");
        Assert.Equal(3, a.GetProperty("Points").GetInt32());
        Assert.Equal(1, a.GetProperty("Wins").GetInt32());
        Assert.Equal(0, a.GetProperty("Losses").GetInt32());
        Assert.Equal(0, a.GetProperty("Draws").GetInt32());
        Assert.Equal(2, a.GetProperty("GoalsFor").GetInt32());
        Assert.Equal(1, a.GetProperty("GoalsAgainst").GetInt32());
        Assert.Equal(1, a.GetProperty("GoalDifference").GetInt32());
        Assert.Equal(1, a.GetProperty("Played").GetInt32());

        var b = FindRow(rows, "B");
        Assert.Equal(0, b.GetProperty("Points").GetInt32());
        Assert.Equal(1, b.GetProperty("Losses").GetInt32());
        Assert.Equal(0, b.GetProperty("Wins").GetInt32());
        Assert.Equal(-1, b.GetProperty("GoalDifference").GetInt32());
        Assert.Equal(1, b.GetProperty("Played").GetInt32());

        // A va primero por tener mas puntos.
        Assert.Equal("A", rows[0].GetProperty("TeamName").GetString());
        Assert.Equal("B", rows[1].GetProperty("TeamName").GetString());
    }

    [Fact]
    public async Task GetStandings_EmpateDaUnPuntoCadaUno()
    {
        // Arrange
        using var db = TestDb.NewContext();
        var teamA = new Team { Name = "A" };
        var teamB = new Team { Name = "B" };
        var tournamentId = await SeedTournamentAsync(db, teamA, teamB);
        await AddPlayedMatchAsync(db, tournamentId, teamA.Id, teamB.Id, 1, 1);
        var controller = BuildController(db);

        // Act
        var rows = GetStandingsArray(await controller.GetStandings(tournamentId));

        // Assert
        var a = FindRow(rows, "A");
        var b = FindRow(rows, "B");
        Assert.Equal(1, a.GetProperty("Points").GetInt32());
        Assert.Equal(1, a.GetProperty("Draws").GetInt32());
        Assert.Equal(1, b.GetProperty("Points").GetInt32());
        Assert.Equal(1, b.GetProperty("Draws").GetInt32());
        Assert.Equal(0, a.GetProperty("Wins").GetInt32());
        Assert.Equal(0, a.GetProperty("Losses").GetInt32());
    }

    [Fact]
    public async Task GetStandings_AcumulaPuntosYPartidosEnVariosPartidos()
    {
        // Arrange: 3 equipos. A juega 2 partidos: gana a B (3-0) y empata con C (2-2).
        using var db = TestDb.NewContext();
        var teamA = new Team { Name = "A" };
        var teamB = new Team { Name = "B" };
        var teamC = new Team { Name = "C" };
        var tournamentId = await SeedTournamentAsync(db, teamA, teamB, teamC);
        await AddPlayedMatchAsync(db, tournamentId, teamA.Id, teamB.Id, 3, 0);
        await AddPlayedMatchAsync(db, tournamentId, teamA.Id, teamC.Id, 2, 2);
        var controller = BuildController(db);

        // Act
        var rows = GetStandingsArray(await controller.GetStandings(tournamentId));

        // Assert: A acumula 1 victoria (3) + 1 empate (1) = 4 puntos, 2 partidos jugados.
        var a = FindRow(rows, "A");
        Assert.Equal(2, a.GetProperty("Played").GetInt32());
        Assert.Equal(4, a.GetProperty("Points").GetInt32());
        Assert.Equal(1, a.GetProperty("Wins").GetInt32());
        Assert.Equal(1, a.GetProperty("Draws").GetInt32());
        Assert.Equal(0, a.GetProperty("Losses").GetInt32());
        Assert.Equal(5, a.GetProperty("GoalsFor").GetInt32());
        Assert.Equal(2, a.GetProperty("GoalsAgainst").GetInt32());
        Assert.Equal(3, a.GetProperty("GoalDifference").GetInt32());

        // B perdio 1, C empato 1: verificacion de acumulacion en sus filas.
        var b = FindRow(rows, "B");
        Assert.Equal(1, b.GetProperty("Played").GetInt32());
        Assert.Equal(0, b.GetProperty("Points").GetInt32());

        var c = FindRow(rows, "C");
        Assert.Equal(1, c.GetProperty("Played").GetInt32());
        Assert.Equal(1, c.GetProperty("Points").GetInt32());
    }

    [Fact]
    public async Task GetStandings_OrdenaPorPuntosLuegoDiferenciaDeGoles()
    {
        // Arrange: A y B terminan con 3 puntos cada uno, pero A tiene mejor diferencia de goles.
        // A gana 5-0 a C. B gana 1-0 a D. C y D pierden.
        using var db = TestDb.NewContext();
        var teamA = new Team { Name = "A" };
        var teamB = new Team { Name = "B" };
        var teamC = new Team { Name = "C" };
        var teamD = new Team { Name = "D" };
        var tournamentId = await SeedTournamentAsync(db, teamA, teamB, teamC, teamD);
        await AddPlayedMatchAsync(db, tournamentId, teamA.Id, teamC.Id, 5, 0); // A: +5
        await AddPlayedMatchAsync(db, tournamentId, teamB.Id, teamD.Id, 1, 0); // B: +1
        var controller = BuildController(db);

        // Act
        var rows = GetStandingsArray(await controller.GetStandings(tournamentId));

        // Assert: ambos 3 puntos, A primero por mejor diferencia de goles (+5 > +1).
        var a = FindRow(rows, "A");
        var b = FindRow(rows, "B");
        Assert.Equal(3, a.GetProperty("Points").GetInt32());
        Assert.Equal(3, b.GetProperty("Points").GetInt32());
        Assert.Equal("A", rows[0].GetProperty("TeamName").GetString());
        Assert.Equal("B", rows[1].GetProperty("TeamName").GetString());
    }

    [Fact]
    public async Task GetStandings_DesempatePorGolesAFavorCuandoPuntosYDiferenciaIguales()
    {
        // Arrange: A y B con mismos puntos (3) y misma diferencia (+2),
        // pero A marco mas goles (5-3 frente a 2-0).
        using var db = TestDb.NewContext();
        var teamA = new Team { Name = "A" };
        var teamB = new Team { Name = "B" };
        var teamC = new Team { Name = "C" };
        var teamD = new Team { Name = "D" };
        var tournamentId = await SeedTournamentAsync(db, teamA, teamB, teamC, teamD);
        await AddPlayedMatchAsync(db, tournamentId, teamA.Id, teamC.Id, 5, 3); // A: dif +2, GF 5
        await AddPlayedMatchAsync(db, tournamentId, teamB.Id, teamD.Id, 2, 0); // B: dif +2, GF 2
        var controller = BuildController(db);

        // Act
        var rows = GetStandingsArray(await controller.GetStandings(tournamentId));

        // Assert: A primero por mas goles a favor con misma diferencia.
        var a = FindRow(rows, "A");
        var b = FindRow(rows, "B");
        Assert.Equal(3, a.GetProperty("Points").GetInt32());
        Assert.Equal(3, b.GetProperty("Points").GetInt32());
        Assert.Equal(2, a.GetProperty("GoalDifference").GetInt32());
        Assert.Equal(2, b.GetProperty("GoalDifference").GetInt32());
        Assert.True(a.GetProperty("GoalsFor").GetInt32() > b.GetProperty("GoalsFor").GetInt32());
        Assert.Equal("A", rows[0].GetProperty("TeamName").GetString());
        Assert.Equal("B", rows[1].GetProperty("TeamName").GetString());
    }

    [Fact]
    public async Task GetStandings_EquipoInscritoSinJugarApareceConTodoCero()
    {
        // Arrange: 3 equipos inscritos, solo A y B juegan; C no juega.
        using var db = TestDb.NewContext();
        var teamA = new Team { Name = "A" };
        var teamB = new Team { Name = "B" };
        var teamC = new Team { Name = "C" };
        var tournamentId = await SeedTournamentAsync(db, teamA, teamB, teamC);
        await AddPlayedMatchAsync(db, tournamentId, teamA.Id, teamB.Id, 1, 0);
        var controller = BuildController(db);

        // Act
        var rows = GetStandingsArray(await controller.GetStandings(tournamentId));

        // Assert: C aparece con todo a cero.
        Assert.Equal(3, rows.GetArrayLength());
        var c = FindRow(rows, "C");
        Assert.Equal(0, c.GetProperty("Played").GetInt32());
        Assert.Equal(0, c.GetProperty("Points").GetInt32());
        Assert.Equal(0, c.GetProperty("Wins").GetInt32());
        Assert.Equal(0, c.GetProperty("Losses").GetInt32());
        Assert.Equal(0, c.GetProperty("Draws").GetInt32());
        Assert.Equal(0, c.GetProperty("GoalsFor").GetInt32());
        Assert.Equal(0, c.GetProperty("GoalsAgainst").GetInt32());
        Assert.Equal(0, c.GetProperty("GoalDifference").GetInt32());
    }

    [Fact]
    public async Task GetStandings_SinPartidosJugados_OrdenaAlfabeticamentePorNombre()
    {
        // Arrange: equipos inscritos sin ningun partido jugado -> caso allZero.
        using var db = TestDb.NewContext();
        var zeta = new Team { Name = "Zeta" };
        var alfa = new Team { Name = "Alfa" };
        var mu = new Team { Name = "Mu" };
        var tournamentId = await SeedTournamentAsync(db, zeta, alfa, mu);
        var controller = BuildController(db);

        // Act
        var rows = GetStandingsArray(await controller.GetStandings(tournamentId));

        // Assert: orden alfabetico por TeamName.
        Assert.Equal(3, rows.GetArrayLength());
        Assert.Equal("Alfa", rows[0].GetProperty("TeamName").GetString());
        Assert.Equal("Mu", rows[1].GetProperty("TeamName").GetString());
        Assert.Equal("Zeta", rows[2].GetProperty("TeamName").GetString());
    }
}
