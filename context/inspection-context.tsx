'use client';

/**
 * Contexto para el Formulario de Inspeccion
 * Maneja el estado global del wizard de 4 pasos
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CHECKLIST_TEMPLATE } from '@/lib/checklist-template';
import { InspectionFormData, Equipment, ChecklistItem, Observation } from '@/types';
import { Station, InspectionType } from '@/types';

interface InspectionContextType {
  // Datos del formulario
  formData: InspectionFormData;
  currentStep: number;

  // Acciones
  setGeneralInfo: (data: InspectionFormData['general']) => void;
  addEquipment: (equipment: Equipment) => void;
  updateEquipment: (index: number, equipment: Equipment) => void;
  removeEquipment: (index: number) => void;
  addObservation: (observation: Observation) => void;
  updateObservation: (index: number, observation: Observation) => void;
  removeObservation: (index: number) => void;
  updateChecklist: (equipmentCode: string, itemCode: string, value: ChecklistItem) => void;
  setSignatures: (data: InspectionFormData['signatures']) => void;
  setEquipmentSignature: (equipmentCode: string, signature: string) => void;

  // Navegacion
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;

  // Utilidades
  resetForm: () => void;
  canProceed: () => boolean;

  // Draft y persistencia
  draftInspectionId?: string | null;
  setDraftInspectionId: (id: string | null) => void;
  equipmentDbIds: Record<string, string>; // code -> equipment row id
  setEquipmentDbId: (code: string, id: string) => void;
  observationDbIds: Record<string, string>; // `${obs_id}-${equipment_code}` -> observation row id
  setObservationDbId: (key: string, id: string) => void;
}

const InspectionContext = createContext<InspectionContextType | undefined>(undefined);

const initialFormData: InspectionFormData = {
  general: null,
  equipment: [],
  observations: [],
  checklists: {},
  signatures: {},
  equipmentSignatures: {},
};

export function InspectionProvider({ children }: { children: ReactNode }) {
  const [formData, setFormData] = useState<InspectionFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [draftInspectionId, setDraftInspectionIdState] = useState<string | null>(null);
  const [equipmentDbIds, setEquipmentDbIds] = useState<Record<string, string>>({});
  const [observationDbIds, setObservationDbIds] = useState<Record<string, string>>({});

  const setGeneralInfo = useCallback((data: InspectionFormData['general']) => {
    setFormData(prev => ({ ...prev, general: data }));
  }, []);

  const addEquipment = useCallback((equipment: Equipment) => {
    setFormData(prev => ({
      ...prev,
      equipment: [...prev.equipment, equipment],
      checklists: {
        ...prev.checklists,
        [equipment.code]: {},
      },
    }));
  }, []);

  const updateEquipment = useCallback((index: number, equipment: Equipment) => {
    setFormData(prev => {
      const newEquipment = [...prev.equipment];
      const oldCode = newEquipment[index].code;
      newEquipment[index] = equipment;

      // Si cambio el codigo, actualizar la key del checklist
      const newChecklists = { ...prev.checklists };
      if (oldCode !== equipment.code) {
        newChecklists[equipment.code] = newChecklists[oldCode] || {};
        delete newChecklists[oldCode];
      }

      return {
        ...prev,
        equipment: newEquipment,
        checklists: newChecklists,
      };
    });
  }, []);

  const removeEquipment = useCallback((index: number) => {
    setFormData(prev => {
      const newEquipment = [...prev.equipment];
      const removedCode = newEquipment[index].code;
      newEquipment.splice(index, 1);

      const newChecklists = { ...prev.checklists };
      delete newChecklists[removedCode];

      return {
        ...prev,
        equipment: newEquipment,
        checklists: newChecklists,
      };
    });
  }, []);

  const addObservation = useCallback((observation: Observation) => {
    setFormData(prev => ({
      ...prev,
      observations: [...prev.observations, observation],
    }));
  }, []);

  const updateObservation = useCallback((index: number, observation: Observation) => {
    setFormData(prev => {
      const newObservations = [...prev.observations];
      newObservations[index] = observation;
      return {
        ...prev,
        observations: newObservations,
      };
    });
  }, []);

  const removeObservation = useCallback((index: number) => {
    setFormData(prev => {
      const newObservations = [...prev.observations];
      newObservations.splice(index, 1);
      return {
        ...prev,
        observations: newObservations,
      };
    });
  }, []);

  const updateChecklist = useCallback(
    (equipmentCode: string, itemCode: string, value: ChecklistItem) => {
      setFormData(prev => ({
        ...prev,
        checklists: {
          ...prev.checklists,
          [equipmentCode]: {
            ...(prev.checklists[equipmentCode] || {}),
            [itemCode]: value,
          },
        },
      }));
    },
    []
  );

  const setSignatures = useCallback((data: InspectionFormData['signatures']) => {
    setFormData(prev => ({ ...prev, signatures: data }));
  }, []);

  const setEquipmentSignature = useCallback((equipmentCode: string, signature: string) => {
    setFormData(prev => ({
      ...prev,
      equipmentSignatures: {
        ...prev.equipmentSignatures,
        [equipmentCode]: signature,
      },
    }));
  }, []);

  const setDraftInspectionId = useCallback((id: string | null) => {
    setDraftInspectionIdState(id);
  }, []);

  const setEquipmentDbId = useCallback((code: string, id: string) => {
    setEquipmentDbIds(prev => ({ ...prev, [code]: id }));
  }, []);

  const setObservationDbId = useCallback((key: string, id: string) => {
    setObservationDbIds(prev => ({ ...prev, [key]: id }));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 5));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(1, Math.min(step, 5)));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep(1);
    setDraftInspectionIdState(null);
    setEquipmentDbIds({});
    setObservationDbIds({});
  }, []);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return formData.general !== null;
      case 2:
        return formData.equipment.length > 0;
      case 3:
        // Checklist: exigir que todos los equipos tengan checklist completo Y firma del inspector
        return formData.equipment.every(eq => {
          const checklist = formData.checklists[eq.code];
          const checklistCompleto = checklist && Object.keys(checklist).length === CHECKLIST_TEMPLATE.length;
          const tieneFirmaInspector = !!formData.equipmentSignatures[eq.code];
          return checklistCompleto && tieneFirmaInspector;
        });
      case 4:
        // Observaciones despues del checklist: si hay No Conformes, exigir observacion del operador por equipo
        return formData.equipment.every(eq => {
          const checklist = formData.checklists[eq.code];
          const tieneNoConformes = Object.values(checklist || {}).some((item) => item?.status === 'no_conforme');
          if (!tieneNoConformes) return true; // si todo es conforme, observaci�n opcional
          const tieneObsOperador = formData.observations.some(
            (obs) => obs.equipment_code === eq.code && !!obs.obs_operator && obs.obs_operator.trim().length > 0
          );
          return tieneObsOperador;
        });
      case 5:
        // Firmas finales son opcionales: permitir avanzar/completar
        return true;
      default:
        return false;
    }
  }, [currentStep, formData]);

  const value: InspectionContextType = {
    formData,
    currentStep,
    draftInspectionId,
    setDraftInspectionId,
    equipmentDbIds,
    setEquipmentDbId,
    observationDbIds,
    setObservationDbId,
    setGeneralInfo,
    addEquipment,
    updateEquipment,
    removeEquipment,
    addObservation,
    updateObservation,
    removeObservation,
    updateChecklist,
    setSignatures,
    setEquipmentSignature,
    nextStep,
    prevStep,
    goToStep,
    resetForm,
    canProceed,
  };

  return (
    <InspectionContext.Provider value={value}>
      {children}
    </InspectionContext.Provider>
  );
}

export function useInspectionForm() {
  const context = useContext(InspectionContext);
  if (context === undefined) {
    throw new Error('useInspectionForm must be used within InspectionProvider');
  }
  return context;
}
