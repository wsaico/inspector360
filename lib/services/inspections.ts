/**
 * Servicio de Inspecciones
 * Gestiona todas las operaciones CRUD de inspecciones
 */

import { supabase } from '@/lib/supabase/client';
import { Inspection, Equipment } from '@/types';

export class InspectionService {
  /**
   * Obtiene todas las inspecciones según los permisos del usuario
   * El RLS de Supabase maneja automáticamente el filtrado por rol
   */
  static async getInspections() {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          equipment (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching inspections:', error);
        throw error;
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error fetching inspections:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtiene una inspección por ID
   */
  static async getInspectionById(id: string) {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .select(`
          *,
          equipment (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error fetching inspection:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Crea una nueva inspección (draft)
   */
  static async createInspection(inspectionData: Partial<Inspection>) {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .insert({
          user_id: inspectionData.user_id,
          station: inspectionData.station,
          inspection_date: inspectionData.inspection_date,
          inspection_type: inspectionData.inspection_type,
          inspector_name: inspectionData.inspector_name,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating inspection:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Actualiza una inspección existente
   */
  static async updateInspection(id: string, updates: Partial<Inspection>) {
    try {
      const { data, error } = await supabase
        .from('inspections')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error updating inspection:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Completa una inspección (cambia status a completed)
   */
  static async completeInspection(
    inspectionId: string,
    signaturesData: {
      supervisorName: string;
      supervisorSignature: string;
      mechanicName: string;
      mechanicSignature: string;
    }
  ) {
    try {
      // 1. Subir firma del supervisor a Storage
      const supervisorBlob = await fetch(signaturesData.supervisorSignature).then((r) =>
        r.blob()
      );
      const supervisorFileName = `signatures/${inspectionId}/supervisor-${Date.now()}.png`;

      const { error: supervisorUploadError } = await supabase.storage
        .from('signatures')
        .upload(supervisorFileName, supervisorBlob, { upsert: true });

      if (supervisorUploadError) throw supervisorUploadError;

      // 2. Obtener URL pública del supervisor
      const {
        data: { publicUrl: supervisorUrl },
      } = supabase.storage.from('signatures').getPublicUrl(supervisorFileName);

      // 3. Subir firma del mecánico a Storage
      const mechanicBlob = await fetch(signaturesData.mechanicSignature).then((r) =>
        r.blob()
      );
      const mechanicFileName = `signatures/${inspectionId}/mechanic-${Date.now()}.png`;

      const { error: mechanicUploadError } = await supabase.storage
        .from('signatures')
        .upload(mechanicFileName, mechanicBlob, { upsert: true });

      if (mechanicUploadError) throw mechanicUploadError;

      // 4. Obtener URL pública del mecánico
      const {
        data: { publicUrl: mechanicUrl },
      } = supabase.storage.from('signatures').getPublicUrl(mechanicFileName);

      // 5. Actualizar inspección con ambas firmas
      const { data, error } = await supabase
        .from('inspections')
        .update({
          supervisor_name: signaturesData.supervisorName,
          supervisor_signature_url: supervisorUrl,
          supervisor_signature_date: new Date().toISOString(),
          mechanic_name: signaturesData.mechanicName,
          mechanic_signature_url: mechanicUrl,
          mechanic_signature_date: new Date().toISOString(),
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', inspectionId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error completing inspection:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Elimina una inspección (solo admin)
   */
  static async deleteInspection(id: string) {
    try {
      const { error } = await supabase
        .from('inspections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error deleting inspection:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Agrega un equipo a una inspección
   */
  static async addEquipment(
    inspectionId: string,
    equipmentData: Partial<Equipment>
  ) {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .insert({
          inspection_id: inspectionId,
          code: equipmentData.code,
          type: equipmentData.type,
          brand: equipmentData.brand,
          model: equipmentData.model,
          year: equipmentData.year,
          serial_number: equipmentData.serial_number,
          motor_serial: equipmentData.motor_serial,
          station: equipmentData.station,
          checklist_data: equipmentData.checklist_data || {},
          order_index: equipmentData.order_index || 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding equipment:', error);
        throw error;
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error adding equipment:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Actualiza un equipo
   */
  static async updateEquipment(id: string, updates: Partial<Equipment>) {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error updating equipment:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Sube firma del inspector para un equipo
   */
  static async uploadInspectorSignature(
    equipmentId: string,
    signature: string
  ) {
    try {
      const signatureBlob = await fetch(signature).then((r) => r.blob());
      const fileName = `signatures/equipment/${equipmentId}/inspector-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, signatureBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('signatures').getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('equipment')
        .update({ inspector_signature_url: publicUrl })
        .eq('id', equipmentId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error uploading signature:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtiene estadísticas de inspecciones
   */
  static async getStatistics() {
    try {
      // Total de inspecciones
      const { count: total, error: totalError } = await supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true });

      if (totalError) throw totalError;

      // Completadas este mes
      const firstDayOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString();

      const { count: thisMonth, error: monthError } = await supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', firstDayOfMonth);

      if (monthError) throw monthError;

      // Pendientes (draft)
      const { count: pending, error: pendingError } = await supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft');

      if (pendingError) throw pendingError;

      return {
        data: {
          total: total || 0,
          thisMonth: thisMonth || 0,
          pending: pending || 0,
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtiene todos los equipos únicos de inspecciones previas
   * Para reutilización en nuevas inspecciones
   * Filtrado por estación para seguridad de datos
   */
  static async getUniqueEquipment(station: string) {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('station', station)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Eliminar duplicados por código de equipo
      const uniqueEquipment = data?.reduce((acc: Equipment[], curr: Equipment) => {
        if (!acc.find(eq => eq.code === curr.code)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      return { data: uniqueEquipment || [], error: null };
    } catch (error: any) {
      console.error('Error fetching unique equipment:', error);
      return { data: [], error: error.message };
    }
  }
}
