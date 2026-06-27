using System.Collections.Generic;
using Torneos.API.Entities;
using Torneos.API.Services;
using Torneos.API.Services.FixtureGenerators;

namespace Torneos.Tests.Fixtures;

public class FixtureServiceTests
{
    private static FixtureService BuildService() =>
        new FixtureService(
            new LeagueFixtureGenerator(),
            new KnockoutFixtureGenerator(),
            new GroupsFixtureGenerator());

    private static List<Team> BuildTeams(int n)
    {
        var teams = new List<Team>();
        for (int i = 1; i <= n; i++)
        {
            teams.Add(new Team
            {
                Id = i,
                Name = $"T{i}",
                StadiumId = 100 + i,
                PrestigePoints = i * 10
            });
        }
        return teams;
    }

    [Fact]
    public void Generate_FormatoLeague_DelegaYDevuelvePartidos()
    {
        var service = BuildService();
        var teams = BuildTeams(4);

        var matches = service.Generate(1, teams, TournamentFormat.League, VenueType.SingleRound, new());

        Assert.NotEmpty(matches);
    }

    [Fact]
    public void Generate_FormatoKnockout_DelegaYDevuelvePartidos()
    {
        var service = BuildService();
        var teams = BuildTeams(4);

        var matches = service.Generate(1, teams, TournamentFormat.Knockout, VenueType.SingleRound, new());

        Assert.NotEmpty(matches);
    }

    [Fact]
    public void Generate_FormatoGroupsAndPlayoffs_DevuelveListaVacia()
    {
        // El GroupsFixtureGenerator es un stub que siempre devuelve []. Este test documenta
        // de forma intencional que el formato "Grupos + Playoffs" NO esta implementado todavia:
        // es un gap conocido del sistema, no un fallo del test.
        var service = BuildService();
        var teams = BuildTeams(4);

        var matches = service.Generate(1, teams, TournamentFormat.GroupsAndPlayoffs, VenueType.SingleRound, new());

        Assert.Empty(matches);
    }
}
