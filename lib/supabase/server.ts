import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cliente Supabase para Server Components y API Routes
 * Usa cookies para manejar la sesión de forma segura
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // El método `setAll` fue llamado desde un Server Component.
            // Esto puede ser ignorado si tienes middleware refrescando
            // las cookies del usuario.
          }
        },
      },
    }
  );
}

/**
 * Valida que el usuario tenga una sesión activa
 * Usa getUser() en lugar de getSession() para validación real con el servidor
 * @returns Usuario autenticado o null si no hay sesión válida
 */
export async function validateSession() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: error?.message || 'No authenticated' };
  }

  return { user, error: null };
}
