using Torneos.API;
using Torneos.API.DTOs;
using Torneos.API.Entities;
using Torneos.API.Models;
using Torneos.Tests.TestSupport;

namespace Torneos.Tests.Models;

/// <summary>
/// Integración del avance de eliminatorias con la nueva lógica de desempate:
/// empate sin penaltis aborta, empate con penaltis avanza, y propagación ida/vuelta.
/// </summary>
public class KnockoutAdvancementTests
{
    private static void SeedSport(ApplicationDbContext db)
    {
        db.Sports.Add(new Sport { Id = 1, Name = "Football" });
        for (int i = 1; i <= 4; i++)
            db.Teams.Add(new Team { Id = i, Name = $"T{i}", SportId = 1 });
        db.Tournaments.Add(new Tournament
        {
            Id = 1, Name = "Copa", SportId = 1, Format = TournamentFormat.Knockout
        });
    }

    private static MatchModel Model(ApplicationDbContext db) => new(db);
    private static readonly List<PlayerStatDto> NoStats = new();

    // ───────────── Partido único ─────────────

    [Fact]
    public async Task SingleLeg_EmpateSinPenaltis_LanzaYNoAvanza()
    {
        using var db = TestDb.NewContext();
        SeedSport(db);
        db.Matches.Add(new Match { Id = 1, TournamentId = 1, HomeTeamId = 1, AwayTeamId = 2, Stage = "Final" });
        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => Model(db).UpdateResultWithStatsAsync(1, 1, 1, NoStats));
        Assert.Contains("empat", ex.Message.ToLower());
    }

    [Fact]
    public async Task SingleLeg_EmpateConPenaltis_AvanzaYRegistraGanador()
    {
        using var db = TestDb.NewContext();
        SeedSport(db);
        // Semifinales (2) + Final (1 vacía)
        db.Matches.Add(new Match { Id = 1, TournamentId = 1, HomeTeamId = 1, AwayTeamId = 2, Stage = "Semifinales" });
        db.Matches.Add(new Match { Id = 2, TournamentId = 1, HomeTeamId = 3, AwayTeamId = 4, Stage = "Semifinales" });
        db.Matches.Add(new Match { Id = 3, TournamentId = 1, Stage = "Final" });
        await db.SaveChangesAsync();

        // Semifinal 0: 1-1 y penaltis 5-4 → gana el local (equipo 1)
        var ok = await Model(db).UpdateResultWithStatsAsync(1, 1, 1, NoStats, homeTiebreak: 5, awayTiebreak: 4);
        Assert.True(ok);

        var semi = db.Matches.First(m => m.Id == 1);
        Assert.Equal(1, semi.WinnerTeamId);

        var final = db.Matches.First(m => m.Stage == "Final");
        Assert.Equal(1, final.HomeTeamId); // cruce 0 → lado local de la final
    }

    [Fact]
    public async Task SingleLeg_GanaPorMarcador_PropagaSegunIndice()
    {
        using var db = TestDb.NewContext();
        SeedSport(db);
        db.Matches.Add(new Match { Id = 1, TournamentId = 1, HomeTeamId = 1, AwayTeamId = 2, Stage = "Semifinales" });
        db.Matches.Add(new Match { Id = 2, TournamentId = 1, HomeTeamId = 3, AwayTeamId = 4, Stage = "Semifinales" });
        db.Matches.Add(new Match { Id = 3, TournamentId = 1, Stage = "Final" });
        await db.SaveChangesAsync();

        await Model(db).UpdateResultWithStatsAsync(2, 0, 2, NoStats); // semifinal 1 → gana visitante (4)

        var final = db.Matches.First(m => m.Stage == "Final");
        Assert.Equal(4, final.AwayTeamId); // cruce 1 → lado visitante de la final
    }

    // ───────────── Ida y vuelta ─────────────

    private static void SeedTwoLegBracket(ApplicationDbContext db)
    {
        SeedSport(db);
        // Semifinal único cruce (equipos 1 y 2) a ida/vuelta + Final ida/vuelta vacía.
        db.Matches.Add(new Match { Id = 1, TournamentId = 1, HomeTeamId = 1, AwayTeamId = 2, Stage = "Semifinales - Ida" });
        db.Matches.Add(new Match { Id = 2, TournamentId = 1, HomeTeamId = 2, AwayTeamId = 1, Stage = "Semifinales - Vuelta" });
        db.Matches.Add(new Match { Id = 3, TournamentId = 1, Stage = "Final - Ida" });
        db.Matches.Add(new Match { Id = 4, TournamentId = 1, Stage = "Final - Vuelta" });
    }

    [Fact]
    public async Task TwoLeg_SoloIdaJugada_NoResuelveTodavia()
    {
        using var db = TestDb.NewContext();
        SeedTwoLegBracket(db);
        await db.SaveChangesAsync();

        // Solo se juega la ida: 2-0. No debe resolver ni lanzar.
        var ok = await Model(db).UpdateResultWithStatsAsync(1, 2, 0, NoStats);
        Assert.True(ok);

        Assert.Null(db.Matches.First(m => m.Id == 2).WinnerTeamId);
        Assert.Null(db.Matches.First(m => m.Stage == "Final - Ida").HomeTeamId);
    }

    [Fact]
    public async Task TwoLeg_GlobalDecide_PropagaAAmbasPiernasDeLaFinal()
    {
        using var db = TestDb.NewContext();
        SeedTwoLegBracket(db);
        await db.SaveChangesAsync();

        var model = Model(db);
        await model.UpdateResultWithStatsAsync(1, 2, 0, NoStats); // ida: 1(local) 2-0 2
        await model.UpdateResultWithStatsAsync(2, 0, 1, NoStats); // vuelta: 2(local) 0-1 1 → global eq1=3, eq2=0

        var vuelta = db.Matches.First(m => m.Id == 2);
        Assert.Equal(1, vuelta.WinnerTeamId);

        var finalIda = db.Matches.First(m => m.Stage == "Final - Ida");
        var finalVuelta = db.Matches.First(m => m.Stage == "Final - Vuelta");
        Assert.Equal(1, finalIda.HomeTeamId);   // cruce 0 → local en la ida
        Assert.Equal(1, finalVuelta.AwayTeamId); // y visitante en la vuelta
    }

    [Fact]
    public async Task TwoLeg_GlobalEmpatadoSinPenaltis_Lanza()
    {
        using var db = TestDb.NewContext();
        SeedTwoLegBracket(db);
        await db.SaveChangesAsync();

        var model = Model(db);
        await model.UpdateResultWithStatsAsync(1, 2, 0, NoStats); // ida: eq1 2-0
        // vuelta: 2(local) 2-0 1 → global 2-2, sin penaltis → lanza
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => model.UpdateResultWithStatsAsync(2, 2, 0, NoStats));
        Assert.Contains("empat", ex.Message.ToLower());
    }

    [Fact]
    public async Task TwoLeg_GlobalEmpatadoConPenaltis_Resuelve()
    {
        using var db = TestDb.NewContext();
        SeedTwoLegBracket(db);
        await db.SaveChangesAsync();

        var model = Model(db);
        await model.UpdateResultWithStatsAsync(1, 2, 0, NoStats); // ida: eq1 2-0
        // vuelta: 2(local) 2-0 1 → global 2-2; penaltis 5-4 a favor del local de la vuelta (equipo 2)
        var ok = await model.UpdateResultWithStatsAsync(2, 2, 0, NoStats, homeTiebreak: 5, awayTiebreak: 4);
        Assert.True(ok);
        Assert.Equal(2, db.Matches.First(m => m.Id == 2).WinnerTeamId);
    }
}
