'use client';

import { useEffect, useState } from 'react';
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

export default function CompliancePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInspections: 0,
    completedThisMonth: 0,
    complianceRate: 0,
    equipmentInspected: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [topIssues, setTopIssues] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, trendsData, complianceResult, issuesData] = await Promise.all([
        ComplianceService.getOverallStats(),
        ComplianceService.getMonthlyTrends(),
        ComplianceService.getComplianceBreakdown(),
        ComplianceService.getTopIssues(),
      ]);

      if (statsData.data) setStats(statsData.data);
      if (trendsData.data) setMonthlyData(trendsData.data);
      if (complianceResult.data) setComplianceData(complianceResult.data);
      if (issuesData.data) setTopIssues(issuesData.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#093071', '#8EBB37', '#F59E0B', '#EF4444'];

  if (loading) {
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
            <CardTitle className="text-sm font-medium">
              Tasa de Cumplimiento
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complianceRate}%</div>
            <p className="text-xs text-muted-foreground">
              Items conformes promedio
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
