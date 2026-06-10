using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Torneos.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSportIdToStadiums : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SportId",
                table: "Stadiums",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "IX_Stadiums_SportId",
                table: "Stadiums",
                column: "SportId");

            migrationBuilder.AddForeignKey(
                name: "FK_Stadiums_Sports_SportId",
                table: "Stadiums",
                column: "SportId",
                principalTable: "Sports",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Stadiums_Sports_SportId",
                table: "Stadiums");

            migrationBuilder.DropIndex(
                name: "IX_Stadiums_SportId",
                table: "Stadiums");

            migrationBuilder.DropColumn(
                name: "SportId",
                table: "Stadiums");
        }
    }
}
