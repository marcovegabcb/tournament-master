using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Torneos.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUniquePendingEnrollmentRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EnrollmentRequests_TeamId",
                table: "EnrollmentRequests");

            migrationBuilder.CreateIndex(
                name: "IX_EnrollmentRequests_TeamId_TournamentId",
                table: "EnrollmentRequests",
                columns: new[] { "TeamId", "TournamentId" },
                unique: true,
                filter: "\"Status\" = 'Pending'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EnrollmentRequests_TeamId_TournamentId",
                table: "EnrollmentRequests");

            migrationBuilder.CreateIndex(
                name: "IX_EnrollmentRequests_TeamId",
                table: "EnrollmentRequests",
                column: "TeamId");
        }
    }
}
