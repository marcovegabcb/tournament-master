using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Torneos.API.DTOs;
using Torneos.API.Entities;
using Torneos.API.Services;

namespace Torneos.API.Models;

public class EnrollmentRequestModel
{
    private readonly ApplicationDbContext _context;
    private readonly PendingRequestTracker _tracker;

    public EnrollmentRequestModel(ApplicationDbContext context, PendingRequestTracker tracker)
    {
        _context = context;
        _tracker = tracker;
    }

    public async Task<List<EnrollmentRequest>> GetAllAsync()
    {
        return await _context.EnrollmentRequests
            .AsNoTracking()
            .Include(er => er.Team)
            .Include(er => er.Tournament)
            .OrderByDescending(er => er.CreatedAt)
            .ToListAsync();
    }

    public async Task<EnrollmentRequest?> GetByIdAsync(int id)
    {
        return await _context.EnrollmentRequests
            .Include(er => er.Team)
            .Include(er => er.Tournament)
            .FirstOrDefaultAsync(er => er.Id == id);
    }

    public async Task<EnrollmentRequest> CreateWithExistingTeamAsync(int teamId, int tournamentId, string requesterEmail)
    {
        var tournament = await _context.Tournaments.FindAsync(tournamentId);
        if (tournament == null)
            throw new InvalidOperationException("Tournament not found.");

        if (tournament.Status != TournamentStatus.RegistrationOpen)
            throw new InvalidOperationException($"Tournament '{tournament.Name}' is not open for registration.");

        var team = await _context.Teams.FindAsync(teamId);
        if (team == null)
            throw new InvalidOperationException("Team not found.");

        bool alreadyEnrolled = await _context.TeamTournaments
            .AnyAsync(tt => tt.TeamId == teamId && tt.TournamentId == tournamentId);
        if (alreadyEnrolled)
            throw new InvalidOperationException($"Team '{team.Name}' is already enrolled in '{tournament.Name}'.");

        bool alreadyPending = await _context.EnrollmentRequests
            .AnyAsync(er => er.TeamId == teamId && er.TournamentId == tournamentId && er.Status == "Pending");
        if (alreadyPending)
            throw new InvalidOperationException($"There is already a pending request for team '{team.Name}' in '{tournament.Name}'.");

        if (!_tracker.TryTrack(teamId, tournamentId, null))
            throw new InvalidOperationException($"A request for team '{team.Name}' in '{tournament.Name}' is already being processed.");

        try
        {
            var request = new EnrollmentRequest
            {
                TeamId = teamId,
                TournamentId = tournamentId,
                RequesterEmail = requesterEmail,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };
            _context.EnrollmentRequests.Add(request);
            await _context.SaveChangesAsync();
            return request;
        }
        finally
        {
            _tracker.Remove(teamId, tournamentId, null);
        }
    }

    public async Task<EnrollmentRequest> CreateWithNewTeamAsync(
        int tournamentId, string requesterEmail,
        string newTeamName, string newTeamCaptainName, string newTeamLogoUrl,
        int? newTeamStadiumId, string newTeamPlayersJson)
    {
        var tournament = await _context.Tournaments.FindAsync(tournamentId);
        if (tournament == null)
            throw new InvalidOperationException("Tournament not found.");

        if (tournament.Status != TournamentStatus.RegistrationOpen)
            throw new InvalidOperationException($"Tournament '{tournament.Name}' is not open for registration.");

        if (tournament.MinPrestigeRequired > 100)
            throw new InvalidOperationException($"Tournament '{tournament.Name}' requires {tournament.MinPrestigeRequired} prestige points, but new teams start with 100.");

        var players = JsonSerializer.Deserialize<List<NewTeamPlayerDto>>(newTeamPlayersJson) ?? new();
        if (tournament.MinPlayersPerTeam > 0 && players.Count < tournament.MinPlayersPerTeam)
            throw new InvalidOperationException($"You need at least {tournament.MinPlayersPerTeam} players for '{tournament.Name}', but only {players.Count} provided.");

        if (tournament.MaxPlayersPerTeam > 0 && players.Count > tournament.MaxPlayersPerTeam)
            throw new InvalidOperationException($"You can have at most {tournament.MaxPlayersPerTeam} players for '{tournament.Name}', but {players.Count} provided.");

        if (!_tracker.TryTrack(null, tournamentId, newTeamName))
            throw new InvalidOperationException($"A request for team '{newTeamName}' in '{tournament.Name}' is already being processed.");

        try
        {
            var request = new EnrollmentRequest
            {
                TeamId = null,
                TournamentId = tournamentId,
                RequesterEmail = requesterEmail,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                NewTeamName = newTeamName,
                NewTeamCaptainName = newTeamCaptainName,
                NewTeamLogoUrl = newTeamLogoUrl,
                NewTeamStadiumId = newTeamStadiumId,
                NewTeamPlayersJson = newTeamPlayersJson
            };
            _context.EnrollmentRequests.Add(request);
            await _context.SaveChangesAsync();
            return request;
        }
        finally
        {
            _tracker.Remove(null, tournamentId, newTeamName);
        }
    }

    public async Task<(bool Success, string Message)> ApproveAsync(int id)
    {
        var request = await _context.EnrollmentRequests
            .Include(er => er.Team)
            .Include(er => er.Tournament)
            .FirstOrDefaultAsync(er => er.Id == id);

        if (request == null)
            return (false, "Enrollment request not found.");

        if (request.Status != "Pending")
            return (false, $"Request is already {request.Status}.");

        int teamId;

        if (request.TeamId.HasValue)
        {
            // Existing team
            teamId = request.TeamId.Value;

            bool alreadyEnrolled = await _context.TeamTournaments
                .AnyAsync(tt => tt.TeamId == teamId && tt.TournamentId == request.TournamentId);
            if (alreadyEnrolled)
            {
                request.Status = "Approved";
                await _context.SaveChangesAsync();
                return (true, $"Team '{request.Team?.Name}' is already enrolled.");
            }

            var team = await _context.Teams.FindAsync(teamId);
            var tournament = await _context.Tournaments.FindAsync(request.TournamentId);
            if (team != null && tournament != null && team.PrestigePoints < tournament.MinPrestigeRequired)
                return (false, $"Team '{team.Name}' has {team.PrestigePoints} prestige but tournament requires {tournament.MinPrestigeRequired}.");
        }
        else
        {
            // New team — create it
            var newTeam = new Team
            {
                Name = request.NewTeamName ?? "Unnamed Team",
                CaptainName = request.NewTeamCaptainName ?? "",
                LogoUrl = request.NewTeamLogoUrl ?? "",
                PrestigePoints = 100,
                SportId = request.Tournament?.SportId ?? 1,
                StadiumId = request.NewTeamStadiumId
            };
            _context.Teams.Add(newTeam);
            await _context.SaveChangesAsync();

            teamId = newTeam.Id;

            // Create players
            var players = JsonSerializer.Deserialize<List<NewTeamPlayerDto>>(request.NewTeamPlayersJson ?? "[]");
            if (players != null)
            {
                foreach (var p in players)
                {
                    _context.Players.Add(new Player
                    {
                        FirstName = p.FirstName,
                        LastName = p.LastName,
                        JerseyNumber = p.JerseyNumber,
                        TeamId = teamId
                    });
                }
                await _context.SaveChangesAsync();
            }

            // Update the request with the new team ID
            request.TeamId = teamId;
            request.NewTeamName = null;
            request.NewTeamCaptainName = null;
            request.NewTeamLogoUrl = null;
            request.NewTeamStadiumId = null;
            request.NewTeamPlayersJson = null;
        }

        // Create TeamTournament
        _context.TeamTournaments.Add(new TeamTournament
        {
            TeamId = teamId,
            TournamentId = request.TournamentId
        });

        request.Status = "Approved";
        await _context.SaveChangesAsync();

        return (true, $"Enrollment request approved. Team has been enrolled.");
    }

    public async Task<(bool Success, string Message)> RejectAsync(int id)
    {
        var request = await _context.EnrollmentRequests
            .Include(er => er.Team)
            .Include(er => er.Tournament)
            .FirstOrDefaultAsync(er => er.Id == id);

        if (request == null)
            return (false, "Enrollment request not found.");

        if (request.Status != "Pending")
            return (false, $"Request is already {request.Status}.");

        request.Status = "Rejected";
        await _context.SaveChangesAsync();

        var teamName = request.Team?.Name ?? request.NewTeamName ?? "Unknown";
        return (true, $"Enrollment request for '{teamName}' has been rejected.");
    }
}

public class NewTeamPlayerDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public int JerseyNumber { get; set; }
}
