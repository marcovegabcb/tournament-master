import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Stadium } from '../models/stadium';

const API = 'http://localhost:5185/api';

@Injectable({ providedIn: 'root' })
export class StadiumService {
  constructor(private http: HttpClient) {}

  /** GET /api/Stadiums — Obtiene todos los estadios. Si se pasa sportId, filtra por deporte. */
  getAll(sportId?: number): Observable<Stadium[]> {
    const params = sportId ? `?sportId=${sportId}` : '';
    return this.http.get<Stadium[]>(`${API}/Stadiums${params}`);
  }

  /** GET /api/Stadiums/{id}/details — Obtiene info detallada de un estadio (equipos locales, torneos asociados). */
  getDetails(id: number): Observable<any> {
    return this.http.get<any>(`${API}/Stadiums/${id}/details`);
  }

  /** POST /api/Stadiums — Crea un nuevo estadio con nombre, ciudad, capacidad, dimensiones y deporte. */
  create(stadium: Partial<Stadium>): Observable<Stadium> {
    return this.http.post<Stadium>(`${API}/Stadiums`, stadium);
  }

  /** DELETE /api/Stadiums/{id} — Elimina un estadio por su id. */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API}/Stadiums/${id}`);
  }
}
