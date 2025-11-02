/**
 * Sistema de Roles y Permisos
 * Define los roles de usuario y sus permisos en el sistema
 */

export type UserRole = 'admin' | 'supervisor' | 'inspector';

export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  INSPECTOR: 'inspector',
} as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  inspector: 'Inspector',
};

export interface RolePermissions {
  canManageUsers: boolean;
  canViewAllStations: boolean;
  canCreateInspections: boolean;
  canEditInspections: boolean;
  canDeleteInspections: boolean;
  canExportReports: boolean;
  canAccessSettings: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canManageUsers: true,
    canViewAllStations: true,
    canCreateInspections: true,
    canEditInspections: true,
    canDeleteInspections: true,
    canExportReports: true,
    canAccessSettings: true,
  },
  supervisor: {
    canManageUsers: false,
    canViewAllStations: false,
    canCreateInspections: true,
    canEditInspections: true,
    canDeleteInspections: false,
    canExportReports: true,
    canAccessSettings: false,
  },
  inspector: {
    canManageUsers: false,
    canViewAllStations: false,
    canCreateInspections: true,
    canEditInspections: false,
    canDeleteInspections: false,
    canExportReports: false,
    canAccessSettings: false,
  },
};

/**
 * Interface de Perfil de Usuario
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  station?: Station;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type Station = 'AQP' | 'CUZ' | 'CIX' | 'TRU' | 'CJA' | 'TPP' | 'PIU';

export const STATIONS: Record<Station, string> = {
  AQP: 'Arequipa',
  CUZ: 'Cusco',
  CIX: 'Chiclayo',
  TRU: 'Trujillo',
  CJA: 'Cajamarca',
  TPP: 'Tarapoto',
  PIU: 'Piura',
};
