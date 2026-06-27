export interface StatField {
  key: string;
  label: string;
}

export interface PlayerStats {
  teamName: string;
  stats: Record<string, number>;
}

export interface SportConfig {
  name: string;
  icon: string;
  statFields: StatField[];
  autoCalcScore: boolean;
  scoreStatKey: string;
  defaultMinPlayers?: number;
  defaultMaxPlayers?: number;
  // El empate de una eliminatoria se resuelve por penaltis (marcador de desempate aparte).
  // Si es false/undefined, el empate se resuelve en el marcador (prórroga) o no puede ocurrir (sets).
  usesPenalties?: boolean;
  useSets?: boolean;
  setsToWin?: number;
  setPointCap?: number;
  // Cruce a doble partido decidido por partidos ganados; si cada equipo gana una pierna,
  // se juega un golden set (a goldenSetPoints) en la vuelta para decidir (vóley).
  usesGoldenSet?: boolean;
  goldenSetPoints?: number;
  statCaps?: Record<string, number>;
  validate?(home: PlayerStats[], away: PlayerStats[]): string | null;
}

const registry = new Map<string, SportConfig>();

export function registerSportConfig(config: SportConfig) {
  registry.set(config.name, config);
}

export function getSportConfig(name: string): SportConfig | undefined {
  return registry.get(name);
}

export function getAllSportConfigs(): SportConfig[] {
  return Array.from(registry.values());
}
