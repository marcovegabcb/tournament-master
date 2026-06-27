using System.Collections.Generic;
using System.Linq;
using Torneos.API.Entities;
using Torneos.API.Services.FixtureGenerators;

namespace Torneos.Tests.Fixtures;

public class KnockoutFixtureGeneratorTests
{
    // Crea N equipos con Id 1..N y prestigio creciente: el equipo i tiene PrestigePoints = i*10,
    // de modo que el de mayor Id es el de mayor prestigio (util para los asserts de byes).
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
    public void Generate_ConCeroEquipos_DevuelveListaVacia()
    {
        var generator = new KnockoutFixtureGenerator();

        var matches = generator.Generate(1, new List<Team>(), VenueType.SingleRound, new());

        Assert.Empty(matches);
    }

    [Fact]
    public void Generate_ConUnEquipo_DevuelveListaVacia()
    {
        var generator = new KnockoutFixtureGenerator();

        var matches = generator.Generate(1, BuildTeams(1), VenueType.SingleRound, new());

        Assert.Empty(matches);
    }

    [Fact]
    public void Generate_CuatroEquipos_SingleRound_DosSemifinalesYUnaFinal()
    {
        var generator = new KnockoutFixtureGenerator();
        var teams = BuildTeams(4);

        var matches = generator.Generate(1, teams, VenueType.SingleRound, new());

        // totalSlots = 4 -> totalSlots - 1 = 3 partidos.
        Assert.Equal(3, matches.Count);

        Assert.Equal(2, matches.Count(m => m.Stage == "Semifinales"));
        Assert.Equal(1, matches.Count(m => m.Stage == "Final"));

        // La final empieza sin equipos asignados.
        var final = Assert.Single(matches, m => m.Stage == "Final");
        Assert.Null(final.HomeTeamId);
        Assert.Null(final.AwayTeamId);
    }

    [Fact]
    public void Generate_OchoEquipos_CuartosSemifinalesYFinal()
    {
        var generator = new KnockoutFixtureGenerator();
        var teams = BuildTeams(8);

        var matches = generator.Generate(1, teams, VenueType.SingleRound, new());

        // totalSlots = 8 -> 7 partidos.
        Assert.Equal(7, matches.Count);

        Assert.Equal(4, matches.Count(m => m.Stage == "Cuartos de final"));
        Assert.Equal(2, matches.Count(m => m.Stage == "Semifinales"));
        Assert.Equal(1, matches.Count(m => m.Stage == "Final"));
    }

    [Fact]
    public void Generate_SeisEquipos_DosByesParaLosDeMayorPrestigio()
    {
        var generator = new KnockoutFixtureGenerator();
        var teams = BuildTeams(6); // nextPow2 = 8, numByes = 2

        var matches = generator.Generate(1, teams, VenueType.SingleRound, new());

        // totalSlots = 8 -> 7 partidos en total.
        Assert.Equal(7, matches.Count);

        // Debe existir una primera ronda de "Cuartos de final".
        var cuartos = matches.Where(m => m.Stage == "Cuartos de final").ToList();
        Assert.Equal(4, cuartos.Count);

        // Los 2 equipos de mayor prestigio son los Ids 5 y 6.
        var byeTeamIds = new[] { 5, 6 };

        // Un bye en cuartos es un partido con HomeTeamId asignado y AwayTeamId null.
        var byeMatches = cuartos.Where(m => m.HomeTeamId != null && m.AwayTeamId == null).ToList();
        Assert.Equal(2, byeMatches.Count);

        // Los equipos que ocupan los byes deben ser exactamente los de mayor prestigio.
        var byeOccupants = byeMatches.Select(m => m.HomeTeamId!.Value).ToHashSet();
        Assert.Equal(byeTeamIds.ToHashSet(), byeOccupants);

        // Tras propagar, al menos una semifinal recibe a un equipo (por el bye).
        var semis = matches.Where(m => m.Stage == "Semifinales").ToList();
        Assert.Equal(2, semis.Count);
        Assert.Contains(semis, m => m.HomeTeamId != null || m.AwayTeamId != null);

        // Los equipos propagados a semifinales deben ser los del bye.
        var propagated = semis
            .SelectMany(m => new[] { m.HomeTeamId, m.AwayTeamId })
            .Where(id => id != null)
            .Select(id => id!.Value)
            .ToHashSet();
        Assert.Subset(byeTeamIds.ToHashSet(), propagated);
    }

    [Fact]
    public void Generate_TresEquipos_UnByeParaElDeMayorPrestigio()
    {
        var generator = new KnockoutFixtureGenerator();
        var teams = BuildTeams(3); // nextPow2 = 4, numByes = 1

        var matches = generator.Generate(1, teams, VenueType.SingleRound, new());

        // totalSlots = 4 -> 3 partidos.
        Assert.Equal(3, matches.Count);

        Assert.Equal(2, matches.Count(m => m.Stage == "Semifinales"));
        Assert.Equal(1, matches.Count(m => m.Stage == "Final"));

        // El equipo de mayor prestigio es el Id 3 -> recibe el bye en semifinales.
        var semis = matches.Where(m => m.Stage == "Semifinales").ToList();
        var byeMatch = Assert.Single(semis, m => m.HomeTeamId != null && m.AwayTeamId == null);
        Assert.Equal(3, byeMatch.HomeTeamId);

        // Y debe quedar propagado en la final.
        var final = Assert.Single(matches, m => m.Stage == "Final");
        var finalTeams = new[] { final.HomeTeamId, final.AwayTeamId }
            .Where(id => id != null)
            .Select(id => id!.Value)
            .ToList();
        Assert.Contains(3, finalTeams);
    }

    [Fact]
    public void Generate_HomeAndAway_CuatroEquipos_GeneraIdaYVuelta()
    {
        var generator = new KnockoutFixtureGenerator();
        var teams = BuildTeams(4);

        var matches = generator.Generate(1, teams, VenueType.HomeAndAway, new());

        // Deben existir etapas con "Ida" y con "Vuelta".
        Assert.Contains(matches, m => m.Stage.Contains("Ida"));
        Assert.Contains(matches, m => m.Stage.Contains("Vuelta"));

        // Cada eliminatoria de dos equipos se duplica: hay tantas idas como vueltas.
        int idas = matches.Count(m => m.Stage.Contains(" - Ida"));
        int vueltas = matches.Count(m => m.Stage.Contains(" - Vuelta"));
        Assert.Equal(idas, vueltas);
        Assert.True(idas > 0);
    }
}
