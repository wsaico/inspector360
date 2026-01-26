import { useQuery } from '@tanstack/react-query';
import { StationsService, StationConfig } from '@/lib/services/stations';

/**
 * Hook para gestionar estaciones con cache.
 * Útil para filtros y selectores que se montan/desmontan frecuentemente.
 */
export function useStations(options?: { activeOnly?: boolean }) {
    const activeOnly = options?.activeOnly ?? true; // Por defecto solo activas
    const queryKey = ['stations', { activeOnly }];

    const query = useQuery({
        queryKey,
        queryFn: async () => {
            const { data, error } = activeOnly
                ? await StationsService.listActive()
                : await StationsService.listAll();

            if (error) throw new Error(error);
            return data || [];
        },
        staleTime: 1000 * 60 * 60, // 1 hora de cache (muy estable)
        refetchOnWindowFocus: false,
    });

    return {
        stations: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
    };
}
