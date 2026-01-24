"use client"

import { useState, useEffect } from "react"
import { useAuth, usePermissions } from "@/hooks"
import { ComplianceService } from "@/lib/services/compliance"
import { StationsService } from "@/lib/services/stations"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts"
import {
  CheckCircle2, AlertTriangle, XCircle, Calendar,
  TrendingUp, Activity, AlertCircle, FileText
} from "lucide-react"
import { ComplianceChart } from "@/components/dashboard/compliance-chart"
import { ComplianceAlert } from "@/components/dashboard/compliance-alert"
import { ComplianceTrend } from "@/components/dashboard/compliance-trend"
import { StationComplianceChart } from "@/components/dashboard/station-compliance-chart"
import { PendingInspectionsList } from "@/components/dashboard/pending-inspections-list"
import { StationComplianceHeatmap } from "@/components/dashboard/station-compliance-heatmap"

export default function CompliancePage() {
  const { profile, loading: profileLoading, user } = useAuth();
  const { canViewAllStations } = usePermissions();
  const [loading, setLoading] = useState(false);

  // State for filters
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]; // First day of current month
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0]; // Today
  });

  const [station, setStation] = useState<string | undefined>(undefined);
  const [stationsList, setStationsList] = useState<any[]>([]);

  // State for data
  const [stats, setStats] = useState({
    totalInspections: 0,
    completedThisMonth: 0,
    complianceRate: 0,
    equipmentInspected: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [topIssues, setTopIssues] = useState<any[]>([]);
  const [dailyCompliance, setDailyCompliance] = useState<{
    daysWithInspection: number;
    daysInMonth: number;
    daysElapsed: number;
    rate: number;
    breakdown: any[];
  }>({ daysWithInspection: 0, daysInMonth: 0, daysElapsed: 0, rate: 0, breakdown: [] });

  const [stationComplianceStatus, setStationComplianceStatus] = useState<any[]>([]);
  const [stationDailyStatus, setStationDailyStatus] = useState<any[]>([]);

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, startDate, endDate, station]);

  const loadStations = async () => {
    const { data } = await StationsService.listActive();
    if (data) setStationsList(data);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Determine effective station filter
      // If user can't view all, force their station. If they can, use selected or undefined (all)
      const effectiveStation = !canViewAllStations && profile?.station
        ? profile.station
        : station;

      const filters = {
        station: effectiveStation === 'all' ? undefined : effectiveStation,
        startDate,
        endDate
      };

      const [
        statsRes,
        trendsRes,
        complianceRes,
        issuesRes,
        dailyRes,
        stationStatusRes,
        stationDailyStatusRes
      ] = await Promise.all([
        ComplianceService.getOverallStats(filters),
        ComplianceService.getMonthlyTrends(filters),
        ComplianceService.getComplianceBreakdown(filters),
        ComplianceService.getTopIssues(5, filters),
        ComplianceService.getDailyCompliance({ ...filters, aggregateAll: !effectiveStation }),
        ComplianceService.getStationComplianceStatus(filters),
        ComplianceService.getStationDailyStatus(filters)
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (trendsRes.data) setMonthlyData(trendsRes.data);
      if (complianceRes.data) setComplianceData(complianceRes.data);
      if (issuesRes.data) setTopIssues(issuesRes.data);
      if (dailyRes.data) setDailyCompliance(dailyRes.data);
      if (stationStatusRes.data) setStationComplianceStatus(stationStatusRes.data);
      // @ts-ignore
      if (stationDailyStatusRes.data) setStationDailyStatus(stationDailyStatusRes.data);

    } catch (error) {
      console.error("Error loading compliance data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate missed days for the alert
  // Días perdidos = días transcurridos - días con inspección
  const missedDays = Math.max(0, dailyCompliance.daysElapsed - dailyCompliance.daysWithInspection);

  return (
    <div className="space-y-6 p-6 pb-20">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cumplimiento</h1>
          <p className="text-muted-foreground">
            Monitoreo de indicadores clave y cumplimiento normativo
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[140px]"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[140px]"
            />
          </div>

          {canViewAllStations && (
            <Select
              value={station || "all"}
              onValueChange={(v) => setStation(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas las estaciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las estaciones</SelectItem>
                {stationsList.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Alert Section */}
      <ComplianceAlert
        missedDays={missedDays}
        daysInMonth={dailyCompliance.daysInMonth}
        currentDay={dailyCompliance.daysElapsed}
      />

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento Periodo</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dailyCompliance.rate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {dailyCompliance.daysWithInspection} de {dailyCompliance.daysElapsed} días cumplidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inspecciones Totales</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInspections}</div>
            <p className="text-xs text-muted-foreground">
              En el periodo seleccionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conformidad</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complianceRate}%</div>
            <p className="text-xs text-muted-foreground">
              Items conformes vs totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Días Sin Inspección</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${missedDays > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {missedDays}
            </div>
            <p className="text-xs text-muted-foreground">
              Días perdidos en el periodo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart & Ranking Side by Side */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <ComplianceChart
          data={dailyCompliance.breakdown || []}
          daysInMonth={dailyCompliance.daysInMonth}
          currentDay={dailyCompliance.daysWithInspection}
          daysElapsed={dailyCompliance.daysElapsed}
        />
        <ComplianceTrend
          data={stationComplianceStatus || []}
          daysInPeriod={dailyCompliance.daysElapsed}
        />
      </div>

      {/* Heatmap Full Width */}
      <StationComplianceHeatmap
        data={stationDailyStatus || []}
        daysInMonth={dailyCompliance.daysElapsed}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Station Compliance & Pending List */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <StationComplianceChart
            data={stationComplianceStatus || []}
            daysInPeriod={dailyCompliance.daysElapsed}
          />
        </div>
        <PendingInspectionsList data={stationComplianceStatus || []} />
      </div>

      {/* Secondary Charts & Tables */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

        {/* Historical Trend */}
        <Card className="col-span-7 shadow-lg border-t-4 border-t-purple-500">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Activity className="h-6 w-6 text-purple-600" />
                  Tendencia Histórica de Inspecciones
                </CardTitle>
                <CardDescription className="mt-1">
                  Cantidad total de inspecciones completadas por periodo
                </CardDescription>
              </div>
              {monthlyData.length > 0 && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-700">
                    {monthlyData.reduce((sum, item) => sum + (item.inspections || 0), 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Acumulado</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Periodo', position: 'insideBottom', offset: -5, fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Cantidad de Inspecciones', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 12 }}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                  cursor={{ fill: 'rgba(147, 51, 234, 0.1)' }}
                />
                <Bar
                  dataKey="inspections"
                  fill="#9333EA"
                  radius={[8, 8, 0, 0]}
                  name="Inspecciones Completadas"
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
              <div className="h-3 w-3 bg-purple-600 rounded"></div>
              <span>Inspecciones realizadas en cada periodo</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Issues */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Top No Conformidades</CardTitle>
            <CardDescription>
              Items con mayor tasa de fallo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topIssues.map((issue, i) => (
                <div key={i} className="flex items-start py-2 border-b last:border-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                    {i + 1}
                  </div>
                  <div className="ml-3 space-y-1 flex-1">
                    <p className="text-sm font-medium leading-normal text-gray-900">
                      {issue.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Código: {issue.code} • <span className="font-semibold text-red-600">{issue.count} incidencias</span>
                    </p>
                  </div>
                </div>
              ))}
              {topIssues.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No hay datos suficientes
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Desglose de Cumplimiento</CardTitle>
            <CardDescription>
              Estado de items inspeccionados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={complianceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {complianceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.name === 'Conforme' ? '#10b981' :
                        entry.name === 'No Conforme' ? '#ef4444' : '#94a3b8'
                    } />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div >
  )
}
