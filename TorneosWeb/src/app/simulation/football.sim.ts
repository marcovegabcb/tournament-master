import { randInt, distribute, emptyStats } from './sim-utils';
import type { MatchSimulator } from './sim-types';

// Distribución de goles sesgada a marcadores bajos (realista para fútbol).
const GOAL_TABLE = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4];

/**
 * Fútbol: marcador = suma de goles (autoCalc). Coherencia clave:
 *  - asistencias del equipo ≤ goles del equipo (lo exige SportConfig.validate).
 *  - tarjetas amarillas/rojas ≤ 1 por jugador (statCaps).
 */
export const simulateFootball: MatchSimulator = (homeCount, awayCount, config) => {
  const keys = config.statFields.map(f => f.key);
  const scoreKey = config.scoreStatKey; // 'goals'

  const build = (count: number) => {
    const stats = emptyStats(keys, count);
    if (count === 0) return { stats, goals: 0 };

    const goals = GOAL_TABLE[randInt(0, GOAL_TABLE.length - 1)];
    distribute(goals, count).forEach((g, i) => { stats[i][scoreKey] = g; });

    // Nunca más asistencias que goles en el equipo.
    distribute(randInt(0, goals), count).forEach((a, i) => { stats[i]['assists'] = a; });

    for (let i = 0; i < count; i++) {
      if (Math.random() < 0.18) stats[i]['yellowCards'] = 1;
      if (Math.random() < 0.03) stats[i]['redCards'] = 1;
    }
    return { stats, goals };
  };

  const home = build(homeCount);
  const away = build(awayCount);
  return {
    homeScore: home.goals,
    awayScore: away.goals,
    homeStats: home.stats,
    awayStats: away.stats,
  };
};
