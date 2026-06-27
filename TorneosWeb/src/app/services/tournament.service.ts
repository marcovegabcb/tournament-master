import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tournament } from '../models/tournament';
import { EnrolledTeam } from '../models/enrolled-team';

export interface CreateTournamentDto {
  name: string;
  format: number;
  venueConfig: number;
  minPrestigeRequired: number;
  minPlayersPerTeam: number;
  maxPlayersPerTeam: number;
  sportId: number;
  stadiumIds?: number[];
}

const API = '/api';

@Injectable({ providedIn: 'root' })
export class TournamentService {
  constructor(private http: HttpClient) {}

  /** GET /api/Tournaments — Obtiene todos los torneos con deporte, estadios y equipos inscritos. */
  getAll(): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(`${API}/Tournaments`);
  }

  /** GET /api/Tournaments/{id}/teams — Obtiene los equipos inscritos en un torneo concreto. */
  getTeams(id: number): Observable<EnrolledTeam[]> {
    return this.http.get<EnrolledTeam[]>(`${API}/Tournaments/${id}/teams`);
  }

  /** POST /api/Tournaments — Crea un torneo. El body incluye nombre, formato, configuración de sede, etc. */
  create(data: CreateTournamentDto): Observable<Tournament> {
    return this.http.post<Tournament>(`${API}/Tournaments`, data);
  }

  /** PATCH /api/Tournaments/{id}/status — Cambia el estado del torneo (RegistrationOpen → InProgress → Finished). */
  updateStatus(id: number, status: number): Observable<any> {
    return this.http.patch(`${API}/Tournaments/${id}/status`, { status });
  }

  /** DELETE /api/Tournaments/{id} — Elimina un torneo y sus relaciones en cascada. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/Tournaments/${id}`);
  }
}
