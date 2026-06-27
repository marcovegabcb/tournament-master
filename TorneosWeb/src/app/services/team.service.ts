import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team } from '../models/team';
import { PagedResult } from '../models/paged-result';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class TeamService {
  constructor(private http: HttpClient) {}

  /** GET /api/Teams — Obtiene equipos paginados. Si se pasa sportId, filtra por deporte. */
  getAll(sportId?: number, page = 1, pageSize = 20): Observable<PagedResult<Team>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (sportId) params = params.set('sportId', sportId);
    return this.http.get<PagedResult<Team>>(`${API}/Teams`, { params });
  }

  /** GET /api/Teams/{id}/details — Obtiene info detallada de un equipo (plantilla, partidos, torneos). */
  getDetails(id: number): Observable<any> {
    return this.http.get<any>(`${API}/Teams/${id}/details`);
  }

  /** POST /api/Teams — Crea un nuevo equipo. El body es un Team parcial (sin id). */
  create(team: Partial<Team>): Observable<Team> {
    return this.http.post<Team>(`${API}/Teams`, team);
  }

  /** DELETE /api/Teams/{id} — Elimina un equipo por su id. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/Teams/${id}`);
  }

  /** DELETE /api/Teams/{teamId}/tournaments/{tournamentId} — Remove a team from a tournament. */
  removeFromTournament(teamId: number, tournamentId: number): Observable<void> {
    return this.http.delete<void>(`${API}/Teams/${teamId}/tournaments/${tournamentId}`);
  }
}
