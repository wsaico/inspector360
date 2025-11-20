'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { InspectionService } from '@/lib/services';
import { handleSessionError } from '@/lib/supabase/session-validator';
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
import { Inspection, Observation } from '@/types';
import { formatInspectionDate, hasPendingObservations, getMissingSignaturesLabel, isSupervisorSigned, isMechanicSigned } from '@/lib/utils';
import { CHECKLIST_CATEGORIES } from '@/types';
import Image from 'next/image';
import { getChecklistItem } from '@/lib/checklist-template';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/hooks';
import { withTimeout } from '@/lib/utils/async';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
const SignaturePad = dynamic(() => import('@/components/forms/signature-pad'), { ssr: false });

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { canEditInspections } = usePermissions();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEquipment, setExpandedEquipment] = useState<string[]>([]);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [signRole, setSignRole] = useState<'supervisor' | 'mechanic' | null>(null);
  const [signName, setSignName] = useState('');
  const [savingSignature, setSavingSignature] = useState(false);
  const [signStep, setSignStep] = useState<'name' | 'signature'>('name'); // Paso del modal
  const [supervisorNames, setSupervisorNames] = useState<string[]>([]);
  const [mechanicNames, setMechanicNames] = useState<string[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  useEffect(() => {
    if (!params?.id) {
      router.replace('/inspections');
      return;
    }
    loadInspection();
  }, [params.id]);

  // Cargar nombres de supervisores y mecánicos cuando se abre el modal
  useEffect(() => {
    if (signOpen && inspection?.station) {
      const loadNames = async () => {
        if (signRole === 'supervisor') {
          const { data } = await InspectionService.getUniqueSupervisorNames(inspection.station);
          setSupervisorNames((data as string[]) || []);
        } else if (signRole === 'mechanic') {
          const { data } = await InspectionService.getUniqueMechanicNames(inspection.station);
          setMechanicNames((data as string[]) || []);
        }
      };
      loadNames();
    }
  }, [signOpen, signRole, inspection?.station]);

  const loadInspection = async () => {
    setLoading(true);

    try {
      const result = await withTimeout(
        InspectionService.getInspectionById(params.id as string)
      );

      if (!result) {
        toast.warning('La carga está tardando más de lo normal');
        setLoading(false);
        return;
      }

      const { data, error } = result as any;
      if (error) {
        // Manejar error de sesión expirada
        if (error === 'SESSION_EXPIRED') {
          toast.error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
          setTimeout(() => router.push('/login'), 1500);
          return;
        }
        toast.error('Error al cargar la inspección');
        console.error(error);
        router.replace('/inspections');
        return;
      }

      // Ordenar equipos y observaciones por order_index para evitar desorden
      const sortedEquipment = Array.isArray(data?.equipment)
        ? [...data.equipment].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        : [];
      const sortedObservations = Array.isArray(data?.observations)
        ? [...data.observations].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        : [];
      setInspection({ ...data, equipment: sortedEquipment, observations: sortedObservations });
    } catch (e) {
      console.error('Fallo al cargar inspección:', e);
      toast.error('No se pudo cargar la inspección');
      router.replace('/inspections');
    } finally {
      setLoading(false);
    }
  };

  const openReply = (obs: Observation) => {
    setSelectedObservation(obs);
    setReplyText(obs.obs_maintenance || '');
    setReplyOpen(true);
  };

  const saveReply = async () => {
    if (!selectedObservation) return;
    try {
      const trimmed = replyText.trim();
      // Si la observación es derivada del checklist (sin id), crearla primero
      if (!selectedObservation.id && inspection?.id) {
        const { data, error } = await InspectionService.createObservation({
          inspection_id: inspection.id,
          obs_id: selectedObservation.obs_id,
          equipment_code: selectedObservation.equipment_code,
          obs_operator: selectedObservation.obs_operator,
          obs_maintenance: trimmed,
          order_index: selectedObservation.order_index ?? 0,
        });
        if (error || !data) throw new Error(error || 'No se pudo crear la observación');

        toast.success('Observación creada y actualizada');
        // Reemplazar la observación derivada por la persistida con id
        setInspection((prev) => {
          if (!prev) return prev;
          const updated = (prev.observations || []).map((o) => {
            const isSame = !o.id && o.obs_id === selectedObservation.obs_id && o.equipment_code === selectedObservation.equipment_code;
            return isSame ? { ...data } : o;
          });
          return { ...prev, observations: updated };
        });
      } else {
        const { error } = await InspectionService.updateObservationMaintenance(
          selectedObservation.id as string,
          trimmed
        );
        if (error) throw new Error(error);
        toast.success('Observación actualizada');
        // Recargar inspección para obtener estado actualizado
        await loadInspection();
      }
      setReplyOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('No se pudo actualizar la observación');
    }
  };

  const toggleEquipment = (equipmentCode: string) => {
    setExpandedEquipment((prev) =>
      prev.includes(equipmentCode)
        ? prev.filter((code) => code !== equipmentCode)
        : [...prev, equipmentCode]
    );
  };

  const goToChecklist = (obs: Observation) => {
    // Expand corresponding equipment and scroll to the checklist item
    const code = obs.equipment_code;
    if (!expandedEquipment.includes(code)) {
      setExpandedEquipment((prev) => [...prev, code]);
    }
    // Espera al render para hacer scroll
    setTimeout(() => {
      const el = document.getElementById(`row-${code}-${obs.obs_id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <Badge variant="success">Completada</Badge>;
    }
    if (status === 'pending') {
      return <Badge variant="warning">Pendiente</Badge>;
    }
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

  // Notificación dinámica cuando faltan firmas
  const [missingSignToastShown, setMissingSignToastShown] = useState(false);
  useEffect(() => {
    if (!inspection) return;
    const label = getMissingSignaturesLabel(inspection);
    if (label && !missingSignToastShown) {
      toast.info(label);
      setMissingSignToastShown(true);
    }
    if (!label && missingSignToastShown) {
      setMissingSignToastShown(false);
    }
  }, [inspection?.supervisor_signature_url, inspection?.mechanic_signature_url, inspection?.supervisor_name, inspection?.mechanic_name]);

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

  // Firma temporal para rehidratación en móviles dentro del modal
  const [tempSignature, setTempSignature] = useState<string | null>(null);

  const handleDownloadPDF = async () => {
    if (!inspection) return;

    try {
      // Mostrar toast de carga y guardar el ID
      const loadingToast = toast.loading(`Generando PDF (${inspection.form_code || 'FOR-ATA-057'})...`);

      // Pequeño delay para que el usuario vea el mensaje
      await new Promise(resolve => setTimeout(resolve, 500));

      // Abrir la plantilla directamente para usar window.print()
      const url = `/templates/forata057?id=${inspection.id}&pdf=1&print=true&logo=/logo.png`;
      window.open(url, '_blank');

      // Dismiss el toast de carga específico
      toast.dismiss(loadingToast);

      // Mostrar mensaje de éxito
      toast.success('PDF abierto. Use Ctrl+P o el botón de imprimir para descargar.', {
        duration: 4000,
      });

    } catch (error: any) {
      console.error('Error generando/descargando PDF:', error);
      toast.dismiss(); // Limpiar todos los toasts
      toast.error(`No se pudo generar el PDF: ${error.message}`);
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
          <Button variant="ghost" size="sm" onClick={() => router.push('/inspections')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{inspection.form_code || 'Sin código'}</h2>
                {inspection.status === 'completed' && ((inspection.observations?.length || 0) > 0) ? (
                  <Badge variant="success">Completada con observación(es)</Badge>
                ) : (
                  getStatusBadge(inspection.status)
                )}
              </div>
            <p className="text-sm text-muted-foreground">
              Detalles de la inspección técnica
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          {canEditInspections && inspection.status === 'draft' && (
            <Button
              onClick={() => router.push(`/inspections/new?draft=${inspection.id}`)}
              variant="outline"
              className="w-full md:w-auto"
            >
              Continuar edición
            </Button>
          )}
          {/* Botones de firma cuando falta alguna (supervisor obligatoria, mecánico opcional) */}
          {canEditInspections && (!isSupervisorSigned(inspection) || !isMechanicSigned(inspection)) && (
            <div className="flex flex-col gap-2 w-full md:w-auto">
              {hasPendingObservations(inspection) && (
                <p className="text-xs text-muted-foreground">
                  Hay observaciones registradas. La inspección puede estar completada, se recomienda revisarlas.
                </p>
              )}
              <div className="flex gap-2">
                {!isSupervisorSigned(inspection) && (
                  <Button
                    variant="outline"
                    className="w-full md:w-auto"
                    disabled={false}
                    onClick={() => {
                      setSignRole('supervisor');
                      try {
                        const n = typeof window !== 'undefined' ? localStorage.getItem('inspections.supervisorName') : '';
                        setSignName(n || '');
                      } catch {}
                      setSignOpen(true);
                    }}
                  >
                    Firmar Supervisor
                  </Button>
                )}
                {!isMechanicSigned(inspection) && (
                  <Button
                    variant="outline"
                    className="w-full md:w-auto"
                    disabled={false}
                    onClick={() => {
                      setSignRole('mechanic');
                      try {
                        const n = typeof window !== 'undefined' ? localStorage.getItem('inspections.mechanicName') : '';
                        setSignName(n || '');
                      } catch {}
                      setSignOpen(true);
                    }}
                  >
                    Firmar Mecánico
                  </Button>
                )}
              </div>
            </div>
          )}
          <Button onClick={handleDownloadPDF} className="w-full md:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
        </div>
      </div>

      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent>
          {hasPendingObservations(inspection) && (
            <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm">
              La inspección puede estar completada, pero se recomienda revisar las observaciones.
            </div>
          )}
          {getMissingSignaturesLabel(inspection) && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
              {getMissingSignaturesLabel(inspection)}. La inspección está pendiente por firmas.
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center text-sm text-muted-foreground mb-1">
                <Calendar className="mr-2 h-4 w-4" />
                Fecha de Inspección
              </div>
              <p className="font-semibold">{formatInspectionDate(inspection.inspection_date)}</p>
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
                              <TableRow key={code} id={`row-${equipment.code}-${code}`}>
                                <TableCell className="font-medium">{code}</TableCell>
                                <TableCell>{item.description || getChecklistItem(code)?.description || '-'}</TableCell>
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

      {/* Observaciones (Operador/Mecánico) */}
      <Card>
        <CardHeader>
          <CardTitle>Observaciones ({inspection.observations?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inspection.observations && inspection.observations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Mecánico</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspection.observations.map((obs) => (
                  <TableRow key={obs.id || `${obs.obs_id}-${obs.equipment_code}`}> 
                    <TableCell className="font-medium">{obs.obs_id}</TableCell>
                    <TableCell>{obs.equipment_code}</TableCell>
                    <TableCell className="max-w-sm">
                      <span className="text-sm text-muted-foreground">{obs.obs_operator || '-'}</span>
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <span className="text-sm">{obs.obs_maintenance || '-'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => goToChecklist(obs)}>Ir al checklist</Button>
                        {canEditInspections && (!obs.obs_maintenance || obs.obs_maintenance.trim().length === 0) && (
                          <Button variant="outline" size="sm" onClick={() => openReply(obs)}>Responder</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No hay observaciones registradas.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respuesta del Mecánico</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Código {selectedObservation?.obs_id} · Equipo {selectedObservation?.equipment_code}
            </p>
            <Textarea
              placeholder="Ingresa tu observación de mantenimiento"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReplyOpen(false)}>Cancelar</Button>
            <Button onClick={saveReply}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para firmar Supervisor/Mecánico - PASOS SEPARADOS para móvil */}
      <Dialog open={signOpen} onOpenChange={(open) => {
        setSignOpen(open);
        if (!open) {
          setSignRole(null);
          setSignName('');
          setSignStep('name');
          setTempSignature(null);
        }
      }}>
        <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {signRole === 'mechanic' ? 'Firma del Mecánico' : 'Firma del Supervisor'}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({signStep === 'name' ? 'Paso 1 de 2' : 'Paso 2 de 2'})
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* PASO 1: Ingresar Nombre */}
          {signStep === 'name' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                <p className="font-medium">Primero, ingrese su nombre</p>
                <p className="text-xs text-blue-700 mt-1">Luego podrá firmar sin que el teclado interfiera</p>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium mb-2">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <Input
                  autoFocus
                  autoComplete="off"
                  placeholder={signRole === 'mechanic' ? 'Nombre del mecánico' : 'Nombre del supervisor'}
                  value={signName}
                  onChange={(e) => setSignName(e.target.value)}
                  onFocus={() => setShowNameSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && signName.trim()) {
                      setSignStep('signature');
                    }
                  }}
                  className="text-base"
                />
                {/* Sugerencias de autocompletado */}
                {showNameSuggestions && signRole && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {(signRole === 'supervisor' ? supervisorNames : mechanicNames)
                      .filter(name => name.toLowerCase().includes(signName.toLowerCase()))
                      .slice(0, 5)
                      .map((name, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm transition-colors flex items-center gap-2"
                          onClick={() => {
                            setSignName(name);
                            setShowNameSuggestions(false);
                          }}
                        >
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {name}
                        </button>
                      ))}
                  </div>
                )}
                {(signRole === 'supervisor' ? supervisorNames : mechanicNames).length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Nombres usados previamente en esta estación
                  </p>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSignOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!signName || signName.trim().length === 0) {
                      toast.error('El nombre es requerido');
                      return;
                    }
                    setSignStep('signature');
                  }}
                  disabled={!signName.trim()}
                  className="w-full sm:w-auto"
                >
                  Continuar a Firma →
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* PASO 2: Firmar (SIN inputs que activen teclado) */}
          {signStep === 'signature' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-900">
                <p className="font-medium">Firmando como: {signName}</p>
                <p className="text-xs text-green-700 mt-1">Dibuje su firma con el dedo o mouse</p>
              </div>
              <SignaturePad
                label="Firma Digital"
                storageKey={signRole === 'mechanic' ? 'inspector360.signature.modal.mechanic' : 'inspector360.signature.modal.supervisor'}
                onSave={async (sig) => {
                  if (!signRole) return;
                  setSavingSignature(true);
                  try {
                    if (signRole === 'supervisor') {
                      const { data, error } = await InspectionService.uploadSupervisorSignature(inspection.id!, signName, sig);
                      if (error) throw new Error(error);
                      try { if (typeof window !== 'undefined') localStorage.setItem('inspections.supervisorName', signName); } catch {}
                      toast.success('Firma del supervisor guardada correctamente');
                      // Recargar inspección para obtener estado actualizado
                      await loadInspection();
                    } else {
                      const { data, error } = await InspectionService.uploadMechanicSignature(inspection.id!, signName, sig);
                      if (error) throw new Error(error);
                      try { if (typeof window !== 'undefined') localStorage.setItem('inspections.mechanicName', signName); } catch {}
                      toast.success('Firma del mecánico guardada correctamente');
                      // Recargar inspección para obtener estado actualizado
                      await loadInspection();
                    }
                    setSignOpen(false);
                    setSignRole(null);
                    setSignName('');
                    setSignStep('name');
                    setTempSignature(null);
                  } catch (err: any) {
                    toast.error(err?.message || 'No se pudo guardar la firma');
                  } finally {
                    setSavingSignature(false);
                  }
                }}
                onCancel={() => setSignStep('name')}
                onChange={(sig) => setTempSignature(sig)}
                initialValue={tempSignature || undefined}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                    className="max-w-full w-auto h-auto"
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
                    className="max-w-full w-auto h-auto"
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
