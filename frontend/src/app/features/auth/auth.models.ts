import { UserRole } from '../../core/models/user.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string | null;
}

export interface AuthResponse {
  token: string;
  type?: string;
  user?: AuthUser;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}
