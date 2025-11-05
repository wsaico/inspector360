/**
 * Servicio de Inspecciones
 * Gestiona todas las operaciones CRUD de inspecciones
 */

import { supabase } from '@/lib/supabase/client';
import { Inspection, Equipment } from '@/types';

export class InspectionService {
  /**
   * Deriva observaciones a partir del checklist de equipos
   * Si un ítem está en "no_conforme" o tiene texto en observations, se genera una observación del operador.
   * Se evita duplicar si ya existe una observación explícita con el mismo (equipment_code, obs_id).
   */
  private static deriveObservationsFromEquipment(
    equipmentList: Equipment[] | undefined,
    existing: any[] = []
  ) {
    if (!equipmentList || equipmentList.length === 0) return [];

    const existingKeys = new Set(
      (existing || []).map((o) => `${o.equipment_code}::${o.obs_id}`)
    );

    const derived: any[] = [];
    equipmentList.forEach((eq) => {
      const entries = Object.entries(eq.checklist_data || {});
      entries.forEach(([code, item], index) => {
        const isNC = item?.status === 'no_conforme'; if (isNC) {
          const key = `${eq.code}::${code}`;
          if (!existingKeys.has(key)) {
            derived.push({
              // sin id (proviene del checklist), sirve para visualización
              inspection_id: eq.inspection_id,
              obs_id: code,
              equipment_code: eq.code,
              obs_operator: '',
              obs_maintenance: null,
              order_index: index,
              created_at: undefined,
              updated_at: undefined,
            });
          }
        }
      });
    });

    return derived;
  }
  /**
   * Obtiene todas las inspecciones según los permisos del usuario
   * El RLS de Supabase maneja automáticamente el filtrado por rol
   */
  static async getInspections() {
    try {
      // Obtener inspecciones con equipos
      const { data: inspections, error: inspectionsError } = await supabase
        .from('inspections')
        .select(`
          *,
          equipment (*)
        `)
        .order('created_at', { ascending: false });

      if (inspectionsError) {
        console.error('Error fetching inspections:', inspectionsError);
        throw inspectionsError;
      }

      const ids = (inspections || []).map((i: { id?: string }) => i.id).filter(Boolean);
      if (!ids || ids.length === 0) {
        return { data: inspections || [], error: null };
      }

      // Obtener observaciones asociadas en un solo query y adjuntar
      const { data: obs, error: obsError } = await supabase
        .from('observations')
        .select('id, inspection_id, obs_id, equipment_code, obs_operator, obs_maintenance, order_index, created_at, updated_at')
        .in('inspection_id', ids);

      if (obsError) {
        console.warn('Observations fetch failed, continuing without them:', obsError);
        return { data: inspections || [], error: null };
      }

      const byInspection: Record<string, any[]> = {};
      (obs || []).forEach((o: any) => {
        const key = o.inspection_id;
        if (!byInspection[key]) byInspection[key] = [];
        byInspection[key].push(o);
      });

      const withObs = (inspections || []).map((i: Inspection) => {
        const attached = byInspection[i.id!] || [];
        const derived = InspectionService.deriveObservationsFromEquipment(i.equipment as Equipment[] | undefined, attached);
        return {
          ...i,
          observations: attached.length > 0 ? attached : derived,
        };
      });

      return { data: withObs, error: null };
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
      // Obtener inspección con equipos
      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections')
        .select(`
          *,
          equipment (*)
        `)
        .eq('id', id)
        .single();

      if (inspectionError) throw inspectionError;

      // Obtener observaciones asociadas explícitamente
      const { data: observations, error: obsError } = await supabase
        .from('observations')
        .select('id, inspection_id, obs_id, equipment_code, obs_operator, obs_maintenance, order_index, created_at, updated_at')
        .eq('inspection_id', id);

      if (obsError) {
        console.warn('Observations fetch failed for inspection:', id, obsError);
      }

      const derived = InspectionService.deriveObservationsFromEquipment(inspection?.equipment as Equipment[] | undefined, observations || []);
      const finalObs = (observations && observations.length > 0) ? observations : derived;
      return { data: { ...inspection, observations: finalObs }, error: null };
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
      supervisorName?: string | null;
      supervisorSignature?: string | null;
      mechanicName?: string | null;
      mechanicSignature?: string | null;
    }
  ) {
    try {
      // 1-4. Subir firmas si existen y obtener URLs públicas
      let supervisorUrl: string | null = null;
      if (signaturesData.supervisorSignature) {
        const supervisorBlob = await fetch(signaturesData.supervisorSignature).then((r) => r.blob());
        const supervisorFileName = `signatures/${inspectionId}/supervisor-${Date.now()}.png`;
        const { error: supervisorUploadError } = await supabase.storage
          .from('signatures')
          .upload(supervisorFileName, supervisorBlob, { upsert: true });
        if (supervisorUploadError) throw supervisorUploadError;
        const {
          data: { publicUrl },
        } = supabase.storage.from('signatures').getPublicUrl(supervisorFileName);
        supervisorUrl = publicUrl;
      }

      let mechanicUrl: string | null = null;
      if (signaturesData.mechanicSignature) {
        const mechanicBlob = await fetch(signaturesData.mechanicSignature).then((r) => r.blob());
        const mechanicFileName = `signatures/${inspectionId}/mechanic-${Date.now()}.png`;
        const { error: mechanicUploadError } = await supabase.storage
          .from('signatures')
          .upload(mechanicFileName, mechanicBlob, { upsert: true });
        if (mechanicUploadError) throw mechanicUploadError;
        const {
          data: { publicUrl },
        } = supabase.storage.from('signatures').getPublicUrl(mechanicFileName);
        mechanicUrl = publicUrl;
      }

      // 5. Determinar estado: 'completed' solo si ambas firmas y nombres
      // Cuando solo faltan firmas, no consideramos 'borrador' a nivel de UI/flujo.
      // Marcamos como 'completed' y la UI mostrará 'Pendiente' por firmas faltantes.
      const finalStatus: 'completed' | 'draft' = 'completed';

      // 6. Actualizar inspección con datos presentes (firmas opcionales)
      const { data, error } = await supabase
        .from('inspections')
        .update({
          supervisor_name: signaturesData.supervisorName ?? null,
          supervisor_signature_url: supervisorUrl,
          supervisor_signature_date: supervisorUrl ? new Date().toISOString() : null,
          mechanic_name: signaturesData.mechanicName ?? null,
          mechanic_signature_url: mechanicUrl,
          mechanic_signature_date: mechanicUrl ? new Date().toISOString() : null,
          status: finalStatus,
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
   * Sube firma del supervisor y actualiza la inspección
   */
  static async uploadSupervisorSignature(
    inspectionId: string,
    name: string,
    signature: string
  ) {
    try {
      const signatureBlob = await fetch(signature).then((r) => r.blob());
      const fileName = `signatures/${inspectionId}/supervisor-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, signatureBlob, { upsert: true });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('signatures').getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('inspections')
        .update({
          supervisor_name: name,
          supervisor_signature_url: publicUrl,
          supervisor_signature_date: new Date().toISOString(),
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', inspectionId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error uploading supervisor signature:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Sube firma del mecánico y actualiza la inspección
   */
  static async uploadMechanicSignature(
    inspectionId: string,
    name: string,
    signature: string
  ) {
    try {
      const signatureBlob = await fetch(signature).then((r) => r.blob());
      const fileName = `signatures/${inspectionId}/mechanic-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, signatureBlob, { upsert: true });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('signatures').getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('inspections')
        .update({
          mechanic_name: name,
          mechanic_signature_url: publicUrl,
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
      console.error('Error uploading mechanic signature:', error);
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

  /**
   * Actualiza la respuesta del mecánico para una observación
   */
  static async updateObservationMaintenance(
    observationId: string,
    obsMaintenance: string
  ) {
    try {
      const { data, error } = await supabase
        .from('observations')
        .update({
          obs_maintenance: obsMaintenance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', observationId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error updating observation maintenance:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Crea una observación cuando proviene del checklist (sin id)
   */
  static async createObservation(
    payload: {
      inspection_id: string;
      obs_id: string;
      equipment_code: string;
      obs_operator: string;
      obs_maintenance: string | null;
      order_index?: number;
    }
  ) {
    try {
      const { data, error } = await supabase
        .from('observations')
        .insert({
          inspection_id: payload.inspection_id,
          obs_id: payload.obs_id,
          equipment_code: payload.equipment_code,
          obs_operator: payload.obs_operator,
          obs_maintenance: payload.obs_maintenance,
          order_index: payload.order_index ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating observation:', error);
      return { data: null, error: error.message };
    }
  }
}
