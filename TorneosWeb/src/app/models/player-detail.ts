export interface PlayerDetail {
  id: number;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  matchesPlayed: number;
  teamId: number;
  team: {
    id: number;
    name: string;
    prestigePoints: number;
    sport: { name: string };
  };
}
