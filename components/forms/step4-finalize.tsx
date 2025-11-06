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
import dynamic from 'next/dynamic';
const SignaturePad = dynamic(() => import('./signature-pad'), { ssr: false });
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Step4Finalize() {
  const router = useRouter();
  const { profile } = useAuth();
  const { formData, setSignatures, resetForm, draftInspectionId, equipmentDbIds } = useInspectionForm();
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorSignature, setSupervisorSignature] = useState<string | null>(null);
  const [mechanicName, setMechanicName] = useState('');
  const [mechanicSignature, setMechanicSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prefill names from localStorage
  useEffect(() => {
    try {
      const supName = typeof window !== 'undefined' ? localStorage.getItem('inspections.supervisorName') : null;
      const mecName = typeof window !== 'undefined' ? localStorage.getItem('inspections.mechanicName') : null;
      if (supName) {
        setSupervisorName(supName);
        setSignatures({
          ...formData.signatures,
          supervisor_name: supName,
        });
      }
      if (mecName) {
        setMechanicName(mecName);
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
          await InspectionService.uploadInspectorSignature(equipmentRowId, equipmentSignature);
        }
      }

      // 2.5 Guardar observaciones agregadas en el formulario (si existen)
      if (formData.observations && formData.observations.length > 0) {
        // Evitar duplicados consultando existentes
        let existingKeys = new Set<string>();
        if (inspectionId) {
          const { data: existingInspection } = await InspectionService.getInspectionById(inspectionId);
          const existingObs = (existingInspection?.observations || []) as any[];
          existingKeys = new Set(existingObs.map(o => `${o.equipment_code}::${o.obs_id}`));
        }
        for (let i = 0; i < formData.observations.length; i++) {
          const o = formData.observations[i];
          const key = `${o.equipment_code}::${o.obs_id}`;
          if (existingKeys.has(key)) continue; // omitir duplicados
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumen de la Inspección</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Fecha</Label>
              <p className="font-semibold">{formData.general?.inspection_date.toLocaleDateString('es')}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Tipo</Label>
              <p className="font-semibold">{formData.general?.inspection_type}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Inspector</Label>
              <p className="font-semibold">{formData.general?.inspector_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Estación</Label>
              <p className="font-semibold">{formData.general?.station}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Equipos</Label>
              <p className="font-semibold">{formData.equipment.length} equipo(s)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Firma del Supervisor o Encargado de Estación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del Supervisor</Label>
          <Input
            value={supervisorName}
            onChange={(e) => {
              const value = e.target.value;
              setSupervisorName(value);
              setSignatures({
                ...formData.signatures,
                supervisor_name: value,
              });
            }}
            placeholder="Nombre completo del supervisor"
          />
          <p className="text-xs text-muted-foreground">Se guarda en este navegador para reutilizar.</p>
        </div>
        <SignaturePad
          label="Firma del Supervisor"
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

      <Card>
        <CardHeader>
          <CardTitle>Firma del Mecánico de Estación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del Mecánico</Label>
          <Input
            value={mechanicName}
            onChange={(e) => {
              const value = e.target.value;
              setMechanicName(value);
              setSignatures({
                ...formData.signatures,
                mechanic_name: value,
              });
            }}
            placeholder="Nombre completo del mecánico"
          />
          <p className="text-xs text-muted-foreground">Se guarda en este navegador para reutilizar.</p>
        </div>
        <SignaturePad
          label="Firma del Mecánico"
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

      <Button
        className="w-full"
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
  );
}
