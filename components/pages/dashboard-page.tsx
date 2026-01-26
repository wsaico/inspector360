'use client';

import { useAuth, usePermissions } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Plus,
  FileText,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { ComplianceService } from '@/lib/services/compliance';
import { InspectionService, InspectionTypeService } from '@/lib/services';
import { hasPendingObservations, getMissingSignaturesLabel } from '@/lib/utils';
import { STATIONS } from '@/types/roles';
import { StationsService } from '@/lib/services/stations';
import { toast } from 'sonner';
import { InspectionSystemType } from '@/types/inspection';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';


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
  const [inspectionTypes, setInspectionTypes] = useState<InspectionSystemType[]>([]);
  const [recentInspections, setRecentInspections] = useState<any[]>([]);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [selectedType, setSelectedType] = useState<InspectionSystemType | null>(null);

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
        const { start, end } = ComplianceService.getDateRange({ month });
        // Obtener inspecciones ya filtradas por estación y mes para evitar mezclar estaciones
        const { data: scoped } = await InspectionService.getInspections({ station: station || undefined, start, end });

        const pendingReview = (scoped || []).reduce((acc: number, i: any) => {
          const hasPending = !!getMissingSignaturesLabel(i);
          return acc + (hasPending ? 1 : 0);
        }, 0);

        // Fetch recent inspections
        const { data: recent } = await InspectionService.getInspections({
          page: 1,
          pageSize: 5,
          station: station || undefined,
        });
        setRecentInspections(recent || []);

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

  // Cargar tipos de inspección
  useEffect(() => {
    const loadInspectionTypes = async () => {
      const { data, error } = await InspectionTypeService.getAll();
      if (data) {
        setInspectionTypes(data);
      } else if (error) {
        console.error('Error loading inspection types:', error);
      }
    };
    loadInspectionTypes();
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
    <div className="space-y-8">
      {/* Header Section */}
      {/* Action Buttons Header */}
      <div className="flex justify-end items-center gap-4 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/talks/register">
            <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 shadow-sm transition-all font-bold">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Registrar Charla
            </Button>
          </Link>
          {canCreateInspections && (
            <Link href="/inspections/new">
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-bold">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Inspección
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid gap-4 md:grid-cols-3 bg-white p-4 rounded-xl border shadow-sm"
      >
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Periodo</label>
          <input
            type="month"
            className="mt-1 w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estación</label>
          {showAllStations ? (
            <select
              className="mt-1 w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={station || ''}
              onChange={(e) => setStation(e.target.value || undefined)}
            >
              <option value="">Todas las estaciones</option>
              {stationOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          ) : (
            <input
              className="mt-1 w-full rounded-lg border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              value={profile?.station || ''}
              readOnly
            />
          )}
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Total Inspecciones",
            value: stats.totalInspections,
            icon: ClipboardList,
            color: "blue",
            desc: showAllStations && !station ? 'Todas las estaciones' : station ? `Estación ${station}` : 'Total histórico'
          },
          {
            title: "Este Mes",
            value: stats.completedThisMonth,
            icon: CheckCircle2,
            color: "green",
            desc: `Completadas en ${month.split('-')[1]}/${month.split('-')[0]}`
          },
          {
            title: "Pendientes",
            value: stats.pendingReview,
            icon: AlertTriangle,
            color: "amber",
            desc: stats.pendingReview === 0 ? '¡Todo al día!' : 'Requieren atención'
          },
          {
            title: "Cumplimiento",
            value: `${stats.complianceRate}%`,
            icon: TrendingUp,
            color: stats.complianceRate >= 80 ? "purple" : "red",
            desc: stats.complianceRate >= 80 ? '¡Excelente ritmo!' : 'Por debajo de la meta'
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`border-l-4 border-l-${stat.color}-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium text-${stat.color}-900`}>
                  {stat.title}
                </CardTitle>
                <div className={`rounded-full bg-${stat.color}-100 p-2`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold text-${stat.color}-700`}>{stat.value}</div>
                <p className={`text-xs text-${stat.color}-600 mt-1 font-medium`}>
                  {stat.desc}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-7">
        {/* Inspection Types - Left Column */}
        <div className="md:col-span-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Módulos de Inspección</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Quick Access to Safety Talks */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href="/talks/register">
                <Card className="h-full cursor-pointer transition-all border-2 border-emerald-100 hover:border-emerald-500 hover:shadow-md bg-white">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="text-4xl mb-2 text-emerald-600">🛡️</div>
                      <div className="bg-emerald-100 p-1.5 rounded-full">
                        <ArrowRight className="h-4 w-4 text-emerald-600" />
                      </div>
                    </div>
                    <CardTitle className="text-lg">Charlas de Seguridad</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      Registra la charla diaria, asistencia y firmas del personal.
                    </p>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-0">
                      Acceso Rápido
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>

            {inspectionTypes.map((type, index) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`h-full cursor-pointer transition-all border-2 ${type.is_active
                    ? 'hover:border-blue-500 hover:shadow-md bg-white'
                    : 'opacity-75 bg-gray-50 border-dashed'
                    }`}
                  onClick={() => {
                    if (type.is_active) {
                      if (type.code === 'technical') window.location.href = '/inspections/new';
                    } else {
                      setSelectedType(type);
                      setShowComingSoonModal(true);
                    }
                  }}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="text-4xl mb-2">{type.icon}</div>
                      {type.is_active ? (
                        <div className="bg-blue-100 p-1.5 rounded-full">
                          <ArrowRight className="h-4 w-4 text-blue-600" />
                        </div>
                      ) : (
                        <Lock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <CardTitle className="text-lg">{type.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {type.description}
                    </p>
                    {!type.is_active && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        Próximamente
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Activity - Right Column */}
        <div className="md:col-span-3 space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Actividad Reciente</h2>
          <Card className="h-full">
            <CardContent className="p-0">
              {recentInspections.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentInspections.map((inspection, i) => (
                    <motion.div
                      key={inspection.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className={`
                        rounded-full p-2 mr-4
                        ${inspection.status === 'completed' ? 'bg-green-100 text-green-600' :
                          inspection.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                            'bg-gray-100 text-gray-600'}
                      `}>
                        {inspection.status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> :
                          inspection.status === 'pending' ? <AlertTriangle className="h-4 w-4" /> :
                            <ClipboardList className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {inspection.form_code || 'Borrador'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {inspection.station} • {format(new Date(inspection.created_at), "d MMM, HH:mm", { locale: es })}
                        </p>
                      </div>
                      <Badge variant={
                        inspection.status === 'completed' ? 'default' :
                          inspection.status === 'pending' ? 'secondary' : 'outline'
                      } className={
                        inspection.status === 'completed' ? 'bg-green-600' :
                          inspection.status === 'pending' ? 'bg-amber-100 text-amber-800' : ''
                      }>
                        {inspection.status === 'completed' ? 'Completado' :
                          inspection.status === 'pending' ? 'Pendiente' : 'Borrador'}
                      </Badge>
                    </motion.div>
                  ))}
                  <div className="p-4 text-center border-t">
                    <Link href="/inspections" className="text-sm text-blue-600 hover:underline font-medium">
                      Ver todas las inspecciones
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="bg-gray-50 p-4 rounded-full mb-3">
                    <ClipboardList className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Sin actividad reciente</p>
                  <p className="text-xs text-gray-500 mt-1">Las nuevas inspecciones aparecerán aquí</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal "Próximamente" */}
      <Dialog open={showComingSoonModal} onOpenChange={setShowComingSoonModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-5xl">{selectedType?.icon}</div>
              <DialogTitle className="text-xl">
                {selectedType?.name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              Esta funcionalidad estará disponible próximamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
              <p className="text-sm text-blue-900 font-medium mb-2">
                ¿Qué incluirá este módulo?
              </p>
              <p className="text-sm text-blue-700">
                {selectedType?.description}
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Formularios personalizados</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Reportes en PDF</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Firmas digitales</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Seguimiento de cumplimiento</span>
              </div>
            </div>
            <Button
              onClick={() => setShowComingSoonModal(false)}
              className="w-full"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}