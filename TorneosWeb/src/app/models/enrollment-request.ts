import { Team } from './team';
import { Tournament } from './tournament';

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface NewTeamPlayer {
  firstName: string;
  lastName: string;
  jerseyNumber: number;
}

export interface EnrollmentRequest {
  id: number;
  teamId: number | null;
  tournamentId: number;
  requesterEmail: string;
  status: RequestStatus;
  createdAt: string;
  team?: Team;
  tournament?: Tournament;
  newTeamName?: string;
  newTeamCaptainName?: string;
  newTeamLogoUrl?: string;
  newTeamStadiumId?: number;
  newTeamPlayersJson?: string;
}

export function parseNewTeamPlayers(json?: string): NewTeamPlayer[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}
