using Torneos.API.Entities;

namespace Torneos.API.Services.FixtureGenerators;

public class LeagueFixtureGenerator : IFixtureGenerator
{
    public TournamentFormat Format => TournamentFormat.League;

    public List<Match> Generate(int tournamentId, List<Team> teams, VenueType venueType, List<int> stadiumIds)
    {
        if (teams == null || teams.Count < 2)
            return [];

        var workingTeams = new List<Team>(teams);

        if (workingTeams.Count % 2 != 0)
        {
            workingTeams.Add(new Team { Id = -1, Name = "DESCANSO" });
        }

        int numTeams = workingTeams.Count;
        int numRounds = numTeams - 1;
        int matchesPerRound = numTeams / 2;

        DateTime startDate = DateTime.UtcNow;

        var teamStadiums = teams.ToDictionary(t => t.Id, t => t.StadiumId);

        List<Match> firstLeg = [];
        int matchIndex = 0;

        for (int round = 0; round < numRounds; round++)
        {
            for (int matchIdx = 0; matchIdx < matchesPerRound; matchIdx++)
            {
                int homeIdx = (round + matchIdx) % (numTeams - 1);
                int awayIdx = (numTeams - 1 - matchIdx + round) % (numTeams - 1);

                if (matchIdx == 0)
                    awayIdx = numTeams - 1;

                var homeTeam = workingTeams[homeIdx];
                var awayTeam = workingTeams[awayIdx];

                if (homeTeam.Id == -1 || awayTeam.Id == -1) continue;

                var match = new Match
                {
                    TournamentId = tournamentId,
                    HomeTeamId = homeTeam.Id,
                    AwayTeamId = awayTeam.Id,
                    HomeScore = 0,
                    AwayScore = 0,
                    IsPlayed = false,
                    Stage = $"Jornada {round + 1}",
                    MatchDate = startDate.AddDays(round * 7)
                };

                AssignStadium(match, venueType, teamStadiums, stadiumIds, matchIndex);
                firstLeg.Add(match);
                matchIndex++;
            }
        }

        if (venueType != VenueType.HomeAndAway)
            return firstLeg;

        int daysInFirstRound = numRounds * 7;

        List<Match> secondLeg = [];

        for (int i = 0; i < firstLeg.Count; i++)
        {
            var original = firstLeg[i];
            var match = new Match
            {
                TournamentId = tournamentId,
                HomeTeamId = original.AwayTeamId,
                AwayTeamId = original.HomeTeamId,
                HomeScore = 0,
                AwayScore = 0,
                IsPlayed = false,
                Stage = $"Jornada {(i / matchesPerRound) + 1 + numRounds}",
                MatchDate = original.MatchDate.AddDays(daysInFirstRound)
            };

            AssignStadium(match, venueType, teamStadiums, stadiumIds, matchIndex);
            secondLeg.Add(match);
            matchIndex++;
        }

        return [.. firstLeg, .. secondLeg];
    }

    private static void AssignStadium(Match match, VenueType venueType, Dictionary<int, int?> teamStadiums, List<int> stadiumIds, int matchIndex)
    {
        if (venueType == VenueType.NeutralVenue)
        {
            if (stadiumIds.Count > 0)
                match.StadiumId = stadiumIds[matchIndex % stadiumIds.Count];
            return;
        }

        if (match.HomeTeamId.HasValue)
            match.StadiumId = teamStadiums.GetValueOrDefault(match.HomeTeamId.Value);
    }
}
