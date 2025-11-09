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
  station?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export function useInspections(options: UseInspectionsOptions = {}) {
  const { page = 1, pageSize = 10, enabled = true, station: filterStation, status, startDate, endDate } = options;
  const { profile, user } = useAuth();
  const { canViewAllStations } = usePermissions();

  // ✅ FIX CRÍTICO: Determinar filtro de estación de forma ESTABLE
  // Usar user.id para mantener queryKey consistente incluso si profile es null temporalmente
  const userId = user?.id;
  // Priorizar filterStation (filtro manual), sino usar estación del perfil si no puede ver todas
  const stationFilter = filterStation || (canViewAllStations ? undefined : (profile?.station || undefined));

  return useQuery({
    // ✅ Query key ESTABLE: usa userId en vez de station cuando no hay profile
    // Esto evita que el cache se invalide cuando profile es null temporalmente
    queryKey: ['inspections', {
      page,
      pageSize,
      station: stationFilter,
      status,
      startDate,
      endDate,
      userId: !canViewAllStations ? userId : undefined, // Mantiene cache estable
    }],

    // Query function: llama al servicio
    queryFn: async () => {
      const result = await InspectionService.getInspections({
        page,
        pageSize,
        station: stationFilter,
        status,
        start: startDate,
        end: endDate,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    },

    // ✅ FIX CRÍTICO: Solo requiere USER (no profile)
    // Profile puede estar cargando en background, pero user ya está disponible
    enabled: enabled && !!user,

    // Cache por 30 segundos para mejor rendimiento
    staleTime: 30000,

    // Refetch automático cuando la ventana recupera el foco
    refetchOnWindowFocus: true,

    // ✅ Keep previous data mientras carga nueva página o profile
    placeholderData: (previousData) => previousData,
  });
}
