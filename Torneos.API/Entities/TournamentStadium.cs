namespace Torneos.API.Entities;

public class TournamentStadium
{
    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;

    public int StadiumId { get; set; }
    public Stadium Stadium { get; set; } = null!;
}