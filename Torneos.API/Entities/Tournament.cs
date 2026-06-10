using Torneos.API.Entities;

namespace Torneos.API.Entities;

// ⚙️ 1. Definimos las opciones de formato para el desplegable del administrador
public enum TournamentFormat
{
    League,             // Liga todos contra todos
    Knockout,           // Eliminatoria directa (Playoffs)
    GroupsAndPlayoffs   // Fase de grupos + Eliminatoria (estilo Champions)
}

// ⚙️ 2. Definimos las opciones de dónde se juegan los partidos
public enum VenueType
{
    HomeAndAway,  // Ida y vuelta en el campo de cada equipo (Fútbol tradicional)
    SingleRound,  // Una sola vuelta en el campo del local
    NeutralVenue  // Todo en sede neutral (Pistas de tenis, polideportivo municipal, etc.)
}

public enum TournamentStatus
{
    RegistrationOpen,
    InProgress,
    Finished
}

public class Tournament
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    
    // 🔄 CAMBIO: Ahora el tipo es un Enum inteligente en vez de un string plano
    public TournamentFormat Format { get; set; } = TournamentFormat.League; 
    
    // 🆕 NUEVO: Configuración de la sede del torneo
    public VenueType VenueConfig { get; set; } = VenueType.HomeAndAway;

    // 🆕 NUEVO: El candado de prestigio mínimo para poder apuntarse
    public int MinPrestigeRequired { get; set; } = 0; // Por defecto 0 (cualquiera entra)

    // 🆕 NUEVO: Mínimo de jugadores por equipo para poder inscribirse
    public int MinPlayersPerTeam { get; set; } = 0; // Por defecto 0 (sin requisito)

    public TournamentStatus Status { get; set; } = TournamentStatus.RegistrationOpen;
    public bool IsFixtureGenerated { get; set; } = false;

    public int SportId { get; set; }
    public Sport? Sport { get; set; }
    
    public List<Match> Matches { get; set; } = new List<Match>();
    
    public List<TeamTournament> TeamTournaments { get; set; } = new List<TeamTournament>();

    // 🆕 NUEVO: Conexión con la tabla intermedia de estadios asignados al torneo (Sedes Neutras)
    public List<TournamentStadium> TournamentStadiums { get; set; } = new List<TournamentStadium>();
}