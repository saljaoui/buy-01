import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from './auth.models';

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

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload);
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, payload);
  }

  storeSession(response: AuthResponse, persistent = true): void {
    this.clearSession();

    const storage = persistent ? localStorage : sessionStorage;
    storage.setItem(AUTH_TOKEN_KEY, response.token);
    storage.setItem(AUTH_USER_KEY, JSON.stringify(this.toUser(response)));
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

  private toUser(response: AuthResponse): AuthUser {
    return {
      id: response.userId,
      username: response.username,
      email: response.email,
      role: response.role,
    };
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
