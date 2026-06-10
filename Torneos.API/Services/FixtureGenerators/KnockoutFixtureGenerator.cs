using Torneos.API.Entities;

namespace Torneos.API.Services.FixtureGenerators;

public class KnockoutFixtureGenerator : IFixtureGenerator
{
    public TournamentFormat Format => TournamentFormat.Knockout;

    public List<Match> Generate(int tournamentId, List<Team> teams, VenueType venueType, List<int> stadiumIds)
    {
        if (teams == null || teams.Count < 2)
            return [];

        var teamStadiums = teams.ToDictionary(t => t.Id, t => t.StadiumId);

        var singleLeg = GenerateSingleLegBracket(tournamentId, teams);

        if (venueType != VenueType.HomeAndAway)
        {
            AssignStadiums(singleLeg, venueType, teamStadiums, stadiumIds);
            return singleLeg;
        }

        var result = new List<Match>(singleLeg.Capacity * 2);

        foreach (var match in singleLeg)
        {
            if (match.HomeTeamId != null && match.AwayTeamId == null)
            {
                result.Add(match);
                continue;
            }

            match.Stage += " - Ida";
            result.Add(match);

            result.Add(new Match
            {
                TournamentId = match.TournamentId,
                HomeTeamId = match.AwayTeamId,
                AwayTeamId = match.HomeTeamId,
                HomeScore = 0,
                AwayScore = 0,
                IsPlayed = false,
                Stage = match.Stage.Replace(" - Ida", " - Vuelta"),
                MatchDate = match.MatchDate.AddDays(7)
            });
        }

        var ordered = result.OrderBy(m => m.MatchDate).ToList();
        AssignStadiums(ordered, venueType, teamStadiums, stadiumIds);
        return ordered;
    }

    private List<Match> GenerateSingleLegBracket(int tournamentId, List<Team> teams)
    {
        int teamCount = teams.Count;
        int totalSlots = NextPowerOfTwo(teamCount);
        int numByes = totalSlots - teamCount;

        var sorted = teams.OrderByDescending(t => t.PrestigePoints).ToList();
        var byeTeams = sorted.Take(numByes).ToList();
        var firstRoundTeams = sorted.Skip(numByes).ToList();

        var rng = Random.Shared;
        byeTeams = [.. byeTeams.OrderBy(_ => rng.Next())];
        firstRoundTeams = [.. firstRoundTeams.OrderBy(_ => rng.Next())];

        var roundNames = GetRoundNames(totalSlots);
        DateTime startDate = DateTime.UtcNow;

        List<Match> matches = [];

        bool hasByes = numByes > 0;
        int numRounds = roundNames.Length;

        for (int roundIdx = 0; roundIdx < numRounds; roundIdx++)
        {
            int matchesInThisRound = totalSlots / (int)Math.Pow(2, roundIdx + 1);
            if (matchesInThisRound < 1) matchesInThisRound = 1;

            if (roundIdx == 0)
            {
                var firstRoundEntries = new (int? homeId, int? awayId)[matchesInThisRound];

                if (hasByes)
                {
                    int regularCount = firstRoundTeams.Count / 2;
                    int byeCount = byeTeams.Count;
                    int ri = 0, bi = 0;

                    for (int i = 0; i < matchesInThisRound; i++)
                    {
                        bool placeRegular;
                        if (ri >= regularCount) placeRegular = false;
                        else if (bi >= byeCount) placeRegular = true;
                        else placeRegular = (float)ri / regularCount <= (float)bi / byeCount;

                        if (placeRegular)
                        {
                            firstRoundEntries[i] = (firstRoundTeams[ri * 2].Id, firstRoundTeams[ri * 2 + 1].Id);
                            ri++;
                        }
                        else
                        {
                            firstRoundEntries[i] = (byeTeams[bi].Id, null);
                            bi++;
                        }
                    }
                }
                else
                {
                    int entryIdx = 0;
                    for (int i = 0; i < firstRoundTeams.Count; i += 2)
                    {
                        firstRoundEntries[entryIdx++] = (firstRoundTeams[i].Id, firstRoundTeams[i + 1].Id);
                    }
                }

                foreach (var (homeId, awayId) in firstRoundEntries)
                {
                    matches.Add(new Match
                    {
                        TournamentId = tournamentId,
                        HomeTeamId = homeId,
                        AwayTeamId = awayId,
                        HomeScore = 0,
                        AwayScore = 0,
                        IsPlayed = false,
                        Stage = roundNames[0],
                        MatchDate = startDate
                    });
                }
            }
            else
            {
                for (int m = 0; m < matchesInThisRound; m++)
                {
                    matches.Add(new Match
                    {
                        TournamentId = tournamentId,
                        HomeTeamId = null,
                        AwayTeamId = null,
                        HomeScore = 0,
                        AwayScore = 0,
                        IsPlayed = false,
                        Stage = roundNames[roundIdx],
                        MatchDate = startDate.AddDays(roundIdx * 7)
                    });
                }
            }
        }

        return matches;
    }

    private static void AssignStadiums(List<Match> matches, VenueType venueType, Dictionary<int, int?> teamStadiums, List<int> stadiumIds)
    {
        if (venueType == VenueType.NeutralVenue)
        {
            for (int i = 0; i < matches.Count; i++)
            {
                if (stadiumIds.Count > 0)
                    matches[i].StadiumId = stadiumIds[i % stadiumIds.Count];
            }
            return;
        }

        foreach (var match in matches)
        {
            if (match.HomeTeamId.HasValue)
                match.StadiumId = teamStadiums.GetValueOrDefault(match.HomeTeamId.Value);
        }
    }

    private static int NextPowerOfTwo(int n)
    {
        int power = 1;
        while (power < n) power <<= 1;
        return power;
    }

    private static string[] GetRoundNames(int totalSlots)
    {
        var names = new List<string>();
        int n = totalSlots;
        while (n >= 2)
        {
            names.Add(GetRoundName(n));
            n /= 2;
        }
        return [.. names];
    }

    private static string GetRoundName(int slotsInRound)
    {
        return slotsInRound switch
        {
            2 => "Final",
            4 => "Semifinales",
            8 => "Cuartos de final",
            16 => "Octavos de final",
            32 => "Ronda de 32",
            64 => "Ronda de 64",
            _ => $"Ronda de {slotsInRound}"
        };
    }
}
