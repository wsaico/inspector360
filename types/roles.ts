/**
 * Sistema de Roles y Permisos
 * Define los roles de usuario y sus permisos en el sistema
 */

export type UserRole = 'admin' | 'supervisor' | 'sig';

export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  SIG: 'sig',
} as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  sig: 'SIG',
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
  sig: {
    canManageUsers: false,
    canViewAllStations: true,
    canCreateInspections: false,
    canEditInspections: false,
    canDeleteInspections: false,
    canExportReports: true,
    canAccessSettings: false,
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
};

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
