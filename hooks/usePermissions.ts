'use client';

/**
 * Hook de Permisos
 * Proporciona los permisos del usuario actual según su rol
 */

import { useAuth } from './useAuth';
import { ROLE_PERMISSIONS, RolePermissions } from '@/types/roles';

const DEFAULT_PERMISSIONS: RolePermissions = {
  canManageUsers: false,
  canViewAllStations: false,
  canCreateInspections: false,
  canEditInspections: false,
  canDeleteInspections: false,
  canExportReports: false,
  canAccessSettings: false,
};

export function usePermissions(): RolePermissions {
  const { profile } = useAuth();

  if (!profile) {
    return DEFAULT_PERMISSIONS;
  }

  return ROLE_PERMISSIONS[profile.role];
}

/**
 * Hook para verificar un permiso específico
 */
export function useHasPermission(permission: keyof RolePermissions): boolean {
  const permissions = usePermissions();
  return permissions[permission];
}
