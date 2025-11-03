import { createBrowserClient } from '@supabase/ssr';

// Evita inicializar Supabase durante SSR/prerender (build) cuando
// las variables de entorno públicas aún no están disponibles.
export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  // En entorno servidor, no se debe usar el cliente del navegador.
  // Se exporta un valor nulo para evitar errores de inicialización.
  : (null as any);
