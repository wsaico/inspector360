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
import SignaturePad from './signature-pad';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Step4Finalize() {
  const router = useRouter();
  const { user } = useAuth();
  const { formData, setSignatures, resetForm } = useInspectionForm();
  const [supervisorName, setSupervisorName] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    if (!supervisorName || !signature) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Crear inspección
      const { data: inspection, error: inspectionError } = await InspectionService.createInspection({
        user_id: user?.id,
        station: formData.general!.station,
        inspection_date: formData.general!.inspection_date,
        inspection_type: formData.general!.inspection_type,
        inspector_name: formData.general!.inspector_name,
      });

      if (inspectionError || !inspection) throw new Error(inspectionError);

      // 2. Agregar equipos
      for (const eq of formData.equipment) {
        const checklistData = formData.checklists[eq.code];
        await InspectionService.addEquipment(inspection.id!, {
          ...eq,
          checklist_data: checklistData,
        });
      }

      // 3. Completar con firma
      await InspectionService.completeInspection(inspection.id!, {
        name: supervisorName,
        signature,
      });

      toast.success('Inspección completada exitosamente');
      resetForm();
      router.push(`/dashboard/inspections/${inspection.id}`);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Error al completar la inspección');
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
          <CardTitle>Firma del Supervisor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del Supervisor *</Label>
            <Input
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              placeholder="Nombre completo"
            />
          </div>
          <SignaturePad onSave={setSignature} required />
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={handleComplete}
        disabled={!supervisorName || !signature || isSubmitting}
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
