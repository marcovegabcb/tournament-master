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
}
