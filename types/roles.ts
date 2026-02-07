/**
 * Sistema de Roles y Permisos
 * Define los roles de usuario y sus permisos en el sistema
 */

export type UserRole = 'admin' | 'supervisor' | 'inspector' | 'sig' | 'operador' | 'mecanico';

export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  INSPECTOR: 'inspector',
  SIG: 'sig',
  OPERADOR: 'operador',
  MECANICO: 'mecanico',
} as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  inspector: 'Inspector',
  sig: 'SIG',
  operador: 'Operador',
  mecanico: 'Mecánico',
};

export interface RolePermissions {
  canManageUsers: boolean;
  canManageEmployees: boolean; // Gestionar empleados (crear, editar, cesar)
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
    canManageEmployees: true,
    canViewAllStations: true,
    canCreateInspections: true,
    canEditInspections: true,
    canDeleteInspections: true,
    canExportReports: true,
    canAccessSettings: true,
  },
  supervisor: {
    canManageUsers: false,
    canManageEmployees: true, // Puede gestionar empleados de su estación
    canViewAllStations: false,
    canCreateInspections: true,
    canEditInspections: true,
    canDeleteInspections: false,
    canExportReports: true,
    canAccessSettings: true, // Ahora puede acceder a configuración
  },
  inspector: {
    canManageUsers: false,
    canManageEmployees: false,
    canViewAllStations: false,
    canCreateInspections: true,
    canEditInspections: false,
    canDeleteInspections: false,
    canExportReports: false,
    canAccessSettings: false,
  },
  sig: {
    canManageUsers: false,
    canManageEmployees: false,
    canViewAllStations: true,
    canCreateInspections: false,
    canEditInspections: false,
    canDeleteInspections: false,
    canExportReports: true,
    canAccessSettings: false,
  },
  operador: {
    canManageUsers: false,
    canManageEmployees: false,
    canViewAllStations: false,
    canCreateInspections: true,
    canEditInspections: true,
    canDeleteInspections: false,
    canExportReports: true,
    canAccessSettings: false,
  },
  mecanico: {
    canManageUsers: false,
    canManageEmployees: false,
    canViewAllStations: false,
    canCreateInspections: true,
    canEditInspections: true,
    canDeleteInspections: false,
    canExportReports: true,
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

export type Station = string;

export const STATIONS: Record<Station, string> = {
  AQP: 'Arequipa',
  CUZ: 'Cusco',
  CIX: 'Chiclayo',
  TRU: 'Trujillo',
  CJA: 'Cajamarca',
  TPP: 'Tarapoto',
  PIU: 'Piura',
};
