/**
 * Hooks de React Query para tipos de inspección
 * Optimiza queries a datos estáticos con caché de larga duración
 */

import { useQuery } from '@tanstack/react-query';
import { InspectionTypeService } from '@/lib/services/inspection-types';

/**
 * Hook para obtener todos los tipos de inspección
 * Caché: 1 hora (datos cambian muy raramente)
 *
 * Los tipos de inspección son datos estáticos que solo cambia un admin,
 * por lo que podemos cachearlos por mucho tiempo.
 */
export const useInspectionTypes = () => {
  return useQuery({
    queryKey: ['inspection-types', 'all'],
    queryFn: () => InspectionTypeService.getAll(),
    staleTime: 60 * 60 * 1000, // 1 hora - datos muy estáticos
    gcTime: 24 * 60 * 60 * 1000, // 24 horas en cache
    // Estos datos casi nunca fallan, pero si lo hacen, reintentar
    retry: 2,
    retryDelay: 1000,
  });
};

/**
 * Hook para obtener solo tipos de inspección activos
 * Caché: 1 hora
 *
 * Este es el hook más usado, ya que en formularios solo
 * mostramos los tipos activos.
 */
export const useActiveInspectionTypes = () => {
  return useQuery({
    queryKey: ['inspection-types', 'active'],
    queryFn: () => InspectionTypeService.getActive(),
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 24 * 60 * 60 * 1000, // 24 horas
    retry: 2,
    retryDelay: 1000,
  });
};

/**
 * Hook para obtener un tipo de inspección específico por código
 * Caché: 1 hora
 *
 * @param code - Código del tipo de inspección (ej: 'MONTACARGAS')
 * @param enabled - Si debe ejecutar la query (default: true si hay code)
 */
export const useInspectionTypeByCode = (code?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['inspection-types', 'by-code', code],
    queryFn: () => InspectionTypeService.getByCode(code!),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    enabled: enabled && !!code, // Solo ejecutar si hay código y está habilitado
    retry: 2,
    retryDelay: 1000,
  });
};
