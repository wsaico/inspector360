/**
 * Servicio para Tipos de Inspección (Módulos del Sistema)
 * Maneja los diferentes tipos de inspecciones disponibles en el sistema
 */

import { supabase } from '@/lib/supabase/client';
import { InspectionSystemType } from '@/types/inspection';

export class InspectionTypeService {
  /**
   * Obtener todos los tipos de inspección ordenados por display_order
   */
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('inspection_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      return { data: data as InspectionSystemType[], error: null };
    } catch (error: any) {
      console.error('Error fetching inspection types:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtener solo los tipos de inspección activos
   */
  static async getActive() {
    try {
      const { data, error } = await supabase
        .from('inspection_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      return { data: data as InspectionSystemType[], error: null };
    } catch (error: any) {
      console.error('Error fetching active inspection types:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtener un tipo de inspección por su código
   */
  static async getByCode(code: string) {
    try {
      const { data, error } = await supabase
        .from('inspection_types')
        .select('*')
        .eq('code', code)
        .single();

      if (error) throw error;

      return { data: data as InspectionSystemType, error: null };
    } catch (error: any) {
      console.error('Error fetching inspection type by code:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Actualizar el estado activo de un tipo de inspección (Admin only)
   */
  static async updateActiveStatus(id: string, isActive: boolean) {
    try {
      const { data, error } = await supabase
        .from('inspection_types')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { data: data as InspectionSystemType, error: null };
    } catch (error: any) {
      console.error('Error updating inspection type status:', error);
      return { data: null, error: error.message };
    }
  }
}
