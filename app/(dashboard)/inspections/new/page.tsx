'use client';

/**
 * Página: Nueva Inspección
 * Wizard de 4 pasos para crear una inspección completa
 */

import { InspectionProvider, useInspectionForm } from '@/context/inspection-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Step1General from '@/components/forms/step1-general';
import Step2Equipment from '@/components/forms/step2-equipment';
import Step3Checklist from '@/components/forms/step3-checklist';
import Step4Finalize from '@/components/forms/step4-finalize';

function InspectionWizardContent() {
  const { currentStep, nextStep, prevStep, canProceed } = useInspectionForm();

  const steps = [
    { number: 1, title: 'Información General', description: 'Datos básicos de la inspección' },
    { number: 2, title: 'Equipos', description: 'Agregar equipos a inspeccionar' },
    { number: 3, title: 'Checklist', description: 'Completar 50 items por equipo' },
    { number: 4, title: 'Finalizar', description: 'Firmas y completar' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Nueva Inspección Técnica</h2>
        <p className="text-sm text-muted-foreground">
          Complete los 4 pasos para crear una inspección completa
        </p>
      </div>

      {/* Step Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  {/* Step Circle */}
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full border-2 font-bold transition-all',
                      currentStep === step.number &&
                        'border-primary bg-primary text-white',
                      currentStep > step.number &&
                        'border-green-500 bg-green-500 text-white',
                      currentStep < step.number &&
                        'border-gray-300 bg-white text-gray-400'
                    )}
                  >
                    {currentStep > step.number ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      step.number
                    )}
                  </div>
                  {/* Step Info */}
                  <div className="mt-2 text-center">
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-1 flex-1 transition-all',
                      currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                    )}
                  />
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
        {currentStep === 4 && <Step4Finalize />}
      </div>

      {/* Navigation Buttons */}
      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>

          <div className="text-sm text-muted-foreground">
            Paso {currentStep} de 4
          </div>

          {currentStep < 4 ? (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Siguiente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => {}} disabled={!canProceed()}>
              <Check className="mr-2 h-4 w-4" />
              Completar Inspección
            </Button>
          )}
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
