using System.ComponentModel.DataAnnotations;

namespace Torneos.API.DTOs;

public class UpdateMatchResultRequest
{
    [Range(0, int.MaxValue, ErrorMessage = "HomeScore cannot be negative.")]
    public int HomeScore { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "AwayScore cannot be negative.")]
    public int AwayScore { get; set; }

    // Puntos (vóley) o juegos (tenis) totales sumados de todos los sets. Desempate de liga.
    [Range(0, int.MaxValue, ErrorMessage = "HomePoints cannot be negative.")]
    public int HomePoints { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "AwayPoints cannot be negative.")]
    public int AwayPoints { get; set; }

    // Desempate opcional (penaltis). Solo se usa si un partido decisivo de eliminatoria acaba empatado.
    [Range(0, int.MaxValue, ErrorMessage = "HomeTiebreak cannot be negative.")]
    public int? HomeTiebreak { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "AwayTiebreak cannot be negative.")]
    public int? AwayTiebreak { get; set; }

    [Required]
    public List<PlayerStatDto> PlayerStats { get; set; } = new();
}
