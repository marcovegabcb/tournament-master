using Torneos.API.Entities;

namespace Torneos.API.Stats;

public class VolleyballStats
{
    public int Id { get; set; }

    public int PlayerId { get; set; }
    public Player Player { get; set; } = null!;

    public int MatchId { get; set; }
    public Match Match { get; set; } = null!;

    public int Kills { get; set; }
    public int Blocks { get; set; }
    public int Aces { get; set; }
    public int Digs { get; set; }
    public int Assists { get; set; }
    public int ServiceErrors { get; set; }
}
