using Microsoft.EntityFrameworkCore;
using Torneos.API.Entities;
using Torneos.API.Models;
using Torneos.API.Stats;
using Torneos.Tests.TestSupport;
using Xunit;

namespace Torneos.Tests.Models;

public class PlayerModelTests
{
    // ---------- Helpers de siembra ----------

    private static Sport CrearDeporte(string name) =>
        new Sport { Name = name, ColorHex = "#123456", ImageUrl = "img" };

    private static Team CrearEquipo(int sportId, string name = "Equipo") =>
        new Team { Name = name, SportId = sportId };

    private static Player CrearJugador(int teamId, string firstName = "Nombre", int matchesPlayed = 0) =>
        new Player { FirstName = firstName, LastName = "Apellido", JerseyNumber = 10, TeamId = teamId, MatchesPlayed = matchesPlayed };

    // ===================================================================
    // GetAllAsync - paginacion y filtros
    // ===================================================================

    [Fact]
    public async Task GetAllAsync_PrimeraPagina_Devuelve20DeTotal25()
    {
        using var db = TestDb.NewContext();
        var sport = CrearDeporte("Football");
        db.Sports.Add(sport);
        await db.SaveChangesAsync();
        var team = CrearEquipo(sport.Id);
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        for (int i = 0; i < 25; i++)
            db.Players.Add(CrearJugador(team.Id, $"J{i}"));
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var result = await model.GetAllAsync(null, null, page: 1, pageSize: 20);

        Assert.Equal(20, result.Items.Count);
        Assert.Equal(25, result.TotalCount);
        Assert.Equal(1, result.Page);
        Assert.Equal(20, result.PageSize);
    }

    [Fact]
    public async Task GetAllAsync_SegundaPagina_DevuelveRestantes5()
    {
        using var db = TestDb.NewContext();
        var sport = CrearDeporte("Football");
        db.Sports.Add(sport);
        await db.SaveChangesAsync();
        var team = CrearEquipo(sport.Id);
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        for (int i = 0; i < 25; i++)
            db.Players.Add(CrearJugador(team.Id, $"J{i}"));
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var result = await model.GetAllAsync(null, null, page: 2, pageSize: 20);

        Assert.Equal(5, result.Items.Count);
        Assert.Equal(25, result.TotalCount);
        Assert.Equal(2, result.Page);
    }

    [Fact]
    public async Task GetAllAsync_FiltroPorTeamId_SoloDevuelveJugadoresDeEseEquipo()
    {
        using var db = TestDb.NewContext();
        var sport = CrearDeporte("Football");
        db.Sports.Add(sport);
        await db.SaveChangesAsync();
        var teamA = CrearEquipo(sport.Id, "A");
        var teamB = CrearEquipo(sport.Id, "B");
        db.Teams.AddRange(teamA, teamB);
        await db.SaveChangesAsync();
        db.Players.AddRange(
            CrearJugador(teamA.Id, "a1"),
            CrearJugador(teamA.Id, "a2"),
            CrearJugador(teamB.Id, "b1"));
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var result = await model.GetAllAsync(teamId: teamA.Id, sportId: null);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.Items.Count);
        Assert.All(result.Items, p => Assert.Equal(teamA.Id, p.TeamId));
    }

    [Fact]
    public async Task GetAllAsync_FiltroPorSportId_SoloDevuelveJugadoresDeEseDeporte()
    {
        using var db = TestDb.NewContext();
        var sport1 = CrearDeporte("Football");
        var sport2 = CrearDeporte("Basketball");
        db.Sports.AddRange(sport1, sport2);
        await db.SaveChangesAsync();
        var team1 = CrearEquipo(sport1.Id, "T1");
        var team2 = CrearEquipo(sport2.Id, "T2");
        db.Teams.AddRange(team1, team2);
        await db.SaveChangesAsync();
        db.Players.AddRange(
            CrearJugador(team1.Id, "s1a"),
            CrearJugador(team1.Id, "s1b"),
            CrearJugador(team2.Id, "s2a"));
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var result = await model.GetAllAsync(teamId: null, sportId: sport1.Id);

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.Items.Count);
        Assert.All(result.Items, p => Assert.Equal(team1.Id, p.TeamId));
    }

    [Fact]
    public async Task GetAllAsync_OrdenEstablePorIdAscendente()
    {
        using var db = TestDb.NewContext();
        var sport = CrearDeporte("Football");
        db.Sports.Add(sport);
        await db.SaveChangesAsync();
        var team = CrearEquipo(sport.Id);
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        for (int i = 0; i < 10; i++)
            db.Players.Add(CrearJugador(team.Id, $"J{i}"));
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var result = await model.GetAllAsync(null, null, page: 1, pageSize: 10);

        var ids = result.Items.Select(p => p.Id).ToList();
        var ordenados = ids.OrderBy(x => x).ToList();
        Assert.Equal(ordenados, ids);
    }

    // ===================================================================
    // GetByIdWithDetailsAsync
    // ===================================================================

    [Fact]
    public async Task GetByIdWithDetailsAsync_Existente_CargaTeamYSport()
    {
        using var db = TestDb.NewContext();
        var sport = CrearDeporte("Football");
        db.Sports.Add(sport);
        await db.SaveChangesAsync();
        var team = CrearEquipo(sport.Id);
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        var player = CrearJugador(team.Id);
        db.Players.Add(player);
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var result = await model.GetByIdWithDetailsAsync(player.Id);

        Assert.NotNull(result);
        Assert.NotNull(result!.Team);
        Assert.NotNull(result.Team.Sport);
        Assert.Equal("Football", result.Team.Sport!.Name);
    }

    [Fact]
    public async Task GetByIdWithDetailsAsync_NoExistente_DevuelveNull()
    {
        using var db = TestDb.NewContext();
        var model = new PlayerModel(db);

        var result = await model.GetByIdWithDetailsAsync(9999);

        Assert.Null(result);
    }

    // ===================================================================
    // CreateAsync
    // ===================================================================

    [Fact]
    public async Task CreateAsync_PersisteJugadorYCargaTeam()
    {
        using var db = TestDb.NewContext();
        var sport = CrearDeporte("Football");
        db.Sports.Add(sport);
        await db.SaveChangesAsync();
        var team = CrearEquipo(sport.Id);
        db.Teams.Add(team);
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var nuevo = CrearJugador(team.Id, "Creado");
        var creado = await model.CreateAsync(nuevo);

        Assert.True(creado.Id > 0);
        Assert.NotNull(creado.Team);
        Assert.Equal(team.Id, creado.Team.Id);

        // Verifica persistencia con contexto fresco apuntando a la misma BD no es posible
        // (InMemory aislado por nombre), pero el mismo contexto debe encontrarlo.
        var enBd = await db.Players.FindAsync(creado.Id);
        Assert.NotNull(enBd);
    }

    // ===================================================================
    // DeleteAsync
    // ===================================================================

    [Fact]
    public async Task DeleteAsync_Existente_DevuelveTrueYElimina()
    {
        using var db = TestDb.NewContext();
        var sport = CrearDeporte("Football");
        db.Sports.Add(sport);
        await db.SaveChangesAsync();
        var team = CrearEquipo(sport.Id);
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        var player = CrearJugador(team.Id);
        db.Players.Add(player);
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var ok = await model.DeleteAsync(player.Id);

        Assert.True(ok);
        Assert.Null(await db.Players.FindAsync(player.Id));
    }

    [Fact]
    public async Task DeleteAsync_NoExistente_DevuelveFalse()
    {
        using var db = TestDb.NewContext();
        var model = new PlayerModel(db);

        var ok = await model.DeleteAsync(9999);

        Assert.False(ok);
    }

    // ===================================================================
    // GetStatsAsync - agregacion por deporte
    // ===================================================================

    [Fact]
    public async Task GetStatsAsync_Football_SumaCorrectaDeCampos()
    {
        using var db = TestDb.NewContext();
        var sport = CrearDeporte("Football");
        db.Sports.Add(sport);
        await db.SaveChangesAsync();
        var team = CrearEquipo(sport.Id);
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        var player = CrearJugador(team.Id, matchesPlayed: 7);
        db.Players.Add(player);
        await db.SaveChangesAsync();

        db.Set<FootballStats>().AddRange(
            new FootballStats { PlayerId = player.Id, MatchId = 1, Goals = 1, Assists = 2, YellowCards = 1, RedCards = 0 },
            new FootballStats { PlayerId = player.Id, MatchId = 2, Goals = 2, Assists = 0, YellowCards = 0, RedCards = 1 },
            new FootballStats { PlayerId = player.Id, MatchId = 3, Goals = 3, Assists = 1, YellowCards = 2, RedCards = 0 });
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var summary = await model.GetStatsAsync(player.Id, null);

        Assert.NotNull(summary);
        Assert.Equal("Football", summary!.Sport);
        Assert.Equal(7, summary.MatchesPlayed);
        Assert.Equal(6, summary.Stats["goals"]);
        Assert.Equal(3, summary.Stats["assists"]);
        Assert.Equal(3, summary.Stats["yellowCards"]);
        Assert.Equal(1, summary.Stats["redCards"]);
    }

    [Fact]
    public async Task GetStatsAsync_Basketball_SumaCorrectaDeCampos()
    {
        using var db = TestDb.NewContext();
        var sport = CrearDeporte("Basketball");
        db.Sports.Add(sport);
        await db.SaveChangesAsync();
        var team = CrearEquipo(sport.Id);
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        var player = CrearJugador(team.Id, matchesPlayed: 4);
        db.Players.Add(player);
        await db.SaveChangesAsync();

        db.Set<BasketballStats>().AddRange(
            new BasketballStats { PlayerId = player.Id, MatchId = 1, Points = 10, Rebounds = 5, Assists = 3 },
            new BasketballStats { PlayerId = player.Id, MatchId = 2, Points = 20, Rebounds = 2, Assists = 4 });
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var summary = await model.GetStatsAsync(player.Id, null);

        Assert.NotNull(summary);
        Assert.Equal("Basketball", summary!.Sport);
        Assert.Equal(4, summary.MatchesPlayed);
        Assert.Equal(30, summary.Stats["points"]);
        Assert.Equal(7, summary.Stats["rebounds"]);
        Assert.Equal(7, summary.Stats["assists"]);
    }

    [Fact]
    public async Task GetStatsAsync_Tennis_SumaCorrectaDeCampos()
    {
        using var db = TestDb.NewContext();
        var sport = CrearDeporte("Tennis");
        db.Sports.Add(sport);
        await db.SaveChangesAsync();
        var team = CrearEquipo(sport.Id);
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        var player = CrearJugador(team.Id, matchesPlayed: 2);
        db.Players.Add(player);
        await db.SaveChangesAsync();

        db.Set<TennisStats>().AddRange(
            new TennisStats { PlayerId = player.Id, MatchId = 1, Aces = 5, DoubleFaults = 1, Winners = 8 },
            new TennisStats { PlayerId = player.Id, MatchId = 2, Aces = 3, DoubleFaults = 2, Winners = 4 });
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var summary = await model.GetStatsAsync(player.Id, null);

        Assert.NotNull(summary);
        Assert.Equal("Tennis", summary!.Sport);
        Assert.Equal(8, summary.Stats["aces"]);
        Assert.Equal(3, summary.Stats["doubleFaults"]);
        Assert.Equal(12, summary.Stats["winners"]);
    }

    [Fact]
    public async Task GetStatsAsync_Volleyball_SumaCorrectaDeCampos()
    {
        using var db = TestDb.NewContext();
        var sport = CrearDeporte("Volleyball");
        db.Sports.Add(sport);
        await db.SaveChangesAsync();
        var team = CrearEquipo(sport.Id);
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        var player = CrearJugador(team.Id, matchesPlayed: 3);
        db.Players.Add(player);
        await db.SaveChangesAsync();

        db.Set<VolleyballStats>().AddRange(
            new VolleyballStats { PlayerId = player.Id, MatchId = 1, Kills = 6, Blocks = 2, Aces = 1 },
            new VolleyballStats { PlayerId = player.Id, MatchId = 2, Kills = 4, Blocks = 3, Aces = 2 });
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var summary = await model.GetStatsAsync(player.Id, null);

        Assert.NotNull(summary);
        Assert.Equal("Volleyball", summary!.Sport);
        Assert.Equal(10, summary.Stats["kills"]);
        Assert.Equal(5, summary.Stats["blocks"]);
        Assert.Equal(3, summary.Stats["aces"]);
    }

    [Fact]
    public async Task GetStatsAsync_SinFilasDeStats_SumasEnCero()
    {
        using var db = TestDb.NewContext();
        var sport = CrearDeporte("Football");
        db.Sports.Add(sport);
        await db.SaveChangesAsync();
        var team = CrearEquipo(sport.Id);
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        var player = CrearJugador(team.Id, matchesPlayed: 0);
        db.Players.Add(player);
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var summary = await model.GetStatsAsync(player.Id, null);

        Assert.NotNull(summary);
        Assert.Equal(0, summary!.Stats["goals"]);
        Assert.Equal(0, summary.Stats["assists"]);
        Assert.Equal(0, summary.Stats["yellowCards"]);
        Assert.Equal(0, summary.Stats["redCards"]);
    }

    [Fact]
    public async Task GetStatsAsync_PlayerInexistente_DevuelveNull()
    {
        using var db = TestDb.NewContext();
        var model = new PlayerModel(db);

        var summary = await model.GetStatsAsync(9999, null);

        Assert.Null(summary);
    }

    [Fact]
    public async Task GetStatsAsync_PlayerSinSport_DevuelveNull()
    {
        using var db = TestDb.NewContext();
        // Equipo con SportId que no corresponde a ningun Sport => Team.Sport == null
        var team = CrearEquipo(sportId: 999);
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        var player = CrearJugador(team.Id);
        db.Players.Add(player);
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var summary = await model.GetStatsAsync(player.Id, null);

        Assert.Null(summary);
    }

    [Fact]
    public async Task GetStatsAsync_SoloSumaStatsDelPlayerConsultado()
    {
        using var db = TestDb.NewContext();
        var sport = CrearDeporte("Football");
        db.Sports.Add(sport);
        await db.SaveChangesAsync();
        var team = CrearEquipo(sport.Id);
        db.Teams.Add(team);
        await db.SaveChangesAsync();
        var player = CrearJugador(team.Id, "Consultado");
        var otro = CrearJugador(team.Id, "Otro");
        db.Players.AddRange(player, otro);
        await db.SaveChangesAsync();

        db.Set<FootballStats>().AddRange(
            new FootballStats { PlayerId = player.Id, MatchId = 1, Goals = 2, Assists = 1, YellowCards = 0, RedCards = 0 },
            // stats del OTRO player, no deben colarse
            new FootballStats { PlayerId = otro.Id, MatchId = 1, Goals = 99, Assists = 99, YellowCards = 99, RedCards = 99 });
        await db.SaveChangesAsync();

        var model = new PlayerModel(db);
        var summary = await model.GetStatsAsync(player.Id, null);

        Assert.NotNull(summary);
        Assert.Equal(2, summary!.Stats["goals"]);
        Assert.Equal(1, summary.Stats["assists"]);
        Assert.Equal(0, summary.Stats["yellowCards"]);
        Assert.Equal(0, summary.Stats["redCards"]);
    }
}
