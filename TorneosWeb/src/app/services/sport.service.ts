import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sport } from '../models/sport';

const API = 'http://localhost:5185/api';

@Injectable({ providedIn: 'root' })
export class SportService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<Sport[]> {
    return this.http.get<Sport[]>(`${API}/Sports`);
  }

  create(sport: Partial<Sport>): Observable<Sport> {
    return this.http.post<Sport>(`${API}/Sports`, sport);
  }
}
