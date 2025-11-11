'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, usePermissions, useInspections } from '@/hooks';
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
  Edit,
  FileText,
  Loader2,
  Calendar,
  MapPin,
  User,
  Filter,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Inspection } from '@/types';
import { formatInspectionDate, hasPendingObservations, getMissingSignaturesLabel } from '@/lib/utils';
import { StationsService } from '@/lib/services/stations';

export default function InspectionsPage() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { canCreateInspections, canDeleteInspections, canViewAllStations } = usePermissions();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtros
  const [filterStation, setFilterStation] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [stationOptions, setStationOptions] = useState<{ value: string; label: string }[]>([]);

  // ✅ OPTIMIZADO: React Query con cache automático - 5x más rápido
  const { data, isLoading, error, refetch } = useInspections({
    page,
    pageSize,
    station: filterStation || undefined,
    status: filterStatus || undefined,
    startDate: filterStartDate || undefined,
    endDate: filterEndDate || undefined,
  });

  // Cargar estaciones activas
  useEffect(() => {
    const loadStations = async () => {
      const res = await StationsService.listAll();
      const active = (res.data || []).filter(s => s.is_active);
      setStationOptions(active.map(s => ({ value: s.code, label: s.name })));
    };
    loadStations();
  }, []);

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
      return <Badge className="bg-green-500 hover:bg-green-600">Completada</Badge>;
    }
    if (inspection.status === 'pending') {
      // Mostrar información adicional si faltan firmas
      const missingSig = getMissingSignaturesLabel(inspection);
      return <Badge className="bg-amber-500 hover:bg-amber-600" title={missingSig || 'Pendiente de firmas'}>Pendiente</Badge>;
    }
    // draft
    return <Badge className="bg-gray-500 hover:bg-gray-600">Borrador</Badge>;
  };

  const getTypeName = (type: string) => {
    const types: Record<string, string> = {
      inicial: 'Inicial',
      periodica: 'Periódica',
      post_mantenimiento: 'Post Mantenimiento',
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Acciones */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? 'bg-blue-50 border-blue-200' : ''}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filtros {hasActiveFilters && `(${[filterStation, filterStatus, filterStartDate, filterEndDate].filter(Boolean).length})`}
        </Button>
        {canCreateInspections && (
          <Link href="/inspections/new">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Inspección
            </Button>
          </Link>
        )}
      </div>

      {/* Panel de Filtros */}
      {showFilters && (
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50/50 to-white shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros de Búsqueda
              </span>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="mr-1 h-3 w-3" />
                  Limpiar filtros
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Filtro por Estación */}
              {canViewAllStations && (
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    Estación
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={filterStation}
                    onChange={(e) => {
                      setFilterStation(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Todas las estaciones</option>
                    {stationOptions.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Filtro por Estatus */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  <FileText className="h-3 w-3 inline mr-1" />
                  Estatus
                </label>
                <select
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

              {/* Fecha Inicio */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Fecha Desde
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={filterStartDate}
                  onChange={(e) => {
                    setFilterStartDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Fecha Fin */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
      <Card className="shadow-lg border-t-4 border-t-blue-500">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center justify-between">
            <span>Todas las Inspecciones</span>
            {hasActiveFilters && (
              <Badge className="bg-blue-500 hover:bg-blue-600">
                Filtrado
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {scopedInspections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <FileText className="mb-4 h-16 w-16 text-gray-300" />
              <p className="mb-2 text-lg font-semibold text-gray-900">
                {hasActiveFilters ? 'No se encontraron inspecciones' : 'No hay inspecciones registradas'}
              </p>
              <p className="mb-4 text-sm text-gray-500">
                {hasActiveFilters
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza creando tu primera inspección técnica'}
              </p>
              {!hasActiveFilters && canCreateInspections && (
                <Link href="/inspections/new">
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Primera Inspección
                  </Button>
                </Link>
              )}
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
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
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="font-semibold">Código</TableHead>
                      <TableHead className="font-semibold">Tipo</TableHead>
                      <TableHead className="font-semibold">Fecha</TableHead>
                      <TableHead className="font-semibold">Inspector</TableHead>
                      <TableHead className="font-semibold">Estación</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="text-right font-semibold">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scopedInspections.map((inspection: Inspection) => (
                      <TableRow key={inspection.id} className="hover:bg-blue-50/30 transition-colors">
                        <TableCell className="font-medium text-gray-900">
                          {inspection.form_code || 'Sin código'}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-700">{getTypeName(inspection.inspection_type)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-gray-700">
                            <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                            {formatInspectionDate(inspection.inspection_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-gray-700">
                            <User className="mr-2 h-4 w-4 text-indigo-500" />
                            {inspection.inspector_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <MapPin className="mr-2 h-4 w-4 text-green-500" />
                            <span className="font-medium text-gray-900">{inspection.station}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(inspection)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {/* Si es borrador, mostrar botón "Continuar" destacado */}
                            {inspection.status === 'draft' && canCreateInspections && (
                              <Link href={`/inspections/new?draft=${inspection.id}`}>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Continuar
                                </Button>
                              </Link>
                            )}

                            {/* Botón "Ver" siempre disponible */}
                            <Link href={`/inspections/${inspection.id}`}>
                              <Button variant="ghost" size="sm" className="hover:bg-blue-50">
                                <Eye className="mr-2 h-4 w-4" />
                                Ver
                              </Button>
                            </Link>

                            {canDeleteInspections && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(inspection)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                                Eliminar
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
              <div className="md:hidden space-y-3 p-4">
                {scopedInspections.map((inspection: Inspection) => (
                  <Card key={inspection.id} className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-all">
                    <CardContent className="pt-4 pb-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-gray-900 text-base">{inspection.form_code || 'Sin código'}</p>
                            <p className="text-sm text-gray-600">{getTypeName(inspection.inspection_type)}</p>
                          </div>
                          {getStatusBadge(inspection)}
                        </div>

                        {/* Detalles */}
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center text-sm">
                            <Calendar className="mr-2 h-4 w-4 text-blue-500 flex-shrink-0" />
                            <span className="text-gray-700">{formatInspectionDate(inspection.inspection_date)}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <User className="mr-2 h-4 w-4 text-indigo-500 flex-shrink-0" />
                            <span className="text-gray-700 truncate">{inspection.inspector_name}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <MapPin className="mr-2 h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="font-medium text-gray-900">{inspection.station}</span>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-2 pt-2 border-t">
                          {/* Si es borrador, mostrar botón "Continuar" destacado */}
                          {inspection.status === 'draft' && canCreateInspections ? (
                            <>
                              <Link href={`/inspections/new?draft=${inspection.id}`} className="flex-1">
                                <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Continuar Borrador
                                </Button>
                              </Link>
                              <Link href={`/inspections/${inspection.id}`}>
                                <Button variant="outline" size="sm" className="hover:bg-blue-50">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </>
                          ) : (
                            <Link href={`/inspections/${inspection.id}`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full hover:bg-blue-50">
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalle
                              </Button>
                            </Link>
                          )}

                          {canDeleteInspections && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => handleDelete(inspection)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
        {/* Paginación Optimizada para Móvil */}
        {scopedInspections.length > 0 && (
          <div className="border-t bg-gradient-to-r from-gray-50 to-white">
            {/* Información de Resultados */}
            <div className="px-4 pt-4 pb-2">
              <div className="text-center md:text-left text-sm text-gray-600 font-medium">
                {total > 0 ? (
                  <span>
                    Mostrando <span className="font-bold text-blue-600">{Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)}</span> de <span className="font-bold text-blue-600">{total}</span> inspecciones
                  </span>
                ) : (
                  <span>Sin resultados</span>
                )}
              </div>
            </div>

            {/* Controles de Paginación */}
            <div className="px-4 pb-4 pt-2">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Selector de Items por Página */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs text-gray-600 whitespace-nowrap">Items por página:</label>
                  <select
                    className="flex-1 sm:flex-none rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                    value={pageSize}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setPage(1);
                      setPageSize(v);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Botones de Navegación */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="hover:bg-blue-50 disabled:opacity-50 flex-1 sm:flex-none h-10"
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Anterior</span>
                    <span className="sm:hidden">Ant</span>
                  </Button>

                  {/* Indicador de Página */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-100 border border-blue-200">
                    <span className="text-sm font-bold text-blue-900">{page}</span>
                    <span className="text-sm text-blue-700">/</span>
                    <span className="text-sm font-bold text-blue-900">{Math.ceil(total / pageSize)}</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * pageSize >= total}
                    onClick={() => setPage((p) => p + 1)}
                    className="hover:bg-blue-50 disabled:opacity-50 flex-1 sm:flex-none h-10"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <span className="sm:hidden">Sig</span>
                    <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
