import type { MatchSimulator } from './sim-types';
import { simulateFootball } from './football.sim';
import { simulateBasketball } from './basketball.sim';
import { simulateVolleyball } from './volleyball.sim';
import { simulateTennis } from './tennis.sim';

export type { SimResult, MatchSimulator } from './sim-types';
export { randInt } from './sim-utils';

// Registro por nombre de deporte (debe coincidir con SportConfig.name).
const registry: Record<string, MatchSimulator> = {
  Football: simulateFootball,
  Basketball: simulateBasketball,
  Volleyball: simulateVolleyball,
  Tennis: simulateTennis,
};

/** Devuelve el simulador del deporte, o undefined si no hay uno registrado. */
export function getSimulator(sportName: string): MatchSimulator | undefined {
  return registry[sportName];
}
