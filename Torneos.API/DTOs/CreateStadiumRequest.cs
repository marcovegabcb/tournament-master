using System.ComponentModel.DataAnnotations;

namespace Torneos.API.DTOs;

public class CreateStadiumRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string City { get; set; } = string.Empty;

    [Range(0, int.MaxValue)]
    public int Capacity { get; set; }

    [Range(1, double.MaxValue)]
    public double Length { get; set; }

    [Range(1, double.MaxValue)]
    public double Width { get; set; }

    [Range(1, int.MaxValue)]
    public int SportId { get; set; }
}
