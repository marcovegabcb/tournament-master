import { Tournament } from './tournament';
import { Stadium } from './stadium';

export interface TournamentStadium {
  tournamentId: number;
  tournament?: Tournament;
  stadiumId: number;
  stadium?: Stadium;
}
