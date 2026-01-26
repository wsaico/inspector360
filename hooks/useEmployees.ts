import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafetyTalksService } from '@/lib/services/safety-talks';
import { Employee } from '@/types/safety-talks';

/**
 * Hook para gestionar empleados con cache.
 * Evita llamadas redundantes cuando hay múltiples selectores en la misma página.
 */
export function useEmployees(stationCode?: string) {
    const queryClient = useQueryClient();
    const queryKey = ['employees', stationCode];

    // Query principal: Listar empleados
    const query = useQuery({
        queryKey,
        queryFn: async () => {
            if (!stationCode) return [];
            const { data, error } = await SafetyTalksService.listEmployees({
                station: stationCode,
                activeOnly: true,
                pageSize: 1000 // Traer todos para el selector
            });
            if (error) throw new Error(error);
            return data || [];
        },
        enabled: !!stationCode, // Solo ejecutar si hay estación
        staleTime: 1000 * 60 * 10, // 10 minutos de cache (datos estables)
        refetchOnWindowFocus: false,
    });

    // Mutación: Agregar empleado nuevo (Quick Create)
    // Actualiza el cache optimísticamente o lo invalida
    const addEmployeeMutation = useMutation({
        mutationFn: async (employee: Partial<Employee>) => {
            // Nota: EmployeeSelect usa SafetyTalksService.create/upsert internamente
            // Este es un placeholder por si queremos centralizar la creación aquí
            // Por ahora el QuickCreateDialog maneja la creación, aquí solo exponemos invalidación
            return null;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        }
    });

    // Función helper para forzar recarga
    const invalidateEmployees = () => {
        queryClient.invalidateQueries({ queryKey });
    };

    return {
        employees: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        invalidateEmployees,
    };
}
