using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Torneos.API.Migrations
{
    /// <inheritdoc />
    public partial class AddIsFixtureGenerated : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsFixtureGenerated",
                table: "Tournaments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Marcar torneos existentes que ya tienen partidos
            migrationBuilder.Sql(@"
                UPDATE ""Tournaments""
                SET ""IsFixtureGenerated"" = true
                WHERE ""Id"" IN (
                    SELECT DISTINCT ""TournamentId""
                    FROM ""Matches""
                )
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsFixtureGenerated",
                table: "Tournaments");
        }
    }
}
