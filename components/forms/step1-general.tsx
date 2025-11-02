'use client';

/**
 * Paso 1: Información General
 * Recopila datos básicos de la inspección
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks';
import { useInspectionForm } from '@/context/inspection-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { inspectionGeneralSchema, InspectionGeneralFormData } from '@/lib/validations';
import { STATIONS, INSPECTION_TYPES } from '@/types';
import { Calendar, MapPin, User, FileText } from 'lucide-react';

export default function Step1General() {
  const { user } = useAuth();
  const { formData, setGeneralInfo, nextStep } = useInspectionForm();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<InspectionGeneralFormData>({
    resolver: zodResolver(inspectionGeneralSchema),
    defaultValues: formData.general || {
      inspection_date: new Date(),
      inspection_type: 'periodica',
      inspector_name: user?.full_name || '',
      station: user?.station || 'AQP',
    },
  });

  const onSubmit = (data: InspectionGeneralFormData) => {
    setGeneralInfo(data);
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Información General de la Inspección</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Fecha de Inspección */}
            <div className="space-y-2">
              <Label htmlFor="inspection_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Inspección
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="inspection_date"
                type="date"
                {...register('inspection_date', {
                  setValueAs: (v) => (v ? new Date(v) : new Date()),
                })}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.inspection_date && (
                <p className="text-sm text-red-500">
                  {errors.inspection_date.message}
                </p>
              )}
            </div>

            {/* Tipo de Inspección */}
            <div className="space-y-2">
              <Label htmlFor="inspection_type" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Tipo de Inspección
                <span className="text-red-500">*</span>
              </Label>
              <select
                id="inspection_type"
                {...register('inspection_type')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.entries(INSPECTION_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.inspection_type && (
                <p className="text-sm text-red-500">
                  {errors.inspection_type.message}
                </p>
              )}
            </div>

            {/* Nombre del Inspector */}
            <div className="space-y-2">
              <Label htmlFor="inspector_name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nombre del Inspector
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="inspector_name"
                {...register('inspector_name')}
                placeholder="Nombre completo del inspector"
              />
              {errors.inspector_name && (
                <p className="text-sm text-red-500">
                  {errors.inspector_name.message}
                </p>
              )}
            </div>

            {/* Estación */}
            <div className="space-y-2">
              <Label htmlFor="station" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Estación
                <span className="text-red-500">*</span>
              </Label>
              <select
                id="station"
                {...register('station')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={user?.role === 'supervisor'}
              >
                {Object.entries(STATIONS).map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} - {name}
                  </option>
                ))}
              </select>
              {errors.station && (
                <p className="text-sm text-red-500">{errors.station.message}</p>
              )}
              {user?.role === 'supervisor' && (
                <p className="text-xs text-muted-foreground">
                  Tu estación está asignada automáticamente
                </p>
              )}
            </div>
          </div>

          {/* Información Importante */}
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              <strong>📋 Información:</strong> Los datos ingresados aquí se
              utilizarán para generar el código de formulario (FOR-ATA-057) y
              aparecerán en el PDF final de la inspección.
            </p>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
