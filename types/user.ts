/**
 * Tipos para Usuarios
 */

import { UserRole, Station } from './roles';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  station: Station | null;
  is_active: boolean;
  created_at: string;
  created_by?: string;
  updated_at?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  station?: Station | null;
}

export interface UpdateUserData {
  full_name?: string;
  role?: UserRole;
  station?: Station | null;
  is_active?: boolean;
}
