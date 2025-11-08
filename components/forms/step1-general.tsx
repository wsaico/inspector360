'use client';

/**
 * Paso 1: Información General
 * Recopila datos básicos de la inspección
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth, usePermissions } from '@/hooks';
import { useInspectionForm } from '@/context/inspection-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { inspectionGeneralSchema, InspectionGeneralFormData } from '@/lib/validations';
import { STATIONS, INSPECTION_TYPES } from '@/types';
import { StationsService } from '@/lib/services/stations';
// Nota: Tipamos estación usando el esquema de validación para evitar que se infiera como string
import { Calendar, MapPin, User, FileText } from 'lucide-react';

export default function Step1General() {
  const { profile, user } = useAuth();
  const { canViewAllStations } = usePermissions();
  const { formData, setGeneralInfo } = useInspectionForm();
  const [stationOptions, setStationOptions] = React.useState<{ code: string; name: string }[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    trigger,
  } = useForm<InspectionGeneralFormData>({
    resolver: zodResolver(inspectionGeneralSchema),
    defaultValues: async () => {
      if (formData.general) {
        const g = formData.general;
        return {
          inspection_date: new Date(g.inspection_date as any),
          inspection_type: g.inspection_type as InspectionGeneralFormData['inspection_type'],
          inspector_name: g.inspector_name,
          station: g.station as InspectionGeneralFormData['station'],
        } satisfies InspectionGeneralFormData;
      }
      const code = (profile?.station as any) || 'AQP';
      return {
        inspection_date: new Date(),
        inspection_type: 'periodica',
        inspector_name: '',
        station: code as InspectionGeneralFormData['station'],
      } satisfies InspectionGeneralFormData;
    },
  });

  // Cargar estaciones desde la base de datos
  React.useEffect(() => {
    const loadStations = async () => {
      const res = await StationsService.listAll();
      const active = (res.data || []).filter(s => s.is_active);
      setStationOptions(active.map(s => ({ code: s.code, name: s.name })));
    };
    loadStations();
  }, []);

  // Si el perfil llega tarde, sincronizar la estación por defecto
  // y mantenerla fija para usuarios sin permiso global
  React.useEffect(() => {
    const s = (profile?.station as any) || undefined;
    if (s) {
      setValue('station', s as InspectionGeneralFormData['station']);
      handleFieldChange();
    }
  }, [profile?.station]);

  // Guardar datos cada vez que cambian los campos
  const handleFieldChange = async () => {
    const isValid = await trigger();
    if (isValid) {
      const values: InspectionGeneralFormData = {
        inspection_date: (document.getElementById('inspection_date') as HTMLInputElement)?.value
          ? new Date((document.getElementById('inspection_date') as HTMLInputElement).value)
          : new Date(),
        inspection_type:
          ((document.getElementById('inspection_type') as HTMLSelectElement)?.value as InspectionGeneralFormData['inspection_type']) || 'periodica',
        inspector_name: (document.getElementById('inspector_name') as HTMLInputElement)?.value || '',
        station:
          (((document.getElementById('station') as HTMLSelectElement)?.value as any) || 'AQP') as InspectionGeneralFormData['station'],
      };
      setGeneralInfo(values);
    }
  };

  return (
    <Card className="border-2 border-blue-200 shadow-lg">
      <div className="h-1.5 bg-gradient-to-r from-blue-500 to-blue-600" />
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-blue-900">Información General de la Inspección</h3>
            <p className="text-sm text-gray-600 font-normal">Complete los datos básicos de la inspección técnica</p>
          </div>
        </CardTitle>
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
              onChange={(e) => {
                register('inspection_date').onChange(e);
                handleFieldChange();
              }}
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
                onChange={(e) => {
                  register('inspection_type').onChange(e);
                  handleFieldChange();
                }}
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
                onChange={(e) => {
                  register('inspector_name').onChange(e);
                  handleFieldChange();
                }}
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
                disabled={!canViewAllStations}
                onChange={(e) => {
                  register('station').onChange(e);
                  handleFieldChange();
                }}
              >
                {(canViewAllStations
                  ? stationOptions
                  : profile?.station
                    ? stationOptions.filter(s => s.code === profile.station)
                    : []
                ).map((station) => (
                  <option key={station.code} value={station.code}>
                    {station.code} - {station.name}
                  </option>
                ))}
              </select>
              {errors.station && (
                <p className="text-sm text-red-500">{errors.station.message}</p>
              )}
              {!canViewAllStations && (
                <p className="text-xs text-muted-foreground">
                  Tu estación está asignada automáticamente
                </p>
              )}
            </div>
          </div>

          {/* Información Importante */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-blue-900 mb-1">Información Importante</h4>
                  <p className="text-sm text-blue-800">
                    Los datos ingresados aquí se utilizarán para generar el código de formulario <span className="font-semibold">(FOR-ATA-057)</span> y aparecerán en el PDF final de la inspección.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
  );
}
