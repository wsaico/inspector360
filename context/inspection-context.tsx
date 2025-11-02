'use client';

/**
 * Context para el Formulario de Inspección
 * Maneja el estado global del wizard de 4 pasos
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { InspectionFormData, Equipment, ChecklistItem } from '@/types';
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
  updateChecklist: (equipmentCode: string, itemCode: string, value: ChecklistItem) => void;
  setSignatures: (data: InspectionFormData['signatures']) => void;

  // Navegación
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;

  // Utilidades
  resetForm: () => void;
  canProceed: () => boolean;
}

const InspectionContext = createContext<InspectionContextType | undefined>(undefined);

const initialFormData: InspectionFormData = {
  general: null,
  equipment: [],
  checklists: {},
  signatures: {},
};

export function InspectionProvider({ children }: { children: ReactNode }) {
  const [formData, setFormData] = useState<InspectionFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);

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

      // Si cambió el código, actualizar la key del checklist
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

  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(Math.max(1, Math.min(step, 4)));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep(1);
  }, []);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return formData.general !== null;
      case 2:
        return formData.equipment.length > 0;
      case 3:
        // Verificar que todos los equipos tengan checklist completo
        return formData.equipment.every(eq => {
          const checklist = formData.checklists[eq.code];
          return checklist && Object.keys(checklist).length === 50;
        });
      case 4:
        return (
          formData.signatures.supervisor_name !== undefined &&
          formData.signatures.supervisor_signature !== undefined
        );
      default:
        return false;
    }
  }, [currentStep, formData]);

  const value: InspectionContextType = {
    formData,
    currentStep,
    setGeneralInfo,
    addEquipment,
    updateEquipment,
    removeEquipment,
    updateChecklist,
    setSignatures,
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
