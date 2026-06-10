using Torneos.API.Entities;

namespace Torneos.API.Services.FixtureGenerators;

public interface IFixtureGenerator
{
    TournamentFormat Format { get; }
    List<Match> Generate(int tournamentId, List<Team> teams, VenueType venueType, List<int> stadiumIds);
}
