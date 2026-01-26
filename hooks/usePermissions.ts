'use client';

/**
 * Hook de Permisos
 * Proporciona los permisos del usuario actual según su rol
 */

import { useMemo } from 'react';
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

  // ✅ FIX: No usar return anticipado en un hook. 
  // Esto rompería la cuenta de hooks en componentes que lo usen
  // si profile es null inicialmente.
  return useMemo(() => {
    if (!profile || !profile.role) {
      return DEFAULT_PERMISSIONS;
    }
    return ROLE_PERMISSIONS[profile.role] || DEFAULT_PERMISSIONS;
  }, [profile]);
}

/**
 * Hook para verificar un permiso específico
 */
export function useHasPermission(permission: keyof RolePermissions): boolean {
  const permissions = usePermissions();
  return permissions[permission];
}
