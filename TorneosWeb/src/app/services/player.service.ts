import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Player } from '../models/player';
import { PagedResult } from '../models/paged-result';
import { PlayerDetail } from '../models/player-detail';
import { PlayerStats } from '../models/player-stats';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  constructor(private http: HttpClient) {}

  /** GET /api/Players — Obtiene jugadores paginados. Acepta filtros opcionales por teamId y sportId. */
  getAll(teamId?: number, page = 1, pageSize = 20, sportId?: number): Observable<PagedResult<Player>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (teamId) params = params.set('teamId', teamId);
    if (sportId) params = params.set('sportId', sportId);
    return this.http.get<PagedResult<Player>>(`${API}/Players`, { params });
  }

  /** GET /api/Players/{id}/details — Obtiene info detallada de un jugador incluyendo equipo y deporte. */
  getDetails(id: number): Observable<PlayerDetail> {
    return this.http.get<PlayerDetail>(`${API}/Players/${id}/details`);
  }

  /** POST /api/Players — Crea un nuevo jugador. El body incluye firstName, lastName, teamId, etc. */
  create(player: Partial<Player>): Observable<Player> {
    return this.http.post<Player>(`${API}/Players`, player);
  }

  /** DELETE /api/Players/{id} — Elimina un jugador por su id. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/Players/${id}`);
  }

  /** GET /api/Players/{id}/stats — Obtiene estadísticas agregadas de un jugador. */
  getStats(id: number, tournamentId?: number): Observable<PlayerStats> {
    const params = tournamentId ? `?tournamentId=${tournamentId}` : '';
    return this.http.get<PlayerStats>(`${API}/Players/${id}/stats${params}`);
  }
}
