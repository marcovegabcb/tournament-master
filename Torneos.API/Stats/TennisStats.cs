using Torneos.API.Entities;

namespace Torneos.API.Stats;

public class TennisStats
{
    public int Id { get; set; }

    public int PlayerId { get; set; }
    public Player Player { get; set; } = null!;

    public int MatchId { get; set; }
    public Match Match { get; set; } = null!;

    public int Aces { get; set; }
    public int DoubleFaults { get; set; }
    public int FirstServePercentage { get; set; }
    public int Winners { get; set; }
    public int UnforcedErrors { get; set; }
    public int BreakPointsConverted { get; set; }
}
