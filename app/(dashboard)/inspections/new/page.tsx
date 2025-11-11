'use client';
export const dynamic = 'force-dynamic';

/**
 * Pagina: Nueva Inspeccion
 * Wizard de 4 pasos para crear una inspeccion completa
 */

import { InspectionProvider, useInspectionForm } from '@/context/inspection-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check, ClipboardList, Package, CheckSquare, MessageSquare, FileCheck } from 'lucide-react';
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
import React, { Suspense } from 'react';

function InspectionWizardContent() {
  const { currentStep, nextStep, prevStep, canProceed, formData, draftInspectionId, setDraftInspectionId, setGeneralInfo, addEquipment, updateChecklist, addObservation, setEquipmentDbId } = useInspectionForm();
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [isAdvancing, setIsAdvancing] = React.useState(false);

  // Wrap searchParams usage in Suspense
  const draftId = searchParams.get('draft');

  React.useEffect(() => {
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
  }, [draftId]);

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
    {
      number: 1,
      title: 'Información General',
      description: 'Datos básicos de la inspección',
      icon: ClipboardList,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-500'
    },
    {
      number: 2,
      title: 'Equipos',
      description: 'Agregar equipos a inspeccionar',
      icon: Package,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-500'
    },
    {
      number: 3,
      title: 'Checklist y Observaciones',
      description: 'Completar items y observaciones',
      icon: CheckSquare,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-500'
    },
    {
      number: 4,
      title: 'Finalizar',
      description: 'Firmas y completar',
      icon: FileCheck,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
      borderColor: 'border-teal-500'
    },
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

      {/* Step Indicator (Mobile) - Modern App Design */}
      <div className="md:hidden">
        <Card className={`border-2 ${steps[currentStep - 1].borderColor} shadow-lg overflow-hidden`}>
          <div className={`h-1.5 bg-gradient-to-r ${steps[currentStep - 1].color} transition-all`} />
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br ${steps[currentStep - 1].color} flex items-center justify-center shadow-md`}>
                {React.createElement(steps[currentStep - 1].icon, { className: 'h-6 w-6 text-white' })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold truncate">{steps[currentStep - 1].title}</h3>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${steps[currentStep - 1].bgColor} ${steps[currentStep - 1].textColor}`}>
                    {currentStep}/4
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {steps[currentStep - 1].description}
                </p>
                <div className="mt-3 flex gap-1">
                  {steps.map((step, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-all",
                        idx < currentStep ? `bg-gradient-to-r ${step.color}` : "bg-gray-200"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step Indicator (Desktop) - Modern App Design */}
      <Card className="hidden md:block shadow-md">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              const isPending = currentStep < step.number;

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    {/* Step Icon with Gradient */}
                    <div className="relative">
                      <div
                        className={cn(
                          'flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 shadow-lg',
                          isActive && `bg-gradient-to-br ${step.color} scale-110`,
                          isCompleted && 'bg-gradient-to-br from-green-500 to-green-600',
                          isPending && 'bg-gray-100 border-2 border-gray-300'
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-8 w-8 text-white" />
                        ) : (
                          <StepIcon className={cn('h-8 w-8', isActive ? 'text-white' : isPending ? 'text-gray-400' : 'text-white')} />
                        )}
                      </div>
                      {isActive && (
                        <div className={`absolute -inset-1 bg-gradient-to-br ${step.color} rounded-2xl blur-md opacity-50 -z-10 animate-pulse`} />
                      )}
                    </div>
                    {/* Step Info */}
                    <div className="mt-3 text-center">
                      <p className={cn('text-sm font-bold', isActive ? step.textColor : isCompleted ? 'text-green-600' : 'text-gray-500')}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[120px]">{step.description}</p>
                      {isActive && (
                        <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${step.bgColor} ${step.textColor}`}>
                          Paso {step.number}/5
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Connector Line with Gradient */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 px-2">
                      <div className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        isCompleted ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gray-200'
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 1 && <Step1General />}
        {currentStep === 2 && <Step2Equipment />}
        {currentStep === 3 && <Step3Checklist />}
        {currentStep === 4 && <Step4Finalize />}
      </div>

      {/* Navigation Buttons - Modern Mobile-First Design */}
      <div className="sticky bottom-0 left-0 right-0 z-10">
        <Card className="shadow-xl border-t-4 border-t-primary">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                className="w-full sm:w-auto h-12 shadow-md hover:shadow-lg transition-shadow"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                size="lg"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Anterior
              </Button>

              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100">
                <span className="text-sm font-semibold text-gray-700">
                  Paso {currentStep} de 4
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "h-2 w-2 rounded-full transition-all",
                        idx < currentStep ? "bg-primary" : "bg-gray-300"
                      )}
                    />
                  ))}
                </div>
              </div>

              {currentStep < 4 ? (
                <Button
                  className={`w-full sm:w-auto h-12 shadow-md hover:shadow-lg transition-all bg-gradient-to-r ${steps[currentStep - 1].color} hover:opacity-90`}
                  onClick={handleNext}
                  disabled={!canProceed() || isAdvancing}
                  size="lg"
                >
                  {isAdvancing ? (
                    <>
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Siguiente
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="w-full sm:w-[140px]" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function NewInspectionPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <InspectionProvider>
        <InspectionWizardContent />
      </InspectionProvider>
    </Suspense>
  );
}
