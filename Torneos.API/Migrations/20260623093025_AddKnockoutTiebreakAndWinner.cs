using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Torneos.API.Migrations
{
    /// <inheritdoc />
    public partial class AddKnockoutTiebreakAndWinner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AwayTiebreak",
                table: "Matches",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HomeTiebreak",
                table: "Matches",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WinnerTeamId",
                table: "Matches",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AwayTiebreak",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "HomeTiebreak",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "WinnerTeamId",
                table: "Matches");
        }
    }
}
