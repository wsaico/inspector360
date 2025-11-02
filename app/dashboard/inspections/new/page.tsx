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
import Step2_5Observations from '@/components/forms/step2_5-observations';
import Step3Checklist from '@/components/forms/step3-checklist';
import Step4Finalize from '@/components/forms/step4-finalize';

function InspectionWizardContent() {
  const { currentStep, nextStep, prevStep, canProceed } = useInspectionForm();

  const steps = [
    { number: 1, title: 'Información General', description: 'Datos básicos de la inspección' },
    { number: 2, title: 'Equipos', description: 'Agregar equipos a inspeccionar' },
    { number: 3, title: 'Observaciones', description: 'Agregar observaciones de equipos' },
    { number: 4, title: 'Checklist', description: 'Completar 15 items por equipo' },
    { number: 5, title: 'Finalizar', description: 'Firmas y completar' },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Step Indicator */}
      <Card>
        <CardContent className="pt-6 pb-4">
          {/* Mobile: Simplified Progress */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">{steps[currentStep - 1].title}</span>
              <span className="text-xs text-muted-foreground">Paso {currentStep}/5</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {steps[currentStep - 1].description}
            </p>
          </div>

          {/* Desktop: Full Step Indicator */}
          <div className="hidden md:flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  {/* Step Circle */}
                  <div
                    className={cn(
                      'flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-full border-2 font-bold transition-all',
                      currentStep === step.number &&
                        'border-primary bg-primary text-white',
                      currentStep > step.number &&
                        'border-green-500 bg-green-500 text-white',
                      currentStep < step.number &&
                        'border-gray-300 bg-white text-gray-400'
                    )}
                  >
                    {currentStep > step.number ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  {/* Step Info */}
                  <div className="mt-2 text-center">
                    <p className="text-xs lg:text-sm font-semibold">{step.title}</p>
                    <p className="text-xs text-muted-foreground hidden lg:block">
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
        {currentStep === 3 && <Step2_5Observations />}
        {currentStep === 4 && <Step3Checklist />}
        {currentStep === 5 && <Step4Finalize />}
      </div>

      {/* Navigation Buttons - Oculto en el último paso */}
      {currentStep < 5 && (
        <Card>
          <CardContent className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>

            <div className="hidden sm:block text-sm text-muted-foreground">
              Paso {currentStep} de 5
            </div>

            <Button onClick={nextStep} disabled={!canProceed()} className="sm:w-auto">
              Siguiente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
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
