using Torneos.API.Entities;

namespace Torneos.API.Services.FixtureGenerators;

public class GroupsFixtureGenerator : IFixtureGenerator
{
    public TournamentFormat Format => TournamentFormat.GroupsAndPlayoffs;

    public List<Match> Generate(int tournamentId, List<Team> teams, VenueType venueType, List<int> stadiumIds)
    {
        return [];
    }
}
