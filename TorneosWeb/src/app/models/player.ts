import { Team } from './team';

export interface Player {
  id: number;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  matchesPlayed: number;
  teamId?: number;
  team?: Team;
}
