using Torneos.API.Entities;

namespace Torneos.Tests;

/*
 ─────────────────────────────────────────────────────────
  TEST 1: cómo se escribe y ejecuta un test en xUnit
 ─────────────────────────────────────────────────────────

  Anatomía de un test:
    [Fact]          → marca este método como un test
    public void ... → el nombre describe lo que prueba
    Assert.True()   → verifica que se cumple una condición

  Fases (AAA):
    Arrange  → preparar datos
    Act      → ejecutar el código a probar
    Assert   → comprobar que el resultado es el esperado

  Para ejecutar:  dotnet test
  Para uno solo:  dotnet test --filter "nombre_del_test"
*/

public class TestBasico
{
    [Fact]
    public void Suma_2_mas_2_es_4()
    {
        // Arrange
        int a = 2, b = 2;

        // Act
        int resultado = a + b;

        // Assert
        Assert.Equal(4, resultado);
    }

    [Fact]
    public void Suma_2_mas_2_NO_es_5()
    {
        int resultado = 2 + 2;
        Assert.NotEqual(5, resultado);
    }
}

/*
 ─────────────────────────────────────────────────────────
  TEST 2: probar una entidad del proyecto (Player)
 ─────────────────────────────────────────────────────────

  Aquí usamos una clase real del proyecto: Player.
  No necesitamos BD, solo creamos instancias y
  verificamos propiedades.
*/

public class PlayerTests
{
    [Fact]
    public void Un_Jugador_Tiene_Nombre()
    {
        var jugador = new Player
        {
            FirstName = "Lionel",
            LastName = "Messi",
            JerseyNumber = 10,
            TeamId = 1
        };

        string nombreCompleto = $"{jugador.FirstName} {jugador.LastName}";

        Assert.Equal("Lionel Messi", nombreCompleto);
        Assert.Equal(10, jugador.JerseyNumber);
    }

    [Fact]
    public void Dos_Jugadores_Distintos_NO_Son_Iguales()
    {
        var messi = new Player { FirstName = "Lionel", LastName = "Messi", JerseyNumber = 10, TeamId = 1 };
        var ronaldo = new Player { FirstName = "Cristiano", LastName = "Ronaldo", JerseyNumber = 7, TeamId = 2 };

        Assert.NotEqual(messi.FirstName, ronaldo.FirstName);
    }
}

/*
 ─────────────────────────────────────────────────────────
  QUÉ PASA SI FALLA UN TEST
 ─────────────────────────────────────────────────────────

  Abajo hay un test que falla a propósito.
  Cámbialo o bórralo y ejecuta  dotnet test  para ver
  la diferencia.
*/

    public class TestQueFalla
    {
        // [Fact]
        public void Este_Test_NoSeEjecuta()
        {
            int resultado = 2 + 2;
            Assert.Equal(4, resultado);
        }
    }
