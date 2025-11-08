/**
 * Validaciones de Equipos con Zod
 */

import { z } from 'zod';

export const equipmentSchema = z.object({
  code: z
    .string()
    .regex(/^TLM-[A-Z]{2}-\d{3}$/, 'Formato inválido. Use: TLM-AR-001')
    .min(1, 'Código requerido'),
  type: z.string().min(1, 'Tipo de equipo requerido'),
  brand: z.string().min(1, 'Marca requerida'),
  model: z.string().min(1, 'Modelo requerido'),
  year: z.number().min(1900, 'Año inválido').max(new Date().getFullYear() + 1, 'Año futuro no permitido'),
  serial_number: z.string().min(1, 'Número de serie requerido'),
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
