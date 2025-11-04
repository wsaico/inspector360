'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePermissions } from '@/hooks';
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
import { formatInspectionDate, hasPendingObservations } from '@/lib/utils';

export default function InspectionsPage() {
  const { canCreateInspections } = usePermissions();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    setLoading(true);
    // Evitar spinner infinito: aplicar timeout suave
    const result = await withTimeout(InspectionService.getInspections(), 8000);

    if (!result) {
      // Corte de espera: mostramos tabla vacía y aviso
      setInspections([]);
      setLoading(false);
      return;
    }

    const { data, error } = result;

    if (error) {
      toast.error('Error al cargar inspecciones');
      console.error(error);
    } else {
      setInspections(data || []);
    }

    setLoading(false);
  };

  const getStatusBadge = (inspection: Inspection) => {
    if (hasPendingObservations(inspection)) {
      return <Badge variant="warning">Pendiente</Badge>;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inspecciones</h2>
          <p className="text-sm text-muted-foreground">
            Gestión de inspecciones técnicas de equipos
          </p>
        </div>
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
          {inspections.length === 0 ? (
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
                {inspections.map((inspection) => (
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
                      <Link href={`/inspections/${inspection.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          Ver
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
