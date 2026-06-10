namespace Torneos.API.Entities;

public class Stadium
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public double Length { get; set; } 
    public double Width { get; set; }  

    public int SportId { get; set; }
    public Sport? Sport { get; set; }

    // Relación con los equipos locales
    public List<Team> Teams { get; set; } = new List<Team>();

    // 🔥 ¡ASEGÚRATE DE QUE ESTA LÍNEA ESTÁ ESCRITA ASÍ EXACTAMENTE!
    // Fíjate bien en la S del final: "TournamentStadiums"
    public List<TournamentStadium> TournamentStadiums { get; set; } = new List<TournamentStadium>();
}