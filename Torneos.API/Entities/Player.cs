namespace Torneos.API.Entities;

public class Player
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public int JerseyNumber { get; set; } // Dorsal del jugador
    
    // Estadísticas generales (universales)
    public int MatchesPlayed { get; set; } // Partidos jugados

    public int? TeamId { get; set; }
    public Team? Team { get; set; }
}