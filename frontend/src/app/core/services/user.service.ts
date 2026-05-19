import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthUser } from '../../features/auth/auth.models';
import { User } from '../models/user.model';

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

export interface UpdateUserRequest {
  name: string;
  avatar?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly usersUrl = `${resolveApiBaseUrl()}/api/users`;

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.usersUrl}/me`);
  }

  updateCurrentUser(payload: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.usersUrl}/me`, payload);
  }
}

