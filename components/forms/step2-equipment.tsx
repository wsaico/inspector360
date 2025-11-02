'use client';

/**
 * Paso 2: Agregar Equipos
 * Permite agregar uno o más equipos a la inspección
 * Incluye reutilización de equipos de inspecciones previas
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInspectionForm } from '@/context/inspection-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { equipmentSchema, EquipmentFormData } from '@/lib/validations';
import { Equipment } from '@/types';
import { Plus, Trash2, Edit, Package, History, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { InspectionService } from '@/lib/services';

export default function Step2Equipment() {
  const { formData, addEquipment, removeEquipment, updateEquipment } = useInspectionForm();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showExisting, setShowExisting] = useState(false);
  const [existingEquipment, setExistingEquipment] = useState<Equipment[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
  });

  useEffect(() => {
    if (showExisting) {
      loadExistingEquipment();
    }
  }, [showExisting]);

  const loadExistingEquipment = async () => {
    if (!formData.general?.station) {
      toast.error('Debe completar la información general primero');
      setShowExisting(false);
      return;
    }

    setLoadingExisting(true);
    const { data, error } = await InspectionService.getUniqueEquipment(formData.general.station);

    if (error) {
      toast.error('Error al cargar equipos existentes');
      console.error(error);
    } else {
      setExistingEquipment(data || []);
    }
    setLoadingExisting(false);
  };

  const onSubmit = (data: EquipmentFormData) => {
    if (!formData.general?.station) {
      toast.error('Debe completar la información general primero');
      return;
    }

    const equipment: Equipment = {
      ...data,
      station: formData.general.station,
      checklist_data: {},
      order_index: editingIndex !== null ? editingIndex : formData.equipment.length,
    };

    if (editingIndex !== null) {
      updateEquipment(editingIndex, equipment);
      toast.success('Equipo actualizado');
      setEditingIndex(null);
    } else {
      addEquipment(equipment);
      toast.success('Equipo agregado');
    }
    reset();
  };

  const handleEdit = (index: number) => {
    const eq = formData.equipment[index];
    reset(eq);
    setEditingIndex(index);
    setShowExisting(false);
  };

  const handleSelectExisting = (eq: Equipment) => {
    if (!formData.general?.station) {
      toast.error('Debe completar la información general primero');
      return;
    }

    // Limpiar datos de base de datos antes de agregar
    const { id, inspection_id, created_at, updated_at, inspector_signature_url, ...cleanEquipment } = eq as any;

    addEquipment({
      ...cleanEquipment,
      station: formData.general.station,
      checklist_data: {},
      order_index: formData.equipment.length,
    });

    toast.success(`Equipo ${eq.code} agregado`);
    setShowExisting(false);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    reset();
  };

  return (
    <div className="space-y-6">
      {/* Botones de Acción */}
      <div className="flex gap-3">
        <Button
          variant={!showExisting ? 'default' : 'outline'}
          onClick={() => setShowExisting(false)}
          className="flex-1"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Equipo
        </Button>
        <Button
          variant={showExisting ? 'default' : 'outline'}
          onClick={() => setShowExisting(true)}
          className="flex-1"
        >
          <History className="mr-2 h-4 w-4" />
          Equipos Existentes
        </Button>
      </div>

      {/* Formulario de Nuevo Equipo */}
      {!showExisting && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingIndex !== null ? 'Editar Equipo' : 'Agregar Nuevo Equipo'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Código del Equipo *</Label>
                  <Input {...register('code')} placeholder="TLM-01-001" />
                  {errors.code && <p className="text-sm text-red-500">{errors.code.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Equipo *</Label>
                  <Input {...register('type')} placeholder="Montacarga" />
                  {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Marca *</Label>
                  <Input {...register('brand')} placeholder="Toyota" />
                  {errors.brand && <p className="text-sm text-red-500">{errors.brand.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input {...register('model')} placeholder="8FG25N" />
                  {errors.model && <p className="text-sm text-red-500">{errors.model.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Año *</Label>
                  <Input
                    {...register('year', { valueAsNumber: true })}
                    type="number"
                    placeholder="2024"
                  />
                  {errors.year && <p className="text-sm text-red-500">{errors.year.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Número de Serie *</Label>
                  <Input {...register('serial_number')} placeholder="ABC123456" />
                  {errors.serial_number && <p className="text-sm text-red-500">{errors.serial_number.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Serie del Motor (Opcional)</Label>
                  <Input {...register('motor_serial')} placeholder="4Y-123456" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Plus className="mr-2 h-4 w-4" />
                  {editingIndex !== null ? 'Actualizar Equipo' : 'Agregar Equipo'}
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
      )}

      {/* Lista de Equipos Existentes */}
      {showExisting && (
        <Card>
          <CardHeader>
            <CardTitle>Equipos Registrados Anteriormente</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingExisting ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : existingEquipment.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No hay equipos registrados. Crea tu primer equipo en "Nuevo Equipo".
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {existingEquipment.map((eq, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold">{eq.code}</p>
                      <p className="text-sm text-muted-foreground">
                        {eq.type} - {eq.brand} {eq.model} ({eq.year})
                      </p>
                      <p className="text-xs text-muted-foreground">Serie: {eq.serial_number}</p>
                    </div>
                    <Button size="sm" onClick={() => handleSelectExisting(eq)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de Equipos Agregados */}
      {formData.equipment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Equipos Agregados ({formData.equipment.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.equipment.map((eq, index) => (
              <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-semibold">{eq.code}</p>
                  <p className="text-sm text-muted-foreground">
                    {eq.type} - {eq.brand} {eq.model} ({eq.year})
                  </p>
                  <p className="text-xs text-muted-foreground">Serie: {eq.serial_number}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(index)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => removeEquipment(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
