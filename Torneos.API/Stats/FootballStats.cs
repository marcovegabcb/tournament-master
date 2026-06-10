using Torneos.API.Entities;

namespace Torneos.API.Stats;

public class FootballStats
{
    public int Id { get; set; }
    
    public int PlayerId { get; set; }
    public Player Player { get; set; } = null!;

    public int MatchId { get; set; } // Enlazado al partido específico
    public Match Match { get; set; } = null!;

    public string Position { get; set; } = "Forward";
    public int Goals { get; set; }
    public int Assists { get; set; }
    public int YellowCards { get; set; }
}