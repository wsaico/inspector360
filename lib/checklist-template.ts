/**
 * Template de Checklist - 15 Items
 * Basado en FOR-ATA-057
 */

import { ChecklistCategory } from '@/types';

export interface ChecklistTemplateItem {
  code: string;
  category: ChecklistCategory;
  description: string;
  order_index: number;
}

export const CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  {
    code: 'CHK-01',
    category: 'general',
    description: 'Extintor vigente: verificar presencia, fecha de vencimiento y de ultima inspección. El manómetro en zona verde.',
    order_index: 1,
  },
  {
    code: 'CHK-02',
    category: 'general',
    description: 'Pin de seguridad: comprobar que esté colocado correctamente y sin deformaciones.',
    order_index: 2,
  },
  {
    code: 'CHK-03',
    category: 'general',
    description: 'Calzas: deben estar disponibles, sin fisuras ni desgaste excesivo.',
    order_index: 3,
  },
  {
    code: 'CHK-04',
    category: 'general',
    description: 'Placards, stickers y micas: deben estar legibles, adheridos y sin daños.',
    order_index: 4,
  },
  {
    code: 'CHK-05',
    category: 'general',
    description: 'Nivel de combustible: debe ser suficiente para la operación prevista.',
    order_index: 5,
  },
  {
    code: 'CHK-06',
    category: 'general',
    description: 'Asiento y cinturón de seguridad: revisar estado, anclaje y funcionamiento.',
    order_index: 6,
  },
  {
    code: 'CHK-07',
    category: 'general',
    description: 'Circulina operativa: encender y comprobar visibilidad. (Aplica a todos los equipos). Alarma de retroceso operativo (Aplica a FT-PM-TR)',
    order_index: 7,
  },
  {
    code: 'CHK-08',
    category: 'general',
    description: 'Luces operativas: verificar luces delanteras, traseras y de freno.',
    order_index: 8,
  },
  {
    code: 'CHK-09',
    category: 'general',
    description: 'Cintas reflectivas: deben estar adheridas y visibles.',
    order_index: 9,
  },
  {
    code: 'CHK-10',
    category: 'general',
    description: 'Pintura: sin deterioro que afecte señalización o visibilidad del equipo.',
    order_index: 10,
  },
  {
    code: 'CHK-11',
    category: 'general',
    description: 'Neumáticos sin desgaste: revisar presión y ausencia de grietas o desgaste de las llantas.',
    order_index: 11,
  },
  {
    code: 'CHK-12',
    category: 'general',
    description: 'Frenos operativos (Freno de pedal y parqueo o mano): probar funcionamiento antes de iniciar el desplazamiento.',
    order_index: 12,
  },
  {
    code: 'CHK-13',
    category: 'general',
    description: 'Bumpers: sin rayones, desgaste que pueda causar daños al fuselaje del avión (Aplica a FT-EM)',
    order_index: 13,
  },
  {
    code: 'CHK-14',
    category: 'general',
    description: 'Sólo escaleras: estabilizadores operativos, peldaños y cintas antideslizantes en buen estado, luces operativas',
    order_index: 14,
  },
];

/**
 * Obtiene items de checklist por categoría
 */
export function getChecklistByCategory(category: ChecklistCategory) {
  return CHECKLIST_TEMPLATE.filter((item) => item.category === category);
}

/**
 * Obtiene un item de checklist por código
 */
export function getChecklistItem(code: string) {
  return CHECKLIST_TEMPLATE.find((item) => item.code === code);
}

/**
 * Obtiene todas las categorías con sus items
 */
export function getChecklistGroupedByCategory() {
  const grouped: Record<ChecklistCategory, ChecklistTemplateItem[]> = {
    documentacion: [],
    electrico: [],
    mecanico: [],
    hidraulico: [],
    general: [],
  };

  CHECKLIST_TEMPLATE.forEach((item) => {
    grouped[item.category].push(item);
  });

  return grouped;
}
