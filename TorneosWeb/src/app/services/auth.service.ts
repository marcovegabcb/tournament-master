import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

const API = '/api/auth';
const TOKEN_KEY = 'auth_token';
const EMAIL_KEY = 'auth_email';
const ROLE_KEY = 'auth_role';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private isAdminSubject = new BehaviorSubject<boolean>(localStorage.getItem(ROLE_KEY) === 'Admin');
  isAdmin$ = this.isAdminSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${API}/login`, { email, password }).pipe(
      tap((res: any) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(EMAIL_KEY, res.email);
        localStorage.setItem(ROLE_KEY, res.role);
        this.isAdminSubject.next(res.role === 'Admin');
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(ROLE_KEY);
    this.isAdminSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getEmail(): string | null {
    return localStorage.getItem(EMAIL_KEY);
  }

  isLoggedIn(): boolean {
    return this.hasToken();
  }

  isAdmin(): boolean {
    return localStorage.getItem(ROLE_KEY) === 'Admin';
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }
}
