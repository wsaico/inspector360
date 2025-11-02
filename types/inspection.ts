/**
 * Tipos para Inspecciones y Equipos
 */

import { Station } from './roles';

export type InspectionType = 'inicial' | 'periodica' | 'post_mantenimiento';

export type InspectionStatus = 'draft' | 'completed';

export type ChecklistStatus = 'conforme' | 'no_conforme' | 'no_aplica';

export type ChecklistCategory =
  | 'documentacion'
  | 'electrico'
  | 'mecanico'
  | 'hidraulico'
  | 'general';

export const INSPECTION_TYPES: Record<InspectionType, string> = {
  inicial: 'Inicial',
  periodica: 'Periódica',
  post_mantenimiento: 'Post Mantenimiento',
};

export const CHECKLIST_CATEGORIES: Record<ChecklistCategory, string> = {
  documentacion: 'Documentación y Registro',
  electrico: 'Sistema Eléctrico',
  mecanico: 'Sistema Mecánico',
  hidraulico: 'Sistema Hidráulico',
  general: 'Condiciones Generales',
};

export interface ChecklistItem {
  status: ChecklistStatus | null;
  observations: string;
  description?: string;
}

export interface Equipment {
  id?: string;
  inspection_id?: string;
  code: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  serial_number: string;
  motor_serial?: string;
  station: Station;
  inspector_signature_url?: string;
  checklist_data: Record<string, ChecklistItem>;
  order_index: number;
  description?: string;
}

export interface Observation {
  id?: string;
  inspection_id?: string;
  obs_id: string;
  equipment_code: string;
  obs_operator: string;
  obs_maintenance: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface Inspection {
  id?: string;
  form_code?: string;
  user_id?: string;
  station: Station;
  inspection_date: Date | string;
  inspection_type: InspectionType;
  inspector_name: string;
  supervisor_name?: string;
  supervisor_signature_url?: string;
  supervisor_signature_date?: string;
  mechanic_name?: string;
  mechanic_signature_url?: string;
  mechanic_signature_date?: string;
  status: InspectionStatus;
  created_at?: string;
  updated_at?: string;
  equipment?: Equipment[];
}

export interface InspectionFormData {
  general: {
    inspection_date: Date;
    inspection_type: InspectionType;
    inspector_name: string;
    station: Station;
  } | null;
  equipment: Equipment[];
  observations: Observation[];
  checklists: Record<string, Record<string, ChecklistItem>>;
  signatures: {
    supervisor_name?: string;
    supervisor_signature?: string;
    mechanic_name?: string;
    mechanic_signature?: string;
  };
  equipmentSignatures: Record<string, string>; // equipment code -> signature URL
}

export interface ChecklistTemplateItem {
  id: string;
  category: ChecklistCategory;
  code: string;
  description: string;
  order_index: number;
  is_active: boolean;
}
