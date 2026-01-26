"use client"

import { useState, useEffect } from "react"
import { useAuth, usePermissions } from "@/hooks"
import { ComplianceService } from "@/lib/services/compliance"
import { StationsService } from "@/lib/services/stations"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MultiSelect } from "@/components/ui/multi-select"
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

  // Multi-select state for stations
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
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
  }, [user, startDate, endDate, selectedStations]);

  const loadStations = async () => {
    const { data } = await StationsService.listActive();
    if (data) setStationsList(data);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Determine effective station filter
      // If user can't view all, force their station.
      const effectiveStations = !canViewAllStations && profile?.station
        ? [profile.station]
        : selectedStations;

      const filters = {
        stations: effectiveStations.length > 0 ? effectiveStations : undefined,
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
        ComplianceService.getDailyCompliance({ ...filters, aggregateAll: effectiveStations.length === 0 }),
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
            Monitoreo de indicadores
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-end md:items-center">
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
            <div className="w-[280px]">
              <MultiSelect
                options={stationsList.map(s => ({ label: s.name, value: s.code }))}
                selected={selectedStations}
                onChange={setSelectedStations}
                placeholder="Todas las estaciones"
              />
            </div>
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

      {/* Heatmap & Top Issues side by side to avoid empty space */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <StationComplianceHeatmap
            data={stationDailyStatus || []}
            daysInMonth={dailyCompliance.daysElapsed}
            startDate={startDate}
            endDate={endDate}
          />
        </div>

        <Card className="lg:col-span-4 h-full shadow-lg border-t-2 border-t-red-200">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-lg font-bold">Top No Conformidades</CardTitle>
            <CardDescription className="text-xs">
              Items con mayor tasa de fallo en el periodo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topIssues.map((issue, i) => (
                <div key={i} className="flex items-start py-2 border-b last:border-0 border-slate-50">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                    {i + 1}
                  </div>
                  <div className="ml-3 space-y-1 flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-tight text-slate-800 line-clamp-2">
                      {issue.description}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      ID: {issue.code} • <span className="font-bold text-red-500">{issue.count} casos</span>
                    </p>
                  </div>
                </div>
              ))}
              {topIssues.length === 0 && (
                <div className="text-center text-muted-foreground py-10 text-xs italic">
                  No hay datos insuficientes
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Historical Trend & Compliance Detail */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-lg border-t-2 border-t-purple-500">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Activity className="h-5 w-5 text-purple-600" />
              Tendencia Histórica
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: '11px' }} />
                <Bar dataKey="inspections" fill="#9333EA" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-lg border-t-2 border-t-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">Estado de Items</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={complianceData}
                  innerRadius={50}
                  outerRadius={70}
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
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div >
  )
}
