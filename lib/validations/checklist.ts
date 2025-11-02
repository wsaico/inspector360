/**
 * Validaciones de Checklist con Zod
 */

import { z } from 'zod';

export const checklistItemSchema = z
  .object({
    status: z.enum(['conforme', 'no_conforme', 'no_aplica'], 'Debe seleccionar un estado'),
    observations: z.string(),
  })
  .refine(
    (data) => {
      // Si es no_conforme, observaciones es obligatorio
      if (data.status === 'no_conforme') {
        return data.observations.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Las observaciones son obligatorias para items no conformes',
      path: ['observations'],
    }
  );

export type ChecklistItemFormData = z.infer<typeof checklistItemSchema>;
