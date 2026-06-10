import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Match } from '../models/match';

const API = 'http://localhost:5185/api';

@Injectable({ providedIn: 'root' })
export class MatchService {
  constructor(private http: HttpClient) {}

  /** GET /api/Matches — Obtiene partidos. Si se pasa tournamentId, filtra por torneo. */
  getAll(tournamentId?: number): Observable<Match[]> {
    const params = tournamentId ? `?tournamentId=${tournamentId}` : '';
    return this.http.get<Match[]>(`${API}/Matches${params}`);
  }

  /** GET /api/Matches/standings/{tournamentId} — Obtiene la clasificación del torneo calculada desde los resultados. */
  getStandings(tournamentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${API}/Matches/standings/${tournamentId}`);
  }

  /** POST /api/Matches/generate/{tournamentId} — Genera el calendario de partidos (ida/vuelta) para un torneo. */
  generateFixture(tournamentId: number): Observable<any> {
    return this.http.post(`${API}/Matches/generate/${tournamentId}`, {});
  }
}
