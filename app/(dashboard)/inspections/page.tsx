'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, usePermissions } from '@/hooks';
import { InspectionService } from '@/lib/services';
import { withTimeout } from '@/lib/utils/async';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { Inspection } from '@/types';
import { formatInspectionDate, hasPendingObservations, getMissingSignaturesLabel } from '@/lib/utils';

export default function InspectionsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { canCreateInspections, canDeleteInspections, canViewAllStations } = usePermissions();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (profile) {
      loadInspections();
    }
  }, [page, pageSize, profile?.id, canViewAllStations]);

  const loadInspections = async () => {
    setLoading(true);
    // Evitar spinner infinito: aplicar timeout suave
    // Si no puede ver todas, pedimos al backend filtrar por su estación
    const stationFilter = canViewAllStations ? undefined : (profile?.station || undefined);
    const result = await withTimeout(InspectionService.getInspections({ page, pageSize, station: stationFilter }), 8000);

    if (!result) {
      // Corte de espera: mostramos tabla vacía y aviso
      setInspections([]);
      setLoading(false);
      return;
    }

    const { data, error, total: t } = result as any;

    if (error) {
      // Detectar sesión expirada
      if (error === 'SESSION_EXPIRED') {
        console.warn('[InspectionsPage] Sesión expirada detectada');
        toast.error('Tu sesión ha expirado. Redirigiendo al login...', { duration: 3000 });
        setInspections([]);
        setLoading(false);
        setTimeout(() => router.push('/login'), 1500);
        return;
      }

      toast.error('Error al cargar inspecciones');
      console.error('[InspectionsPage] Error:', error);
      setInspections([]);
    } else {
      setInspections(data || []);
      // El total proporcionado por el backend ya respeta la estación si se aplicó filtro.
      setTotal(typeof t === 'number' ? t : (data?.length || 0));
    }

    setLoading(false);
  };

  // NO hacer filtrado adicional - el backend YA filtró por estación en línea 52
  const scopedInspections = inspections;

  const handleDelete = async (inspection: Inspection) => {
    if (!inspection?.id) return;
    const label = inspection.form_code || inspection.id;
    const ok = window.confirm(`¿Eliminar la inspección ${label}? Esta acción no se puede deshacer.`);
    if (!ok) return;
    const res = await InspectionService.deleteInspection(inspection.id);
    if (res.success) {
      toast.success('Inspección eliminada');
      // Recargar respetando paginación actual
      await loadInspections();
    } else {
      toast.error(res.error || 'Error al eliminar inspección');
    }
  };

  const getStatusBadge = (inspection: Inspection) => {
    const missingSig = getMissingSignaturesLabel(inspection);
    if (hasPendingObservations(inspection)) {
      return <Badge variant="warning">Pendiente</Badge>;
    }
    if (missingSig) {
      // Mostrar 'Pendiente' cuando faltan firmas, con tooltip informativo
      return <Badge variant="warning" title={missingSig}>Pendiente</Badge>;
    }
    if (inspection.status === 'completed') {
      return <Badge variant="success">Completada</Badge>;
    }
    return <Badge variant="warning">Borrador</Badge>;
  };

  const getTypeName = (type: string) => {
    const types: Record<string, string> = {
      inicial: 'Inicial',
      periodica: 'Periódica',
      post_mantenimiento: 'Post Mantenimiento',
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Acciones de página (sin duplicar título, el Navbar ya lo muestra) */}
      <div className="flex items-center justify-end">
        {canCreateInspections && (
          <Link href="/inspections/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Inspección
            </Button>
          </Link>
        )}
      </div>

      {/* Lista de Inspecciones */}
      <Card>
        <CardHeader>
          <CardTitle>Todas las Inspecciones</CardTitle>
        </CardHeader>
        <CardContent>
          {scopedInspections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-4 h-12 w-12 text-gray-400" />
              <p className="mb-2 text-lg font-semibold text-gray-900">
                No hay inspecciones registradas
              </p>
              <p className="mb-4 text-sm text-gray-500">
                Comienza creando tu primera inspección técnica
              </p>
              {canCreateInspections && (
                <Link href="/inspections/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Primera Inspección
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Estación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopedInspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell className="font-medium">
                      {inspection.form_code || 'Sin código'}
                    </TableCell>
                    <TableCell>{getTypeName(inspection.inspection_type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                        {formatInspectionDate(inspection.inspection_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <User className="mr-2 h-4 w-4 text-gray-400" />
                        {inspection.inspector_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                        {inspection.station}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(inspection)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/inspections/${inspection.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Ver
                          </Button>
                        </Link>
                        {canDeleteInspections && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(inspection)}
                          >
                            {/* lucide trash icon */}
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
          )}
        </CardContent>
        {/* Paginación */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-6 pb-6">
          <div className="text-sm text-muted-foreground">
            {total > 0 ? (
              <span>
                Mostrando {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total}
              </span>
            ) : (
              <span>Sin resultados</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
            <select
              className="ml-2 rounded-md border px-2 py-1 text-sm"
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
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
}
