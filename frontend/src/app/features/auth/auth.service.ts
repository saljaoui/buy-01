import { HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, switchMap, throwError } from 'rxjs';

import { ApiClient } from '../../core/api/api-client.service';
import {
  AuthResponse,
  AuthSession,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from './auth.models';

const AUTH_TOKEN_KEY = 'buy01.auth.token';
const AUTH_USER_KEY = 'buy01.auth.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);

  login(payload: LoginRequest): Observable<AuthSession> {
    return this.api
      .post<AuthResponse>('/auth/login', payload)
      .pipe(switchMap((response) => this.toSession(response)));
  }

  register(payload: RegisterRequest): Observable<AuthSession> {
    return this.api
      .post<AuthResponse>('/auth/register', payload)
      .pipe(switchMap((response) => this.toSession(response)));
  }

  refreshCurrentUser(): Observable<AuthUser> {
    return this.api.get<AuthUser>('/users/me').pipe(
      map((user) => {
        this.updateStoredUser(user);
        return user;
      }),
    );
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

  getStoredUser(): AuthUser | null {
    const storedUser =
      localStorage.getItem(AUTH_USER_KEY) ?? sessionStorage.getItem(AUTH_USER_KEY);

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as AuthUser;
    } catch {
      this.clearSession();
      return null;
    }
  }

  updateStoredUser(user: AuthUser): void {
    const storedToken =
      localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY);

    if (storedToken) {
      if (localStorage.getItem(AUTH_TOKEN_KEY)) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } else {
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      }
    }
  }

  getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
    return this.api.getErrorMessage(error, fallback);
  }

  private toSession(response: AuthResponse): Observable<AuthSession> {
    if (!response.token) {
      return throwError(() => new Error('Authentication response did not include an access token.'));
    }

    if (response.user) {
      return of({ token: response.token, user: response.user });
    }

    return this.api
      .get<AuthUser>('/users/me', {
        headers: new HttpHeaders({
          Authorization: `Bearer ${response.token}`,
        }),
      })
      .pipe(map((user) => ({ token: response.token, user })));
  }
}
