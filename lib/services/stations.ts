/**
 * Servicio de Estaciones
 * Permite listar, activar/desactivar y agregar estaciones configurables.
 * Usa tabla opcional `stations` en Supabase. Si no existe, hace fallback a `STATIONS`.
 */

import { supabase } from '@/lib/supabase/client';
import { STATIONS, Station } from '@/types/roles';

export type StationConfig = {
  code: Station;
  name: string;
  is_active: boolean;
  address?: string;
  created_at?: string;
};

export class StationsService {
  /**
   * Lista todas las estaciones desde la tabla `stations`.
   * Si la tabla no existe o falla, hace fallback con todas activas desde `STATIONS`.
   */
  static async listAll(): Promise<{ data: StationConfig[]; error: string | null; usingFallback: boolean }> {
    try {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;

      const mapped: StationConfig[] = (data || []).map((row: any) => ({
        code: row.code as Station,
        name: row.name ?? STATIONS[row.code as Station] ?? String(row.code),
        is_active: !!row.is_active,
        address: row.address,
        created_at: row.created_at,
      }));

      return { data: mapped, error: null, usingFallback: false };
    } catch (err: any) {
      // Fallback: usar constantes existentes
      const fallback = Object.entries(STATIONS).map(([code, name]) => ({
        code: code as Station,
        name,
        is_active: true,
      }));
      return { data: fallback, error: null, usingFallback: true };
    }
  }

  // ... listActive ...

  static async listActive(): Promise<{ data: StationConfig[]; error: string | null; usingFallback: boolean }> {
    const res = await this.listAll();
    return { ...res, data: res.data.filter((s) => s.is_active) };
  }

  /**
   * Activa o desactiva una estación
   */
  static async setActive(code: Station, active: boolean): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('stations')
        .update({ is_active: active })
        .eq('code', code)
        .select()
        .single();

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error('Error updating station status:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Agrega o actualiza una estación.
   */
  static async upsert(data: { code: Station; is_active?: boolean; name?: string; address?: string }): Promise<{ success: boolean; error: string | null }> {
    try {
      const name = data.name ?? STATIONS[data.code] ?? String(data.code);
      const payload: any = { code: data.code, name };

      if (data.is_active !== undefined) payload.is_active = data.is_active;
      if (data.address !== undefined) payload.address = data.address;

      const { error } = await supabase
        .from('stations')
        .upsert(payload, { onConflict: 'code' })
        .select()
        .single();

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error('Error upserting station:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Elimina una estación de la tabla `stations` por código
   */
  static async delete(code: Station): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('stations')
        .delete()
        .eq('code', code);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error('Error deleting station:', err);
      return { success: false, error: err.message };
    }
  }
}