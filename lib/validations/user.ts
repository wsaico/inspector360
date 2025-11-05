/**
 * Validaciones de Usuario con Zod
 */

import { z } from 'zod';

export const userSchema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    full_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    role: z.enum(['admin', 'supervisor', 'sig'], 'Rol requerido'),
    station: z.string().min(3, 'Código de estación inválido').optional(),
  })
  .refine(
    (data) => {
      // Si el rol es supervisor, la estación es obligatoria
      if (data.role === 'supervisor') {
        return !!data.station;
      }
      return true;
    },
    {
      message: 'La estación es obligatoria para supervisores',
      path: ['station'],
    }
  )
  .refine(
    (data) => {
      // Si el rol es admin o sig, la estación debe ser null/undefined
      if (data.role === 'admin' || data.role === 'sig') {
        return !data.station;
      }
      return true;
    },
    {
      message: 'Administradores y SIG no deben tener estación asignada',
      path: ['station'],
    }
  );

export const updateUserSchema = z
  .object({
    full_name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').optional(),
    role: z.enum(['admin', 'supervisor', 'sig']).optional(),
    station: z.string().min(3, 'Código de estación inválido').optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.role === 'supervisor' && data.station === undefined) {
        return false;
      }
      return true;
    },
    {
      message: 'La estación es obligatoria para supervisores',
      path: ['station'],
    }
  );

export type UserFormData = z.infer<typeof userSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
