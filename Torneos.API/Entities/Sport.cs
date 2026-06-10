namespace Torneos.API.Entities;

public class Sport
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ColorHex { get; set; } = "#FFFFFF"; // Para el color en la interfaz (Ej: #00FF00)
    public string ImageUrl { get; set; } = string.Empty; // Para la foto del deporte
    
    [System.Text.Json.Serialization.JsonIgnore]
    public List<Tournament> Tournaments { get; set; } = new List<Tournament>();
}