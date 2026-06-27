export interface Standing {
  teamId: number;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  // Puntos (vóley) / juegos (tenis) sumados de los sets. Desempate tras la diferencia de sets.
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
  points: number;
}
