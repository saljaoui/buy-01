import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api/api-client.service';
import { User } from '../models/user.model';

export interface UpdateUserRequest {
  name: string;
  avatar?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiClient);

  getCurrentUser(): Observable<User> {
    return this.api.get<User>('/users/me');
  }

  updateCurrentUser(payload: UpdateUserRequest): Observable<User> {
    return this.api.put<User>('/users/me', payload);
  }
}
