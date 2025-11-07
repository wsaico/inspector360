'use client';

/**
 * Hook useInspections - Con React Query para cache eficiente
 *
 * OPTIMIZACIONES:
 * - Cache de 5 minutos: reduce queries a Supabase
 * - Filtrado inteligente por estación
 * - Paginación eficiente
 * - Sin re-fetches innecesarios
 */

import { useQuery } from '@tanstack/react-query';
import { InspectionService } from '@/lib/services';
import { useAuth, usePermissions } from '@/hooks';

interface UseInspectionsOptions {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useInspections(options: UseInspectionsOptions = {}) {
  const { page = 1, pageSize = 10, enabled = true } = options;
  const { profile } = useAuth();
  const { canViewAllStations } = usePermissions();

  // Determinar filtro de estación
  const stationFilter = canViewAllStations ? undefined : (profile?.station || undefined);

  return useQuery({
    // Query key: incluye page, pageSize y station para cache específico
    queryKey: ['inspections', { page, pageSize, station: stationFilter }],

    // Query function: llama al servicio
    queryFn: async () => {
      const result = await InspectionService.getInspections({
        page,
        pageSize,
        station: stationFilter,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    },

    // Solo ejecutar si está habilitado y hay perfil
    enabled: enabled && !!profile,

    // Stale time: 2 minutos - evita re-fetches innecesarios
    staleTime: 1000 * 60 * 2,

    // Keep previous data mientras carga nueva página
    placeholderData: (previousData) => previousData,
  });
}
