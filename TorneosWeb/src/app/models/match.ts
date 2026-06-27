import { Team } from './team';
import { Tournament } from './tournament';

export interface Match {
  id: number;
  matchDate: string;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  isPlayed: boolean;
  stage: string;
  homeTeam?: Team;
  awayTeam?: Team;
  tournamentId: number;
  tournament?: Tournament;
  stadiumId?: number;
  // Desempate de eliminatoria (penaltis). Solo presentes si el cruce decisivo acabó empatado.
  homeTiebreak?: number | null;
  awayTiebreak?: number | null;
  winnerTeamId?: number | null;
  _bye?: boolean;
}
