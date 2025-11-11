'use client';

import { useState } from 'react';
import { useInspectionForm } from '@/context/inspection-context';
import { InspectionService } from '@/lib/services/inspections';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CHECKLIST_TEMPLATE } from '@/lib/checklist-template';
import { ChecklistItem, Observation } from '@/types';
import { CheckCircle2, XCircle, MinusCircle, Package, PenLine, CheckSquare, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
const SignaturePad = dynamic(() => import('./signature-pad'), { ssr: false });
import { toast } from 'sonner';

export default function Step3Checklist() {
  const { formData, updateChecklist, setEquipmentSignature, draftInspectionId, equipmentDbIds, addObservation, updateObservation } = useInspectionForm();
  const [selectedEquipment, setSelectedEquipment] = useState(0);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [observationTexts, setObservationTexts] = useState<Record<string, string>>({});
  // Iteramos directamente sobre el template para evitar contenedores vacíos por categoría

  const currentEquipment = formData.equipment[selectedEquipment];
  const currentChecklist = formData.checklists[currentEquipment?.code] || {};
  const currentSignature = formData.equipmentSignatures[currentEquipment?.code];

  const handleStatusChange = async (itemCode: string, status: ChecklistItem['status']) => {
    // Actualiza estado local primero para responsividad inmediata
    updateChecklist(currentEquipment.code, itemCode, {
      status,
      observations: '',
    });

    // Si cambia de no_conforme a otro estado, eliminar la observación asociada
    if (status !== 'no_conforme') {
      const obsKey = `${currentEquipment.code}::${itemCode}`;
      const obsIndex = formData.observations.findIndex(
        obs => obs.equipment_code === currentEquipment.code && obs.obs_id === itemCode
      );
      if (obsIndex !== -1) {
        const updatedObs = [...formData.observations];
        updatedObs.splice(obsIndex, 1);
        // Actualizar contexto removiendo observación
      }
      // Limpiar texto local
      setObservationTexts(prev => {
        const updated = { ...prev };
        delete updated[obsKey];
        return updated;
      });
    }

    // Persistencia contra borrador si existe equipment_id
    try {
      const equipmentId = equipmentDbIds[currentEquipment.code];
      if (draftInspectionId && equipmentId) {
        const newChecklistData = {
          ...(formData.checklists[currentEquipment.code] || {}),
          [itemCode]: { status, observations: '' },
        };
        await InspectionService.updateEquipment(equipmentId, {
          checklist_data: newChecklistData,
        });
      }
    } catch (err: any) {
      console.error('Error al persistir checklist:', err);
      toast.error('No se pudo guardar el checklist en el borrador');
    }
  };

  const handleObservationChange = (itemCode: string, text: string) => {
    const obsKey = `${currentEquipment.code}::${itemCode}`;
    setObservationTexts(prev => ({ ...prev, [obsKey]: text }));
  };

  const handleSaveObservation = async (itemCode: string) => {
    const obsKey = `${currentEquipment.code}::${itemCode}`;
    const observationText = observationTexts[obsKey]?.trim();

    if (!observationText) {
      toast.error('Debe ingresar una observación para items No Conformes');
      return;
    }

    // Buscar si ya existe una observación para este item
    const existingObsIndex = formData.observations.findIndex(
      obs => obs.equipment_code === currentEquipment.code && obs.obs_id === itemCode
    );

    const observation: Observation = {
      obs_id: itemCode,
      equipment_code: currentEquipment.code,
      obs_operator: observationText,
      obs_maintenance: null,
      order_index: existingObsIndex !== -1 ? existingObsIndex : formData.observations.length,
    };

    // Actualizar estado local primero
    if (existingObsIndex !== -1) {
      updateObservation(existingObsIndex, observation);
    } else {
      addObservation(observation);
    }

    // Persistir en base de datos si existe un borrador
    try {
      if (draftInspectionId) {
        // Buscar si la observación ya existe en la BD
        const { data: existingInspection } = await InspectionService.getInspectionById(draftInspectionId);
        const existingObservations = existingInspection?.observations || [];
        const existingDbObs = existingObservations.find(
          (obs: any) => obs.equipment_code === currentEquipment.code && obs.obs_id === itemCode
        );

        if (existingDbObs && existingDbObs.id) {
          // Actualizar observación existente en BD
          await InspectionService.updateObservation(existingDbObs.id, {
            obs_operator: observationText,
            order_index: observation.order_index,
          });
          toast.success('Observación actualizada y guardada');
        } else {
          // Crear nueva observación en BD
          const { data, error } = await InspectionService.createObservation({
            inspection_id: draftInspectionId,
            obs_id: itemCode,
            equipment_code: currentEquipment.code,
            obs_operator: observationText,
            obs_maintenance: null,
            order_index: observation.order_index,
          });
          if (error) {
            console.error('Error creando observación:', error);
            toast.error('No se pudo guardar la observación en la base de datos');
          } else {
            toast.success('Observación agregada y guardada');
          }
        }
      } else {
        // Si no hay borrador, solo mostrar mensaje de que se agregó localmente
        toast.success(existingObsIndex !== -1 ? 'Observación actualizada' : 'Observación agregada');
      }
    } catch (err: any) {
      console.error('Error al persistir observación:', err);
      toast.error('No se pudo guardar la observación en la base de datos');
    }
  };

  

  const getProgress = () => {
    const total = CHECKLIST_TEMPLATE.length; // 15 items
    const completed = Object.keys(currentChecklist).length;
    return Math.round((completed / total) * 100);
  };

  const handleSaveSignature = async (signature: string) => {
    // Actualiza estado local
    setEquipmentSignature(currentEquipment.code, signature);
    setShowSignaturePad(false);

    // Subir firma del inspector para el equipo si existe en BD
    try {
      const equipmentId = equipmentDbIds[currentEquipment.code];
      if (draftInspectionId && equipmentId) {
        await InspectionService.uploadInspectorSignature(equipmentId, signature);
      }
      toast.success('Firma del inspector guardada');
    } catch (err: any) {
      console.error('Error subiendo firma del inspector:', err);
      toast.error('No se pudo subir la firma del inspector');
    }
  };

  const isChecklistComplete = () => {
    const baseComplete = Object.keys(currentChecklist).length === CHECKLIST_TEMPLATE.length;

    // Verificar que todos los items No Conformes tengan observación
    const itemsNoConformes = Object.entries(currentChecklist)
      .filter(([_, item]) => item?.status === 'no_conforme')
      .map(([code, _]) => code);

    const todasLasObservacionesCompletas = itemsNoConformes.every(itemCode =>
      formData.observations.some(obs =>
        obs.equipment_code === currentEquipment.code &&
        obs.obs_id === itemCode &&
        obs.obs_operator?.trim().length > 0
      )
    );

    return baseComplete && todasLasObservacionesCompletas;
  };

  // Verificar cuántos equipos tienen checklist completo y firma
  const equiposConChecklistCompleto = formData.equipment.filter(eq => {
    const checklist = formData.checklists[eq.code] || {};
    return Object.keys(checklist).length === CHECKLIST_TEMPLATE.length;
  }).length;

  const equiposConFirma = formData.equipment.filter(eq => {
    return !!formData.equipmentSignatures[eq.code];
  }).length;

  const todoCompleto = equiposConChecklistCompleto === formData.equipment.length &&
                       equiposConFirma === formData.equipment.length;

  return (
    <div className="space-y-6">
      {/* Alerta de progreso general */}
      {formData.equipment.length > 0 && !todoCompleto && (
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-yellow-500 flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-900 mb-2">Progreso de Inspección</h3>
                <div className="space-y-1 text-sm text-yellow-800">
                  <p>✓ Checklists completados: {equiposConChecklistCompleto}/{formData.equipment.length} equipos</p>
                  <p>✓ Firmas del inspector: {equiposConFirma}/{formData.equipment.length} equipos</p>
                  {equiposConChecklistCompleto === formData.equipment.length && equiposConFirma < formData.equipment.length && (
                    <p className="font-semibold mt-2">⚠️ Falta firmar {formData.equipment.length - equiposConFirma} equipo(s)</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selector de Equipo Moderno */}
      <Card className="border-2 border-purple-200 shadow-lg">
        <div className="h-1.5 bg-gradient-to-r from-purple-500 to-purple-600" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Package className="h-5 w-5 text-purple-600" />
            Seleccionar Equipo para Inspección
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          {formData.equipment.map((eq, index) => {
            const equipmentChecklist = formData.checklists[eq.code] || {};
            const equipmentProgress = Math.round((Object.keys(equipmentChecklist).length / CHECKLIST_TEMPLATE.length) * 100);
            const isSelected = selectedEquipment === index;
            const isComplete = equipmentProgress === 100;
            const tieneFirma = !!formData.equipmentSignatures[eq.code];
            const todoListo = isComplete && tieneFirma;

            return (
              <button
                key={eq.code}
                onClick={() => setSelectedEquipment(index)}
                className={`relative overflow-hidden rounded-xl p-4 transition-all duration-200 min-w-[140px] ${
                  isSelected
                    ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg scale-105'
                    : todoListo
                    ? 'bg-white border-2 border-green-400 text-purple-900 hover:border-green-500 hover:shadow-md'
                    : 'bg-white border-2 border-purple-200 text-purple-900 hover:border-purple-400 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-white/20' : todoListo ? 'bg-green-100' : 'bg-purple-100'
                  }`}>
                    <Package className={`h-5 w-5 ${isSelected ? 'text-white' : todoListo ? 'text-green-600' : 'text-purple-600'}`} />
                  </div>
                  <span className="text-sm font-bold">{eq.code}</span>
                  <div className="flex flex-col items-center gap-1">
                    {isComplete ? (
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20' : 'bg-green-100'
                      }`}>
                        <CheckCircle2 className={`h-3 w-3 ${isSelected ? 'text-white' : 'text-green-600'}`} />
                        <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-green-700'}`}>
                          100%
                        </span>
                      </div>
                    ) : (
                      <span className={`text-xs font-semibold ${isSelected ? 'text-white/90' : 'text-purple-600'}`}>
                        {equipmentProgress}%
                      </span>
                    )}
                    {isComplete && (
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                        tieneFirma
                          ? isSelected ? 'bg-white/20' : 'bg-green-100'
                          : isSelected ? 'bg-white/20' : 'bg-red-100'
                      }`}>
                        <PenLine className={`h-3 w-3 ${
                          tieneFirma
                            ? isSelected ? 'text-white' : 'text-green-600'
                            : isSelected ? 'text-white' : 'text-red-600'
                        }`} />
                        <span className={`text-xs font-semibold ${
                          tieneFirma
                            ? isSelected ? 'text-white' : 'text-green-700'
                            : isSelected ? 'text-white' : 'text-red-700'
                        }`}>
                          {tieneFirma ? 'Firmado' : 'Sin firma'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Progreso Moderno con Gradiente */}
      <Card className={`border-2 shadow-lg ${
        getProgress() === 100
          ? 'border-green-200 bg-gradient-to-r from-green-50/30 to-white'
          : 'border-blue-200 bg-gradient-to-r from-blue-50/30 to-white'
      }`}>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                getProgress() === 100
                  ? 'bg-gradient-to-br from-green-500 to-green-600'
                  : 'bg-gradient-to-br from-blue-500 to-blue-600'
              }`}>
                <CheckSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Progreso del Checklist</p>
                <p className="text-xs text-gray-500">{currentEquipment?.code}</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl ${
              getProgress() === 100
                ? 'bg-gradient-to-br from-green-500 to-green-600'
                : 'bg-gradient-to-br from-blue-500 to-blue-600'
            }`}>
              <span className="text-2xl font-bold text-white">{getProgress()}%</span>
            </div>
          </div>
          <div className="relative h-3 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                getProgress() === 100
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600'
              }`}
              style={{ width: `${getProgress()}%` }}
            />
            {getProgress() === 100 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
            <span>{Object.keys(currentChecklist).length} de {CHECKLIST_TEMPLATE.length} items completados</span>
            {getProgress() === 100 && (
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                <CheckCircle2 className="h-3 w-3" />
                ¡Completado!
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checklist Moderno con Iconos SVG Premium */}
      <div className="space-y-3">
        {CHECKLIST_TEMPLATE.map((item, index) => {
          const value = currentChecklist[item.code];
          const isCompleted = !!value?.status;

          return (
            <Card
              key={item.code}
              className={`transition-all duration-300 hover:shadow-md ${
                isCompleted
                  ? value?.status === 'conforme'
                    ? 'border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/30 to-white'
                    : value?.status === 'no_conforme'
                    ? 'border-l-4 border-l-red-500 bg-gradient-to-r from-red-50/30 to-white'
                    : 'border-l-4 border-l-gray-400 bg-gradient-to-r from-gray-50/30 to-white'
                  : 'border-l-4 border-l-blue-200'
              }`}
            >
              <CardContent className="pt-4 pb-4">
                <div className="space-y-3">
                  {/* Header del Item */}
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${
                      isCompleted
                        ? value?.status === 'conforme'
                          ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-md'
                          : value?.status === 'no_conforme'
                          ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-md'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500 shadow-md'
                        : 'bg-gradient-to-br from-blue-100 to-blue-200'
                    }`}>
                      <span className={`text-sm font-bold ${isCompleted ? 'text-white' : 'text-blue-600'}`}>
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{item.code}</p>
                          <p className="text-sm text-gray-600 mt-0.5">{item.description}</p>
                        </div>
                        {isCompleted && (
                          <div className="flex-shrink-0">
                            {value?.status === 'conforme' && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100">
                                <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-semibold text-green-700">OK</span>
                              </div>
                            )}
                            {value?.status === 'no_conforme' && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100">
                                <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-semibold text-red-700">NO</span>
                              </div>
                            )}
                            {value?.status === 'no_aplica' && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100">
                                <svg className="h-4 w-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-semibold text-gray-700">N/A</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botones de Estado con Iconos SVG Premium */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleStatusChange(item.code, 'conforme')}
                      className={`relative overflow-hidden rounded-xl p-3 transition-all duration-200 ${
                        value?.status === 'conforme'
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg scale-105'
                          : 'bg-white border-2 border-green-200 text-green-700 hover:border-green-400 hover:bg-green-50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <svg className={`h-6 w-6 ${value?.status === 'conforme' ? 'text-white' : 'text-green-600'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold">Conforme</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleStatusChange(item.code, 'no_conforme')}
                      className={`relative overflow-hidden rounded-xl p-3 transition-all duration-200 ${
                        value?.status === 'no_conforme'
                          ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg scale-105'
                          : 'bg-white border-2 border-red-200 text-red-700 hover:border-red-400 hover:bg-red-50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <svg className={`h-6 w-6 ${value?.status === 'no_conforme' ? 'text-white' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold">No Conforme</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleStatusChange(item.code, 'no_aplica')}
                      className={`relative overflow-hidden rounded-xl p-3 transition-all duration-200 ${
                        value?.status === 'no_aplica'
                          ? 'bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-lg scale-105'
                          : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <svg className={`h-6 w-6 ${value?.status === 'no_aplica' ? 'text-white' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold">No Aplica</span>
                      </div>
                    </button>
                  </div>

                  {/* Campo de Observación para No Conforme */}
                  {value?.status === 'no_conforme' && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200">
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        <p className="text-xs font-semibold text-red-900">
                          Item No Conforme - Debe agregar observación del operador
                        </p>
                      </div>
                      <Textarea
                        placeholder="Describa el problema o anomalía encontrada..."
                        value={observationTexts[`${currentEquipment.code}::${item.code}`] || formData.observations.find(obs => obs.equipment_code === currentEquipment.code && obs.obs_id === item.code)?.obs_operator || ''}
                        onChange={(e) => handleObservationChange(item.code, e.target.value)}
                        className="min-h-[80px] text-sm"
                        rows={3}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveObservation(item.code)}
                        className="w-full bg-red-600 hover:bg-red-700"
                        disabled={!observationTexts[`${currentEquipment.code}::${item.code}`]?.trim() && !formData.observations.find(obs => obs.equipment_code === currentEquipment.code && obs.obs_id === item.code)?.obs_operator}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Guardar Observación
                      </Button>
                      {formData.observations.find(obs => obs.equipment_code === currentEquipment.code && obs.obs_id === item.code)?.obs_operator && (
                        <div className="px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-xs font-semibold text-green-900 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Observación guardada correctamente
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Firma del Inspector por Equipo */}
      {isChecklistComplete() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5" />
              Firma del Inspector - {currentEquipment.code}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentSignature ? (
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="font-semibold text-green-900">Equipo firmado</p>
                  </div>
                  <img
                    src={currentSignature}
                    alt="Firma del inspector"
                    className="h-32 border rounded bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowSignaturePad(true)}
                  className="w-full"
                >
                  <PenLine className="mr-2 h-4 w-4" />
                  Cambiar Firma
                </Button>
              </div>
            ) : showSignaturePad ? (
              <SignaturePad
                label="Firma del Inspector"
                storageKey={`inspector360.signature.equipment.${currentEquipment.code}`}
                required
                onSave={handleSaveSignature}
                onCancel={() => setShowSignaturePad(false)}
                onChange={(sig) => {
                  // Autoguarda localmente para prevenir pérdidas por re-render
                  setEquipmentSignature(currentEquipment.code, sig);
                }}
                initialValue={currentSignature || undefined}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  El checklist de este equipo está completo. Firme para confirmar la inspección.
                </p>
                <Button onClick={() => setShowSignaturePad(true)}>
                  <PenLine className="mr-2 h-4 w-4" />
                  Firmar Checklist
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
