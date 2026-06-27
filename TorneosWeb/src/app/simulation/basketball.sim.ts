import { randInt, distribute, emptyStats } from './sim-utils';
import type { MatchSimulator } from './sim-types';

/** Baloncesto: marcador = suma de puntos (autoCalc). Rangos típicos por equipo. */
export const simulateBasketball: MatchSimulator = (homeCount, awayCount, config) => {
  const keys = config.statFields.map(f => f.key);
  const scoreKey = config.scoreStatKey; // 'points'

  const build = (count: number) => {
    const stats = emptyStats(keys, count);
    const points = randInt(72, 112);
    if (count > 0) {
      distribute(points, count).forEach((p, i) => { stats[i][scoreKey] = p; });
      distribute(randInt(30, 46), count).forEach((r, i) => { stats[i]['rebounds'] = r; });
      distribute(randInt(14, 28), count).forEach((a, i) => { stats[i]['assists'] = a; });
    }
    return { stats, points };
  };

  const home = build(homeCount);
  const away = build(awayCount);
  return {
    homeScore: home.points,
    awayScore: away.points,
    homeStats: home.stats,
    awayStats: away.stats,
  };
};
