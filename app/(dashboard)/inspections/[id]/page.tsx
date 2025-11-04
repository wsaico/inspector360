'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { InspectionService } from '@/lib/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Loader2,
  Download,
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  FileText,
  Package,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Inspection } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CHECKLIST_CATEGORIES } from '@/types';
import Image from 'next/image';
import { downloadInspectionPDF } from '@/lib/pdf/generator';

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEquipment, setExpandedEquipment] = useState<string[]>([]);

  useEffect(() => {
    loadInspection();
  }, [params.id]);

  const loadInspection = async () => {
    setLoading(true);
    const { data, error } = await InspectionService.getInspectionById(params.id as string);

    if (error) {
      toast.error('Error al cargar la inspección');
      console.error(error);
      router.push('/inspections');
    } else {
      setInspection(data);
    }

    setLoading(false);
  };

  const toggleEquipment = (equipmentCode: string) => {
    setExpandedEquipment((prev) =>
      prev.includes(equipmentCode)
        ? prev.filter((code) => code !== equipmentCode)
        : [...prev, equipmentCode]
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
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

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'conforme':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'no_conforme':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'no_aplica':
        return <MinusCircle className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'conforme':
        return 'Conforme';
      case 'no_conforme':
        return 'No Conforme';
      case 'no_aplica':
        return 'No Aplica';
      default:
        return '-';
    }
  };

  const handleDownloadPDF = async () => {
    if (!inspection) return;

    try {
      toast.loading('Generando PDF...');
      await downloadInspectionPDF(inspection);
      toast.success('PDF descargado exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="mb-4 h-12 w-12 text-gray-400" />
        <p className="text-lg font-semibold">Inspección no encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/inspections')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{inspection.form_code || 'Sin código'}</h2>
              {getStatusBadge(inspection.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              Detalles de la inspección técnica
            </p>
          </div>
        </div>
        <Button onClick={handleDownloadPDF} className="w-full md:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Descargar PDF
        </Button>
      </div>

      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <Calendar className="mr-2 h-4 w-4" />
                Fecha de Inspección
              </div>
              <p className="font-semibold">
                {typeof inspection.inspection_date === 'string'
                  ? format(new Date(inspection.inspection_date), 'dd/MM/yyyy', { locale: es })
                  : format(inspection.inspection_date, 'dd/MM/yyyy', { locale: es })}
              </p>
            </div>
            <div>
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <FileText className="mr-2 h-4 w-4" />
                Tipo de Inspección
              </div>
              <p className="font-semibold">{getTypeName(inspection.inspection_type)}</p>
            </div>
            <div>
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <User className="mr-2 h-4 w-4" />
                Inspector
              </div>
              <p className="font-semibold">{inspection.inspector_name}</p>
            </div>
            <div>
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <MapPin className="mr-2 h-4 w-4" />
                Estación
              </div>
              <p className="font-semibold">{inspection.station}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipos y Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Equipos Inspeccionados ({inspection.equipment?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {inspection.equipment && inspection.equipment.length > 0 ? (
            inspection.equipment.map((equipment) => {
              const isExpanded = expandedEquipment.includes(equipment.code);
              const checklistData = equipment.checklist_data || {};
              const checklistItems = Object.entries(checklistData);

              // Calculate statistics
              const conforme = checklistItems.filter(([_, item]) => item.status === 'conforme').length;
              const noConforme = checklistItems.filter(([_, item]) => item.status === 'no_conforme').length;
              const noAplica = checklistItems.filter(([_, item]) => item.status === 'no_aplica').length;
              const total = checklistItems.length;

              return (
                <div key={equipment.code} className="border rounded-lg">
                  {/* Equipment Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleEquipment(equipment.code)}
                  >
                    <div className="flex items-center gap-4">
                      <Package className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">{equipment.code}</p>
                        <p className="text-sm text-muted-foreground">{equipment.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2">
                        <Badge variant="success" className="text-xs">
                          {conforme} Conforme
                        </Badge>
                        {noConforme > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {noConforme} No Conforme
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {noAplica} N/A
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Equipment Details (Expanded) */}
                  {isExpanded && (
                    <div className="border-t p-4 space-y-4">
                      {/* Equipment Info */}
                      <div className="grid gap-4 md:grid-cols-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Marca:</span>
                          <span className="ml-2 font-medium">{equipment.brand}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Modelo:</span>
                          <span className="ml-2 font-medium">{equipment.model}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Año:</span>
                          <span className="ml-2 font-medium">{equipment.year}</span>
                        </div>
                      </div>

                      {/* Checklist Results */}
                      <div>
                        <h4 className="font-semibold mb-3">Resultados del Checklist</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Código</TableHead>
                              <TableHead>Descripción</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Observaciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {checklistItems.map(([code, item]) => (
                              <TableRow key={code}>
                                <TableCell className="font-medium">{code}</TableCell>
                                <TableCell>{item.description || '-'}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(item.status)}
                                    <span className="text-sm">{getStatusText(item.status)}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <span className="text-sm text-muted-foreground">
                                    {item.observations || '-'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay equipos registrados
            </p>
          )}
        </CardContent>
      </Card>

      {/* Firma del Supervisor */}
      {inspection.status === 'completed' && inspection.supervisor_signature_url && (
        <Card>
          <CardHeader>
            <CardTitle>Firma del Supervisor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Nombre del Supervisor</p>
                <p className="font-semibold">{inspection.supervisor_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Firma Digital</p>
                <div className="border rounded-lg p-4 bg-white inline-block">
                  <Image
                    src={inspection.supervisor_signature_url}
                    alt="Firma del supervisor"
                    width={400}
                    height={150}
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Firma del Mecánico */}
      {inspection.status === 'completed' && inspection.mechanic_signature_url && (
        <Card>
          <CardHeader>
            <CardTitle>Firma del Mecánico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Nombre del Mecánico</p>
                <p className="font-semibold">{inspection.mechanic_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Firma Digital</p>
                <div className="border rounded-lg p-4 bg-white inline-block">
                  <Image
                    src={inspection.mechanic_signature_url}
                    alt="Firma del mecánico"
                    width={400}
                    height={150}
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
