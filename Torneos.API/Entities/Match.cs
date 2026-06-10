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

    // 🔥 NUEVO: Para saber si el partido es de "GroupStage", "Quarterfinals", "Final"...
    public string Stage { get; set; } = "RegularSeason"; 

    public Team HomeTeam { get; set; } = null!;
    public Team AwayTeam { get; set; } = null!;

    public int? StadiumId { get; set; }
    public Stadium? Stadium { get; set; }

    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;
}