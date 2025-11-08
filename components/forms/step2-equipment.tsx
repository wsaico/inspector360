'use client';

/**
 * Paso 2: Agregar Equipos
 * Permite agregar uno o más equipos a la inspección
 * Incluye reutilización de equipos de inspecciones previas
 */

import { useState, useEffect, useMemo } from 'react';
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
import { Plus, Trash2, Edit, Package, History, Loader2, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { InspectionService } from '@/lib/services';

export default function Step2Equipment() {
  const { formData, addEquipment, removeEquipment, updateEquipment } = useInspectionForm();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showExisting, setShowExisting] = useState(true);
  const [existingEquipment, setExistingEquipment] = useState<Equipment[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 3; // Máximo 3 equipos visibles por página

  const filteredExisting = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = existingEquipment || [];
    const filtered = !q
      ? list
      : list.filter((eq) => {
          const haystack = [
            eq.code,
            eq.type,
            eq.brand,
            eq.model,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(q);
        });
    return filtered.slice().sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  }, [existingEquipment, searchQuery]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((filteredExisting.length || 0) / PAGE_SIZE)), [filteredExisting.length]);
  const paginatedExisting = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredExisting.slice(start, start + PAGE_SIZE);
  }, [filteredExisting, page]);

  useEffect(() => {
    // Reset de página al cambiar búsqueda
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    // Ajuste si la página actual excede el total tras filtrar
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
  });
  const watchedCode: string | undefined = watch('code');
  const hasDuplicateInForm = watchedCode
    ? formData.equipment.some((e) => e.code.trim().toUpperCase() === watchedCode.trim().toUpperCase())
    : false;
  const existingMatch = watchedCode
    ? existingEquipment.find((eq) => eq.code.trim().toUpperCase() === watchedCode.trim().toUpperCase())
    : undefined;

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

    // Validación: evitar duplicar código dentro del borrador actual
    const duplicateCurrent = formData.equipment.some(
      (e) => e.code.trim().toUpperCase() === data.code.trim().toUpperCase()
    );
    if (duplicateCurrent) {
      toast.warning('Ya agregaste este equipo en la inspección actual');
      return;
    }

    // Validación: si existe reutilizable con el mismo código, sugerir reutilizar y bloquear creación
    const duplicateExisting = existingEquipment.some(
      (eq) => eq.code.trim().toUpperCase() === data.code.trim().toUpperCase()
    );
    if (duplicateExisting) {
      toast.warning('Este código ya existe. Usa "Equipos Existentes" para reutilizar.');
      setShowExisting(true);
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
    // Mantener visible la lista de "Equipos Existentes" al reutilizar
    setShowExisting(true);
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
                  {watchedCode && existingMatch && (
                    <div className="mt-2 rounded-md border border-yellow-300 bg-yellow-50 p-2 text-xs">
                      Ya existe el equipo <span className="font-semibold">{existingMatch.code}</span>. Reutiliza desde "Equipos Existentes".
                      <div className="mt-2 flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => handleSelectExisting(existingMatch!)}>
                          Reutilizar
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setShowExisting(true)}>
                          Ver lista
                        </Button>
                      </div>
                    </div>
                  )}
                  {watchedCode && hasDuplicateInForm && (
                    <p className="text-xs text-red-500 mt-2">Este código ya fue agregado en esta inspección.</p>
                  )}
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
                  <Input {...register('year', { valueAsNumber: true })} type="number" placeholder="2023" />
                  {errors.year && <p className="text-sm text-red-500">{errors.year.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Número de Serie *</Label>
                  <Input {...register('serial_number')} placeholder="SN123456789" />
                  {errors.serial_number && <p className="text-sm text-red-500">{errors.serial_number.message}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={!!existingMatch || hasDuplicateInForm}>
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
            <CardTitle>
              Equipos Registrados Anteriormente ({existingEquipment.length})
            </CardTitle>
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
              <>
                <div className="mb-4 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por código, tipo, marca o modelo"
                      className="pl-8"
                    />
                  </div>
                  {searchQuery && (
                    <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                      <X className="h-4 w-4" />
                      Limpiar
                    </Button>
                  )}
                </div>

                {filteredExisting.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No hay resultados para "{searchQuery}".
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {paginatedExisting.map((eq, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div>
                          <p className="font-semibold">{eq.code}</p>
                          <p className="text-sm text-muted-foreground">
                            {eq.type} - {eq.brand} {eq.model}
                          </p>
                          </div>
                          <Button size="sm" onClick={() => handleSelectExisting(eq)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>

                      <div className="text-sm text-muted-foreground">
                        Página {page} de {totalPages} · Mostrando {paginatedExisting.length} de {filteredExisting.length}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="gap-2"
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </>
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
                    {eq.type} - {eq.brand} {eq.model}
                  </p>
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

