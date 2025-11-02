/**
 * Validaciones de Equipos con Zod
 */

import { z } from 'zod';

export const equipmentSchema = z.object({
  code: z
    .string()
    .regex(/^TLM-\d{2}-\d{3}$/, 'Formato inválido. Use: TLM-XX-XXX')
    .min(1, 'Código requerido'),
  type: z.string().min(1, 'Tipo de equipo requerido'),
  brand: z.string().min(1, 'Marca requerida'),
  model: z.string().min(1, 'Modelo requerido'),
  year: z.number().min(1900, 'Año inválido').max(new Date().getFullYear() + 1, 'Año inválido'),
  serial_number: z.string().min(1, 'Número de serie requerido'),
  motor_serial: z.string().optional(),
});

export type EquipmentFormData = z.infer<typeof equipmentSchema>;
