// Utilidades puras de aleatoriedad para la simulación de partidos.
// Aisladas en src/app/simulation para no mezclarse con la configuración de deportes.

/** Entero aleatorio en [min, max] (ambos incluidos). */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Reparte `total` unidades enteras al azar entre `count` jugadores. La suma siempre da `total`. */
export function distribute(total: number, count: number): number[] {
  const out = new Array(count).fill(0);
  if (count <= 0 || total <= 0) return out;
  for (let i = 0; i < total; i++) out[randInt(0, count - 1)]++;
  return out;
}

/** Array de `count` registros de stats, todas las claves a 0. */
export function emptyStats(keys: string[], count: number): Record<string, number>[] {
  return Array.from({ length: count }, () => Object.fromEntries(keys.map(k => [k, 0])));
}

/**
 * Simula sets hasta que un equipo llega a `setsToWin`, garantizando un ganador claro.
 * `setScore(homeWins)` devuelve [puntosLocal, puntosVisitante] de un set ya decidido.
 */
export function simulateSets(
  setsToWin: number,
  setScore: (homeWins: boolean) => [number, number]
): { home: number[]; away: number[] } {
  const home: number[] = [];
  const away: number[] = [];
  let h = 0;
  let a = 0;
  while (h < setsToWin && a < setsToWin) {
    const homeWins = Math.random() < 0.5;
    const [hs, as] = setScore(homeWins);
    home.push(hs);
    away.push(as);
    if (homeWins) h++;
    else a++;
  }
  return { home, away };
}
