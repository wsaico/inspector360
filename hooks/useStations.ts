/**
 * Hooks de React Query para estaciones
 * Optimiza queries de estaciones con caché de larga duración
 */

import { useQuery } from '@tanstack/react-query';
import { StationsService } from '@/lib/services/stations';

/**
 * Hook para obtener todas las estaciones
 * Caché: 1 hora (estaciones cambian muy raramente)
 */
export const useStations = () => {
  return useQuery({
    queryKey: ['stations', 'all'],
    queryFn: () => StationsService.listAll(),
    staleTime: 60 * 60 * 1000, // 1 hora - datos muy estáticos
    gcTime: 24 * 60 * 60 * 1000, // 24 horas en cache
    select: (data) => data.data || [],
    retry: 2,
    retryDelay: 1000,
  });
};

/**
 * Hook para obtener solo estaciones activas
 * Caché: 1 hora
 *
 * Este es el hook más usado, ya que en formularios y filtros
 * solo mostramos estaciones activas.
 */
export const useActiveStations = () => {
  return useQuery({
    queryKey: ['stations', 'active'],
    queryFn: async () => {
      const result = await StationsService.listAll();
      return result.data?.filter(s => s.is_active) || [];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });
};

/**
 * Hook para obtener opciones de estaciones formateadas para <select>
 * Caché: 1 hora
 *
 * Retorna array de { value: string, label: string } listo para usar
 * en componentes de selección.
 */
export const useStationOptions = () => {
  return useQuery({
    queryKey: ['stations', 'options'],
    queryFn: async () => {
      const result = await StationsService.listAll();
      const active = result.data?.filter(s => s.is_active) || [];
      return active.map(s => ({ value: s.code, label: s.name }));
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });
};
