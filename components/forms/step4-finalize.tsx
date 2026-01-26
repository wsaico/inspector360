'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { useInspectionForm } from '@/context/inspection-context';
import { InspectionService } from '@/lib/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import dynamic from 'next/dynamic';
const SignaturePad = dynamic(() => import('./signature-pad'), { ssr: false });
import { CheckCircle2, Loader2, AlertCircle, Wrench, MessageSquare, PenTool, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { EmployeeSelect } from './employee-select';

export default function Step4Finalize() {
  const router = useRouter();
  const { profile } = useAuth();
  const { formData, setSignatures, resetForm, draftInspectionId, equipmentDbIds, updateObservation, setAdditionalComments } = useInspectionForm();
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorSignature, setSupervisorSignature] = useState<string | null>(null);
  const [mechanicName, setMechanicName] = useState('');
  const [mechanicSignature, setMechanicSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mechanicResponses, setMechanicResponses] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState(false);

  // Estado para rastrear el nombre guardado junto con la firma
  const [savedSupervisorName, setSavedSupervisorName] = useState<string | null>(null);
  const [savedMechanicName, setSavedMechanicName] = useState<string | null>(null);

  // Initialize showComments based on existing data
  useEffect(() => {
    if (formData.additional_comments && formData.additional_comments.length > 0) {
      setShowComments(true);
    }
  }, [formData.additional_comments]);

  // Prefill de nombres desde localStorage (solo nombres, no firmas)
  useEffect(() => {
    try {
      const supName = typeof window !== 'undefined' ? localStorage.getItem('inspections.supervisorName') : null;
      const mecName = typeof window !== 'undefined' ? localStorage.getItem('inspections.mechanicName') : null;

      if (supName) {
        setSupervisorName(supName);
        setSavedSupervisorName(supName);
        setSignatures({
          ...formData.signatures,
          supervisor_name: supName,
        });
      }
      if (mecName) {
        setMechanicName(mecName);
        setSavedMechanicName(mecName);
        setSignatures({
          ...formData.signatures,
          mechanic_name: mecName,
        });
      }
    } catch { }
  }, []);

  // Persist names to localStorage when they change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem('inspections.supervisorName', supervisorName || '');
    } catch { }
  }, [supervisorName]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem('inspections.mechanicName', mechanicName || '');
    } catch { }
  }, [mechanicName]);

  // VALIDACIÓN: Invalidar firma del supervisor si el nombre cambia
  useEffect(() => {
    if (savedSupervisorName && supervisorName && savedSupervisorName !== supervisorName) {
      // El nombre cambió, invalidar firma
      setSupervisorSignature(null);
      setSavedSupervisorName(supervisorName);
      setSignatures({
        ...formData.signatures,
        supervisor_signature: undefined,
        supervisor_name: supervisorName,
      });
      // Limpiar firma guardada en localStorage
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('inspector360.signature.supervisor');
        }
      } catch { }
      // toast.info('Firma del supervisor invalidada. Por favor firme nuevamente.', { duration: 3000 });
    }
  }, [supervisorName, savedSupervisorName]);

  // VALIDACIÓN: Invalidar firma del mecánico si el nombre cambia
  useEffect(() => {
    if (savedMechanicName && mechanicName && savedMechanicName !== mechanicName) {
      // El nombre cambió, invalidar firma
      setMechanicSignature(null);
      setSavedMechanicName(mechanicName);
      setSignatures({
        ...formData.signatures,
        mechanic_signature: undefined,
        mechanic_name: mechanicName,
      });
      // Limpiar firma guardada en localStorage
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('inspector360.signature.mechanic');
        }
      } catch { }
      // toast.info('Firma del mecánico invalidada. Por favor firme nuevamente.', { duration: 3000 });
    }
  }, [mechanicName, savedMechanicName]);

  // Cargar respuestas del mecánico existentes
  useEffect(() => {
    const responses: Record<string, string> = {};
    formData.observations.forEach(obs => {
      const key = `${obs.equipment_code}::${obs.obs_id}`;
      if (obs.obs_maintenance) {
        responses[key] = obs.obs_maintenance;
      }
    });
    setMechanicResponses(responses);
  }, [formData.observations]);

  const handleMechanicResponseChange = (obsIndex: number, equipmentCode: string, obsId: string, response: string) => {
    const key = `${equipmentCode}::${obsId}`;
    setMechanicResponses(prev => ({ ...prev, [key]: response }));
  };

  const handleSaveMechanicResponse = async (obsIndex: number, equipmentCode: string, obsId: string) => {
    const key = `${equipmentCode}::${obsId}`;
    const response = mechanicResponses[key]?.trim();

    if (!response) {
      toast.error('Debe ingresar una respuesta del mecánico');
      return;
    }

    const observation = formData.observations[obsIndex];

    // Actualizar estado local
    updateObservation(obsIndex, {
      ...observation,
      obs_maintenance: response,
    });

    // Persistir en base de datos si existe la inspección
    try {
      if (draftInspectionId) {
        // Buscar la observación en la BD
        const { data: existingInspection } = await InspectionService.getInspectionById(draftInspectionId);
        const existingObservations = existingInspection?.observations || [];
        const existingDbObs = existingObservations.find(
          (obs: any) => obs.equipment_code === equipmentCode && obs.obs_id === obsId
        );

        if (existingDbObs && existingDbObs.id) {
          // Actualizar observación en BD
          const { error } = await InspectionService.updateObservation(existingDbObs.id, {
            obs_maintenance: response,
          });
          if (error) {
            console.error('Error actualizando respuesta del mecánico:', error);
            toast.error('No se pudo guardar la respuesta en la base de datos');
          } else {
            toast.success('Respuesta del mecánico guardada y el estado actualizado');
          }
        } else {
          toast.error('No se encontró la observación en la base de datos');
        }
      } else {
        toast.success('Respuesta del mecánico guardada localmente');
      }
    } catch (err: any) {
      console.error('Error al persistir respuesta del mecánico:', err);
      toast.error('No se pudo guardar la respuesta en la base de datos');
    }
  };

  const handleComplete = async () => {

    if (!profile?.id) {
      toast.error('Usuario no autenticado');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Obtener o crear inspección según borrador
      let inspectionId: string | null = null;
      if (draftInspectionId) {
        // Usamos el borrador existente, asegurando actualizar info general (por si cambió)
        const { error: updateDraftError } = await InspectionService.updateInspection(draftInspectionId, {
          station: formData.general!.station,
          inspection_date: formData.general!.inspection_date,
          inspection_type: formData.general!.inspection_type,
          inspector_name: formData.general!.inspector_name,
          additional_comments: formData.additional_comments,
        });
        if (updateDraftError) {
          throw new Error(updateDraftError);
        }
        inspectionId = draftInspectionId;
      } else {
        const { data: created, error: createError } = await InspectionService.createInspection({
          user_id: profile.id,
          station: formData.general!.station,
          inspection_date: formData.general!.inspection_date,
          inspection_type: formData.general!.inspection_type,
          inspector_name: formData.general!.inspector_name,
          additional_comments: formData.additional_comments,
        });
        if (createError || !created) throw new Error(createError);
        inspectionId = created.id!;
      }

      // 2. Agregar/Actualizar equipos
      for (let i = 0; i < formData.equipment.length; i++) {
        const eq = formData.equipment[i];
        const checklistData = formData.checklists[eq.code];
        const equipmentSignature = formData.equipmentSignatures[eq.code];
        const existingId = equipmentDbIds[eq.code];
        let equipmentRowId: string | null = null;
        if (existingId) {
          const { data: updatedEq, error: updateEqError } = await InspectionService.updateEquipment(existingId, {
            ...eq,
            checklist_data: checklistData,
            order_index: i,
          });
          if (updateEqError) throw new Error(`Error actualizando equipo: ${updateEqError}`);
          equipmentRowId = updatedEq?.id ?? existingId;
        } else {
          const { data: equipmentResult, error: equipmentError } = await InspectionService.addEquipment(inspectionId!, {
            ...eq,
            checklist_data: checklistData,
            order_index: i,
          });
          if (equipmentError) throw new Error(`Error agregando equipo: ${equipmentError}`);
          equipmentRowId = equipmentResult?.id ?? null;
        }

        // 2.1 Guardar firma del inspector por equipo si existe
        if (equipmentSignature && equipmentRowId) {
          // Validar que la firma sea una data URL válida
          if (typeof equipmentSignature === 'string' && equipmentSignature.startsWith('data:image')) {
            const { error: signatureError } = await InspectionService.uploadInspectorSignature(equipmentRowId, equipmentSignature);
            if (signatureError) {
              console.error(`Error guardando firma del inspector para equipo ${eq.code}:`, signatureError);
              toast.error(`No se pudo guardar la firma del inspector para ${eq.code}`);
            }
          } else {
            console.warn(`Firma inválida para equipo ${eq.code}:`, equipmentSignature);
          }
        }
      }

      // 2.5 Guardar/Actualizar observaciones agregadas en el formulario (si existen)
      if (formData.observations && formData.observations.length > 0) {
        // Obtener observaciones existentes para actualizar en lugar de duplicar
        let existingObsMap = new Map<string, any>();
        if (inspectionId) {
          const { data: existingInspection } = await InspectionService.getInspectionById(inspectionId);
          const existingObs = (existingInspection?.observations || []) as any[];
          existingObs.forEach(o => {
            const key = `${o.equipment_code}::${o.obs_id}`;
            existingObsMap.set(key, o);
          });
        }

        for (let i = 0; i < formData.observations.length; i++) {
          const o = formData.observations[i];
          const key = `${o.equipment_code}::${o.obs_id}`;
          const existing = existingObsMap.get(key);

          if (existing) {
            // Actualizar observación existente
            await InspectionService.updateObservation(existing.id, {
              obs_operator: o.obs_operator,
              obs_maintenance: o.obs_maintenance ?? null,
              order_index: i,
            });
          } else {
            // Crear nueva observación
            await InspectionService.createObservation({
              inspection_id: inspectionId!,
              obs_id: o.obs_id,
              equipment_code: o.equipment_code,
              obs_operator: o.obs_operator,
              obs_maintenance: o.obs_maintenance ?? null,
              order_index: i,
            });
          }
        }
      }

      // 3. Completar con firmas
      await InspectionService.completeInspection(inspectionId!, {
        supervisorName: supervisorName || null,
        supervisorSignature: supervisorSignature || null,
        mechanicName: mechanicName || null,
        mechanicSignature: mechanicSignature || null,
      });

      toast.success('Inspección completada exitosamente');
      resetForm();
      router.push(`/inspections/${inspectionId}`);
    } catch (error: any) {
      toast.error(`Error al completar la inspección: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Resumen compacto */}
      <Card className="border-0 shadow-lg rounded-[30px] overflow-hidden">
        <CardHeader className="bg-[#0A3161] text-white p-6 pb-4">
          <CardTitle className="text-lg font-black uppercase tracking-widest text-[#B3D400]">Resumen de la Inspección</CardTitle>
        </CardHeader>
        <CardContent className="p-6 bg-slate-50/50">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm">
              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fecha</Label>
              <p className="text-base font-bold text-[#0A3161]">{formData.general?.inspection_date.toLocaleDateString('es')}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm">
              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tipo</Label>
              <p className="text-base font-bold text-[#0A3161] capitalize">{formData.general?.inspection_type.replace('_', ' ')}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm">
              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Inspector</Label>
              <p className="text-base font-bold text-[#0A3161] truncate">{formData.general?.inspector_name}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm">
              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estación</Label>
              <p className="text-base font-bold text-[#0A3161]">{formData.general?.station}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm sm:col-span-2">
              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Equipos inspeccionados</Label>
              <p className="text-base font-bold text-[#0A3161]">{formData.equipment.length} equipo(s)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de Respuestas del Mecánico a Observaciones */}
      {formData.observations.length > 0 && (
        <Card className="border-2 border-orange-200 bg-orange-50/30 rounded-[30px] overflow-hidden">
          <CardHeader className="pb-3 border-b border-orange-100 bg-orange-50/50 p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 shadow-sm border border-orange-200">
                <Wrench className="h-5 w-5" />
              </div>
              <span className="font-black uppercase tracking-wide text-orange-900">Respuestas (Mecánico)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {formData.observations.map((obs, index) => {
              const key = `${obs.equipment_code}::${obs.obs_id}`;
              const hasResponse = !!obs.obs_maintenance;

              return (
                <Card key={index} className="border-0 shadow-sm bg-white rounded-xl overflow-hidden">
                  <CardContent className="pt-4 space-y-3 p-5">
                    <div className="flex items-start gap-4">
                      <AlertCircle className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-orange-100 text-orange-900 border border-orange-200">
                            {obs.equipment_code}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-orange-100 text-orange-900 border border-orange-200">
                            {obs.obs_id}
                          </span>
                        </div>
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                          <Label className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Observación del Inspector:</Label>
                          <p className="text-sm font-medium text-red-900 mt-1">{obs.obs_operator}</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-slate-500 tracking-wide">Respuesta del Mecánico:</Label>
                          <Textarea
                            placeholder="Describa la acción correctiva tomada o el plan de reparación..."
                            value={mechanicResponses[key] || ''}
                            onChange={(e) => handleMechanicResponseChange(index, obs.equipment_code, obs.obs_id, e.target.value)}
                            className="min-h-[80px] text-sm rounded-xl border-slate-200 focus:border-[#0A3161] focus:ring-[#0A3161]"
                            rows={3}
                            disabled={hasResponse}
                          />
                          {hasResponse ? (
                            <div className="px-4 py-3 bg-green-50 rounded-xl border border-green-200 shadow-sm">
                              <p className="text-sm font-bold text-green-800 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                Respuesta guardada
                              </p>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleSaveMechanicResponse(index, obs.equipment_code, obs.obs_id)}
                              className="w-full bg-[#0A3161] hover:bg-[#152d6f] text-white font-bold rounded-xl"
                              disabled={!mechanicResponses[key]?.trim()}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4 text-[#B3D400]" />
                              Guardar Respuesta
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Sección Comentarios Adicionales */}
      <Card className="border-0 shadow-md rounded-[30px] overflow-hidden">
        <CardHeader className="pb-3 bg-slate-50 p-6 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                <MessageSquare className="h-5 w-5 text-slate-500" />
              </div>
              <span className="font-bold text-slate-700">Comentarios Adicionales</span>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="show-comments" className="text-xs font-bold uppercase text-slate-400 cursor-pointer">
                {showComments ? 'Ocultar' : 'Agregar'}
              </Label>
              <Switch
                id="show-comments"
                checked={showComments}
                onCheckedChange={setShowComments}
              />
            </div>
          </CardTitle>
        </CardHeader>
        {showComments && (
          <CardContent className="p-6">
            <Textarea
              placeholder="Ingrese cualquier comentario adicional, observación general o nota importante sobre la inspección..."
              value={formData.additional_comments || ''}
              onChange={(e) => setAdditionalComments(e.target.value)}
              className="min-h-[100px] rounded-xl border-slate-200 focus:border-[#0A3161] focus:ring-[#0A3161] p-4 text-base"
            />
          </CardContent>
        )}
      </Card>

      {/* Sección Supervisor - Mejorada con EmployeeSelect */}
      <Card className="border-0 shadow-lg rounded-[30px] overflow-hidden">
        <CardHeader className="bg-[#0A3161] p-6 pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20">
              <span className="text-lg font-black text-[#B3D400]">1</span>
            </div>
            <div className="flex flex-col">
              <span className="font-black uppercase tracking-widest text-sm text-[#B3D400]">Responsable (1)</span>
              <span className="font-medium text-slate-300">Supervisor de Estación</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6 bg-slate-50/50">
          <div className="space-y-3 relative z-20">
            <Label htmlFor="supervisor-name" className="text-xs font-black uppercase text-[#0A3161] tracking-wider flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Nombre del Supervisor
            </Label>

            <EmployeeSelect
              stationCode={formData.general?.station || 'AQP'}
              value={supervisorName}
              onChange={(val) => {
                setSupervisorName(val);
                setSignatures({
                  ...formData.signatures,
                  supervisor_name: val,
                });
              }}
              className="h-12 rounded-xl border-slate-200 bg-white"
              placeholder="Seleccione al supervisor..."
            />

            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1 fa-fade">
              {supervisorName ? '✓ Personal Seleccionado' : 'Seleccione de la lista oficial'}
            </p>
          </div>
          <SignaturePad
            label="Firma del Supervisor"
            storageKey="inspector360.signature.supervisor"
            onSave={(sig) => {
              setSupervisorSignature(sig);
              setSignatures({
                ...formData.signatures,
                supervisor_signature: sig,
                supervisor_name: supervisorName,
              });
            }}
            onChange={(sig) => {
              setSupervisorSignature(sig);
              setSignatures({
                ...formData.signatures,
                supervisor_signature: sig,
                supervisor_name: supervisorName,
              });
            }}
            initialValue={supervisorSignature || formData.signatures.supervisor_signature || undefined}
          />
        </CardContent>
      </Card>

      {/* Sección Mecánico - Mejorada con EmployeeSelect */}
      <Card className="border-0 shadow-lg rounded-[30px] overflow-hidden">
        <CardHeader className="bg-[#0A3161] p-6 pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/20">
              <span className="text-lg font-black text-[#B3D400]">2</span>
            </div>
            <div className="flex flex-col">
              <span className="font-black uppercase tracking-widest text-sm text-[#B3D400]">Responsable (2)</span>
              <span className="font-medium text-slate-300">Mecánico de Turno</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-6 bg-slate-50/50">
          <div className="space-y-3 relative z-10">
            <Label htmlFor="mechanic-name" className="text-xs font-black uppercase text-[#0A3161] tracking-wider flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Nombre del Mecánico
            </Label>

            <EmployeeSelect
              stationCode={formData.general?.station || 'AQP'}
              value={mechanicName}
              onChange={(val) => {
                setMechanicName(val);
                setSignatures({
                  ...formData.signatures,
                  mechanic_name: val,
                });
              }}
              className="h-12 rounded-xl border-slate-200 bg-white"
              placeholder="Seleccione al mecánico..."
            />

            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1 fa-fade">
              {mechanicName ? '✓ Personal Seleccionado' : 'Seleccione de la lista oficial'}
            </p>
          </div>
          <SignaturePad
            label="Firma del Mecánico"
            storageKey="inspector360.signature.mechanic"
            onSave={(sig) => {
              setMechanicSignature(sig);
              setSignatures({
                ...formData.signatures,
                mechanic_signature: sig,
                mechanic_name: mechanicName,
              });
            }}
            onChange={(sig) => {
              setMechanicSignature(sig);
              setSignatures({
                ...formData.signatures,
                mechanic_signature: sig,
                mechanic_name: mechanicName,
              });
            }}
            initialValue={mechanicSignature || formData.signatures.mechanic_signature || undefined}
          />
        </CardContent>
      </Card>

      {/* Botón de completar - Fixed en móvil */}
      <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 z-30">
        <Button
          className="w-full h-14 rounded-2xl shadow-xl bg-[#0A3161] hover:bg-[#152d6f] text-white text-lg font-black uppercase tracking-widest transition-all hover:scale-[1.01]"
          size="lg"
          onClick={handleComplete}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-[#B3D400]" />
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-6 w-6 text-[#B3D400]" />
              Completar Inspección
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
