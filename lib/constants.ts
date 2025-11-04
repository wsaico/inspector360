/**
 * Constantes del Sistema
 */

// Configuración de la aplicación
export const APP_NAME = 'Inspector 360°';
export const APP_DESCRIPTION = 'Sistema de Inspección Técnica de Equipos - FOR-ATA-057';

// Límites y configuraciones
export const MAX_EQUIPMENT_PER_INSPECTION = 50;
export const CHECKLIST_ITEMS_COUNT = 50;
export const AUTO_SAVE_INTERVAL = 30000; // 30 segundos

// Categorías de checklist con cantidad de items
export const CHECKLIST_CATEGORY_COUNTS = {
  documentacion: 8,
  electrico: 11,
  mecanico: 12,
  hidraulico: 10,
  general: 9,
} as const;

// Prefijos de códigos de checklist
export const CHECKLIST_CODE_PREFIXES = {
  documentacion: 'DOC',
  electrico: 'ELE',
  mecanico: 'MEC',
  hidraulico: 'HID',
  general: 'GEN',
} as const;

// Colores de la marca (según documentación)
export const BRAND_COLORS = {
  primary: '#093071', // Azul corporativo
  secondary: '#8EBB37', // Verde corporativo
  accent: '#E8EDF5', // Gris claro
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
} as const;

// Formatos de fecha
export const DATE_FORMAT = 'dd/MM/yyyy';
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

// Mensajes de error comunes
export const ERROR_MESSAGES = {
  GENERIC: 'Ha ocurrido un error. Por favor intente nuevamente.',
  NETWORK: 'Error de conexión. Verifique su conexión a internet.',
  UNAUTHORIZED: 'No tiene permisos para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no fue encontrado.',
  VALIDATION: 'Por favor verifique los datos ingresados.',
} as const;

// Mensajes de éxito
export const SUCCESS_MESSAGES = {
  INSPECTION_CREATED: 'Inspección creada exitosamente',
  INSPECTION_UPDATED: 'Inspección actualizada exitosamente',
  INSPECTION_DELETED: 'Inspección eliminada exitosamente',
  USER_CREATED: 'Usuario creado exitosamente',
  USER_UPDATED: 'Usuario actualizado exitosamente',
  PDF_GENERATED: 'PDF generado exitosamente',
} as const;

// Texto de nota para el footer del FOR-ATA-057
export const FOR_ATA_057_FOOTER_NOTE = `**NOTA:**
**Para registros fisicos:** No debe borrarse, bajo ninguna circunstancia, la información registrada originalmente en un registro; las correcciones o anulación de una parte de la información plasmada en los registros físicos, deben realizarse trazando una línea diagonal sobre la información a corregir o anular, garantizando que ésta quede legible, para luego consignar la nueva información al margen de la información original. La justificación de la corrección o anulación efectuada debe realizarse en la parte posterior del registro indicando la fecha, nombre y/o firma de quien lo ejecutó para que quede constancia.

**Para registros electrónicos:** Colocar un comentario sobre la información modificada. La justificación de la corrección o anulación efectuada debe realizarse en el comentario añadido indicando la fecha, nombre y/o firma de quien lo ejecutó para que quede constancia.`;
