import { Sport } from './sport';
import { Player } from './player';
import { TeamTournament } from './team-tournament';
import { Stadium } from './stadium';

export interface Team {
  id: number;
  name: string;
  captainName: string;
  captainId?: number;
  captain?: Player;
  logoUrl: string;
  groupLabel?: string;
  prestigePoints: number;
  sportId: number;
  playerCount?: number;
  sport?: Sport;
  stadiumId?: number;
  stadium?: Stadium;
  players?: Player[];
  teamTournaments?: TeamTournament[];
}
