namespace Torneos.API.DTOs;

public class PlayerStatsSummary
{
    public string Sport { get; set; } = string.Empty;
    public int MatchesPlayed { get; set; }
    public Dictionary<string, int> Stats { get; set; } = new();
}
