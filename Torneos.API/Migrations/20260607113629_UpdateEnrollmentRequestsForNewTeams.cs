using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Torneos.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateEnrollmentRequestsForNewTeams : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EnrollmentRequests_Teams_TeamId",
                table: "EnrollmentRequests");

            migrationBuilder.AlterColumn<int>(
                name: "TeamId",
                table: "EnrollmentRequests",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "NewTeamCaptainName",
                table: "EnrollmentRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NewTeamLogoUrl",
                table: "EnrollmentRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NewTeamName",
                table: "EnrollmentRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NewTeamPlayersJson",
                table: "EnrollmentRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NewTeamStadiumId",
                table: "EnrollmentRequests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_EnrollmentRequests_Teams_TeamId",
                table: "EnrollmentRequests",
                column: "TeamId",
                principalTable: "Teams",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EnrollmentRequests_Teams_TeamId",
                table: "EnrollmentRequests");

            migrationBuilder.DropColumn(
                name: "NewTeamCaptainName",
                table: "EnrollmentRequests");

            migrationBuilder.DropColumn(
                name: "NewTeamLogoUrl",
                table: "EnrollmentRequests");

            migrationBuilder.DropColumn(
                name: "NewTeamName",
                table: "EnrollmentRequests");

            migrationBuilder.DropColumn(
                name: "NewTeamPlayersJson",
                table: "EnrollmentRequests");

            migrationBuilder.DropColumn(
                name: "NewTeamStadiumId",
                table: "EnrollmentRequests");

            migrationBuilder.AlterColumn<int>(
                name: "TeamId",
                table: "EnrollmentRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_EnrollmentRequests_Teams_TeamId",
                table: "EnrollmentRequests",
                column: "TeamId",
                principalTable: "Teams",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
