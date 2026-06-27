namespace Torneos.API.Services;

/// <summary>
/// Lógica pura (sin BD) para decidir qué equipo avanza en una eliminatoria.
///
/// Cascada de desempate (sin regla de goles de visitante):
///   1) Marcador (de un partido único) o GLOBAL agregado (ida + vuelta) → mayor avanza.
///   2) Si hay empate → marcador de desempate / penaltis (HomeTiebreak vs AwayTiebreak).
///   3) Si sigue empate o no se introdujo el desempate → null (no se puede avanzar todavía).
///
/// Notas por deporte:
///   - Fútbol: el marcador puede empatar → se resuelve con penaltis (paso 2).
///   - Baloncesto: la prórroga ya queda reflejada en el marcador → no empata.
///   - Tenis/Vóley: el marcador son sets ganados → no empata.
/// Por eso solo el fútbol necesita el paso 2; el modelo es el mismo para todos.
/// </summary>
public static class KnockoutResolver
{
    /// <summary>
    /// Ganador de una eliminatoria a partido único. Devuelve el id del equipo que avanza,
    /// o null si terminó en empate y el desempate no resuelve (faltan penaltis o también empatan).
    /// </summary>
    public static int? ResolveSingleLeg(
        int homeTeamId, int awayTeamId,
        int homeScore, int awayScore,
        int? homeTiebreak = null, int? awayTiebreak = null)
    {
        if (homeScore > awayScore) return homeTeamId;
        if (awayScore > homeScore) return awayTeamId;

        return ResolveTiebreak(homeTeamId, awayTeamId, homeTiebreak, awayTiebreak);
    }

    /// <summary>
    /// Ganador de una eliminatoria a doble partido (ida y vuelta) por marcador global.
    /// Los equipos se emparejan por id (en la vuelta se invierten local y visitante).
    /// El desempate (penaltis) se toma del partido de vuelta. Devuelve null si el global
    /// empata y el desempate no resuelve.
    /// </summary>
    public static int? ResolveTwoLeg(
        int firstLegHomeTeamId, int firstLegAwayTeamId,
        int firstLegHomeScore, int firstLegAwayScore,
        int secondLegHomeTeamId, int secondLegAwayTeamId,
        int secondLegHomeScore, int secondLegAwayScore,
        int? secondLegHomeTiebreak = null, int? secondLegAwayTiebreak = null)
    {
        int teamA = firstLegHomeTeamId;
        int teamB = firstLegAwayTeamId;

        // Marcador de cada equipo en la vuelta (en la vuelta se invierten local/visitante).
        int teamASecondLeg = secondLegHomeTeamId == teamA ? secondLegHomeScore : secondLegAwayScore;
        int teamBSecondLeg = secondLegHomeTeamId == teamB ? secondLegHomeScore : secondLegAwayScore;

        int globalA = firstLegHomeScore + teamASecondLeg;
        int globalB = firstLegAwayScore + teamBSecondLeg;

        if (globalA > globalB) return teamA;
        if (globalB > globalA) return teamB;

        // Empate global → penaltis, referidos a local/visitante del partido de vuelta.
        return ResolveTiebreak(secondLegHomeTeamId, secondLegAwayTeamId, secondLegHomeTiebreak, secondLegAwayTiebreak);
    }

    /// <summary>
    /// Ganador de una eliminatoria a doble partido por PARTIDOS ganados (vóley). Cada pierna la gana
    /// quien hace más sets; si cada equipo gana una pierna, decide el golden set de la vuelta
    /// (secondLegHomeTiebreak vs secondLegAwayTiebreak). Devuelve null si el golden set falta o empata,
    /// o si alguna pierna no tiene ganador claro (datos inválidos).
    /// </summary>
    public static int? ResolveTwoLegByLegWins(
        int firstLegHomeTeamId, int firstLegAwayTeamId,
        int firstLegHomeScore, int firstLegAwayScore,
        int secondLegHomeTeamId, int secondLegAwayTeamId,
        int secondLegHomeScore, int secondLegAwayScore,
        int? secondLegHomeTiebreak = null, int? secondLegAwayTiebreak = null)
    {
        int? firstLegWinner = firstLegHomeScore > firstLegAwayScore ? firstLegHomeTeamId
            : firstLegAwayScore > firstLegHomeScore ? firstLegAwayTeamId : null;
        int? secondLegWinner = secondLegHomeScore > secondLegAwayScore ? secondLegHomeTeamId
            : secondLegAwayScore > secondLegHomeScore ? secondLegAwayTeamId : null;

        // Una pierna sin ganador no debería ocurrir en vóley (siempre hay un equipo con más sets).
        if (firstLegWinner == null || secondLegWinner == null) return null;

        // Mismo equipo gana las dos piernas → avanza directamente.
        if (firstLegWinner == secondLegWinner) return firstLegWinner;

        // Empate a una pierna por equipo → golden set de la vuelta.
        return ResolveTiebreak(secondLegHomeTeamId, secondLegAwayTeamId, secondLegHomeTiebreak, secondLegAwayTiebreak);
    }

    private static int? ResolveTiebreak(int homeTeamId, int awayTeamId, int? homeTiebreak, int? awayTiebreak)
    {
        if (homeTiebreak.HasValue && awayTiebreak.HasValue && homeTiebreak.Value != awayTiebreak.Value)
            return homeTiebreak.Value > awayTiebreak.Value ? homeTeamId : awayTeamId;

        return null;
    }
}
