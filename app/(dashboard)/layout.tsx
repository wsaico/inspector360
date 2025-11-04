'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuth } from '@/hooks';

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [authTimeout, setAuthTimeout] = useState(false);
  // Modo desarrollo sin Supabase: permitir acceso al dashboard sin bloquear
  const devNoAuth = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Redirección basada en estado de autenticación centralizado
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  // Guardia: si la autenticación tarda demasiado, cortamos el spinner
  useEffect(() => {
    if (loading && !authTimeout) {
      const t = setTimeout(() => setAuthTimeout(true), 6000);
      return () => clearTimeout(t);
    }
  }, [loading, authTimeout]);

  if (devNoAuth) {
    // Entorno sin Supabase configurado: no bloquear navegación
    return <DashboardShell>{children}</DashboardShell>;
  }

  if (loading && !authTimeout) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loading && authTimeout) {
    // Fallback limpio: mensaje y acceso a login sin spinner infinito
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-lg border bg-white p-6 shadow">
          <p className="text-sm text-muted-foreground">
            La validación de sesión está tardando demasiado.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm"
              onClick={() => router.replace('/login')}
            >
              Ir a login
            </button>
            <button
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-white"
              onClick={() => location.reload()}
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <DashboardShell>{children}</DashboardShell>;
}