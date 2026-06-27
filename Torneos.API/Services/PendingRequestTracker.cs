using System.Collections.Concurrent;

namespace Torneos.API.Services;

public class PendingRequestTracker
{
    private readonly ConcurrentDictionary<string, byte> _pending = new();

    public bool TryTrack(int? teamId, int tournamentId, string? newTeamName)
    {
        var key = BuildKey(teamId, tournamentId, newTeamName);
        return _pending.TryAdd(key, 0);
    }

    public void Remove(int? teamId, int tournamentId, string? newTeamName)
    {
        var key = BuildKey(teamId, tournamentId, newTeamName);
        _pending.TryRemove(key, out _);
    }

    private static string BuildKey(int? teamId, int tournamentId, string? newTeamName)
    {
        if (teamId.HasValue)
            return $"team:{teamId.Value}:tor:{tournamentId}";
        return $"new:{newTeamName ?? ""}:tor:{tournamentId}";
    }
}
