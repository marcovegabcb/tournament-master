export interface TeamDetail {
  id: number;
  name: string;
  captainName: string;
  captainId?: number;
  captain?: { id: number; firstName: string; lastName: string; jerseyNumber: number } | null;
  logoUrl: string;
  groupLabel?: string;
  prestigePoints: number;
  sportId: number;
  sport?: { id: number; name: string; colorHex: string } | null;
  stadiumId?: number;
  stadium?: { id: number; name: string; city: string } | null;
  players: { id: number; firstName: string; lastName: string; jerseyNumber: number; matchesPlayed: number }[];
  tournaments: { id: number; name: string; format: number; status: number; sportId: number; sport: { name: string } }[];
  matches: {
    id: number;
    matchDate: string;
    homeTeamId: number;
    homeTeam: { name: string };
    awayTeamId: number;
    awayTeam: { name: string };
    homeScore: number;
    awayScore: number;
    isPlayed: boolean;
    stage: string;
    tournamentName: string;
  }[];
}
