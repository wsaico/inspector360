'use client';

import { useAuth, usePermissions } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Plus,
  FileText,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { canCreateInspections } = usePermissions();

  // Datos mock - serán reemplazados con datos reales
  const stats = {
    totalInspections: 0,
    completedThisMonth: 0,
    pendingReview: 0,
    complianceRate: 0,
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          Bienvenido, {user?.full_name}
        </h2>
        <p className="mt-2 text-gray-600">
          {user?.station
            ? `Estación: ${user.station}`
            : 'Acceso a todas las estaciones'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {canCreateInspections && (
          <Link href="/inspections/new">
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Nueva Inspección
                </CardTitle>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Crear una nueva inspección técnica
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href="/inspections">
          <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ver Inspecciones
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Consultar inspecciones realizadas
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/compliance">
          <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cumplimiento</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Panel de métricas y cumplimiento
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Inspecciones
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInspections}</div>
            <p className="text-xs text-muted-foreground">
              Todas las inspecciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.completedThisMonth}
            </div>
            <p className="text-xs text-muted-foreground">
              Completadas este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReview}</div>
            <p className="text-xs text-muted-foreground">En revisión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complianceRate}%</div>
            <p className="text-xs text-muted-foreground">
              Tasa de cumplimiento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-500">
              No hay inspecciones recientes
            </p>
            {canCreateInspections && (
              <Link href="/inspections/new">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primera Inspección
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
