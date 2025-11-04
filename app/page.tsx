'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
// Eliminamos el render directo del Dashboard para usar el layout del grupo

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Si el cliente de Supabase no está disponible, redirige al login
        if (!supabase || !('auth' in supabase)) {
          setHasSession(false);
          router.replace('/login');
          setLoading(false);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          // En caso de error, enviamos al login y liberamos el loader
          console.error('Error obteniendo sesión:', error);
          setHasSession(false);
          router.replace('/login');
        } else if (session) {
          setHasSession(true);
        } else {
          router.replace('/login');
        }

        setLoading(false);
      } catch (err) {
        // Cualquier excepción (p.ej. variables de entorno faltan) no debe dejar el spinner infinito
        console.error('Excepción en checkSession:', err);
        setHasSession(false);
        router.replace('/login');
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si hay sesión, redirigimos al dashboard del grupo
  if (hasSession) {
    router.replace('/dashboard');
  }

  // Sin sesión, el efecto ya redirige a /login
  return null;
}
