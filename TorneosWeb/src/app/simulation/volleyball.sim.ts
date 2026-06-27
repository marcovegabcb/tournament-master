import { randInt, distribute, emptyStats, simulateSets } from './sim-utils';
import type { MatchSimulator } from './sim-types';

/** Vóley: marcador = sets ganados. El set lo gana quien llega al tope (25) con el otro por debajo. */
export const simulateVolleyball: MatchSimulator = (homeCount, awayCount, config) => {
  const keys = config.statFields.map(f => f.key);
  const setsToWin = config.setsToWin ?? 3;
  const cap = config.setPointCap ?? 25;

  const { home: homeSets, away: awaySets } = simulateSets(setsToWin, (homeWins) => {
    const winner = cap;
    const loser = randInt(15, cap - 2);
    return homeWins ? [winner, loser] : [loser, winner];
  });

  const played = homeSets.length;
  const build = (count: number) => {
    const stats = emptyStats(keys, count);
    if (count > 0) {
      distribute(randInt(10, 14) * played, count).forEach((v, i) => { stats[i]['kills'] = v; });
      distribute(randInt(2, 4) * played, count).forEach((v, i) => { stats[i]['blocks'] = v; });
      distribute(randInt(1, 3) * played, count).forEach((v, i) => { stats[i]['aces'] = v; });
    }
    return stats;
  };

  return {
    homeScore: homeSets.filter((s, i) => s > awaySets[i]).length,
    awayScore: awaySets.filter((s, i) => s > homeSets[i]).length,
    homeSets,
    awaySets,
    homeStats: build(homeCount),
    awayStats: build(awayCount),
  };
};
