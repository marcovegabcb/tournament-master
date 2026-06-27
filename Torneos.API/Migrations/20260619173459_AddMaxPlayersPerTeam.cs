using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Torneos.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMaxPlayersPerTeam : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxPlayersPerTeam",
                table: "Tournaments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Backfill existing tournaments with sport-appropriate defaults
            // Football → 22, Basketball → 15, Volleyball → 11
            // Tennis: max players among enrolled teams (1 = singles, 2 = doubles)
            migrationBuilder.Sql(@"
                UPDATE ""Tournaments"" SET ""MaxPlayersPerTeam"" = 22
                WHERE ""SportId"" = 1 AND ""MaxPlayersPerTeam"" = 0;

                UPDATE ""Tournaments"" SET ""MaxPlayersPerTeam"" = 15
                WHERE ""SportId"" = 2 AND ""MaxPlayersPerTeam"" = 0;

                UPDATE ""Tournaments"" SET ""MaxPlayersPerTeam"" = 11
                WHERE ""SportId"" = 4 AND ""MaxPlayersPerTeam"" = 0;

                UPDATE ""Tournaments"" SET ""MaxPlayersPerTeam"" = sub.maxp
                FROM (
                    SELECT tt.""TournamentId"", COALESCE(MAX(pcount), 0) AS maxp
                    FROM ""TeamTournaments"" tt
                    JOIN ""Teams"" t ON t.""Id"" = tt.""TeamId""
                    LEFT JOIN (
                        SELECT ""TeamId"", COUNT(*) AS pcount
                        FROM ""Players""
                        GROUP BY ""TeamId""
                    ) p ON p.""TeamId"" = t.""Id""
                    GROUP BY tt.""TournamentId""
                ) sub
                WHERE ""Tournaments"".""Id"" = sub.""TournamentId""
                  AND ""Tournaments"".""SportId"" = 3
                  AND ""Tournaments"".""MaxPlayersPerTeam"" = 0;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxPlayersPerTeam",
                table: "Tournaments");
        }
    }
}
