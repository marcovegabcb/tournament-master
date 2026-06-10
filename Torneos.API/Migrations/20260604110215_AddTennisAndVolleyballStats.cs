using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Torneos.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTennisAndVolleyballStats : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TennisStats",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    MatchId = table.Column<int>(type: "integer", nullable: false),
                    Aces = table.Column<int>(type: "integer", nullable: false),
                    DoubleFaults = table.Column<int>(type: "integer", nullable: false),
                    FirstServePercentage = table.Column<int>(type: "integer", nullable: false),
                    Winners = table.Column<int>(type: "integer", nullable: false),
                    UnforcedErrors = table.Column<int>(type: "integer", nullable: false),
                    BreakPointsConverted = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TennisStats", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TennisStats_Matches_MatchId",
                        column: x => x.MatchId,
                        principalTable: "Matches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TennisStats_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VolleyballStats",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    MatchId = table.Column<int>(type: "integer", nullable: false),
                    Kills = table.Column<int>(type: "integer", nullable: false),
                    Blocks = table.Column<int>(type: "integer", nullable: false),
                    Aces = table.Column<int>(type: "integer", nullable: false),
                    Digs = table.Column<int>(type: "integer", nullable: false),
                    Assists = table.Column<int>(type: "integer", nullable: false),
                    ServiceErrors = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VolleyballStats", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VolleyballStats_Matches_MatchId",
                        column: x => x.MatchId,
                        principalTable: "Matches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VolleyballStats_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TennisStats_MatchId",
                table: "TennisStats",
                column: "MatchId");

            migrationBuilder.CreateIndex(
                name: "IX_TennisStats_PlayerId",
                table: "TennisStats",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_VolleyballStats_MatchId",
                table: "VolleyballStats",
                column: "MatchId");

            migrationBuilder.CreateIndex(
                name: "IX_VolleyballStats_PlayerId",
                table: "VolleyballStats",
                column: "PlayerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TennisStats");

            migrationBuilder.DropTable(
                name: "VolleyballStats");
        }
    }
}
