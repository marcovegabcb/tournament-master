using Torneos.API.Entities;

namespace Torneos.API.DTOs;

public class UpdateTournamentStatusRequest
{
    public TournamentStatus Status { get; set; }
}
