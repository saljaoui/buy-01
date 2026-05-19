export type UserRole = 'CLIENT' | 'SELLER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string | null;
}

export interface UpdateUserRequest {
  name: string;
  avatar?: string | null;
}