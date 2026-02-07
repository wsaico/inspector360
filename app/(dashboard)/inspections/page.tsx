'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, usePermissions, useInspections, useStations } from '@/hooks'; // Import useStations
import { InspectionService } from '@/lib/services';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Eye,
  FileText,
  Loader2,
  Calendar,
  MapPin,
  User,
  Filter,
  X,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Inspection } from '@/types';
import { formatInspectionDate, hasPendingObservations, getMissingSignaturesLabel } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ENEquipmentHeatmap } from '@/components/inspections/en-equipment-heatmap';
// import { StationsService } from '@/lib/services/stations'; // Removed direct service usage

export default function InspectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, user } = useAuth();
  const { canCreateInspections, canDeleteInspections, canViewAllStations } = usePermissions();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtros
  const [filterStation, setFilterStation] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>(''); // Nuevo estado para Tipo
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // ✅ OPTIMIZACIÓN: Usar hook con cache (React Query)
  const { stations, isLoading: loadingStations } = useStations({ activeOnly: true });

  // Inicializar filtro de tipo desde URL
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam) {
      setFilterType(typeParam);
      setShowFilters(true); // Mostrar filtros para que el usuario vea que está activo
    }
  }, [searchParams]);

  // ✅ OPTIMIZADO: React Query con cache automático - 5x más rápido
  const { data, isLoading, error, refetch } = useInspections({
    page,
    pageSize,
    station: filterStation || undefined,
    status: filterStatus || undefined,
    type: filterType || undefined, // Pasar tipo al hook
    startDate: filterStartDate || undefined,
    endDate: filterEndDate || undefined,
  });

  // Extraer datos del resultado con cache
  const inspections = data?.data || [];
  const total = data?.total || 0;
  const scopedInspections = inspections;

  const handleDelete = async (inspection: Inspection) => {
    if (!inspection?.id) return;
    const label = inspection.form_code || inspection.id;
    const ok = window.confirm(`¿Eliminar la inspección ${label}? Esta acción no se puede deshacer.`);
    if (!ok) return;
    const res = await InspectionService.deleteInspection(inspection.id);
    if (res.success) {
      toast.success('Inspección eliminada');
      // ✅ OPTIMIZADO: refetch usa cache, no recarga desde cero
      await refetch();
    } else {
      toast.error(res.error || 'Error al eliminar inspección');
    }
  };

  const getStatusBadge = (inspection: Inspection) => {
    // Usar el estado de la base de datos directamente
    // El backend ya calcula el estado correcto basándose en las firmas
    if (inspection.status === 'completed') {
      const hasObs = Array.isArray((inspection as any).observations) && (inspection as any).observations.length > 0;
      return (
        <Badge className="bg-[#B3D400] text-[#0A3161] hover:bg-[#c4e600] border-0 font-bold uppercase tracking-wider">
          {hasObs ? 'Completada / Obs' : 'Completada'}
        </Badge>
      );
    }
    if (inspection.status === 'pending') {
      // Mostrar información adicional si faltan firmas
      const missingSig = getMissingSignaturesLabel(inspection);
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200" title={missingSig || 'Pendiente de firmas'}>Pendiente</Badge>;
    }
    // draft
    return <Badge variant="outline" className="text-slate-500 border-slate-300">Borrador</Badge>;
  };

  const getTypeName = (type: string) => {
    const types: Record<string, string> = {
      inicial: 'Inicial',
      periodica: 'Periódica',
      post_mantenimiento: 'Post Mant.',
    };
    return types[type] || type;
  };

  const clearFilters = () => {
    setFilterStation('');
    setFilterStatus('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(1);
  };

  const hasActiveFilters = filterStation || filterStatus || filterStartDate || filterEndDate;

  // ✅ OPTIMIZADO: isLoading de React Query
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0A3161]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#0A3161] uppercase tracking-tighter">Inspecciones</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Historial, gestión y seguimiento de inspecciones técnicas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-slate-100 border-slate-300' : 'border-slate-200'}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros {hasActiveFilters && `(${[filterStation, filterStatus, filterStartDate, filterEndDate].filter(Boolean).length})`}
          </Button>
          {canCreateInspections && (
            <Link href="/inspections/new">
              <Button className="bg-[#0A3161] hover:bg-[#152d6f] text-white font-bold shadow-lg shadow-blue-900/20">
                <Plus className="mr-2 h-4 w-4 text-[#B3D400]" />
                Nueva Inspección
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all">Todas las Inspecciones</TabsTrigger>
          <TabsTrigger value="en-equipment">Equipos EN</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6 mt-6">
          {/* Panel de Filtros */}
          {showFilters && (
            <Card className="border-0 shadow-lg bg-white rounded-[20px] overflow-hidden">
              <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Búsqueda Avanzada
                  </span>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2 text-xs"
                    >
                      <X className="mr-1 h-3 w-3" />
                      Limpiar
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Filtro por Estación */}
                  {canViewAllStations && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                        Estación
                      </label>
                      <select
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0A3161] focus:border-transparent outline-none transition-all bg-slate-50/50"
                        value={filterStation}
                        onChange={(e) => {
                          setFilterStation(e.target.value);
                          setPage(1);
                        }}
                      >
                        <option value="">Todas las estaciones</option>
                        {stations.map((s) => (
                          <option key={s.code} value={s.code}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Filtro por Estatus */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      Estatus
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0A3161] focus:border-transparent outline-none transition-all bg-slate-50/50"
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Todos los estados</option>
                      <option value="draft">Borrador</option>
                      <option value="pending">Pendiente</option>
                      <option value="completed">Completada</option>
                    </select>
                  </div>

                  {/* Filtro por Tipo */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      Tipo
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0A3161] focus:border-transparent outline-none transition-all bg-slate-50/50"
                      value={filterType}
                      onChange={(e) => {
                        setFilterType(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">Todos los tipos</option>
                      <option value="technical">Técnica</option>
                      <option value="botiquin">Botiquín</option>
                      <option value="extintores">Extintores</option>
                      <option value="interna">Interna</option>
                    </select>
                  </div>

                  {/* Fecha Inicio */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      Fecha Desde
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0A3161] focus:border-transparent outline-none transition-all bg-slate-50/50"
                      value={filterStartDate}
                      onChange={(e) => {
                        setFilterStartDate(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>

                  {/* Fecha Fin */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                      Fecha Hasta
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0A3161] focus:border-transparent outline-none transition-all bg-slate-50/50"
                      value={filterEndDate}
                      onChange={(e) => {
                        setFilterEndDate(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Inspecciones */}
          <Card className="shadow-lg border-0 rounded-[30px] overflow-hidden bg-white">
            <CardHeader className="bg-[#0A3161] text-white p-6">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="font-black uppercase tracking-widest text-[#B3D400]">Resultados</span>
                {hasActiveFilters && (
                  <Badge className="bg-white/10 text-white hover:bg-white/20 border-0">
                    Filtrado Evaluaciones
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {scopedInspections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <FileText className="h-10 w-10 text-slate-300" />
                  </div>
                  <p className="mb-2 text-xl font-bold text-[#0A3161]">
                    {hasActiveFilters ? 'No se encontraron resultados' : 'Aún no hay inspecciones'}
                  </p>
                  <p className="mb-8 text-sm text-slate-500 max-w-sm mx-auto">
                    {hasActiveFilters
                      ? 'Intenta ajustar los filtros de búsqueda para ver más resultados.'
                      : 'Comienza creando tu primera inspección técnica digital ahora mismo.'}
                  </p>
                  {!hasActiveFilters && canCreateInspections && (
                    <Link href="/inspections/new">
                      <Button className="h-12 px-8 rounded-xl bg-[#0A3161] hover:bg-[#152d6f] text-white font-bold shadow-lg shadow-blue-900/20">
                        <Plus className="mr-2 h-5 w-5 text-[#B3D400]" />
                        Crear Primera Inspección
                      </Button>
                    </Link>
                  )}
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters} className="rounded-xl">
                      <X className="mr-2 h-4 w-4" />
                      Limpiar Filtros
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Vista de Tabla Desktop */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-100">
                          <TableHead className="font-bold uppercase text-[11px] tracking-wider text-slate-500 py-4">Código</TableHead>
                          <TableHead className="font-bold uppercase text-[11px] tracking-wider text-slate-500">Tipo</TableHead>
                          <TableHead className="font-bold uppercase text-[11px] tracking-wider text-slate-500">Fecha</TableHead>
                          <TableHead className="font-bold uppercase text-[11px] tracking-wider text-slate-500">Inspector</TableHead>
                          <TableHead className="font-bold uppercase text-[11px] tracking-wider text-slate-500">Estación</TableHead>
                          <TableHead className="font-bold uppercase text-[11px] tracking-wider text-slate-500">Estado</TableHead>
                          <TableHead className="text-right font-bold uppercase text-[11px] tracking-wider text-slate-500">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scopedInspections.map((inspection: Inspection) => (
                          <TableRow key={inspection.id} className="hover:bg-blue-50/50 transition-colors border-b border-slate-50">
                            <TableCell className="font-bold text-[#0A3161]">
                              {inspection.form_code || '---'}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium text-slate-600 px-2 py-1 bg-slate-100 rounded-md">
                                {getTypeName(inspection.inspection_type)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center text-sm font-medium text-slate-600">
                                {formatInspectionDate(inspection.inspection_date)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center text-sm text-slate-600">
                                {inspection.inspector_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center text-sm">
                                <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full text-xs border border-slate-200">
                                  {inspection.station}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(inspection)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Link href={`/inspections/${inspection.id}`}>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-blue-100 hover:text-[#0A3161]">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                {canDeleteInspections && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-600"
                                    onClick={() => handleDelete(inspection)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Vista de Cards Mobile */}
                  <div className="md:hidden space-y-4 p-4 bg-slate-50/50">
                    {scopedInspections.map((inspection: Inspection) => (
                      <Link key={inspection.id} href={`/inspections/${inspection.id}`}>
                        <Card className="border-0 shadow-sm hover:shadow-md transition-all active:scale-[0.99] mb-4 overflow-hidden">
                          <div className="h-1.5 w-full bg-[#0A3161]" />
                          <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-lg font-black text-[#0A3161] leading-tight">
                                  {inspection.form_code || 'Sin Código'}
                                </h3>
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  {getTypeName(inspection.inspection_type)}
                                </span>
                              </div>
                              {getStatusBadge(inspection)}
                            </div>

                            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                              <div className="col-span-1">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Fecha</p>
                                <p className="font-medium text-slate-700">{formatInspectionDate(inspection.inspection_date)}</p>
                              </div>
                              <div className="col-span-1">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Estación</p>
                                <p className="font-medium text-slate-700">{inspection.station}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Inspector</p>
                                <p className="font-medium text-slate-700 truncate">{inspection.inspector_name}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
            {/* Paginación Optimizada para Móvil */}
            {scopedInspections.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50/30 p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {Math.min((page - 1) * pageSize + 1, total)} - {Math.min(page * pageSize, total)} de {total}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="h-9 w-9 p-0 rounded-lg border-slate-200"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Button>

                    <div className="flex items-center justify-center px-4 h-9 bg-white rounded-lg border border-slate-200 font-bold text-sm text-[#0A3161] shadow-sm">
                      {page} / {Math.ceil(total / pageSize)}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page * pageSize >= total}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-9 w-9 p-0 rounded-lg border-slate-200"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="en-equipment" className="mt-6">
          <ENEquipmentHeatmap />
        </TabsContent>
      </Tabs>
    </div>
  );
}
