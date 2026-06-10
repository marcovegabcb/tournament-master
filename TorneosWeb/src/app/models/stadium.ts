import { Sport } from './sport';
import { Team } from './team';
import { TournamentStadium } from './tournament-stadium';

export interface Stadium {
  id: number;
  name: string;
  city: string;
  capacity: number;
  length: number;
  width: number;
  sportId: number;
  sport?: Sport;
  teams?: Team[];
  tournamentStadiums?: TournamentStadium[];
}
