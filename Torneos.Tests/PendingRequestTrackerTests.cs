using Torneos.API.Services;

namespace Torneos.Tests;

public class PendingRequestTrackerTests
{
    [Fact]
    public void TryTrack_ReturnsTrue_FirstTime()
    {
        var tracker = new PendingRequestTracker();
        bool result = tracker.TryTrack(teamId: 1, tournamentId: 5, newTeamName: null);
        Assert.True(result);
    }

    [Fact]
    public void TryTrack_ReturnsFalse_ForSameTeamAndTournament()
    {
        var tracker = new PendingRequestTracker();
        tracker.TryTrack(teamId: 1, tournamentId: 5, newTeamName: null);
        bool result = tracker.TryTrack(teamId: 1, tournamentId: 5, newTeamName: null);
        Assert.False(result);
    }

    [Fact]
    public void TryTrack_ReturnsTrue_ForDifferentTournaments()
    {
        var tracker = new PendingRequestTracker();
        tracker.TryTrack(teamId: 1, tournamentId: 5, newTeamName: null);
        bool result = tracker.TryTrack(teamId: 1, tournamentId: 10, newTeamName: null);
        Assert.True(result);
    }

    [Fact]
    public void TryTrack_ReturnsTrue_ForDifferentTeams()
    {
        var tracker = new PendingRequestTracker();
        tracker.TryTrack(teamId: 1, tournamentId: 5, newTeamName: null);
        bool result = tracker.TryTrack(teamId: 2, tournamentId: 5, newTeamName: null);
        Assert.True(result);
    }

    [Fact]
    public void Remove_AllowsTrackingAgain()
    {
        var tracker = new PendingRequestTracker();
        tracker.TryTrack(teamId: 1, tournamentId: 5, newTeamName: null);
        tracker.Remove(teamId: 1, tournamentId: 5, newTeamName: null);
        bool result = tracker.TryTrack(teamId: 1, tournamentId: 5, newTeamName: null);
        Assert.True(result);
    }

    [Fact]
    public void TryTrack_NewTeamName_IsIndependentFromExistingTeam()
    {
        var tracker = new PendingRequestTracker();
        tracker.TryTrack(teamId: 1, tournamentId: 5, newTeamName: null);
        bool result = tracker.TryTrack(teamId: null, tournamentId: 5, newTeamName: "New Team");
        Assert.True(result);
    }

    [Fact]
    public void TryTrack_SameNewTeamName_ReturnsFalse()
    {
        var tracker = new PendingRequestTracker();
        tracker.TryTrack(teamId: null, tournamentId: 5, newTeamName: "New Team");
        bool result = tracker.TryTrack(teamId: null, tournamentId: 5, newTeamName: "New Team");
        Assert.False(result);
    }
}
