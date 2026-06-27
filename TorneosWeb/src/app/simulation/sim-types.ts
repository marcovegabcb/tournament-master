import type { SportConfig } from '../sports';

/**
 * Resultado simulado de un partido. Refleja el mismo modelo que el formulario de reporte
 * del generador, de modo que pueda volcarse tal cual y pasar por sus mismas validaciones.
 */
export interface SimResult {
  // Marcador (deportes con autoCalc/manual). En deportes de sets se deriva de los sets.
  homeScore: number;
  awayScore: number;
  // Puntos por set jugado (vóley/tenis); las posiciones no jugadas se dejan a 0 en el form.
  homeSets?: number[];
  awaySets?: number[];
  // Stats por jugador, alineadas con el orden de la plantilla recibida.
  homeStats: Record<string, number>[];
  awayStats: Record<string, number>[];
}

/** Simulador de un deporte: recibe el tamaño de cada plantilla y su SportConfig. */
export type MatchSimulator = (
  homeCount: number,
  awayCount: number,
  config: SportConfig
) => SimResult;
