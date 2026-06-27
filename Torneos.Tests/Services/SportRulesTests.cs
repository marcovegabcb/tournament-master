using Torneos.API.Services;

namespace Torneos.Tests.Services;

public class SportRulesTests
{
    [Theory]
    [InlineData("Football", true)]
    [InlineData("football", true)]
    [InlineData("  FOOTBALL  ", true)]
    [InlineData("Basketball", false)]
    [InlineData("Tennis", false)]
    [InlineData("Volleyball", false)]
    public void UsesPenaltyShootout_SoloFutbol(string sport, bool expected)
    {
        Assert.Equal(expected, SportRules.UsesPenaltyShootout(sport));
    }

    [Theory]
    [InlineData("Tennis", true)]
    [InlineData("Volleyball", true)]
    [InlineData("volleyball", true)]
    [InlineData("Football", false)]
    [InlineData("Basketball", false)]
    public void IsSetBased_TenisYVoley(string sport, bool expected)
    {
        Assert.Equal(expected, SportRules.IsSetBased(sport));
    }

    [Theory]
    [InlineData("Tennis", true)]
    [InlineData("tennis", true)]
    [InlineData("Football", false)]
    [InlineData("Volleyball", false)]
    [InlineData("Basketball", false)]
    public void IsNeutralVenueOnly_SoloTenis(string sport, bool expected)
    {
        Assert.Equal(expected, SportRules.IsNeutralVenueOnly(sport));
    }
}
