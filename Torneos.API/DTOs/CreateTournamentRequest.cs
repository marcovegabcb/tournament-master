using Torneos.API.Entities;

namespace Torneos.API.DTOs;

public class CreateTournamentRequest
{
    public string Name { get; set; } = string.Empty;
    public int MinPrestigeRequired { get; set; }
    public int MinPlayersPerTeam { get; set; }
    public TournamentFormat Format { get; set; }
    public VenueType VenueConfig { get; set; }
    public int SportId { get; set; }
    public List<int> StadiumIds { get; set; } = new();
}
