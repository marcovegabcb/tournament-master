using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Torneos.API;
using Torneos.API.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Fail fast with a clear message if required secrets are not configured
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Missing required config: ConnectionStrings:DefaultConnection");
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Missing required config: Jwt:Key");
var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("Missing required config: Jwt:Issuer");
var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("Missing required config: Jwt:Audience");

if (jwtKey.Length < 32)
    throw new InvalidOperationException("Jwt:Key must be at least 32 characters long.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddIdentity<IdentityUser, IdentityRole>(options =>
{
    options.Password.RequiredLength = 8;
    options.Password.RequireDigit = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = false;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    })
    .AddMvcOptions(options =>
    {
        options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
    });

builder.Services.AddOpenApi();

builder.Services.AddScoped<Torneos.API.Models.PlayerModel>();
builder.Services.AddScoped<Torneos.API.Models.TeamModel>();
builder.Services.AddScoped<Torneos.API.Models.TournamentModel>();
builder.Services.AddScoped<Torneos.API.Models.SportModel>();
builder.Services.AddScoped<Torneos.API.Models.StadiumModel>();
builder.Services.AddScoped<Torneos.API.Models.MatchModel>();
builder.Services.AddScoped<Torneos.API.Models.EnrollmentModel>();
builder.Services.AddScoped<Torneos.API.Models.EnrollmentRequestModel>();

builder.Services.AddTransient<GlobalExceptionHandler>();
builder.Services.AddSingleton<Torneos.API.Services.PendingRequestTracker>();
builder.Services.AddScoped<Torneos.API.Services.FixtureService>();
builder.Services.AddScoped<Torneos.API.Services.FixtureGenerators.LeagueFixtureGenerator>();
builder.Services.AddScoped<Torneos.API.Services.FixtureGenerators.KnockoutFixtureGenerator>();
builder.Services.AddScoped<Torneos.API.Services.FixtureGenerators.GroupsFixtureGenerator>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "https://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Tournament Master API v1");
        options.RoutePrefix = "swagger";
        options.DefaultModelsExpandDepth(-1);
    });
}

app.UseMiddleware<GlobalExceptionHandler>();
app.UseCors("AllowAngular");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

    var adminEmail = builder.Configuration["Admin:Email"] ?? "admin@torneos.com";
    var adminPassword = builder.Configuration["Admin:Password"];

    // En desarrollo se permite una contraseña provisional; fuera de él es obligatorio configurarla.
    if (string.IsNullOrEmpty(adminPassword))
    {
        if (app.Environment.IsDevelopment())
            adminPassword = "Admin123!";
        else
            throw new InvalidOperationException("Missing required config: Admin:Password");
    }

    if (!await roleManager.RoleExistsAsync("Admin"))
        await roleManager.CreateAsync(new IdentityRole("Admin"));

    var adminUser = await userManager.FindByEmailAsync(adminEmail);
    if (adminUser == null)
    {
        adminUser = new IdentityUser { UserName = adminEmail, Email = adminEmail, EmailConfirmed = true };
        await userManager.CreateAsync(adminUser, adminPassword);
        await userManager.AddToRoleAsync(adminUser, "Admin");
        Console.WriteLine($"Default admin created: {adminEmail}");
    }
}

app.Run();
