'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { useInspectionForm } from '@/context/inspection-context';
import { InspectionService } from '@/lib/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import dynamic from 'next/dynamic';
const SignaturePad = dynamic(() => import('./signature-pad'), { ssr: false });
import { CheckCircle2, Loader2, AlertCircle, Wrench } from 'lucide-react';
import { toast } from 'sonner';

export default function Step4Finalize() {
  const router = useRouter();
  const { profile } = useAuth();
  const { formData, setSignatures, resetForm, draftInspectionId, equipmentDbIds, updateObservation } = useInspectionForm();
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorSignature, setSupervisorSignature] = useState<string | null>(null);
  const [mechanicName, setMechanicName] = useState('');
  const [mechanicSignature, setMechanicSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mechanicResponses, setMechanicResponses] = useState<Record<string, string>>({});

  // Estado para rastrear el nombre guardado junto con la firma
  const [savedSupervisorName, setSavedSupervisorName] = useState<string | null>(null);
  const [savedMechanicName, setSavedMechanicName] = useState<string | null>(null);

  // Estados para autocompletado de nombres
  const [supervisorNames, setSupervisorNames] = useState<string[]>([]);
  const [mechanicNames, setMechanicNames] = useState<string[]>([]);
  const [showSupervisorSuggestions, setShowSupervisorSuggestions] = useState(false);
  const [showMechanicSuggestions, setShowMechanicSuggestions] = useState(false);

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
    } catch {}
  }, []);

  // Persist names to localStorage when they change
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem('inspections.supervisorName', supervisorName || '');
    } catch {}
  }, [supervisorName]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem('inspections.mechanicName', mechanicName || '');
    } catch {}
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
      } catch {}
      toast.info('Firma del supervisor invalidada. Por favor firme nuevamente.', { duration: 3000 });
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
      } catch {}
      toast.info('Firma del mecánico invalidada. Por favor firme nuevamente.', { duration: 3000 });
    }
  }, [mechanicName, savedMechanicName]);

  // Cargar nombres de supervisores y mecánicos cuando se monta el componente
  useEffect(() => {
    const station = formData.general?.station;
    if (station) {
      const loadNames = async () => {
        const [supervisorRes, mechanicRes] = await Promise.all([
          InspectionService.getUniqueSupervisorNames(station),
          InspectionService.getUniqueMechanicNames(station),
        ]);
        setSupervisorNames((supervisorRes.data as string[]) || []);
        setMechanicNames((mechanicRes.data as string[]) || []);
      };
      loadNames();
    }
  }, [formData.general?.station]);

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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumen de la Inspección</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-3">
              <Label className="text-xs text-muted-foreground">Fecha</Label>
              <p className="text-sm font-semibold">{formData.general?.inspection_date.toLocaleDateString('es')}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <p className="text-sm font-semibold">{formData.general?.inspection_type}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <Label className="text-xs text-muted-foreground">Inspector</Label>
              <p className="text-sm font-semibold truncate">{formData.general?.inspector_name}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <Label className="text-xs text-muted-foreground">Estación</Label>
              <p className="text-sm font-semibold">{formData.general?.station}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Equipos inspeccionados</Label>
              <p className="text-sm font-semibold">{formData.equipment.length} equipo(s)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección de Respuestas del Mecánico a Observaciones */}
      {formData.observations.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                <Wrench className="h-4 w-4 text-orange-700" />
              </div>
              Respuestas del Mecánico a Observaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.observations.map((obs, index) => {
              const key = `${obs.equipment_code}::${obs.obs_id}`;
              const hasResponse = !!obs.obs_maintenance;

              return (
                <Card key={index} className="border-orange-200">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-orange-100 text-orange-900">
                            {obs.equipment_code}
                          </span>
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-orange-100 text-orange-900">
                            {obs.obs_id}
                          </span>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <Label className="text-xs text-red-700 font-semibold">Observación del Inspector:</Label>
                          <p className="text-sm text-red-900 mt-1">{obs.obs_operator}</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Respuesta del Mecánico:</Label>
                          <Textarea
                            placeholder="Describa la acción correctiva tomada o el plan de reparación..."
                            value={mechanicResponses[key] || ''}
                            onChange={(e) => handleMechanicResponseChange(index, obs.equipment_code, obs.obs_id, e.target.value)}
                            className="min-h-[80px] text-sm"
                            rows={3}
                            disabled={hasResponse}
                          />
                          {hasResponse ? (
                            <div className="px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-xs font-semibold text-green-900 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                Respuesta guardada correctamente
                              </p>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleSaveMechanicResponse(index, obs.equipment_code, obs.obs_id)}
                              className="w-full bg-orange-600 hover:bg-orange-700"
                              disabled={!mechanicResponses[key]?.trim()}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
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

      {/* Sección Supervisor - Mejorada para móvil */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <span className="text-sm font-bold text-blue-700">1</span>
            </div>
            Supervisor o Encargado de Estación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 relative">
            <Label htmlFor="supervisor-name" className="text-sm font-medium">Nombre del Supervisor</Label>
            <Input
              id="supervisor-name"
              value={supervisorName}
              autoComplete="off"
              onFocus={() => setShowSupervisorSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSupervisorSuggestions(false), 200)}
              onChange={(e) => {
                const value = e.target.value;
                setSupervisorName(value);
                setSignatures({
                  ...formData.signatures,
                  supervisor_name: value,
                });
              }}
              placeholder="Ej: Juan Pérez García"
              className="bg-white"
            />
            {/* Sugerencias de autocompletado para supervisor */}
            {showSupervisorSuggestions && supervisorNames.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {supervisorNames
                  .filter(name => name.toLowerCase().includes(supervisorName.toLowerCase()))
                  .slice(0, 5)
                  .map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm transition-colors flex items-center gap-2"
                      onClick={() => {
                        setSupervisorName(name);
                        setSignatures({
                          ...formData.signatures,
                          supervisor_name: name,
                        });
                        setShowSupervisorSuggestions(false);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-gray-400" />
                      {name}
                    </button>
                  ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {supervisorNames.length > 0 ? '💡 Nombres usados previamente en esta estación' : '💾 Se guarda automáticamente para la próxima inspección'}
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

      {/* Sección Mecánico - Mejorada para móvil */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <span className="text-sm font-bold text-green-700">2</span>
            </div>
            Mecánico de Estación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 relative">
            <Label htmlFor="mechanic-name" className="text-sm font-medium">Nombre del Mecánico</Label>
            <Input
              id="mechanic-name"
              value={mechanicName}
              autoComplete="off"
              onFocus={() => setShowMechanicSuggestions(true)}
              onBlur={() => setTimeout(() => setShowMechanicSuggestions(false), 200)}
              onChange={(e) => {
                const value = e.target.value;
                setMechanicName(value);
                setSignatures({
                  ...formData.signatures,
                  mechanic_name: value,
                });
              }}
              placeholder="Ej: María López Ruiz"
              className="bg-white"
            />
            {/* Sugerencias de autocompletado para mecánico */}
            {showMechanicSuggestions && mechanicNames.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {mechanicNames
                  .filter(name => name.toLowerCase().includes(mechanicName.toLowerCase()))
                  .slice(0, 5)
                  .map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left px-4 py-2 hover:bg-green-50 text-sm transition-colors flex items-center gap-2"
                      onClick={() => {
                        setMechanicName(name);
                        setSignatures({
                          ...formData.signatures,
                          mechanic_name: name,
                        });
                        setShowMechanicSuggestions(false);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-gray-400" />
                      {name}
                    </button>
                  ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {mechanicNames.length > 0 ? '💡 Nombres usados previamente en esta estación' : '💾 Se guarda automáticamente para la próxima inspección'}
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
      <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-2">
        <Button
          className="w-full shadow-lg"
          size="lg"
          onClick={handleComplete}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Guardando Inspección...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Completar Inspección
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
