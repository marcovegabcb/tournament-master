using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Torneos.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchPoints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AwayPoints",
                table: "Matches",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "HomePoints",
                table: "Matches",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AwayPoints",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "HomePoints",
                table: "Matches");
        }
    }
}
