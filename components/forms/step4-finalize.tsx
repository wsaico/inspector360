'use client';

import { useState } from 'react';
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
  const { formData, setSignatures, resetForm } = useInspectionForm();
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorSignature, setSupervisorSignature] = useState<string | null>(null);
  const [mechanicName, setMechanicName] = useState('');
  const [mechanicSignature, setMechanicSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    if (!supervisorName || !supervisorSignature || !mechanicName || !mechanicSignature) {
      toast.error('Complete todos los campos requeridos (ambas firmas)');
      return;
    }

    if (!profile?.id) {
      toast.error('Usuario no autenticado');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Crear inspección
      const { data: inspection, error: inspectionError} = await InspectionService.createInspection({
        user_id: profile.id,
        station: formData.general!.station,
        inspection_date: formData.general!.inspection_date,
        inspection_type: formData.general!.inspection_type,
        inspector_name: formData.general!.inspector_name,
      });

      if (inspectionError || !inspection) {
        throw new Error(inspectionError);
      }

      // 2. Agregar equipos
      for (let i = 0; i < formData.equipment.length; i++) {
        const eq = formData.equipment[i];
        const checklistData = formData.checklists[eq.code];
        const equipmentSignature = formData.equipmentSignatures[eq.code];

        const { data: equipmentResult, error: equipmentError } = await InspectionService.addEquipment(inspection.id!, {
          ...eq,
          checklist_data: checklistData,
          order_index: i,
        });

        if (equipmentError) {
          throw new Error(`Error agregando equipo: ${equipmentError}`);
        }

        // 2.1 Guardar firma del inspector por equipo si existe
        if (equipmentSignature && equipmentResult) {
          await InspectionService.uploadInspectorSignature(equipmentResult.id!, equipmentSignature);
        }
      }

      // 3. Completar con firmas
      await InspectionService.completeInspection(inspection.id!, {
        supervisorName,
        supervisorSignature,
        mechanicName,
        mechanicSignature,
      });

      toast.success('Inspección completada exitosamente');
      resetForm();
      router.push(`/inspections/${inspection.id}`);
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
            <Label>Nombre del Supervisor *</Label>
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
          required
        />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Firma del Mecánico de Estación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del Mecánico *</Label>
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
          required
        />
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={handleComplete}
        disabled={!supervisorName || !supervisorSignature || !mechanicName || !mechanicSignature || isSubmitting}
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
