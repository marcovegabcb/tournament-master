using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Torneos.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateStatsTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Assists",
                table: "VolleyballStats");

            migrationBuilder.DropColumn(
                name: "Digs",
                table: "VolleyballStats");

            migrationBuilder.DropColumn(
                name: "ServiceErrors",
                table: "VolleyballStats");

            migrationBuilder.DropColumn(
                name: "BreakPointsConverted",
                table: "TennisStats");

            migrationBuilder.DropColumn(
                name: "FirstServePercentage",
                table: "TennisStats");

            migrationBuilder.DropColumn(
                name: "UnforcedErrors",
                table: "TennisStats");

            migrationBuilder.DropColumn(
                name: "Position",
                table: "FootballStats");

            migrationBuilder.RenameColumn(
                name: "TriplesMade",
                table: "BasketballStats",
                newName: "Assists");

            migrationBuilder.AddColumn<int>(
                name: "RedCards",
                table: "FootballStats",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RedCards",
                table: "FootballStats");

            migrationBuilder.RenameColumn(
                name: "Assists",
                table: "BasketballStats",
                newName: "TriplesMade");

            migrationBuilder.AddColumn<int>(
                name: "Assists",
                table: "VolleyballStats",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Digs",
                table: "VolleyballStats",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ServiceErrors",
                table: "VolleyballStats",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "BreakPointsConverted",
                table: "TennisStats",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FirstServePercentage",
                table: "TennisStats",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "UnforcedErrors",
                table: "TennisStats",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Position",
                table: "FootballStats",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
