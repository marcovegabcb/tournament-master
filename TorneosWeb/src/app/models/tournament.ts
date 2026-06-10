import { Sport } from './sport';
import { Match } from './match';
import { TeamTournament } from './team-tournament';
import { TournamentStadium } from './tournament-stadium';

export enum TournamentFormat {
  League = 0,
  Knockout = 1,
  GroupsAndPlayoffs = 2
}

export enum VenueType {
  HomeAndAway = 0,
  SingleRound = 1,
  NeutralVenue = 2
}

export enum TournamentStatus {
  RegistrationOpen = 0,
  InProgress = 1,
  Finished = 2
}

export interface Tournament {
  id: number;
  name: string;
  format: TournamentFormat;
  venueConfig: VenueType;
  minPrestigeRequired: number;
  minPlayersPerTeam: number;
  status: TournamentStatus;
  isFixtureGenerated: boolean;
  sportId: number;
  sport?: Sport;
  matches?: Match[];
  teamTournaments?: TeamTournament[];
  tournamentStadiums?: TournamentStadium[];
  _enrolledCount?: number;
  _enrolledTeams?: Team[];
}
import { Team } from './team';
