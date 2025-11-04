'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { supabase } from '@/lib/supabase/client';

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const verifySession = async () => {
      try {
        // Si el cliente de Supabase no está disponible, redirige al login y evita spinner infinito
        if (!supabase || !('auth' in supabase)) {
          setAuthorized(false);
          router.replace('/login');
          setLoading(false);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          // Ante cualquier error, enviamos al login y liberamos el loader
          setAuthorized(false);
          router.replace('/login');
        } else {
          if (session) {
            setAuthorized(true);
          } else {
            setAuthorized(false);
            router.replace('/login');
          }
        }
      } catch (err) {
        // Cualquier error: no autorizado y redirigir a login
        setAuthorized(false);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <DashboardShell>{children}</DashboardShell>;
}