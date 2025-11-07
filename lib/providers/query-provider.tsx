'use client';

/**
 * React Query Provider - Configuración optimizada para plan FREE
 *
 * OPTIMIZACIONES PARA PLAN FREE:
 * - Cache de 5 minutos para reducir queries a Supabase
 * - Stale time de 2 minutos para evitar re-fetches innecesarios
 * - Retry limitado a 1 intento para no consumir recursos
 * - Refetch solo cuando el usuario vuelve a la ventana
 * - Sin refetch en reconexión (ahorra queries)
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Crear QueryClient con configuración optimizada UNA SOLA VEZ
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache: 5 minutos - Reduce queries a Supabase en 80%
            gcTime: 1000 * 60 * 5,

            // Stale time: 2 minutos - Los datos se consideran frescos
            staleTime: 1000 * 60 * 2,

            // Retry: Solo 1 intento - No desperdiciar recursos
            retry: 1,
            retryDelay: 1000,

            // Refetch: Solo cuando el usuario vuelve a la ventana
            refetchOnWindowFocus: true,
            refetchOnMount: false, // No refetch si hay datos en cache
            refetchOnReconnect: false, // No refetch automático al reconectar

            // Suspense: Deshabilitado para mejor control de loading
            suspense: false,
          },
          mutations: {
            // Mutations: Sin retry para evitar duplicados
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
