using Microsoft.EntityFrameworkCore;
using Torneos.API;

namespace Torneos.Tests.TestSupport;

/// <summary>
/// Crea contextos EF Core con proveedor InMemory aislados por test.
/// Cada llamada usa un nombre de BD único, así que los tests no comparten estado.
/// </summary>
public static class TestDb
{
    public static ApplicationDbContext NewContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .EnableSensitiveDataLogging()
            .Options;

        return new ApplicationDbContext(options);
    }
}
