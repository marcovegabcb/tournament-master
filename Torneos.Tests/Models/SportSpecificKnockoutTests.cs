using Torneos.API;
using Torneos.API.DTOs;
using Torneos.API.Entities;
using Torneos.API.Models;
using Torneos.Tests.TestSupport;

namespace Torneos.Tests.Models;

/// <summary>
/// Reglas por deporte en eliminatorias:
/// - Baloncesto: un partido único o el global ida/vuelta no pueden empatar (se resuelve por prórroga
///   en el marcador, no por penaltis). Los penaltis enviados se ignoran.
/// - Vóley: el cruce a doble partido se decide por partidos ganados; si 1-1, por golden set.
/// - Tenis: se juega siempre a partido único en sede neutral.
/// </summary>
public class SportSpecificKnockoutTests
{
    private static readonly List<PlayerStatDto> NoStats = new();

    private static void SeedSport(ApplicationDbContext db, string sportName)
    {
        db.Sports.Add(new Sport { Id = 1, Name = sportName });
        for (int i = 1; i <= 4; i++)
            db.Teams.Add(new Team { Id = i, Name = $"T{i}", SportId = 1 });
        db.Tournaments.Add(new Tournament { Id = 1, Name = "Copa", SportId = 1, Format = TournamentFormat.Knockout });
    }

    // ───────── Baloncesto: partido único ─────────

    [Fact]
    public async Task Baloncesto_PartidoUnicoEmpatado_Lanza_NoPenaltis()
    {
        using var db = TestDb.NewContext();
        SeedSport(db, "Basketball");
        db.Matches.Add(new Match { Id = 1, TournamentId = 1, HomeTeamId = 1, AwayTeamId = 2, Stage = "Final" });
        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => new MatchModel(db).UpdateResultWithStatsAsync(1, 70, 70, NoStats));
        Assert.Contains("rroga", ex.Message.ToLower()); // pide prórroga, no penaltis
        Assert.DoesNotContain("penal", ex.Message.ToLower());
    }

    [Fact]
    public async Task Baloncesto_EmpateConPenaltis_LosIgnoraYLanza()
    {
        using var db = TestDb.NewContext();
        SeedSport(db, "Basketball");
        db.Matches.Add(new Match { Id = 1, TournamentId = 1, HomeTeamId = 1, AwayTeamId = 2, Stage = "Final" });
        await db.SaveChangesAsync();

        // Aunque se manden penaltis, en baloncesto se ignoran: sigue siendo empate inválido.
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => new MatchModel(db).UpdateResultWithStatsAsync(1, 70, 70, NoStats, homeTiebreak: 5, awayTiebreak: 4));
    }

    [Fact]
    public async Task Baloncesto_PartidoUnicoConGanador_Avanza()
    {
        using var db = TestDb.NewContext();
        SeedSport(db, "Basketball");
        db.Matches.Add(new Match { Id = 1, TournamentId = 1, HomeTeamId = 1, AwayTeamId = 2, Stage = "Semifinales" });
        db.Matches.Add(new Match { Id = 2, TournamentId = 1, HomeTeamId = 3, AwayTeamId = 4, Stage = "Semifinales" });
        db.Matches.Add(new Match { Id = 3, TournamentId = 1, Stage = "Final" });
        await db.SaveChangesAsync();

        var ok = await new MatchModel(db).UpdateResultWithStatsAsync(1, 80, 78, NoStats);
        Assert.True(ok);
        Assert.Equal(1, db.Matches.First(m => m.Id == 1).WinnerTeamId);
    }

    // ───────── Baloncesto: ida y vuelta ─────────

    private static void SeedTwoLeg(ApplicationDbContext db)
    {
        SeedSport(db, "Basketball");
        db.Matches.Add(new Match { Id = 1, TournamentId = 1, HomeTeamId = 1, AwayTeamId = 2, Stage = "Semifinales - Ida" });
        db.Matches.Add(new Match { Id = 2, TournamentId = 1, HomeTeamId = 2, AwayTeamId = 1, Stage = "Semifinales - Vuelta" });
        db.Matches.Add(new Match { Id = 3, TournamentId = 1, Stage = "Final - Ida" });
        db.Matches.Add(new Match { Id = 4, TournamentId = 1, Stage = "Final - Vuelta" });
    }

    [Fact]
    public async Task Baloncesto_IdaEmpatada_EsValida()
    {
        using var db = TestDb.NewContext();
        SeedTwoLeg(db);
        await db.SaveChangesAsync();

        // Ida 70-70 es válida (el empate de un partido suelto no decide la eliminatoria).
        var ok = await new MatchModel(db).UpdateResultWithStatsAsync(1, 70, 70, NoStats);
        Assert.True(ok);
        Assert.Null(db.Matches.First(m => m.Id == 2).WinnerTeamId);
    }

    [Fact]
    public async Task Baloncesto_GlobalDesempatado_Avanza()
    {
        using var db = TestDb.NewContext();
        SeedTwoLeg(db);
        await db.SaveChangesAsync();

        var model = new MatchModel(db);
        await model.UpdateResultWithStatsAsync(1, 70, 70, NoStats); // ida: eq1 70-70 eq2
        await model.UpdateResultWithStatsAsync(2, 60, 65, NoStats); // vuelta: eq2 60-65 eq1 → global eq1=135, eq2=130
        Assert.Equal(1, db.Matches.First(m => m.Id == 2).WinnerTeamId);
    }

    [Fact]
    public async Task Baloncesto_GlobalEmpatado_Lanza()
    {
        using var db = TestDb.NewContext();
        SeedTwoLeg(db);
        await db.SaveChangesAsync();

        var model = new MatchModel(db);
        await model.UpdateResultWithStatsAsync(1, 74, 72, NoStats); // ida: eq1 74-72 eq2
        // vuelta: eq2 87-85 eq1 → global eq1=159, eq2=159 → empate → prórroga
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => model.UpdateResultWithStatsAsync(2, 87, 85, NoStats));
        Assert.Contains("rroga", ex.Message.ToLower());
    }

    // ───────── Vóley: ida y vuelta (partidos ganados + golden set) ─────────

    private static void SeedTwoLegVolley(ApplicationDbContext db)
    {
        db.Sports.Add(new Sport { Id = 1, Name = "Volleyball" });
        for (int i = 1; i <= 4; i++)
            db.Teams.Add(new Team { Id = i, Name = $"T{i}", SportId = 1 });
        db.Tournaments.Add(new Tournament { Id = 1, Name = "Copa", SportId = 1, Format = TournamentFormat.Knockout });
        db.Matches.Add(new Match { Id = 1, TournamentId = 1, HomeTeamId = 1, AwayTeamId = 2, Stage = "Semifinales - Ida" });
        db.Matches.Add(new Match { Id = 2, TournamentId = 1, HomeTeamId = 2, AwayTeamId = 1, Stage = "Semifinales - Vuelta" });
        db.Matches.Add(new Match { Id = 3, TournamentId = 1, Stage = "Final - Ida" });
        db.Matches.Add(new Match { Id = 4, TournamentId = 1, Stage = "Final - Vuelta" });
    }

    [Fact]
    public async Task Voley_MismoEquipoGanaLasDosPiernas_Avanza()
    {
        using var db = TestDb.NewContext();
        SeedTwoLegVolley(db);
        await db.SaveChangesAsync();

        var model = new MatchModel(db);
        await model.UpdateResultWithStatsAsync(1, 3, 1, NoStats); // ida: eq1 gana 3-1 a eq2
        await model.UpdateResultWithStatsAsync(2, 0, 3, NoStats); // vuelta: eq2 0-3 eq1 → eq1 gana ambas
        Assert.Equal(1, db.Matches.First(m => m.Id == 2).WinnerTeamId);
    }

    [Fact]
    public async Task Voley_UnaPiernaCadaEquipo_SinGoldenSet_Lanza()
    {
        using var db = TestDb.NewContext();
        SeedTwoLegVolley(db);
        await db.SaveChangesAsync();

        var model = new MatchModel(db);
        await model.UpdateResultWithStatsAsync(1, 3, 1, NoStats); // ida: eq1 gana
        // vuelta: eq2 gana 3-2 → 1 pierna cada uno → falta golden set
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => model.UpdateResultWithStatsAsync(2, 3, 2, NoStats));
        Assert.Contains("golden", ex.Message.ToLower());
    }

    [Fact]
    public async Task Voley_UnaPiernaCadaEquipo_ConGoldenSet_Avanza()
    {
        using var db = TestDb.NewContext();
        SeedTwoLegVolley(db);
        await db.SaveChangesAsync();

        var model = new MatchModel(db);
        await model.UpdateResultWithStatsAsync(1, 3, 1, NoStats); // ida: eq1 gana
        // vuelta: eq2 gana 3-2 + golden set 15-12 a favor del local de la vuelta (eq2) → avanza eq2
        await model.UpdateResultWithStatsAsync(2, 3, 2, NoStats, homeTiebreak: 15, awayTiebreak: 12);
        Assert.Equal(2, db.Matches.First(m => m.Id == 2).WinnerTeamId);
    }

    // ───────── Creación de torneo: tenis sin doble partido ─────────

    private static CreateTournamentRequest Req(TournamentFormat format, VenueType venue) => new()
    {
        Name = "Torneo X", SportId = 1, Format = format, VenueConfig = venue
    };

    [Fact]
    public async Task CrearTorneo_VoleyKnockoutDoblePartido_EsValido()
    {
        // Vóley sí admite doble partido: se decide por partidos ganados y, si 1-1, por golden set.
        using var db = TestDb.NewContext();
        db.Sports.Add(new Sport { Id = 1, Name = "Volleyball" });
        await db.SaveChangesAsync();

        var created = await new TournamentModel(db).CreateAsync(Req(TournamentFormat.Knockout, VenueType.HomeAndAway));
        Assert.True(created.Id > 0);
        Assert.Equal(VenueType.HomeAndAway, created.VenueConfig);
    }

    [Theory]
    [InlineData("Tennis", VenueType.NeutralVenue)]
    [InlineData("Volleyball", VenueType.SingleRound)]
    public async Task CrearTorneo_SetBasedKnockoutPartidoUnico_EsValido(string sport, VenueType venue)
    {
        using var db = TestDb.NewContext();
        db.Sports.Add(new Sport { Id = 1, Name = sport });
        await db.SaveChangesAsync();

        var created = await new TournamentModel(db).CreateAsync(Req(TournamentFormat.Knockout, venue));
        Assert.True(created.Id > 0);
    }

    [Fact]
    public async Task CrearTorneo_FutbolKnockoutDoblePartido_EsValido()
    {
        using var db = TestDb.NewContext();
        db.Sports.Add(new Sport { Id = 1, Name = "Football" });
        await db.SaveChangesAsync();

        var created = await new TournamentModel(db).CreateAsync(Req(TournamentFormat.Knockout, VenueType.HomeAndAway));
        Assert.True(created.Id > 0);
    }

    // ───────── Tenis: sede neutral obligatoria, equipos sin estadio ─────────

    [Theory]
    [InlineData(VenueType.HomeAndAway)]
    [InlineData(VenueType.SingleRound)]
    public async Task CrearTorneo_Tenis_FuerzaSedeNeutral(VenueType requested)
    {
        using var db = TestDb.NewContext();
        db.Sports.Add(new Sport { Id = 1, Name = "Tennis" });
        await db.SaveChangesAsync();

        var created = await new TournamentModel(db).CreateAsync(Req(TournamentFormat.League, requested));
        Assert.Equal(VenueType.NeutralVenue, created.VenueConfig);
    }

    [Fact]
    public async Task CrearEquipo_Tenis_QuitaEstadioPropio()
    {
        using var db = TestDb.NewContext();
        db.Sports.Add(new Sport { Id = 1, Name = "Tennis" });
        await db.SaveChangesAsync();

        var team = await new TeamModel(db).CreateAsync(new Team { Name = "Nadal", SportId = 1, StadiumId = 5 });
        Assert.Null(team.StadiumId);
    }

    [Fact]
    public async Task CrearEquipo_Futbol_ConservaEstadioPropio()
    {
        using var db = TestDb.NewContext();
        db.Sports.Add(new Sport { Id = 1, Name = "Football" });
        await db.SaveChangesAsync();

        var team = await new TeamModel(db).CreateAsync(new Team { Name = "Madrid", SportId = 1, StadiumId = 5 });
        Assert.Equal(5, team.StadiumId);
    }
}
