import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Match } from '../models/match';
import { Standing } from '../models/standing';

const API = '/api';

export interface PlayerStatEntry {
  playerId: number;
  stats: Record<string, number>;
}

export interface UpdateMatchResultBody {
  homeScore: number;
  awayScore: number;
  // Puntos (vóley) o juegos (tenis) totales sumados de los sets. Desempate de liga.
  homePoints?: number;
  awayPoints?: number;
  // Desempate opcional (penaltis) para cruces de eliminatoria que acaban empatados.
  homeTiebreak?: number | null;
  awayTiebreak?: number | null;
  playerStats: PlayerStatEntry[];
}

@Injectable({ providedIn: 'root' })
export class MatchService {
  constructor(private http: HttpClient) {}

  /** GET /api/Matches — Obtiene partidos. Si se pasa tournamentId, filtra por torneo. */
  getAll(tournamentId?: number): Observable<Match[]> {
    const params = tournamentId ? `?tournamentId=${tournamentId}` : '';
    return this.http.get<Match[]>(`${API}/Matches${params}`);
  }

  /** GET /api/Matches/standings/{tournamentId} — Obtiene la clasificación del torneo calculada desde los resultados. */
  getStandings(tournamentId: number): Observable<Standing[]> {
    return this.http.get<Standing[]>(`${API}/Matches/standings/${tournamentId}`);
  }

  /** POST /api/Matches/generate/{tournamentId} — Genera el calendario de partidos (ida/vuelta) para un torneo. */
  generateFixture(tournamentId: number): Observable<any> {
    return this.http.post(`${API}/Matches/generate/${tournamentId}`, {});
  }

  /** PATCH /api/Matches/{id}/result — Actualiza el resultado de un partido con estadísticas. */
  updateResult(matchId: number, body: UpdateMatchResultBody): Observable<any> {
    return this.http.patch(`${API}/Matches/${matchId}/result`, body);
  }
}
