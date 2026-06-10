import { Team } from './team';
import { Tournament } from './tournament';

export interface TeamTournament {
  teamId: number;
  team?: Team;
  tournamentId: number;
  tournament?: Tournament;
}
