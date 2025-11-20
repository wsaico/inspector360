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
import { TopStations } from "@/components/dashboard/top-stations"
import { StationComplianceChart } from "@/components/dashboard/station-compliance-chart"
import { PendingInspectionsList } from "@/components/dashboard/pending-inspections-list"

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
    rate: number;
    breakdown: any[];
  }>({ daysWithInspection: 0, daysInMonth: 0, rate: 0, breakdown: [] });

  const [stationComplianceStatus, setStationComplianceStatus] = useState<any[]>([]);

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
        stationStatusRes
      ] = await Promise.all([
        ComplianceService.getOverallStats(filters),
        ComplianceService.getMonthlyTrends(filters),
        ComplianceService.getComplianceBreakdown(filters),
        ComplianceService.getTopIssues(5, filters),
        ComplianceService.getDailyCompliance({ ...filters, aggregateAll: !effectiveStation }),
        ComplianceService.getStationComplianceStatus(filters)
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (trendsRes.data) setMonthlyData(trendsRes.data);
      if (complianceRes.data) setComplianceData(complianceRes.data);
      if (issuesRes.data) setTopIssues(issuesRes.data);
      if (dailyRes.data) setDailyCompliance(dailyRes.data);
      if (stationStatusRes.data) setStationComplianceStatus(stationStatusRes.data);

    } catch (error) {
      console.error("Error loading compliance data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate missed days for the alert
  // We need to know how many days have passed in the selected range up to "today" (or end date if in past)
  const calculateMissedDays = () => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    // The effective end date for counting "missed" days is the lesser of:
    // 1. The selected end date
    // 2. Today (we can't miss days in the future)
    const effectiveEnd = end < today ? end : today;

    // If start is in future, 0 missed
    if (start > today) return 0;

    // Calculate total days expected so far
    const diffTime = Math.abs(effectiveEnd.getTime() - start.getTime());
    const daysExpected = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start day

    // Missed = Expected - Actual
    // Ensure we don't return negative if data is weird
    return Math.max(0, daysExpected - dailyCompliance.daysWithInspection);
  };

  const missedDays = calculateMissedDays();

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
        daysInMonth={dailyCompliance.daysInMonth} // Using daysInMonth as "Total Days in Range"
        currentDay={dailyCompliance.daysInMonth} // For range view, we can consider the whole range as context
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              {dailyCompliance.daysWithInspection} de {dailyCompliance.daysInMonth} días cumplidos
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

      {/* Main Chart & Top Stations */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <ComplianceChart
            data={dailyCompliance.breakdown}
            daysInMonth={dailyCompliance.daysInMonth}
            currentDay={dailyCompliance.daysWithInspection}
          />
        </div>
        <TopStations
          data={stationComplianceStatus}
          daysInPeriod={dailyCompliance.daysInMonth}
        />
      </div>

      {/* Station Compliance & Pending List */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <StationComplianceChart
            data={stationComplianceStatus}
            daysInPeriod={dailyCompliance.daysInMonth}
          />
        </div>
        <PendingInspectionsList data={stationComplianceStatus} />
      </div>

      {/* Secondary Charts & Tables */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

        {/* Historical Trend */}
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Tendencia Histórica</CardTitle>
            <CardDescription>
              Evolución de inspecciones en el tiempo
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                />
                <Bar
                  dataKey="inspections"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  name="Inspecciones"
                />
              </BarChart>
            </ResponsiveContainer>
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
                <div key={i} className="flex items-center">
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none truncate max-w-[200px]" title={issue.description}>
                      {issue.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {issue.code} • {issue.count} incidencias
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    #{i + 1}
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
    </div>
  )
}
