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
import { useEffect, useMemo, useState } from 'react';
import { ComplianceService } from '@/lib/services/compliance';
import { InspectionService } from '@/lib/services';
import { hasPendingObservations, getMissingSignaturesLabel } from '@/lib/utils';
import { STATIONS } from '@/types/roles';
import { StationsService } from '@/lib/services/stations';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { profile, error, user, status, loading: authLoading } = useAuth();
  const { canCreateInspections, canViewAllStations } = usePermissions();

  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [station, setStation] = useState<string | undefined>(undefined);
  const [stats, setStats] = useState({
    totalInspections: 0,
    completedThisMonth: 0,
    pendingReview: 0,
    complianceRate: 0,
  });

  // No elevar a global por "estación vacía"; solo admin/SIG o estación explícita "todas"
  const showAllStations = canViewAllStations || String(profile?.station || '').toLowerCase() === 'todas';

  useEffect(() => {
    if (!showAllStations && profile?.station) {
      setStation(profile.station);
    }
  }, [profile?.station, showAllStations]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Evitar cargar si la sesión no está activa
        if (!user) {
          return;
        }
        // Evitar cargar datos globales si el usuario no puede ver todas
        // y aún no se ha establecido su estación.
        if (!showAllStations && !station) {
          return;
        }
        const overall = await ComplianceService.getOverallStats({ station, month });
        const daily = await ComplianceService.getDailyCompliance({ station, month, aggregateAll: showAllStations && !station });

        const total = overall.data?.totalInspections || 0;
        const completed = overall.data?.completedThisMonth || 0;
        const complianceRate = daily.data?.rate || 0;

        // Calcular pendientes: inspecciones con observaciones del operador sin respuesta del mecánico
        // o con firmas faltantes, dentro del rango del mes seleccionado y alcance de estación.
        const { start, end } = ComplianceService.getMonthRange(month);
        // Obtener inspecciones ya filtradas por estación y mes para evitar mezclar estaciones
        const { data: scoped } = await InspectionService.getInspections({ station: station || undefined, start, end });

        const pendingReview = (scoped || []).reduce((acc: number, i: any) => {
          const hasPending = hasPendingObservations(i) || !!getMissingSignaturesLabel(i);
          return acc + (hasPending ? 1 : 0);
        }, 0);

        setStats({
          totalInspections: total,
          completedThisMonth: completed,
          pendingReview,
          complianceRate,
        });
      } catch (e) {
        console.error(e);
        toast.error('No se pudo cargar estadísticas');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [station, month, showAllStations]);

  const [stationOptions, setStationOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    const loadStations = async () => {
      const res = await StationsService.listAll();
      const active = (res.data || []).filter(s => s.is_active);
      setStationOptions(active.map(s => ({ value: s.code, label: s.name })));
    };
    loadStations();
  }, []);

  // Mostrar loader mientras se carga la autenticación o los datos
  if (authLoading || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <ClipboardList className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario después de cargar, mostrar mensaje claro
  if (!user) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-lg font-semibold">No hay sesión activa</p>
        <p className="text-sm text-muted-foreground">
          Por favor inicia sesión para acceder al dashboard
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          Bienvenido{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h2>
        <p className="mt-2 text-gray-600">
          {profile?.station
            ? `Estación: ${profile.station}`
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

      {/* Filtros */}
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs text-gray-500">Mes</label>
          <input
            type="month"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Estación</label>
          {showAllStations ? (
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              value={station || ''}
              onChange={(e) => setStation(e.target.value || undefined)}
            >
              <option value="">Todas</option>
              {stationOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          ) : (
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-gray-100"
              value={profile?.station || ''}
              readOnly
            />
          )}
        </div>
      </div>

      {/* Statistics - Diseño moderno y colorido */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Inspecciones - Azul */}
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">
              Total Inspecciones
            </CardTitle>
            <div className="rounded-full bg-blue-100 p-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{stats.totalInspections}</div>
            <p className="text-xs text-blue-600 mt-1">
              {showAllStations && !station
                ? 'Todas las estaciones'
                : station
                  ? `Estación ${station}`
                  : 'Inspecciones'}
            </p>
          </CardContent>
        </Card>

        {/* Este Mes - Verde */}
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-white hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900">Este Mes</CardTitle>
            <div className="rounded-full bg-green-100 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {stats.completedThisMonth}
            </div>
            <p className="text-xs text-green-600 mt-1">
              Completadas en {month.split('-')[1]}/{month.split('-')[0]}
            </p>
          </CardContent>
        </Card>

        {/* Pendientes - Amarillo/Naranja */}
        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-white hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-900">Pendientes</CardTitle>
            <div className="rounded-full bg-amber-100 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">{stats.pendingReview}</div>
            <p className="text-xs text-amber-600 mt-1">
              {stats.pendingReview === 0 ? '¡Todo al día!' : 'Requieren atención'}
            </p>
          </CardContent>
        </Card>

        {/* Cumplimiento - Púrpura */}
        <Card className={`border-l-4 ${stats.complianceRate >= 80 ? 'border-l-purple-500 bg-gradient-to-br from-purple-50 to-white' : 'border-l-red-500 bg-gradient-to-br from-red-50 to-white'} hover:shadow-lg transition-all`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${stats.complianceRate >= 80 ? 'text-purple-900' : 'text-red-900'}`}>
              Cumplimiento
            </CardTitle>
            <div className={`rounded-full ${stats.complianceRate >= 80 ? 'bg-purple-100' : 'bg-red-100'} p-2`}>
              <TrendingUp className={`h-5 w-5 ${stats.complianceRate >= 80 ? 'text-purple-600' : 'text-red-600'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${stats.complianceRate >= 80 ? 'text-purple-700' : 'text-red-700'}`}>
              {stats.complianceRate}%
            </div>
            <p className={`text-xs mt-1 ${stats.complianceRate >= 80 ? 'text-purple-600' : 'text-red-600'}`}>
              {stats.complianceRate >= 80 ? '¡Excelente!' : 'Meta: 80%'} • 1/día
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