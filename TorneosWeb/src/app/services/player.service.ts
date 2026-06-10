import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Player } from '../models/player';

const API = 'http://localhost:5185/api';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  constructor(private http: HttpClient) {}

  /** GET /api/Players — Obtiene todos los jugadores. Si se pasa teamId, filtra por equipo. */
  getAll(teamId?: number): Observable<Player[]> {
    const params = teamId ? `?teamId=${teamId}` : '';
    return this.http.get<Player[]>(`${API}/Players${params}`);
  }

  /** GET /api/Players/{id}/details — Obtiene info detallada de un jugador incluyendo equipo y deporte. */
  getDetails(id: number): Observable<any> {
    return this.http.get<any>(`${API}/Players/${id}/details`);
  }

  /** POST /api/Players — Crea un nuevo jugador. El body incluye firstName, lastName, teamId, etc. */
  create(player: Partial<Player>): Observable<Player> {
    return this.http.post<Player>(`${API}/Players`, player);
  }

  /** DELETE /api/Players/{id} — Elimina un jugador por su id. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/Players/${id}`);
  }
}
