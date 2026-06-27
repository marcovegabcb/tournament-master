namespace Torneos.API.Entities;

public class Match
{
    public int Id { get; set; }
    public DateTime MatchDate { get; set; }
    
    public int? HomeTeamId { get; set; }
    public int? AwayTeamId { get; set; }
    
    public int HomeScore { get; set; }
    public int AwayScore { get; set; }
    public bool IsPlayed { get; set; }

    // Puntos (vóley) o juegos (tenis) totales sumados de todos los sets del partido. Sirven como
    // desempate de liga en deportes de sets, después de la diferencia de sets. 0 en el resto.
    public int HomePoints { get; set; }
    public int AwayPoints { get; set; }

    // Desempate de eliminatoria (penaltis en fútbol). Nulos salvo que el partido decisivo acabe empatado.
    public int? HomeTiebreak { get; set; }
    public int? AwayTiebreak { get; set; }

    // Equipo que avanza en este cruce de eliminatoria (persistido en el partido decisivo).
    public int? WinnerTeamId { get; set; }

    // 🔥 NUEVO: Para saber si el partido es de "GroupStage", "Quarterfinals", "Final"...
    public string Stage { get; set; } = "RegularSeason"; 

    public Team HomeTeam { get; set; } = null!;
    public Team AwayTeam { get; set; } = null!;

    public int? StadiumId { get; set; }
    public Stadium? Stadium { get; set; }

    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;
}