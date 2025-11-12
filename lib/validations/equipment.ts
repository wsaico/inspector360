/**
 * Validaciones de Equipos con Zod
 */

import { z } from 'zod';

export const equipmentSchema = z.object({
  code: z
    .string()
    .regex(/^[A-Z]{3}-[A-Z]{2}-\d{3}$/i, 'Formato inválido. Use: AAA-BB-123')
    .min(1, 'Código requerido')
    .transform((v) => v.toUpperCase()),
  type: z.string().min(1, 'Tipo de equipo requerido'),
  brand: z.string().optional(),
  model: z.string().optional(),
});

export const observationSchema = z.object({
  equipment_code: z.string().min(1, 'Código de equipo requerido'),
  // La observación del operador será opcional aquí;
  // Se hará obligatoria dinámicamente si el checklist del equipo tiene No Conformes
  obs_operator: z.string().optional(),
  // La respuesta de mantenimiento puede ser posterior; permitir vacío inicialmente
  obs_maintenance: z.string().optional(),
});

export type EquipmentFormData = z.infer<typeof equipmentSchema>;
export type ObservationFormData = z.infer<typeof observationSchema>;
