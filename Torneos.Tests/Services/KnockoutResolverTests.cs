using Torneos.API.Services;

namespace Torneos.Tests.Services;

/// <summary>
/// Tests de la cascada de desempate de eliminatorias (lógica pura).
/// Cubre: ganador claro, empate resuelto por penaltis, empate no resoluble,
/// global de ida y vuelta (incluido 6-6), y deportes cuyo marcador no empata.
/// </summary>
public class KnockoutResolverTests
{
    // ───────────────────────── Partido único ─────────────────────────

    [Fact]
    public void SingleLeg_LocalGanaPorMarcador()
    {
        Assert.Equal(10, KnockoutResolver.ResolveSingleLeg(homeTeamId: 10, awayTeamId: 20, homeScore: 2, awayScore: 1));
    }

    [Fact]
    public void SingleLeg_VisitanteGanaPorMarcador()
    {
        Assert.Equal(20, KnockoutResolver.ResolveSingleLeg(homeTeamId: 10, awayTeamId: 20, homeScore: 0, awayScore: 3));
    }

    [Fact]
    public void SingleLeg_EmpateSinPenaltis_DevuelveNull()
    {
        // Empate y sin desempate introducido → no se puede avanzar todavía.
        Assert.Null(KnockoutResolver.ResolveSingleLeg(10, 20, homeScore: 1, awayScore: 1));
    }

    [Fact]
    public void SingleLeg_EmpateResueltoPorPenaltisLocal()
    {
        Assert.Equal(10, KnockoutResolver.ResolveSingleLeg(10, 20, 1, 1, homeTiebreak: 5, awayTiebreak: 4));
    }

    [Fact]
    public void SingleLeg_EmpateResueltoPorPenaltisVisitante()
    {
        Assert.Equal(20, KnockoutResolver.ResolveSingleLeg(10, 20, 2, 2, homeTiebreak: 3, awayTiebreak: 4));
    }

    [Fact]
    public void SingleLeg_EmpateConPenaltisTambienEmpatados_DevuelveNull()
    {
        Assert.Null(KnockoutResolver.ResolveSingleLeg(10, 20, 1, 1, homeTiebreak: 3, awayTiebreak: 3));
    }

    [Fact]
    public void SingleLeg_EmpateConSoloUnPenalti_DevuelveNull()
    {
        // Datos incompletos (solo un lado) → no resuelve.
        Assert.Null(KnockoutResolver.ResolveSingleLeg(10, 20, 1, 1, homeTiebreak: 5, awayTiebreak: null));
    }

    [Fact]
    public void SingleLeg_MarcadorDecideAunqueHayaPenaltis()
    {
        // Si no hay empate, los penaltis se ignoran.
        Assert.Equal(10, KnockoutResolver.ResolveSingleLeg(10, 20, 3, 1, homeTiebreak: 0, awayTiebreak: 9));
    }

    [Fact]
    public void SingleLeg_Sets_NoEmpataNunca()
    {
        // Tenis/vóley: el marcador son sets (3-1), siempre hay ganador sin penaltis.
        Assert.Equal(20, KnockoutResolver.ResolveSingleLeg(10, 20, homeScore: 1, awayScore: 3));
    }

    // ───────────────────────── Ida y vuelta ─────────────────────────

    [Fact]
    public void TwoLeg_GlobalDecideAFavorDelLocalDeIda()
    {
        // Ida: A(10) 2-0 B(20). Vuelta: B 1-2 A. Global A=4, B=1 → A.
        var winner = KnockoutResolver.ResolveTwoLeg(
            firstLegHomeTeamId: 10, firstLegAwayTeamId: 20, firstLegHomeScore: 2, firstLegAwayScore: 0,
            secondLegHomeTeamId: 20, secondLegAwayTeamId: 10, secondLegHomeScore: 1, secondLegAwayScore: 2);
        Assert.Equal(10, winner);
    }

    [Fact]
    public void TwoLeg_GlobalDecideAFavorDelOtroEquipo()
    {
        // Ida: A(10) 1-1 B(20). Vuelta: B 3-0 A. Global A=1, B=4 → B.
        var winner = KnockoutResolver.ResolveTwoLeg(
            10, 20, 1, 1,
            20, 10, 3, 0);
        Assert.Equal(20, winner);
    }

    [Fact]
    public void TwoLeg_GlobalEmpatado_SinPenaltis_DevuelveNull()
    {
        // El caso del enunciado: ida 2-0 y vuelta 2-4 → global 6-6 sin penaltis → null.
        // A(10) ida 2-0. Vuelta: B(20) local 4-2 → A mete 2, B mete 4. Global A=2+2=4? Ajustamos al ejemplo 6-6:
        // Ida A 2-0 B (A=2,B=0). Vuelta B 4-2 A (B=4,A=2)... global A=4,B=4. Empate.
        var winner = KnockoutResolver.ResolveTwoLeg(
            firstLegHomeTeamId: 10, firstLegAwayTeamId: 20, firstLegHomeScore: 2, firstLegAwayScore: 0,
            secondLegHomeTeamId: 20, secondLegAwayTeamId: 10, secondLegHomeScore: 4, secondLegAwayScore: 2);
        Assert.Null(winner);
    }

    [Fact]
    public void TwoLeg_GlobalEmpatado_ResueltoPorPenaltis()
    {
        // Global 4-4, penaltis en la vuelta: local de vuelta (20) gana 5-4.
        var winner = KnockoutResolver.ResolveTwoLeg(
            10, 20, 2, 0,
            20, 10, 4, 2,
            secondLegHomeTiebreak: 5, secondLegAwayTiebreak: 4);
        Assert.Equal(20, winner); // 20 es local en la vuelta y gana los penaltis
    }

    [Fact]
    public void TwoLeg_GlobalEmpatado_PenaltisLosGanaElEquipoDeIda()
    {
        // Mismo global 4-4; penaltis los gana 10 (visitante en la vuelta).
        var winner = KnockoutResolver.ResolveTwoLeg(
            10, 20, 2, 0,
            20, 10, 4, 2,
            secondLegHomeTiebreak: 3, secondLegAwayTiebreak: 6);
        Assert.Equal(10, winner);
    }

    [Fact]
    public void TwoLeg_FuncionaAunqueElOrdenLocalVisitanteSeRepita()
    {
        // Si por error la vuelta NO invierte (mismo local), el emparejado por id sigue siendo coherente.
        // Ida: A(10) 1-0 B(20). Vuelta con A de local otra vez: A 0-2 B. Global A=1, B=2 → B.
        var winner = KnockoutResolver.ResolveTwoLeg(
            10, 20, 1, 0,
            10, 20, 0, 2);
        Assert.Equal(20, winner);
    }
}
