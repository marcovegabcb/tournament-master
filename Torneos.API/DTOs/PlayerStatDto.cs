namespace Torneos.API.DTOs;

public class PlayerStatDto
{
    public int PlayerId { get; set; }
    public Dictionary<string, int> Stats { get; set; } = new();
}
