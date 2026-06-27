namespace Torneos.API.Services;

/// <summary>
/// Reglas que dependen del deporte para resolver eliminatorias.
///
/// - Fútbol: el empate (de un partido único o del global ida/vuelta) se resuelve con PENALTIS,
///   que se introducen en un marcador de desempate aparte.
/// - Baloncesto (y cualquier otro no contemplado): el empate se resuelve con PRÓRROGA, que ya
///   queda reflejada en el marcador; por tanto un cruce no puede quedar empatado en el marcador.
/// - Vóley: el cruce a doble partido se decide por PARTIDOS ganados; si cada equipo gana una pierna,
///   se juega un GOLDEN SET (a 15) en la vuelta para decidir quién avanza.
/// - Tenis: el marcador son sets, nunca empata, y se juega siempre a partido único en sede neutral.
/// </summary>
public static class SportRules
{
    /// <summary>El empate del cruce se decide con penaltis (marcador de desempate aparte).</summary>
    public static bool UsesPenaltyShootout(string sportName) =>
        Normalize(sportName) == "football";

    /// <summary>
    /// El cruce a doble partido se decide por partidos ganados (sets de cada pierna). Si cada equipo
    /// gana una pierna, el desempate es un golden set (HomeTiebreak/AwayTiebreak de la vuelta).
    /// </summary>
    public static bool UsesGoldenSet(string sportName) =>
        Normalize(sportName) == "volleyball";

    /// <summary>El marcador son sets ganados: nunca empata.</summary>
    public static bool IsSetBased(string sportName)
    {
        var n = Normalize(sportName);
        return n == "tennis" || n == "volleyball";
    }

    /// <summary>
    /// El deporte se juega siempre en sede neutral y los equipos no tienen sede propia (tenis).
    /// </summary>
    public static bool IsNeutralVenueOnly(string sportName) =>
        Normalize(sportName) == "tennis";

    private static string Normalize(string sportName) => (sportName ?? "").Trim().ToLowerInvariant();
}
