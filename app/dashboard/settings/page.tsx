'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Shield, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  // Redirect non-admins after profile loads
  useEffect(() => {
    if (!loading && profile && profile.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [profile, loading, router]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-lg text-muted-foreground">
          No tienes permisos para acceder a esta página
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Configuración</h2>
        <p className="mt-2 text-gray-600">
          Administra los ajustes del sistema
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Gestión de Usuarios */}
        <Link href="/dashboard/settings/users">
          <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Usuarios</CardTitle>
                  <CardDescription>Gestionar usuarios y roles</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Crear, editar y administrar usuarios del sistema
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Permisos (placeholder) */}
        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Shield className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>Permisos</CardTitle>
                <CardDescription>Configurar permisos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Próximamente
            </p>
          </CardContent>
        </Card>

        {/* Sistema (placeholder) */}
        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <SettingsIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>Sistema</CardTitle>
                <CardDescription>Configuración general</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Próximamente
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
