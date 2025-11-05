'use client';
export const dynamic = 'force-dynamic';

/**
 * Pagina: Nueva Inspeccion
 * Wizard de 4 pasos para crear una inspeccion completa
 */

import { InspectionProvider, useInspectionForm } from '@/context/inspection-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Step1General from '@/components/forms/step1-general';
import Step2Equipment from '@/components/forms/step2-equipment';
import Step2_5Observations from '@/components/forms/step2_5-observations';
import Step3Checklist from '@/components/forms/step3-checklist';
import Step4Finalize from '@/components/forms/step4-finalize';
import { useAuth } from '@/hooks';
import { InspectionService } from '@/lib/services';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import React from 'react';

function InspectionWizardContent() {
  const { currentStep, nextStep, prevStep, canProceed, formData, draftInspectionId, setDraftInspectionId, setGeneralInfo, addEquipment, updateChecklist, addObservation, setEquipmentDbId } = useInspectionForm();
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [isAdvancing, setIsAdvancing] = React.useState(false);

  React.useEffect(() => {
    const draftId = searchParams.get('draft');
    if (!draftId) return;
    (async () => {
      const { data, error } = await InspectionService.getInspectionById(draftId);
      if (error || !data) {
        toast.error('No se pudo cargar el borrador');
        return;
      }
      setDraftInspectionId(data.id!);
      setGeneralInfo({
        station: data.station,
        inspection_date: new Date(data.inspection_date as any),
        inspection_type: data.inspection_type,
        inspector_name: data.inspector_name,
      });
      (data.equipment || []).forEach((eq: import('@/types').Equipment, idx: number) => {
        addEquipment({
          code: eq.code,
          type: eq.type,
          brand: eq.brand,
          model: eq.model,
          year: eq.year,
          serial_number: eq.serial_number,
          motor_serial: eq.motor_serial,
          station: data.station,
          checklist_data: eq.checklist_data || {},
          order_index: typeof eq.order_index === 'number' ? eq.order_index : idx,
          description: eq.description,
        } as any);
        setEquipmentDbId(eq.code, eq.id!);
        const entries = Object.entries(eq.checklist_data || {});
        entries.forEach(([code, value]) => {
          updateChecklist(eq.code, code, value as any);
        });
      });
      (data.observations || []).forEach((obs: import('@/types').Observation, idx: number) => {
        addObservation({
          obs_id: obs.obs_id,
          equipment_code: obs.equipment_code,
          obs_operator: obs.obs_operator || '',
          obs_maintenance: obs.obs_maintenance ?? null,
          order_index: typeof obs.order_index === 'number' ? obs.order_index : idx,
        } as any);
      });
      toast.success('Borrador cargado');
    })();
  }, [searchParams]);

  const handleNext = async () => {
    if (currentStep !== 1) {
      nextStep();
      return;
    }
    if (!canProceed()) return;
    if (draftInspectionId) {
      nextStep();
      return;
    }
    if (!profile?.id) {
      toast.error('Usuario no autenticado');
      return;
    }
    setIsAdvancing(true);
    try {
      const general = formData.general!;
      const { data, error } = await InspectionService.createInspection({
        user_id: profile.id,
        station: general.station,
        inspection_date: general.inspection_date,
        inspection_type: general.inspection_type,
        inspector_name: general.inspector_name,
      });
      if (error || !data) throw new Error(error || 'No se pudo crear borrador');
      setDraftInspectionId(data.id!);
      toast.success('Borrador creado');
      nextStep();
    } catch (e: any) {
      toast.error(e.message || 'Error creando borrador');
    } finally {
      setIsAdvancing(false);
    }
  };

  const steps = [
    { number: 1, title: 'Informacion General', description: 'Datos basicos de la inspeccion' },
    { number: 2, title: 'Equipos', description: 'Agregar equipos a inspeccionar' },
    { number: 3, title: 'Checklist', description: 'Completar 15 items por equipo' },
    { number: 4, title: 'Observaciones', description: 'Agregar observaciones de equipos' },
    { number: 5, title: 'Finalizar', description: 'Firmas y completar' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Nueva Inspeccion Tecnica</h2>
        <p className="text-sm text-muted-foreground">
          Complete los 4 pasos para crear una inspeccion completa
        </p>
      </div>

      {/* Step Indicator (Mobile) */}
      <Card className="md:hidden">
        <CardContent className="pt-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold truncate max-w-[60%]">{steps[currentStep - 1].title}</span>
            <span className="text-xs text-muted-foreground">Paso {currentStep}/5</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 truncate">
            {steps[currentStep - 1].description}
          </p>
        </CardContent>
      </Card>

      {/* Step Indicator (Desktop) */}
      <Card className="hidden md:block">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  {/* Step Circle */}
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full border-2 font-bold transition-all',
                      currentStep === step.number && 'border-primary bg-primary text-white',
                      currentStep > step.number && 'border-green-500 bg-green-500 text-white',
                      currentStep < step.number && 'border-gray-300 bg-white text-gray-400'
                    )}
                  >
                    {currentStep > step.number ? <Check className="h-6 w-6" /> : step.number}
                  </div>
                  {/* Step Info */}
                  <div className="mt-2 text-center">
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className={cn('h-1 flex-1 transition-all', currentStep > step.number ? 'bg-green-500' : 'bg-gray-200')} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && <Step1General />}
        {currentStep === 2 && <Step2Equipment />}
        {currentStep === 3 && <Step3Checklist />}
        {currentStep === 4 && <Step2_5Observations />}
        {currentStep === 5 && <Step4Finalize />}
      </div>

      {/* Navigation Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>

            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Paso {currentStep} de 5
            </div>

            {currentStep < 5 ? (
              <Button className="w-full sm:w-auto" onClick={handleNext} disabled={!canProceed() || isAdvancing}>
                Siguiente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <div className="w-full sm:w-[140px]" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewInspectionPage() {
  return (
    <InspectionProvider>
      <InspectionWizardContent />
    </InspectionProvider>
  );
}
