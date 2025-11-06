/**
 * Validador de Sesión - Sistema de Detección de Sesiones Expiradas
 *
 * Este módulo previene el problema de "sesión fantasma" donde la UI muestra
 * que el usuario está autenticado pero las operaciones de BD fallan silenciosamente.
 *
 * Características:
 * - Valida sesión antes de cada operación de BD
 * - Detecta errores de autenticación (401, 403)
 * - Notifica al usuario cuando la sesión expira
 * - Redirige automáticamente al login si es necesario
 */

import { supabase } from './client';

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

/**
 * Valida que exista una sesión activa antes de ejecutar operaciones
 * IMPORTANTE: Usa getUser() para validación real, no getSession()
 */
export async function validateActiveSession(): Promise<boolean> {
  try {
    // getUser() hace una llamada al servidor para validar el token
    // getSession() solo lee del localStorage y puede estar desactualizado
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.warn('[SessionValidator] No active session detected:', error?.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[SessionValidator] Error validating session:', error);
    return false;
  }
}

/**
 * Wrapper para ejecutar operaciones de BD con validación de sesión
 * Lanza SessionError si la sesión no es válida
 */
export async function withSessionValidation<T>(
  operation: () => Promise<T>,
  operationName: string = 'Database operation'
): Promise<T> {
  const isValid = await validateActiveSession();

  if (!isValid) {
    throw new SessionError(`Session expired. Please login again to continue with: ${operationName}`);
  }

  try {
    return await operation();
  } catch (error: any) {
    // Detectar errores de autenticación comunes
    const isAuthError =
      error?.message?.includes('JWT') ||
      error?.message?.includes('expired') ||
      error?.message?.includes('not authenticated') ||
      error?.code === 'PGRST301' || // PostgREST JWT expired
      error?.code === '401' ||
      error?.code === '403';

    if (isAuthError) {
      console.error('[SessionValidator] Authentication error detected:', error);
      throw new SessionError(`Session expired during operation: ${operationName}`);
    }

    // Re-lanzar otros errores sin modificar
    throw error;
  }
}

/**
 * Maneja errores de sesión mostrando notificación y redirigiendo al login
 */
export function handleSessionError(error: unknown, router?: any, toast?: any): boolean {
  if (error instanceof SessionError) {
    console.error('[SessionValidator] Session error:', error.message);

    // Mostrar notificación al usuario
    if (toast) {
      toast.error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', {
        duration: 5000,
      });
    }

    // Limpiar datos locales de sesión
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('i360.auth.persist');
        sessionStorage.clear();
      }
    } catch (e) {
      console.warn('[SessionValidator] Could not clear local storage:', e);
    }

    // Cerrar sesión explícitamente
    supabase.auth.signOut().catch((e: any) => {
      console.warn('[SessionValidator] Error during signOut:', e);
    });

    // Redirigir al login
    if (router) {
      setTimeout(() => {
        router.push('/login');
      }, 1000);
    } else if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }

    return true;
  }

  return false;
}

/**
 * Detecta si un error es relacionado con autenticación
 */
export function isAuthenticationError(error: any): boolean {
  if (!error) return false;

  const message = error?.message?.toLowerCase() || '';
  const code = error?.code?.toString() || '';

  return (
    message.includes('jwt') ||
    message.includes('expired') ||
    message.includes('not authenticated') ||
    message.includes('unauthorized') ||
    message.includes('invalid token') ||
    code === 'PGRST301' ||
    code === '401' ||
    code === '403'
  );
}

/**
 * Monitor de sesión en tiempo real
 * Escucha eventos de cambio de autenticación
 */
export function setupSessionMonitor(
  onSessionExpired: () => void,
  onSessionRestored?: () => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event: any, session: any) => {
      console.log('[SessionMonitor] Auth state changed:', event);

      switch (event) {
        case 'SIGNED_OUT':
        case 'USER_DELETED':
          console.warn('[SessionMonitor] Session ended:', event);
          onSessionExpired();
          break;

        case 'TOKEN_REFRESHED':
          console.log('[SessionMonitor] Token refreshed successfully');
          if (onSessionRestored) {
            onSessionRestored();
          }
          break;

        case 'SIGNED_IN':
          console.log('[SessionMonitor] User signed in');
          if (onSessionRestored) {
            onSessionRestored();
          }
          break;
      }
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}
