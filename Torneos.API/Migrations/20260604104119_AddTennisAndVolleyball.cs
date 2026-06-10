using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Torneos.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTennisAndVolleyball : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Sports",
                columns: new[] { "Id", "Name", "ColorHex", "ImageUrl" },
                values: new object[,]
                {
                    { 3, "Tennis", "#FF6D00", "https://example.com/photos/tennis.jpg" },
                    { 4, "Volleyball", "#9C27B0", "https://example.com/photos/volleyball.jpg" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Sports",
                keyColumn: "Id",
                keyValues: new object[] { 3, 4 });
        }
    }
}
