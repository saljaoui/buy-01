export type UserRole = 'CLIENT' | 'SELLER';

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
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
}

export interface RegisterResponse {
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
