using System.ComponentModel.DataAnnotations;

namespace Torneos.API.DTOs;

public class CreateTeamRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Name must be between 2 and 100 characters.")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "CaptainName must be between 2 and 100 characters.")]
    public string CaptainName { get; set; } = string.Empty;

    [StringLength(500)]
    public string LogoUrl { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "SportId must be a valid sport.")]
    public int SportId { get; set; } = 1;

    public int? StadiumId { get; set; }
    public int? CaptainId { get; set; }
}
