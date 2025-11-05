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
} from 'lucide-react';
import { ComplianceService } from '@/lib/services/compliance';
import { toast } from 'sonner';
import { STATIONS } from '@/types/roles';
import { StationsService } from '@/lib/services/stations';

export default function CompliancePage() {
  const { profile, loading: profileLoading } = useAuth();
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

    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, trendsData, complianceResult, issuesData, daily] = await Promise.all([
          ComplianceService.getOverallStats({ station, month }),
          ComplianceService.getMonthlyTrends({ station, month }),
          ComplianceService.getComplianceBreakdown({ station }),
          ComplianceService.getTopIssues(10, { station }),
          ComplianceService.getDailyCompliance({ station, month, aggregateAll: showAllStations && !station }),
        ]);

        if (statsData.data) setStats(statsData.data);
        if (trendsData.data) setMonthlyData(trendsData.data);
        if (complianceResult.data) setComplianceData(complianceResult.data);
        if (issuesData.data) setTopIssues(issuesData.data);
        if (daily.data) {
          setDailyCompliance({ daysWithInspection: daily.data.daysWithInspection, daysInMonth: daily.data.daysInMonth, rate: daily.data.rate });
          setDailyBreakdown(daily.data.breakdown || []);
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

  const COLORS = ['#093071', '#8EBB37', '#F59E0B', '#EF4444'];

  if (profileLoading || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Dashboard de Cumplimiento</h2>
        <p className="text-sm text-muted-foreground">
          Métricas y estadísticas de inspecciones
        </p>
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Inspecciones
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInspections}</div>
            <p className="text-xs text-muted-foreground">
              Todas las inspecciones registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Inspecciones completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento Diario</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyCompliance.rate}%</div>
            <p className="text-xs text-muted-foreground">
              {dailyCompliance.daysWithInspection} días con inspección de {dailyCompliance.daysInMonth}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Equipos Inspeccionados
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.equipmentInspected}</div>
            <p className="text-xs text-muted-foreground">Total de equipos</p>
          </CardContent>
        </Card>
      </div>

      {/* Cumplimiento Diario vs Meta (1 por día) */}
      <Card>
        <CardHeader>
          <CardTitle>Cumplimiento Diario vs Meta</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" label={{ value: 'Día del mes', position: 'insideBottom', offset: -5 }} />
              <YAxis domain={[0, 1]} ticks={[0, 1]} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={1} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Meta 1/día', fill: '#10B981', position: 'insideTopRight' }} />
              <Bar dataKey="value" name="Cumplió (≥1 inspección)">
                {dailyBreakdown.map((d, idx) => (
                  <Cell key={`cell-${idx}`} fill={d.value === 1 ? '#22C55E' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-muted-foreground">
            Se cuenta máximo una inspección completada por día.
          </p>
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="inspections"
                  stroke="#093071"
                  strokeWidth={2}
                  name="Inspecciones"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Compliance Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Cumplimiento</CardTitle>
          </CardHeader>
          <CardContent>
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 No Conformidades</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topIssues}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="code" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#EF4444" name="Cantidad" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {complianceData.map((category, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {category.value} items
                  </span>
                  <Badge
                    variant={
                      category.name === 'Conforme' ? 'success' : 'destructive'
                    }
                  >
                    {((category.value / stats.totalInspections) * 100).toFixed(
                      1
                    )}
                    %
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