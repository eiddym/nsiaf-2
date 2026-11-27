import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginResponse, UsuarioPerfil } from '../models/auth.models';

const TOKEN_KEY = 'nsiaf_access_token';
const USER_KEY = 'nsiaf_user_profile';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSignal = signal<UsuarioPerfil | null>(this.getStoredUser());

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/v1/auth/login', credentials).pipe(
      tap((response) => {
        if (response && response.accessToken) {
          localStorage.setItem(TOKEN_KEY, response.accessToken);
          localStorage.setItem(USER_KEY, JSON.stringify(response.usuario));
          this.currentUserSignal.set(response.usuario);
        }
      }),
    );
  }

  loginAuthentik(ssoData: { username: string; email?: string; nombres?: string; apellidos?: string; cargo?: string; ci?: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/v1/auth/sso/authentik', ssoData).pipe(
      tap((response) => {
        if (response && response.accessToken) {
          localStorage.setItem(TOKEN_KEY, response.accessToken);
          localStorage.setItem(USER_KEY, JSON.stringify(response.usuario));
          this.currentUserSignal.set(response.usuario);
        }
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  cambiarPassword(passwordActual: string, passwordNueva: string): Observable<any> {
    return this.http.patch('/api/v1/auth/cambiar-password', { passwordActual, passwordNueva });
  }

  private getStoredUser(): UsuarioPerfil | null {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
