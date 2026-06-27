export interface StadiumDetail {
  id: number;
  name: string;
  city: string;
  capacity: number;
  length: number;
  width: number;
  sportId: number;
  sport: { id: number; name: string; colorHex: string };
  teams: { id: number; name: string; prestigePoints: number }[];
  tournaments: { id: number; name: string; format: number; status: number; sport: { name: string } }[];
}
