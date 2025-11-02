/**
 * Servicio de Usuarios
 * Gestiona todas las operaciones CRUD de usuarios (solo admin)
 */

import { supabase } from '@/lib/supabase/client';
import { UserProfile, UserRole } from '@/types/roles';

export class UserService {
  /**
   * Obtiene todos los usuarios (solo admin)
   */
  static async getUsers() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
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
        .from('user_profiles')
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
   * Llama a la API backend para crear usuario con Supabase Admin
   */
  static async createUser(userData: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    station?: string;
    phone?: string;
  }) {
    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error creando usuario');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Error creating user:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Actualiza un usuario existente
   */
  static async updateUser(userId: string, updates: Partial<UserProfile>) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
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
        .from('user_profiles')
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
        .from('user_profiles')
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
  static async getUsersByRole(role: UserRole) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
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
