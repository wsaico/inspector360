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
    description: 'Extintor vigente: verificar presencia, fecha de vencimiento y de última inspección',
    order_index: 1,
  },
  {
    code: 'CHK-02',
    category: 'general',
    description: 'Pin de seguridad: comprobar que esté colocado correctamente y sin deformaciones',
    order_index: 2,
  },
  {
    code: 'CHK-03',
    category: 'general',
    description: 'Manómetro: verificar que la aguja esté en la zona verde de presión adecuada',
    order_index: 3,
  },
  {
    code: 'CHK-04',
    category: 'general',
    description: 'Manguera: inspeccionar que no presente grietas, cortes o deterioro visible',
    order_index: 4,
  },
  {
    code: 'CHK-05',
    category: 'general',
    description: 'Boquilla: verificar que esté limpia, sin obstrucciones y correctamente acoplada',
    order_index: 5,
  },
  {
    code: 'CHK-06',
    category: 'general',
    description: 'Etiqueta de identificación: confirmar que sea legible y contenga información actualizada',
    order_index: 6,
  },
  {
    code: 'CHK-07',
    category: 'general',
    description: 'Ubicación: asegurar que esté en un lugar accesible y señalizado según normativa',
    order_index: 7,
  },
  {
    code: 'CHK-08',
    category: 'general',
    description: 'Soporte: verificar que esté firmemente sujeto y sin daños estructurales',
    order_index: 8,
  },
  {
    code: 'CHK-09',
    category: 'general',
    description: 'Peso: confirmar que el peso corresponda al indicado en la etiqueta',
    order_index: 9,
  },
  {
    code: 'CHK-10',
    category: 'general',
    description: 'Cuerpo del extintor: inspeccionar ausencia de corrosión, abolladuras o fugas',
    order_index: 10,
  },
  {
    code: 'CHK-11',
    category: 'general',
    description: 'Válvula: verificar que abra y cierre correctamente sin obstrucciones',
    order_index: 11,
  },
  {
    code: 'CHK-12',
    category: 'general',
    description: 'Precinto de seguridad: confirmar que esté intacto y sin signos de manipulación',
    order_index: 12,
  },
  {
    code: 'CHK-13',
    category: 'general',
    description: 'Instrucciones de uso: verificar que sean legibles y estén en el idioma local',
    order_index: 13,
  },
  {
    code: 'CHK-14',
    category: 'general',
    description: 'Prueba de funcionamiento: realizar descarga breve para verificar operatividad',
    order_index: 14,
  },
  {
    code: 'CHK-15',
    category: 'general',
    description: 'Observaciones generales: documentar cualquier anomalía o condición especial detectada',
    order_index: 15,
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
