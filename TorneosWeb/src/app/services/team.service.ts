import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team } from '../models/team';

const API = 'http://localhost:5185/api';

@Injectable({ providedIn: 'root' })
export class TeamService {
  constructor(private http: HttpClient) {}

  /** GET /api/Teams — Obtiene todos los equipos. Si se pasa sportId, filtra por deporte. */
  getAll(sportId?: number): Observable<Team[]> {
    const params = sportId ? `?sportId=${sportId}` : '';
    return this.http.get<Team[]>(`${API}/Teams${params}`);
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
