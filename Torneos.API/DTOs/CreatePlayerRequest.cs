using System.ComponentModel.DataAnnotations;

namespace Torneos.API.DTOs;

public class CreatePlayerRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "FirstName must be between 1 and 50 characters.")]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "LastName must be between 1 and 50 characters.")]
    public string LastName { get; set; } = string.Empty;

    [Range(1, 99, ErrorMessage = "JerseyNumber must be between 1 and 99.")]
    public int JerseyNumber { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "TeamId must be a valid team.")]
    public int TeamId { get; set; }
}
