/**
 * Servicio de Usuarios
 * Gestiona todas las operaciones CRUD de usuarios (solo admin)
 */

import { supabase } from '@/lib/supabase/client';
import { User, CreateUserData, UpdateUserData } from '@/types';

export class UserService {
  /**
   * Obtiene todos los usuarios (solo admin)
   */
  static async getUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error fetching users:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtiene un usuario por ID
   */
  static async getUserById(id: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error fetching user:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Crea un nuevo usuario (solo admin)
   * Requiere permisos de admin en Supabase
   */
  static async createUser(userData: CreateUserData) {
    try {
      // Nota: Esta función requiere configuración adicional en Supabase
      // para permitir la creación de usuarios desde el cliente
      // Normalmente se haría desde el backend con el service_role key

      // Por ahora, retornamos un mensaje indicando que debe configurarse
      return {
        data: null,
        error:
          'La creación de usuarios debe configurarse en el backend con Supabase Admin API',
      };

      // Código de ejemplo (requiere backend):
      /*
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const result = await response.json();
      return result;
      */
    } catch (error: any) {
      console.error('Error creating user:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Actualiza un usuario existente
   */
  static async updateUser(userId: string, updates: UpdateUserData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error updating user:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Activa o desactiva un usuario
   */
  static async toggleUserStatus(userId: string, isActive: boolean) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtiene usuarios por estación
   */
  static async getUsersByStation(station: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('station', station)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error fetching users by station:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtiene usuarios por rol
   */
  static async getUsersByRole(role: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error fetching users by role:', error);
      return { data: null, error: error.message };
    }
  }
}
