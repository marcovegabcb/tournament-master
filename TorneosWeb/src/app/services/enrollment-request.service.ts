import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EnrollmentRequest } from '../models/enrollment-request';

const API = 'http://localhost:5185/api';

@Injectable({ providedIn: 'root' })
export class EnrollmentRequestService {
  constructor(private http: HttpClient) {}

  create(data: {
    teamId?: number;
    tournamentId: number;
    newTeamName?: string;
    newTeamCaptainName?: string;
    newTeamLogoUrl?: string;
    newTeamStadiumId?: number;
    newTeamPlayers?: { firstName: string; lastName: string; jerseyNumber: number }[];
  }): Observable<any> {
    return this.http.post(`${API}/EnrollmentRequests`, data);
  }

  getAll(): Observable<EnrollmentRequest[]> {
    return this.http.get<EnrollmentRequest[]>(`${API}/EnrollmentRequests`);
  }

  approve(id: number): Observable<any> {
    return this.http.patch(`${API}/EnrollmentRequests/${id}/approve`, {});
  }

  reject(id: number): Observable<any> {
    return this.http.patch(`${API}/EnrollmentRequests/${id}/reject`, {});
  }
}
