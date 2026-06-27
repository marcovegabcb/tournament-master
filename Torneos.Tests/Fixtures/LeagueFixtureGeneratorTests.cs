using System.Collections.Generic;
using System.Linq;
using Torneos.API.Entities;
using Torneos.API.Services.FixtureGenerators;

namespace Torneos.Tests.Fixtures;

public class LeagueFixtureGeneratorTests
{
    // Crea N equipos con Id 1..N, Name "T{i}", StadiumId = 100+i y prestigios variados.
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
                PrestigePoints = 50 + (i * 7) % 33
            });
        }
        return teams;
    }

    // Convierte un partido en un par no ordenado {min, max} de los Ids de los equipos.
    private static (int, int) UnorderedPair(Match m)
    {
        int a = m.HomeTeamId!.Value;
        int b = m.AwayTeamId!.Value;
        return a <= b ? (a, b) : (b, a);
    }

    [Fact]
    public void Generate_ConCeroEquipos_DevuelveListaVacia()
    {
        var generator = new LeagueFixtureGenerator();

        var matches = generator.Generate(1, new List<Team>(), VenueType.SingleRound, new());

        Assert.Empty(matches);
    }

    [Fact]
    public void Generate_ConUnEquipo_DevuelveListaVacia()
    {
        var generator = new LeagueFixtureGenerator();

        var matches = generator.Generate(1, BuildTeams(1), VenueType.SingleRound, new());

        Assert.Empty(matches);
    }

    [Theory]
    [InlineData(4, 6)]   // N*(N-1)/2
    [InlineData(6, 15)]
    public void Generate_SingleRoundPar_CadaParJuegaExactamenteUnaVez(int numTeams, int expectedMatches)
    {
        var generator = new LeagueFixtureGenerator();
        var teams = BuildTeams(numTeams);

        var matches = generator.Generate(1, teams, VenueType.SingleRound, new());

        // Numero total de partidos correcto.
        Assert.Equal(expectedMatches, matches.Count);

        // Ningun equipo "DESCANSO" (Id = -1) debe aparecer.
        Assert.DoesNotContain(matches, m => m.HomeTeamId == -1 || m.AwayTeamId == -1);

        // Conjunto de pares no ordenados: deben ser exactamente todos los pares unicos, sin repeticion.
        var pairs = matches.Select(UnorderedPair).ToList();
        Assert.Equal(expectedMatches, pairs.Distinct().Count()); // sin repeticiones

        var expectedPairs = new HashSet<(int, int)>();
        for (int i = 1; i <= numTeams; i++)
            for (int j = i + 1; j <= numTeams; j++)
                expectedPairs.Add((i, j));

        Assert.Equal(expectedPairs, pairs.ToHashSet());
    }

    [Fact]
    public void Generate_SingleRoundImpar_CincoEquipos_DiezPartidosSinDescanso()
    {
        var generator = new LeagueFixtureGenerator();
        var teams = BuildTeams(5);

        var matches = generator.Generate(1, teams, VenueType.SingleRound, new());

        // 5*(5-1)/2 = 10
        Assert.Equal(10, matches.Count);

        // No debe filtrarse el equipo DESCANSO (Id = -1).
        Assert.DoesNotContain(matches, m => m.HomeTeamId == -1 || m.AwayTeamId == -1);

        // Todos los pares unicos presentes, sin repeticion.
        var pairs = matches.Select(UnorderedPair).ToList();
        var expectedPairs = new HashSet<(int, int)>();
        for (int i = 1; i <= 5; i++)
            for (int j = i + 1; j <= 5; j++)
                expectedPairs.Add((i, j));

        Assert.Equal(expectedPairs, pairs.ToHashSet());
        Assert.Equal(10, pairs.Distinct().Count());
    }

    [Fact]
    public void Generate_SingleRoundImpar_CadaEquipoApareceEnNMenosUnoPartidos()
    {
        var generator = new LeagueFixtureGenerator();
        var teams = BuildTeams(5);

        var matches = generator.Generate(1, teams, VenueType.SingleRound, new());

        for (int teamId = 1; teamId <= 5; teamId++)
        {
            int appearances = matches.Count(m => m.HomeTeamId == teamId || m.AwayTeamId == teamId);
            Assert.Equal(4, appearances); // N - 1 = 4
        }
    }

    [Fact]
    public void Generate_HomeAndAway_CuatroEquipos_CadaParOrdenadoUnaVez()
    {
        var generator = new LeagueFixtureGenerator();
        var teams = BuildTeams(4);

        var matches = generator.Generate(1, teams, VenueType.HomeAndAway, new());

        // N*(N-1) = 12
        Assert.Equal(12, matches.Count);

        // Cada par ordenado (home, away) debe aparecer exactamente una vez.
        var orderedPairs = matches
            .Select(m => (m.HomeTeamId!.Value, m.AwayTeamId!.Value))
            .ToList();

        Assert.Equal(12, orderedPairs.Distinct().Count());

        var expected = new HashSet<(int, int)>();
        for (int i = 1; i <= 4; i++)
            for (int j = 1; j <= 4; j++)
                if (i != j) expected.Add((i, j));

        Assert.Equal(expected, orderedPairs.ToHashSet());
    }

    [Fact]
    public void Generate_SingleRound_StadiumEsElDelEquipoLocal()
    {
        var generator = new LeagueFixtureGenerator();
        var teams = BuildTeams(4); // StadiumId = 100 + Id, distintos entre si.

        var matches = generator.Generate(1, teams, VenueType.SingleRound, new());

        Assert.All(matches, m =>
        {
            int expectedStadium = 100 + m.HomeTeamId!.Value;
            Assert.Equal(expectedStadium, m.StadiumId);
        });
    }

    [Fact]
    public void Generate_HomeAndAway_StadiumEsElDelEquipoLocalDeCadaPartido()
    {
        var generator = new LeagueFixtureGenerator();
        var teams = BuildTeams(4);

        var matches = generator.Generate(1, teams, VenueType.HomeAndAway, new());

        Assert.All(matches, m =>
        {
            int expectedStadium = 100 + m.HomeTeamId!.Value;
            Assert.Equal(expectedStadium, m.StadiumId);
        });
    }

    [Fact]
    public void Generate_NeutralVenue_TodosLosStadiumsEstanEnLaListaProporcionada()
    {
        var generator = new LeagueFixtureGenerator();
        var teams = BuildTeams(4);
        var stadiumIds = new List<int> { 10, 20 };

        var matches = generator.Generate(1, teams, VenueType.NeutralVenue, stadiumIds);

        Assert.NotEmpty(matches);
        Assert.All(matches, m =>
        {
            Assert.True(m.StadiumId.HasValue);
            Assert.Contains(m.StadiumId!.Value, stadiumIds);
        });
    }
}
