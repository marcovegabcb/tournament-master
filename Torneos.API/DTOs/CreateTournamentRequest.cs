using System.ComponentModel.DataAnnotations;
using Torneos.API.Entities;

namespace Torneos.API.DTOs;

public class CreateTournamentRequest : IValidatableObject
{
    [Required]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Name must be between 3 and 100 characters.")]
    public string Name { get; set; } = string.Empty;

    [Range(0, int.MaxValue, ErrorMessage = "MinPrestigeRequired cannot be negative.")]
    public int MinPrestigeRequired { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "MinPlayersPerTeam cannot be negative.")]
    public int MinPlayersPerTeam { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "MaxPlayersPerTeam cannot be negative.")]
    public int MaxPlayersPerTeam { get; set; }

    [EnumDataType(typeof(TournamentFormat))]
    public TournamentFormat Format { get; set; }

    [EnumDataType(typeof(VenueType))]
    public VenueType VenueConfig { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "SportId must be a valid sport.")]
    public int SportId { get; set; }

    public List<int> StadiumIds { get; set; } = new();

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (MaxPlayersPerTeam > 0 && MinPlayersPerTeam > 0 && MaxPlayersPerTeam < MinPlayersPerTeam)
            yield return new ValidationResult(
                "MaxPlayersPerTeam must be greater than or equal to MinPlayersPerTeam.",
                [nameof(MaxPlayersPerTeam)]);
    }
}
