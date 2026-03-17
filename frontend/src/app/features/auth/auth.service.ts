import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';

import {
  AuthResponse,
  AuthSession,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
} from './auth.models';

const AUTH_TOKEN_KEY = 'buy01.auth.token';
const AUTH_USER_KEY = 'buy01.auth.user';

function resolveApiBaseUrl(): string {
  const location = globalThis.location;

  if (!location) {
    return 'http://localhost:8080';
  }

  if (location.port === '4200' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
    return 'http://localhost:8080';
  }

  return location.origin;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${resolveApiBaseUrl()}/api/auth`;
  private readonly usersUrl = `${resolveApiBaseUrl()}/api/users`;

  login(payload: LoginRequest): Observable<AuthSession> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload).pipe(
      switchMap(({ token }) =>
        this.http
          .get<AuthUser>(`${this.usersUrl}/me`, {
            headers: new HttpHeaders({
              Authorization: `Bearer ${token}`,
            }),
          })
          .pipe(map((user) => ({ token, user }))),
      ),
    );
  }

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, payload);
  }

  storeSession(session: AuthSession, persistent = true): void {
    this.clearSession();

    const storage = persistent ? localStorage : sessionStorage;
    storage.setItem(AUTH_TOKEN_KEY, session.token);
    storage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
  }

  clearSession(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  }

  getStoredToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY);
  }

  getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }

      if (this.hasMessage(error.error)) {
        return error.error.message;
      }

      if (error.status === 0) {
        return 'Unable to reach the authentication server.';
      }
    }

    return fallback;
  }

  private hasMessage(value: unknown): value is { message: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      typeof value.message === 'string' &&
      value.message.trim().length > 0
    );
  }
}
