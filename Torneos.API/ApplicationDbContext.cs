using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Torneos.API.Entities;
using Torneos.API.Stats;

namespace Torneos.API;

public class ApplicationDbContext : IdentityDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Sport> Sports { get; set; }
    public DbSet<Team> Teams { get; set; }
    public DbSet<Player> Players { get; set; }
    public DbSet<Tournament> Tournaments { get; set; }
    public DbSet<Match> Matches { get; set; }
    public DbSet<TeamTournament> TeamTournaments { get; set; } 
    public DbSet<BasketballStats> BasketballStats { get; set; }
    public DbSet<FootballStats> FootballStats { get; set; }
    public DbSet<TennisStats> TennisStats { get; set; }
    public DbSet<VolleyballStats> VolleyballStats { get; set; }

    public DbSet<Stadium> Stadiums { get; set; }
    public DbSet<TournamentStadium> TournamentStadiums { get; set; }
    public DbSet<EnrollmentRequest> EnrollmentRequests { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<TeamTournament>()
            .HasKey(tt => new { tt.TeamId, tt.TournamentId });

        modelBuilder.Entity<Stadium>()
            .Property(s => s.SportId)
            .HasDefaultValue(1);

        modelBuilder.Entity<FootballStats>().ToTable("FootballStats");
        modelBuilder.Entity<BasketballStats>().ToTable("BasketballStats");

        modelBuilder.Entity<TeamTournament>()
            .HasOne(tt => tt.Team)
            .WithMany(t => t.TeamTournaments)
            .HasForeignKey(tt => tt.TeamId);

        modelBuilder.Entity<TeamTournament>()
            .HasOne(tt => tt.Tournament)
            .WithMany(t => t.TeamTournaments)
            .HasForeignKey(tt => tt.TournamentId);


        modelBuilder.Entity<TournamentStadium>()
            .HasKey(ts => new { ts.TournamentId, ts.StadiumId });

        modelBuilder.Entity<TournamentStadium>()
            .HasOne(ts => ts.Tournament)
            .WithMany(t => t.TournamentStadiums)
            .HasForeignKey(ts => ts.TournamentId);

        modelBuilder.Entity<TournamentStadium>()
            .HasOne(ts => ts.Stadium)
            .WithMany(s => s.TournamentStadiums)
            .HasForeignKey(ts => ts.StadiumId);

        modelBuilder.Entity<Match>()
            .HasOne(m => m.HomeTeam)
            .WithMany()
            .HasForeignKey(m => m.HomeTeamId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<Match>()
            .HasOne(m => m.AwayTeam)
            .WithMany()
            .HasForeignKey(m => m.AwayTeamId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<Match>()
            .HasOne(m => m.Stadium)
            .WithMany()
            .HasForeignKey(m => m.StadiumId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Player>()
            .HasOne(p => p.Team)
            .WithMany(t => t.Players)
            .HasForeignKey(p => p.TeamId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Player>()
            .HasIndex(p => new { p.TeamId, p.JerseyNumber })
            .IsUnique();

        modelBuilder.Entity<Team>()
            .HasOne(t => t.Captain)
            .WithMany()
            .HasForeignKey(t => t.CaptainId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<EnrollmentRequest>()
            .HasOne(er => er.Team)
            .WithMany()
            .HasForeignKey(er => er.TeamId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EnrollmentRequest>()
            .HasIndex(er => new { er.TeamId, er.TournamentId })
            .HasFilter("\"Status\" = 'Pending'")
            .IsUnique();

        modelBuilder.Entity<EnrollmentRequest>()
            .HasOne(er => er.Tournament)
            .WithMany()
            .HasForeignKey(er => er.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
