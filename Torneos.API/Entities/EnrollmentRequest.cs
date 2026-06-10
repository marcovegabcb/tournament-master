namespace Torneos.API.Entities;

public class EnrollmentRequest
{
    public int Id { get; set; }

    // Existing team request
    public int? TeamId { get; set; }
    public Team? Team { get; set; }

    // New team request (used when TeamId is null)
    public string? NewTeamName { get; set; }
    public string? NewTeamCaptainName { get; set; }
    public string? NewTeamLogoUrl { get; set; }
    public int? NewTeamStadiumId { get; set; }
    public string? NewTeamPlayersJson { get; set; }

    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;
    public string RequesterEmail { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
