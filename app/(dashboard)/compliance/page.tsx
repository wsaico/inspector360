'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth, usePermissions } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Package,
  Calendar,
  Loader2,
  AlertTriangle,
  MapPin,
  Activity,
} from 'lucide-react';
import { ComplianceService } from '@/lib/services/compliance';
import { toast } from 'sonner';
import { STATIONS } from '@/types/roles';
import { StationsService } from '@/lib/services/stations';

export default function CompliancePage() {
  const { profile, loading: profileLoading, user, error, status } = useAuth();
  const { canViewAllStations } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalInspections: 0,
    completedThisMonth: 0,
    complianceRate: 0,
    equipmentInspected: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [topIssues, setTopIssues] = useState<any[]>([]);
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [station, setStation] = useState<string | undefined>(undefined);
  const [dailyCompliance, setDailyCompliance] = useState<{ daysWithInspection: number; daysInMonth: number; rate: number }>({ daysWithInspection: 0, daysInMonth: 0, rate: 0 });
  const [dailyBreakdown, setDailyBreakdown] = useState<any[]>([]);
  const [stationComplianceStatus, setStationComplianceStatus] = useState<any[]>([]);

  // Solo permitir "todas" si realmente tiene permiso o su estación es "todas"
  // Fuerza tipo boolean para evitar uniones con string/undefined que rompen el build
  const showAllStations: boolean = Boolean(
    canViewAllStations || (profile?.station && String(profile?.station).toLowerCase() === 'todas')
  );
  const [stationOptions, setStationOptions] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    // Forzar filtro por estación si el usuario no puede ver todas
    if (!canViewAllStations) {
      const s = profile?.station ? String(profile.station) : undefined;
      setStation(s);
    }
  }, [profile?.station, canViewAllStations]);

  useEffect(() => {
    const loadStations = async () => {
      const res = await StationsService.listAll();
      const active = (res.data || []).filter(s => s.is_active);
      setStationOptions(active.map(s => ({ value: s.code, label: s.name })));
    };
    loadStations();
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    // Evitar cargar si la sesión no está activa
    if (!user) return;
    // Evitar cargar datos globales por un primer render sin estación cuando no tiene permiso.
    if (!showAllStations && !station) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, trendsData, complianceResult, issuesData, daily, stationStatus] = await Promise.all([
          ComplianceService.getOverallStats({ station, month }),
          ComplianceService.getMonthlyTrends({ station, month }),
          ComplianceService.getComplianceBreakdown({ station }),
          ComplianceService.getTopIssues(10, { station }),
          ComplianceService.getDailyCompliance({ station, month, aggregateAll: showAllStations && !station }),
          showAllStations && !station ? ComplianceService.getStationComplianceStatus({ month }) : Promise.resolve({ data: null, error: null }),
        ]);

        if (statsData.data) setStats(statsData.data);
        if (trendsData.data) setMonthlyData(trendsData.data);
        if (complianceResult.data) setComplianceData(complianceResult.data);
        if (issuesData.data) setTopIssues(issuesData.data);
        if (daily.data) {
          setDailyCompliance({ daysWithInspection: daily.data.daysWithInspection, daysInMonth: daily.data.daysInMonth, rate: daily.data.rate });
          setDailyBreakdown(daily.data.breakdown || []);
        }
        if (stationStatus.data) {
          setStationComplianceStatus(stationStatus.data);
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
        toast.error('Error al cargar el dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profileLoading, station, month, showAllStations]);

  const COLORS = ['#10B981', '#F59E0B', '#6366F1', '#EF4444'];

  // Estado de carga: mostrar spinner mientras carga el perfil O los datos
  if (profileLoading || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si no hay usuario después de cargar, el middleware debería redirigir
  // Pero por si acaso, mostramos un mensaje claro
  if (!user) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg font-semibold">No hay sesión activa</p>
        <p className="text-sm text-muted-foreground">
          Por favor inicia sesión para ver el dashboard de cumplimiento
        </p>
      </div>
    );
  }

  const getStationStatusColor = (status: 'on_track' | 'behind' | 'no_inspections') => {
    switch (status) {
      case 'on_track':
        return 'from-green-50 to-emerald-50 border-l-green-500';
      case 'behind':
        return 'from-amber-50 to-yellow-50 border-l-amber-500';
      case 'no_inspections':
        return 'from-red-50 to-rose-50 border-l-red-500';
      default:
        return 'from-gray-50 to-slate-50 border-l-gray-500';
    }
  };

  const getStationStatusBadge = (status: 'on_track' | 'behind' | 'no_inspections') => {
    switch (status) {
      case 'on_track':
        return <Badge className="bg-green-500 hover:bg-green-600">En Meta</Badge>;
      case 'behind':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Bajo Meta</Badge>;
      case 'no_inspections':
        return <Badge className="bg-red-500 hover:bg-red-600">Sin Inspecciones</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Mes</label>
          <input
            type="month"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Estación</label>
          {showAllStations ? (
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={station || ''}
              onChange={(e) => setStation(e.target.value || undefined)}
            >
              <option value="">Todas las Estaciones</option>
              {stationOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          ) : (
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50"
              value={profile?.station || ''}
              readOnly
            />
          )}
        </div>
      </div>

      {/* KPI Cards - Diseño moderno y colorido */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Inspecciones - Azul */}
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 via-blue-25 to-white hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-900">
              Total Inspecciones
            </CardTitle>
            <div className="rounded-full bg-blue-100 p-2.5 shadow-sm">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{stats.totalInspections}</div>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              {showAllStations && !station
                ? 'Todas las estaciones'
                : station
                  ? `Estación ${station}`
                  : 'Inspecciones'}
            </p>
          </CardContent>
        </Card>

        {/* Este Mes - Verde */}
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 via-emerald-25 to-white hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-green-900">Este Mes</CardTitle>
            <div className="rounded-full bg-green-100 p-2.5 shadow-sm">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {stats.completedThisMonth}
            </div>
            <p className="text-xs text-green-600 mt-1 font-medium">
              Completadas en {month.split('-')[1]}/{month.split('-')[0]}
            </p>
          </CardContent>
        </Card>

        {/* Cumplimiento Diario - Púrpura */}
        <Card className={`border-l-4 ${dailyCompliance.rate >= 80 ? 'border-l-purple-500 bg-gradient-to-br from-purple-50 via-violet-25 to-white' : 'border-l-amber-500 bg-gradient-to-br from-amber-50 via-yellow-25 to-white'} hover:shadow-xl transition-all duration-300`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-semibold ${dailyCompliance.rate >= 80 ? 'text-purple-900' : 'text-amber-900'}`}>
              Cumplimiento Diario
            </CardTitle>
            <div className={`rounded-full ${dailyCompliance.rate >= 80 ? 'bg-purple-100' : 'bg-amber-100'} p-2.5 shadow-sm`}>
              <CheckCircle2 className={`h-5 w-5 ${dailyCompliance.rate >= 80 ? 'text-purple-600' : 'text-amber-600'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${dailyCompliance.rate >= 80 ? 'text-purple-700' : 'text-amber-700'}`}>
              {dailyCompliance.rate}%
            </div>
            <p className={`text-xs mt-1 font-medium ${dailyCompliance.rate >= 80 ? 'text-purple-600' : 'text-amber-600'}`}>
              {dailyCompliance.daysWithInspection} días con inspección de {dailyCompliance.daysInMonth}
            </p>
          </CardContent>
        </Card>

        {/* Equipos Inspeccionados - Indigo */}
        <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50 via-blue-25 to-white hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-indigo-900">
              Equipos Inspeccionados
            </CardTitle>
            <div className="rounded-full bg-indigo-100 p-2.5 shadow-sm">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700">{stats.equipmentInspected}</div>
            <p className="text-xs text-indigo-600 mt-1 font-medium">Total de equipos</p>
          </CardContent>
        </Card>
      </div>

      {/* Panel de Cumplimiento por Estación - Solo para Admin/SIG */}
      {showAllStations && !station && stationComplianceStatus.length > 0 && (
        <Card className="border-t-4 border-t-blue-500 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Tracking de Cumplimiento por Estación</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Estado de cada estación • Meta: 80% de cumplimiento diario (1 inspección/día)
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stationComplianceStatus.map((stationData: any) => (
                <Card
                  key={stationData.code}
                  className={`border-l-4 bg-gradient-to-br ${getStationStatusColor(stationData.status)} hover:shadow-md transition-all duration-200`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg text-gray-900">{stationData.code}</h3>
                          {getStationStatusBadge(stationData.status)}
                        </div>
                        <p className="text-sm text-gray-600">{stationData.name}</p>
                      </div>
                      <div className={`rounded-full p-2 ${stationData.status === 'on_track' ? 'bg-green-100' : stationData.status === 'behind' ? 'bg-amber-100' : 'bg-red-100'}`}>
                        {stationData.status === 'on_track' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : stationData.status === 'behind' ? (
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Total Inspecciones:</span>
                        <span className="font-bold text-gray-900">{stationData.count}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Días con Inspección:</span>
                        <span className="font-bold text-gray-900">{stationData.daysWithInspection} / {dailyCompliance.daysInMonth}</span>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">Cumplimiento Diario:</span>
                          <span className={`font-bold ${stationData.complianceRate >= 80 ? 'text-green-700' : stationData.complianceRate >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                            {stationData.complianceRate}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              stationData.complianceRate >= 80
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                : stationData.complianceRate >= 50
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                                  : 'bg-gradient-to-r from-red-500 to-rose-500'
                            }`}
                            style={{ width: `${stationData.complianceRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cumplimiento Diario vs Meta (1 por día) */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            Cumplimiento Diario vs Meta
          </CardTitle>
          <p className="text-sm text-muted-foreground">Meta: Al menos 1 inspección por día</p>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="day"
                label={{ value: 'Día del mes', position: 'insideBottom', offset: -5 }}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <ReferenceLine
                y={1}
                stroke="#10B981"
                strokeDasharray="3 3"
                label={{ value: 'Meta 1/día', fill: '#10B981', position: 'insideTopRight', fontWeight: 'bold' }}
              />
              <Bar dataKey="value" name="Cumplió (≥1 inspección)" radius={[4, 4, 0, 0]}>
                {dailyBreakdown.map((d, idx) => (
                  <Cell key={`cell-${idx}`} fill={d.value === 1 ? '#10B981' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-4 text-xs text-center text-muted-foreground bg-blue-50 py-2 px-4 rounded-lg">
            Se cuenta máximo una inspección completada por día. Verde = cumple meta • Rojo = no cumple meta
          </p>
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Trend */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardTitle>Tendencia Mensual</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="inspections"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  name="Inspecciones"
                  dot={{ fill: '#3B82F6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Compliance Breakdown */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle>Distribución de Cumplimiento</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={complianceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {complianceData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Top 10 No Conformidades
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topIssues}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="code" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="count" fill="#EF4444" name="Cantidad" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle>Resumen por Categoría</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {complianceData.map((category, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border-2 border-gray-100 p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-5 w-5 rounded-full shadow-sm"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-semibold text-gray-900">{category.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 font-medium">
                    {category.value} items
                  </span>
                  <Badge
                    className={`font-bold ${
                      category.name === 'Conforme'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {((category.value / stats.totalInspections) * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
