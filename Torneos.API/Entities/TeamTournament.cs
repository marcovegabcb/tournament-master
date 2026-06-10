namespace Torneos.API.Entities;

public class TeamTournament
{
    public int TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;
    
    // 🔥 Ventaja del programador: En el futuro aquí puedes meter cosas como:
    // public DateTime RegistrationDate { get; set; } = DateTime.UtcNow;
}