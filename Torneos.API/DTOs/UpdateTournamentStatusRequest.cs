using System.ComponentModel.DataAnnotations;
using Torneos.API.Entities;

namespace Torneos.API.DTOs;

public class UpdateTournamentStatusRequest
{
    [Required]
    [EnumDataType(typeof(TournamentStatus))]
    public TournamentStatus Status { get; set; }
}
