/**
 * Template de Checklist - 50 Items
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
  // DOCUMENTACIÓN Y REGISTRO (8 items)
  {
    code: 'DOC-01',
    category: 'documentacion',
    description: 'Tarjeta de propiedad vigente',
    order_index: 1,
  },
  {
    code: 'DOC-02',
    category: 'documentacion',
    description: 'SOAT vigente según normativa',
    order_index: 2,
  },
  {
    code: 'DOC-03',
    category: 'documentacion',
    description: 'Certificado de inspección técnica vigente',
    order_index: 3,
  },
  {
    code: 'DOC-04',
    category: 'documentacion',
    description: 'Manual de operación del equipo',
    order_index: 4,
  },
  {
    code: 'DOC-05',
    category: 'documentacion',
    description: 'Registro de mantenimientos preventivos',
    order_index: 5,
  },
  {
    code: 'DOC-06',
    category: 'documentacion',
    description: 'Bitácora de operación actualizada',
    order_index: 6,
  },
  {
    code: 'DOC-07',
    category: 'documentacion',
    description: 'Certificados de capacitación de operadores',
    order_index: 7,
  },
  {
    code: 'DOC-08',
    category: 'documentacion',
    description: 'Registro fotográfico del equipo',
    order_index: 8,
  },

  // SISTEMA ELÉCTRICO (11 items)
  {
    code: 'ELE-01',
    category: 'electrico',
    description: 'Estado de batería y conexiones',
    order_index: 9,
  },
  {
    code: 'ELE-02',
    category: 'electrico',
    description: 'Sistema de carga operativo',
    order_index: 10,
  },
  {
    code: 'ELE-03',
    category: 'electrico',
    description: 'Luces delanteras funcionando',
    order_index: 11,
  },
  {
    code: 'ELE-04',
    category: 'electrico',
    description: 'Luces traseras y de freno funcionando',
    order_index: 12,
  },
  {
    code: 'ELE-05',
    category: 'electrico',
    description: 'Luces de advertencia operativas',
    order_index: 13,
  },
  {
    code: 'ELE-06',
    category: 'electrico',
    description: 'Bocina funcional',
    order_index: 14,
  },
  {
    code: 'ELE-07',
    category: 'electrico',
    description: 'Alarma de retroceso operativa',
    order_index: 15,
  },
  {
    code: 'ELE-08',
    category: 'electrico',
    description: 'Tablero de instrumentos funcional',
    order_index: 16,
  },
  {
    code: 'ELE-09',
    category: 'electrico',
    description: 'Sistema de arranque sin fallas',
    order_index: 17,
  },
  {
    code: 'ELE-10',
    category: 'electrico',
    description: 'Cableado sin deterioros visibles',
    order_index: 18,
  },
  {
    code: 'ELE-11',
    category: 'electrico',
    description: 'Interruptores de seguridad operativos',
    order_index: 19,
  },

  // SISTEMA MECÁNICO (12 items)
  {
    code: 'MEC-01',
    category: 'mecanico',
    description: 'Motor sin fugas de aceite',
    order_index: 20,
  },
  {
    code: 'MEC-02',
    category: 'mecanico',
    description: 'Nivel de aceite adecuado',
    order_index: 21,
  },
  {
    code: 'MEC-03',
    category: 'mecanico',
    description: 'Sistema de refrigeración operativo',
    order_index: 22,
  },
  {
    code: 'MEC-04',
    category: 'mecanico',
    description: 'Transmisión sin ruidos anormales',
    order_index: 23,
  },
  {
    code: 'MEC-05',
    category: 'mecanico',
    description: 'Frenos operativos (respuesta inmediata)',
    order_index: 24,
  },
  {
    code: 'MEC-06',
    category: 'mecanico',
    description: 'Freno de estacionamiento funcional',
    order_index: 25,
  },
  {
    code: 'MEC-07',
    category: 'mecanico',
    description: 'Dirección sin juego excesivo',
    order_index: 26,
  },
  {
    code: 'MEC-08',
    category: 'mecanico',
    description: 'Neumáticos en buen estado',
    order_index: 27,
  },
  {
    code: 'MEC-09',
    category: 'mecanico',
    description: 'Presión de neumáticos correcta',
    order_index: 28,
  },
  {
    code: 'MEC-10',
    category: 'mecanico',
    description: 'Suspensión sin desgaste excesivo',
    order_index: 29,
  },
  {
    code: 'MEC-11',
    category: 'mecanico',
    description: 'Cadenas y eslabones en buen estado',
    order_index: 30,
  },
  {
    code: 'MEC-12',
    category: 'mecanico',
    description: 'Sistema de escape sin fugas',
    order_index: 31,
  },

  // SISTEMA HIDRÁULICO (10 items)
  {
    code: 'HID-01',
    category: 'hidraulico',
    description: 'Nivel de aceite hidráulico adecuado',
    order_index: 32,
  },
  {
    code: 'HID-02',
    category: 'hidraulico',
    description: 'Mangueras sin fugas visibles',
    order_index: 33,
  },
  {
    code: 'HID-03',
    category: 'hidraulico',
    description: 'Cilindros hidráulicos sin fugas',
    order_index: 34,
  },
  {
    code: 'HID-04',
    category: 'hidraulico',
    description: 'Válvulas de control operativas',
    order_index: 35,
  },
  {
    code: 'HID-05',
    category: 'hidraulico',
    description: 'Bomba hidráulica sin ruidos anormales',
    order_index: 36,
  },
  {
    code: 'HID-06',
    category: 'hidraulico',
    description: 'Sistema de elevación funcional',
    order_index: 37,
  },
  {
    code: 'HID-07',
    category: 'hidraulico',
    description: 'Sistema de inclinación operativo',
    order_index: 38,
  },
  {
    code: 'HID-08',
    category: 'hidraulico',
    description: 'Conexiones hidráulicas ajustadas',
    order_index: 39,
  },
  {
    code: 'HID-09',
    category: 'hidraulico',
    description: 'Filtro hidráulico limpio',
    order_index: 40,
  },
  {
    code: 'HID-10',
    category: 'hidraulico',
    description: 'Válvula de seguridad operativa',
    order_index: 41,
  },

  // CONDICIONES GENERALES (9 items)
  {
    code: 'GEN-01',
    category: 'general',
    description: 'Estructura sin daños estructurales',
    order_index: 42,
  },
  {
    code: 'GEN-02',
    category: 'general',
    description: 'Cabina del operador limpia y segura',
    order_index: 43,
  },
  {
    code: 'GEN-03',
    category: 'general',
    description: 'Asiento del operador en buen estado',
    order_index: 44,
  },
  {
    code: 'GEN-04',
    category: 'general',
    description: 'Cinturón de seguridad operativo',
    order_index: 45,
  },
  {
    code: 'GEN-05',
    category: 'general',
    description: 'Espejos retrovisores completos',
    order_index: 46,
  },
  {
    code: 'GEN-06',
    category: 'general',
    description: 'Extintor de incendios vigente y accesible',
    order_index: 47,
  },
  {
    code: 'GEN-07',
    category: 'general',
    description: 'Señalización de seguridad visible',
    order_index: 48,
  },
  {
    code: 'GEN-08',
    category: 'general',
    description: 'Kit de primeros auxilios disponible',
    order_index: 49,
  },
  {
    code: 'GEN-09',
    category: 'general',
    description: 'Limpieza general del equipo',
    order_index: 50,
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
