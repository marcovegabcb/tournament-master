using Torneos.API.Entities;
using Torneos.API.Services.FixtureGenerators;

namespace Torneos.API.Services;

public class FixtureService
{
    private readonly LeagueFixtureGenerator _league;
    private readonly KnockoutFixtureGenerator _knockout;
    private readonly GroupsFixtureGenerator _groups;

    public FixtureService(
        LeagueFixtureGenerator league,
        KnockoutFixtureGenerator knockout,
        GroupsFixtureGenerator groups)
    {
        _league = league;
        _knockout = knockout;
        _groups = groups;
    }

    public List<Match> Generate(int tournamentId, List<Team> teams, TournamentFormat format, VenueType venueType, List<int> stadiumIds)
    {
        return format switch
        {
            TournamentFormat.League => _league.Generate(tournamentId, teams, venueType, stadiumIds),
            TournamentFormat.Knockout => _knockout.Generate(tournamentId, teams, venueType, stadiumIds),
            TournamentFormat.GroupsAndPlayoffs => _groups.Generate(tournamentId, teams, venueType, stadiumIds),
            _ => []
        };
    }
}
