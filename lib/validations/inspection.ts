/**
 * Validaciones de Inspección con Zod
 */

import { z } from 'zod';
import { equipmentSchema } from './equipment';
import { checklistItemSchema } from './checklist';
import { CHECKLIST_TEMPLATE } from '@/lib/checklist-template';

export const inspectionGeneralSchema = z.object({
  inspection_date: z.date().max(new Date(), 'La fecha no puede ser futura'),
  inspection_type: z.enum(['inicial', 'periodica', 'post_mantenimiento'], 'Tipo de inspección requerido'),
  inspector_name: z.string().min(1, 'Nombre del inspector requerido'),
  station: z.string().min(1, 'Estación requerida'),
});

export const inspectionSchema = z
  .object({
    general: inspectionGeneralSchema,
    equipment: z.array(equipmentSchema).min(1, 'Debe agregar al menos un equipo'),
    checklists: z.record(z.string(), z.record(z.string(), checklistItemSchema)),
    signatures: z.object({
      supervisor_name: z.string().min(1, 'Nombre del supervisor requerido'),
      supervisor_signature: z.string().min(1, 'Firma del supervisor requerida'),
    }),
  })
  .refine(
    (data) => {
      // Validar que cada equipo tenga su checklist completo (según template)
      for (const eq of data.equipment) {
        const checklist = data.checklists[eq.code];
        if (!checklist || Object.keys(checklist).length < CHECKLIST_TEMPLATE.length) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Todos los equipos deben tener el checklist completo',
      path: ['checklists'],
    }
  );

export type InspectionGeneralFormData = z.infer<typeof inspectionGeneralSchema>;
export type InspectionFormData = z.infer<typeof inspectionSchema>;
