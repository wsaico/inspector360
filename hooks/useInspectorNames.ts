/**
 * Hooks de React Query para nombres de personal
 * Optimiza queries de nombres únicos con caché inteligente
 */

import { useQuery } from '@tanstack/react-query';
import { InspectionService } from '@/lib/services/inspections';

/**
 * Hook para obtener nombres únicos de supervisores por estación
 * Caché: 30 minutos (los nombres no cambian frecuentemente)
 *
 * @param station - Código de estación
 * @param enabled - Si debe ejecutar la query (default: true si hay station)
 */
export const useSupervisorNames = (station?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['supervisor-names', station],
    queryFn: () => InspectionService.getUniqueSupervisorNames(station!),
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000,    // 1 hora en cache
    enabled: enabled && !!station,
    // Retornar array vacío por defecto para evitar undefined
    select: (data) => (data.data as string[]) || [],
    retry: 1,
  });
};

/**
 * Hook para obtener nombres únicos de mecánicos por estación
 * Caché: 30 minutos
 *
 * @param station - Código de estación
 * @param enabled - Si debe ejecutar la query (default: true si hay station)
 */
export const useMechanicNames = (station?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['mechanic-names', station],
    queryFn: () => InspectionService.getUniqueMechanicNames(station!),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: enabled && !!station,
    select: (data) => (data.data as string[]) || [],
    retry: 1,
  });
};

/**
 * Hook para obtener nombres únicos de inspectores por estación
 * Caché: 30 minutos
 *
 * @param station - Código de estación
 * @param enabled - Si debe ejecutar la query (default: true si hay station)
 */
export const useInspectorNames = (station?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['inspector-names', station],
    queryFn: () => InspectionService.getUniqueInspectorNames(station!),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: enabled && !!station,
    select: (data) => (data.data as string[]) || [],
    retry: 1,
  });
};

/**
 * Hook combinado que precarga todos los nombres para una estación
 * Útil cuando sabes que vas a necesitar todos los tipos de nombres
 *
 * @param station - Código de estación
 * @param enabled - Si debe ejecutar las queries (default: true si hay station)
 */
export const useAllInspectorNames = (station?: string, enabled: boolean = true) => {
  const supervisors = useSupervisorNames(station, enabled);
  const mechanics = useMechanicNames(station, enabled);
  const inspectors = useInspectorNames(station, enabled);

  return {
    supervisors: supervisors.data || [],
    mechanics: mechanics.data || [],
    inspectors: inspectors.data || [],
    isLoading: supervisors.isLoading || mechanics.isLoading || inspectors.isLoading,
    isError: supervisors.isError || mechanics.isError || inspectors.isError,
  };
};
