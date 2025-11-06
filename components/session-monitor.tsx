'use client';

/**
 * Componente Monitor de Sesión
 *
 * Detecta cuando la sesión expira y notifica al usuario de forma clara
 * Previene el problema de "sesión fantasma" donde la UI parece funcionar
 * pero las operaciones de BD fallan silenciosamente
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setupSessionMonitor } from '@/lib/supabase/session-validator';
import { useAuth } from '@/hooks/useAuth';

export function SessionMonitor() {
  const router = useRouter();
  const { user } = useAuth();
  const [hasShownWarning, setHasShownWarning] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasShownWarning(false);
      return;
    }

    const cleanup = setupSessionMonitor(
      // onSessionExpired
      () => {
        if (!hasShownWarning) {
          console.warn('[SessionMonitor] Sesión expirada detectada');

          toast.error('Tu sesión ha expirado', {
            description: 'Por favor inicia sesión nuevamente para continuar',
            duration: 6000,
            action: {
              label: 'Iniciar Sesión',
              onClick: () => router.push('/login'),
            },
          });

          setHasShownWarning(true);

          // Limpiar localStorage
          try {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('i360.auth.persist');
            }
          } catch (e) {
            console.warn('[SessionMonitor] Error limpiando localStorage:', e);
          }

          // Redirigir después de un momento
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
      },
      // onSessionRestored
      () => {
        if (hasShownWarning) {
          console.log('[SessionMonitor] Sesión restaurada');
          toast.success('Sesión restaurada correctamente');
          setHasShownWarning(false);
        }
      }
    );

    return cleanup;
  }, [user, hasShownWarning, router]);

  return null; // Este componente no renderiza nada
}
