import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  constructor(private http: HttpClient) {}

  /** POST /api/Enrollments/enroll?teamId=&tournamentId= — Inscribe un equipo en un torneo. Valida prestige y duplicados en el backend. */
  enroll(teamId: number, tournamentId: number): Observable<any> {
    return this.http.post(`${API}/Enrollments/enroll?teamId=${teamId}&tournamentId=${tournamentId}`, {});
  }
}
