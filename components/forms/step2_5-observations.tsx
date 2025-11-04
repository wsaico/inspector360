'use client';

/**
 * Paso 2.5: Agregar Observaciones
 * Permite agregar múltiples observaciones relacionadas con los equipos
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInspectionForm } from '@/context/inspection-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { observationSchema, ObservationFormData } from '@/lib/validations';
import { Observation } from '@/types';
import { Plus, Trash2, Edit, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

export default function Step2_5Observations() {
  const { formData, addObservation, removeObservation, updateObservation } = useInspectionForm();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ObservationFormData>({
    resolver: zodResolver(observationSchema),
  });

  const onSubmit = (data: ObservationFormData) => {
    // Generar ID automático OBS-001, OBS-002, etc.
    const nextNumber = editingIndex !== null ? editingIndex + 1 : formData.observations.length + 1;
    const obs_id = `OBS-${String(nextNumber).padStart(3, '0')}`;

    const observation: Observation = {
      ...data,
      obs_id,
      order_index: editingIndex !== null ? editingIndex : formData.observations.length,
    };

    if (editingIndex !== null) {
      updateObservation(editingIndex, observation);
      toast.success('Observación actualizada');
      setEditingIndex(null);
    } else {
      addObservation(observation);
      toast.success('Observación agregada');
      if (observation.obs_operator && !observation.obs_maintenance) {
        toast.info(`Pendiente respuesta de mecánico para ${observation.obs_id}`);
      }
    }
    reset();
  };

  const handleEdit = (index: number) => {
    const obs = formData.observations[index];
    reset(obs);
    setEditingIndex(index);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    reset();
  };

  // Verificar si hay equipos agregados
  if (formData.equipment.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Debe agregar al menos un equipo antes de agregar observaciones.</p>
            <p className="text-sm mt-2">Vuelva al paso anterior para agregar equipos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formulario de Nueva Observación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {editingIndex !== null ? 'Editar Observación' : 'Agregar Nueva Observación'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Código de Equipo *</Label>
              <select
                {...register('equipment_code')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Seleccione un equipo</option>
                {formData.equipment.map((eq, index) => (
                  <option key={index} value={eq.code}>
                    {eq.code} - {eq.type} ({eq.brand} {eq.model})
                  </option>
                ))}
              </select>
              {errors.equipment_code && <p className="text-sm text-red-500">{errors.equipment_code.message}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Observación - Operador *</Label>
                <Textarea
                  {...register('obs_operator')}
                  placeholder="Observaciones del operador del equipo"
                  rows={4}
                />
                {errors.obs_operator && <p className="text-sm text-red-500">{errors.obs_operator.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Observación - Mantenimiento (responde mecánico)</Label>
                <Textarea
                  {...register('obs_maintenance')}
                  placeholder="Observaciones de mantenimiento"
                  rows={4}
                />
                {errors.obs_maintenance && <p className="text-sm text-red-500">{errors.obs_maintenance.message}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <Plus className="mr-2 h-4 w-4" />
                {editingIndex !== null ? 'Actualizar Observación' : 'Agregar Observación'}
              </Button>
              {editingIndex !== null && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Observaciones Agregadas */}
      {formData.observations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Observaciones Agregadas ({formData.observations.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.observations.map((obs, index) => (
              <div key={index} className="rounded-lg border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-lg">{obs.obs_id}</p>
                    <p className="text-sm text-muted-foreground">
                      Equipo: {obs.equipment_code}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(index)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removeObservation(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Obs. Operador:</p>
                    <p className="text-sm">{obs.obs_operator}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Obs. Mantenimiento:</p>
                    <p className="text-sm">{obs.obs_maintenance}</p>
                    {!obs.obs_maintenance && (
                      <p className="mt-1 text-xs text-amber-600">Pendiente respuesta de mecánico</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Mensaje informativo */}
      {formData.observations.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">
                No hay observaciones agregadas. Use el formulario anterior para agregar observaciones.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
