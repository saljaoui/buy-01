export type UserRole = 'CLIENT' | 'SELLER';

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
  email: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}
