using Torneos.API.Entities;

namespace Torneos.API.Stats;

public class BasketballStats
{
    public int Id { get; set; }

    public int PlayerId { get; set; }
    public Player Player { get; set; } = null!;

    public int MatchId { get; set; }
    public Match Match { get; set; } = null!;

    public int Points { get; set; }
    public int Rebounds { get; set; }
    public int Assists { get; set; }
}
