'use client';
export const dynamic = 'force-dynamic';

/**
 * Pagina: Nueva Inspeccion
 * Wizard de 4 pasos para crear una inspeccion completa
 */

import { InspectionProvider, useInspectionForm } from '@/context/inspection-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check, ClipboardList, Package, CheckSquare, MessageSquare, FileCheck, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import Step1General from '@/components/forms/step1-general';
import Step2Equipment from '@/components/forms/step2-equipment';
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
      title: 'Info General',
      description: 'Datos básicos',
      icon: ClipboardList,
    },
    {
      number: 2,
      title: 'Equipos',
      description: 'Selección',
      icon: Package,
    },
    {
      number: 3,
      title: 'Checklist',
      description: 'Verificación',
      icon: CheckSquare,
    },
    {
      number: 4,
      title: 'Finalizar',
      description: 'Firmas',
      icon: FileCheck,
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-[#0A3161] uppercase tracking-tighter">Nueva Inspección Técnica</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Complete los 4 pasos obligatorios para generar el reporte
          </p>
        </div>
        <Button
          variant="outline"
          className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-bold shadow-sm transition-all"
          onClick={() => window.open('https://drive.google.com/file/d/141Nmu285-EoQKXAXSzsMdySCf5j-H7bL/view?usp=sharing', '_blank')}
        >
          <Video className="w-5 h-5 mr-2" />
          Ver Tutorial
        </Button>
      </div>

      {/* Step Indicator (Mobile) - Modern App Design */}
      <div className="md:hidden sticky top-0 z-30 pt-2 -mx-4 px-4 bg-gray-50/95 backdrop-blur-sm">
        <Card className="border-0 shadow-lg bg-[#0A3161] text-white overflow-hidden rounded-[20px]">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#B3D400] flex items-center justify-center text-[#0A3161] font-bold">
                {currentStep}
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-widest text-slate-300 font-bold">Paso {currentStep} de 4</span>
                <span className="font-bold text-white leading-tight">{steps[currentStep - 1].title}</span>
              </div>
            </div>
            <div className="flex gap-1">
              {steps.map((s) => (
                <div key={s.number} className={cn(
                  "h-1.5 w-6 rounded-full transition-all",
                  s.number === currentStep ? "bg-[#B3D400]" : s.number < currentStep ? "bg-[#B3D400]/50" : "bg-white/20"
                )} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step Indicator (Desktop) - Modern App Design */}
      <Card className="hidden md:block shadow-lg border-0 bg-white rounded-[30px] overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between relative">
            {/* Connecting Line Background */}
            <div className="absolute left-0 right-0 top-1/2 h-1 bg-slate-100 -z-10 mx-16" />

            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;

              return (
                <div key={step.number} className="flex-1 p-6 relative group cursor-default">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-500 shadow-md z-10',
                        isActive
                          ? 'bg-[#0A3161] text-[#B3D400] scale-110 shadow-[#0A3161]/30'
                          : isCompleted
                            ? 'bg-[#B3D400] text-[#0A3161]'
                            : 'bg-white border-2 border-slate-200 text-slate-300'
                      )}
                    >
                      <StepIcon className={cn("h-6 w-6", isActive && "animate-pulse")} />
                    </div>

                    <div className="text-center space-y-0.5">
                      <p className={cn("text-xs font-black uppercase tracking-widest", isActive ? "text-[#0A3161]" : "text-slate-400")}>
                        {step.title}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 hidden lg:block">
                        {step.description}
                      </p>
                    </div>
                  </div>
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
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 md:static md:p-0 md:bg-transparent">
        <Card className="shadow-2xl border-t border-slate-100 rounded-[25px] md:rounded-[30px] md:shadow-none md:border-0 md:bg-transparent">
          <CardContent className="p-4 md:p-0">
            <div className="flex items-center justify-between gap-4">
              <Button
                className="flex-1 md:flex-none h-14 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-700 transition-all"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Anterior
              </Button>

              {currentStep < 4 ? (
                <Button
                  className="flex-[2] md:flex-none md:min-w-[200px] h-14 rounded-2xl bg-[#0A3161] hover:bg-[#152d6f] text-white font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:shadow-xl hover:scale-[1.02] transition-all"
                  onClick={handleNext}
                  disabled={!canProceed() || isAdvancing}
                >
                  {isAdvancing ? (
                    <>
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[#B3D400] border-t-transparent" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Siguiente
                      <ArrowRight className="ml-2 h-5 w-5 text-[#B3D400]" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="hidden md:block w-[140px]" />
                // Placeholder to balance flex layout on desktop if needed, 
                // but usually Step 4 has its own button inside the component. 
                // We keep "Previous" button here, Step 4 handles "Complete".
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
