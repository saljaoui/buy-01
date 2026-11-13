import { HttpClient, HttpEventType } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, filter, map } from 'rxjs';
import { ApiClient } from '../api/api-client.service';
import { User } from '../models/user.model';

export interface UpdateUserRequest {
  name: string;
  avatar?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiClient);
  private readonly http = inject(HttpClient);

  getCurrentUser(): Observable<User> {
    return this.api.get<User>('/users/me');
  }

  updateCurrentUser(payload: UpdateUserRequest): Observable<User> {
    return this.api.put<User>('/users/me', payload);
  }

  /** Same request as updateCurrentUser, reporting upload progress (useful when it carries a photo). */
  updateCurrentUserWithProgress(
    payload: UpdateUserRequest,
  ): Observable<{ type: 'progress'; percent: number } | { type: 'done'; user: User }> {
    return this.http.put<User>(this.api.url('/users/me'), payload, { reportProgress: true, observe: 'events' }).pipe(
      filter((e) => e.type === HttpEventType.UploadProgress || e.type === HttpEventType.Response),
      map((e) => {
        if (e.type === HttpEventType.Response) return { type: 'done' as const, user: e.body as User };
        const total = 'total' in e && e.total ? e.total : 1;
        return { type: 'progress' as const, percent: Math.min(99, Math.round((('loaded' in e ? e.loaded : 0) / total) * 100)) };
      }),
    );
  }
}
