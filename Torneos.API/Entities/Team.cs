using Torneos.API.Entities;

namespace Torneos.API.Entities;

public class Team
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string CaptainName { get; set; } = string.Empty;
    public string LogoUrl { get; set; } = string.Empty;
    public string? GroupLabel { get; set; } 

    // 🔥 NUEVO: Sistema de prestigio para bloquear/desbloquear torneos
    // Por defecto, todos los equipos empiezan con 100 puntos al crearse
    public int PrestigePoints { get; set; } = 100; 

    public int SportId { get; set; } = 1;
    public Sport? Sport { get; set; }

    // 🏟️ Relación con el Estadio principal del equipo (Sede Local)
    public int? StadiumId { get; set; } 
    public Stadium? Stadium { get; set; }

    // 👑 Capitán del equipo (debe ser un jugador que pertenezca al equipo)
    public int? CaptainId { get; set; }
    public Player? Captain { get; set; }

    // 👥 Relaciones inversas con jugadores y torneos inscritos
    public List<Player> Players { get; set; } = new List<Player>();
    public List<TeamTournament> TeamTournaments { get; set; } = new List<TeamTournament>();
}