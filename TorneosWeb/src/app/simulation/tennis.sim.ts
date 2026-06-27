import { randInt, distribute, emptyStats, simulateSets } from './sim-utils';
import type { MatchSimulator } from './sim-types';

function tennisSetScore(): [number, number] {
  const weights: [number, number][] = [
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4],
    [7, 5], [7, 6],
  ];
  return weights[randInt(0, weights.length - 1)];
}

/** Tenis: marcador = sets ganados. Cada set se define con tennisSetScore. */
export const simulateTennis: MatchSimulator = (homeCount, awayCount, config) => {
  const keys = config.statFields.map(f => f.key);
  const setsToWin = config.setsToWin ?? 3;

  const { home: homeSets, away: awaySets } = simulateSets(setsToWin, (homeWins) => {
    const [winner, loser] = tennisSetScore();
    return homeWins ? [winner, loser] : [loser, winner];
  });

  const played = homeSets.length;
  const build = (count: number) => {
    const stats = emptyStats(keys, count);
    if (count > 0) {
      distribute(randInt(2, 6) * played, count).forEach((v, i) => { stats[i]['aces'] = v; });
      distribute(randInt(1, 3) * played, count).forEach((v, i) => { stats[i]['doubleFaults'] = v; });
      distribute(randInt(4, 9) * played, count).forEach((v, i) => { stats[i]['winners'] = v; });
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
