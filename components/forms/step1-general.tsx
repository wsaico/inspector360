'use client';

/**
 * Paso 1: Información General
 * Recopila datos básicos de la inspección
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth, usePermissions, useStations } from '@/hooks';
import { useInspectionForm } from '@/context/inspection-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { inspectionGeneralSchema, InspectionGeneralFormData } from '@/lib/validations';
import { INSPECTION_TYPES } from '@/types';
import { Calendar, MapPin, User, FileText } from 'lucide-react';
import { EmployeeSelect } from './employee-select';

export default function Step1General() {
  const { profile } = useAuth();
  const { canViewAllStations } = usePermissions();
  const { formData, setGeneralInfo } = useInspectionForm();

  // ✅ OPTIMIZACIÓN: Usar hook con cache para estaciones
  const { stations, isLoading: loadingStations } = useStations({ activeOnly: true });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
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
      // FIXED: Si hay perfil, usar su estación. Si no, no forzar 'AQP' todavía para evitar conflictos visuales
      const code = (profile?.station as any) || '';
      return {
        inspection_date: new Date(),
        inspection_type: 'periodica',
        inspector_name: '',
        station: code as InspectionGeneralFormData['station'],
      } satisfies InspectionGeneralFormData;
    },
  });

  const currentStation = watch('station');

  // Sincronización robusta de estación para usuarios restringidos
  React.useEffect(() => {
    if (profile?.station) {
      // Si el usuario tiene estación fija, imponerla siempre
      const stationCode = profile.station as InspectionGeneralFormData['station'];

      // Solo actualizar si es diferente para evitar loops, pero FORZAR si está vacío
      if (currentStation !== stationCode) {
        setValue('station', stationCode, { shouldValidate: true });
      }
    } else if (profile && !profile.station && !currentStation) {
      // Fallback solo si ya cargó el perfil y es admin sin estación: AQP por defecto
      setValue('station', 'AQP', { shouldValidate: true });
    }
  }, [profile, currentStation, setValue]);

  // Guardar datos cada vez que cambian los campos
  React.useEffect(() => {
    const subscription = watch(async (value) => {
      // Solo guardar si tenemos una estación válida
      if (!value.station) return;

      const isValid = await trigger();
      if (isValid) {
        setGeneralInfo({
          inspection_date: value.inspection_date ? new Date(value.inspection_date) : new Date(),
          inspection_type: value.inspection_type as any || 'periodica',
          inspector_name: value.inspector_name || '',
          station: value.station as any
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setGeneralInfo, trigger]);


  return (
    <Card className="border-0 shadow-xl rounded-[30px] overflow-hidden">
      <CardHeader className="bg-[#0A3161] text-white p-8">
        <CardTitle className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
            <FileText className="h-7 w-7 text-[#B3D400]" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-widest text-[#B3D400]">Información General</h3>
            <p className="text-sm text-slate-300 font-medium opacity-90 mt-1">
              Datos básicos de la inspección técnica
            </p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-8 space-y-8 bg-slate-50/50">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Fecha de Inspección */}
          <div className="space-y-3">
            <Label htmlFor="inspection_date" className="flex items-center gap-2 text-[#0A3161] font-bold uppercase text-xs tracking-wider">
              <Calendar className="h-4 w-4" />
              Fecha de Inspección
            </Label>
            <div className="relative">
              <Input
                id="inspection_date"
                type="date"
                className="h-12 rounded-xl border-slate-200 bg-white focus:ring-[#0A3161] focus:border-[#0A3161] transition-all font-medium"
                {...register('inspection_date', {
                  setValueAs: (v) => (v ? new Date(v) : new Date()),
                })}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            {errors.inspection_date && (
              <p className="text-xs font-bold text-red-500 uppercase tracking-wide bg-red-50 p-2 rounded-lg">
                {errors.inspection_date.message}
              </p>
            )}
          </div>

          {/* Tipo de Inspección */}
          <div className="space-y-3">
            <Label htmlFor="inspection_type" className="flex items-center gap-2 text-[#0A3161] font-bold uppercase text-xs tracking-wider">
              <FileText className="h-4 w-4" />
              Tipo de Inspección
            </Label>
            <select
              id="inspection_type"
              {...register('inspection_type')}
              className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3161] font-medium"
            >
              {Object.entries(INSPECTION_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.inspection_type && (
              <p className="text-xs font-bold text-red-500 uppercase tracking-wide bg-red-50 p-2 rounded-lg">
                {errors.inspection_type.message}
              </p>
            )}
          </div>

          {/* ESTACION (Movemos arriba porque EmployeeSelect depende de ella) */}
          <div className="space-y-3">
            <Label htmlFor="station" className="flex items-center gap-2 text-[#0A3161] font-bold uppercase text-xs tracking-wider">
              <MapPin className="h-4 w-4" />
              Estación
            </Label>
            <div className="relative">
              {loadingStations ? (
                <div className="h-12 w-full rounded-xl border border-slate-200 bg-slate-100 animate-pulse" />
              ) : (
                <select
                  id="station"
                  {...register('station')}
                  className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3161] font-medium disabled:opacity-70 disabled:bg-slate-100"
                  disabled={!canViewAllStations}
                >
                  {(canViewAllStations
                    ? stations
                    : profile?.station
                      ? stations.filter(s => s.code === profile.station)
                      : []
                  ).map((station) => (
                    <option key={station.code} value={station.code}>
                      {station.code} - {station.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {errors.station && (
              <p className="text-xs font-bold text-red-500 uppercase tracking-wide bg-red-50 p-2 rounded-lg">
                {errors.station.message}
              </p>
            )}
          </div>

          {/* Nombre del Inspector - AHORA ELEGIBLE */}
          <div className="space-y-3 relative z-20">
            <Label htmlFor="inspector_name" className="flex items-center gap-2 text-[#0A3161] font-bold uppercase text-xs tracking-wider">
              <User className="h-4 w-4" />
              Inspector Responsable
            </Label>

            <EmployeeSelect
              stationCode={currentStation || 'AQP'}
              value={watch('inspector_name')}
              onChange={(val) => {
                setValue('inspector_name', val, { shouldValidate: true, shouldDirty: true });
              }}
              className={`h-12 rounded-xl border-slate-200 ${errors.inspector_name ? 'border-red-500 ring-2 ring-red-100' : ''}`}
            />

            {errors.inspector_name && (
              <p className="text-xs font-bold text-red-500 uppercase tracking-wide bg-red-50 p-2 rounded-lg">
                {errors.inspector_name.message}
              </p>
            )}
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-1">
              Seleccione su nombre de la lista oficial
            </p>
          </div>
        </div>

        {/* Información Importante */}
        <div className="rounded-2xl border-l-4 border-[#B3D400] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-[#0A3161]/5 rounded-lg">
              <svg className="h-6 w-6 text-[#0A3161]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-black text-[#0A3161] uppercase tracking-wider mb-2">Información Oficial</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Estos datos generarán el código único <span className="font-bold text-[#0A3161]">FOR-ATA-057</span>. Asegúrese de seleccionar el personal correcto para evitar rechazos por parte de auditoría.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
