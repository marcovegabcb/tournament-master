using Torneos.API.Entities;
using Torneos.Tests.TestSupport;

namespace Torneos.Tests;

/// <summary>
/// Verifica que el helper InMemory puede construir el modelo y persistir/leer datos.
/// Si el modelo relacional rompiera bajo InMemory, fallaría aquí primero.
/// </summary>
public class TestDbSmokeTests
{
    [Fact]
    public async Task Context_CanPersistAndQuery()
    {
        using var db = TestDb.NewContext();
        db.Sports.Add(new Sport { Id = 1, Name = "Football", ColorHex = "#fff" });
        db.Teams.Add(new Team { Id = 1, Name = "Team A", SportId = 1 });
        await db.SaveChangesAsync();

        using var db2 = TestDb.NewContext();
        Assert.Empty(db2.Teams); // BD distinta → aislada

        Assert.Single(db.Teams);
    }
}
