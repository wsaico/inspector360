/**
 * Validaciones de Checklist con Zod
 */

import { z } from 'zod';

export const checklistItemSchema = z
  .object({
    status: z.enum(['conforme', 'no_conforme', 'no_aplica'], 'Debe seleccionar un estado'),
    observations: z.string().optional().default(''),
  });

export type ChecklistItemFormData = z.infer<typeof checklistItemSchema>;

