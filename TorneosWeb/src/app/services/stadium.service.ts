import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Stadium } from '../models/stadium';
import { PagedResult } from '../models/paged-result';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class StadiumService {
  constructor(private http: HttpClient) {}

  /** GET /api/Stadiums — Obtiene estadios paginados. Si se pasa sportId, filtra por deporte. */
  getAll(sportId?: number, page = 1, pageSize = 20): Observable<PagedResult<Stadium>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (sportId) params = params.set('sportId', sportId);
    return this.http.get<PagedResult<Stadium>>(`${API}/Stadiums`, { params });
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
