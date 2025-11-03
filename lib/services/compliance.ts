/**
 * Servicio de Cumplimiento
 * Gestiona estadísticas y métricas de cumplimiento
 */

import { supabase } from '@/lib/supabase/client';
import { ChecklistItem } from '@/types';

// Tipos auxiliares para filas provenientes de Supabase
type EquipmentChecklistRow = {
  checklist_data: Record<string, ChecklistItem> | null;
};

type EquipmentWithMetaRow = {
  code: string;
  type: string;
  checklist_data: Record<string, ChecklistItem> | null;
};

export class ComplianceService {
  /**
   * Obtiene estadísticas generales
   */
  static async getOverallStats() {
    try {
      // Total de inspecciones completadas
      const { count: totalInspections, error: totalError } = await supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      if (totalError) throw totalError;

      // Inspecciones completadas este mes
      const firstDayOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString();

      const { count: completedThisMonth, error: monthError } = await supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', firstDayOfMonth);

      if (monthError) throw monthError;

      // Total de equipos inspeccionados
      const { count: equipmentInspected, error: equipmentError } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true });

      if (equipmentError) throw equipmentError;

      // Calcular tasa de cumplimiento
      const { data: allEquipment, error: equipmentDataError } = await supabase
        .from('equipment')
        .select('checklist_data');

      if (equipmentDataError) throw equipmentDataError;

      let totalItems = 0;
      let conformeItems = 0;

      allEquipment?.forEach((eq: EquipmentChecklistRow) => {
        const checklist = eq.checklist_data as Record<string, ChecklistItem>;
        if (checklist) {
          Object.values(checklist).forEach((item) => {
            totalItems++;
            if (item.status === 'conforme') {
              conformeItems++;
            }
          });
        }
      });

      const complianceRate = totalItems > 0
        ? Math.round((conformeItems / totalItems) * 100)
        : 0;

      return {
        data: {
          totalInspections: totalInspections || 0,
          completedThisMonth: completedThisMonth || 0,
          complianceRate,
          equipmentInspected: equipmentInspected || 0,
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Error fetching overall stats:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtiene tendencias mensuales
   */
  static async getMonthlyTrends() {
    try {
      const { data: inspections, error } = await supabase
        .from('inspections')
        .select('created_at')
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Agrupar por mes
      const monthlyData: Record<string, number> = {};
      const monthNames = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
      ];

      inspections?.forEach((inspection: { created_at: string }) => {
        const date = new Date(inspection.created_at);
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      });

      // Convertir a array para el gráfico
      const chartData = Object.entries(monthlyData).map(([month, inspections]) => ({
        month,
        inspections,
      }));

      return { data: chartData, error: null };
    } catch (error: any) {
      console.error('Error fetching monthly trends:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtiene desglose de cumplimiento
   */
  static async getComplianceBreakdown() {
    try {
      const { data: allEquipment, error } = await supabase
        .from('equipment')
        .select('checklist_data');

      if (error) throw error;

      let conforme = 0;
      let noConforme = 0;
      let noAplica = 0;

      allEquipment?.forEach((eq: EquipmentChecklistRow) => {
        const checklist = eq.checklist_data as Record<string, ChecklistItem>;
        if (checklist) {
          Object.values(checklist).forEach((item) => {
            if (item.status === 'conforme') conforme++;
            else if (item.status === 'no_conforme') noConforme++;
            else if (item.status === 'no_aplica') noAplica++;
          });
        }
      });

      const chartData = [
        { name: 'Conforme', value: conforme },
        { name: 'No Conforme', value: noConforme },
        { name: 'No Aplica', value: noAplica },
      ];

      return { data: chartData, error: null };
    } catch (error: any) {
      console.error('Error fetching compliance breakdown:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtiene top de no conformidades por ítem
   */
  static async getTopIssues(limit: number = 10) {
    try {
      const { data: allEquipment, error } = await supabase
        .from('equipment')
        .select('checklist_data');

      if (error) throw error;

      const issueCount: Record<string, { code: string; count: number }> = {};

      allEquipment?.forEach((eq: EquipmentChecklistRow) => {
        const checklist = eq.checklist_data as Record<string, ChecklistItem>;
        if (checklist) {
          Object.entries(checklist).forEach(([code, item]) => {
            if (item.status === 'no_conforme') {
              if (!issueCount[code]) {
                issueCount[code] = { code, count: 0 };
              }
              issueCount[code].count++;
            }
          });
        }
      });

      // Convertir a array y ordenar por count
      const sortedIssues = Object.values(issueCount)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return { data: sortedIssues, error: null };
    } catch (error: any) {
      console.error('Error fetching top issues:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtiene estadísticas por estación
   */
  static async getStationStats() {
    try {
      const { data: inspections, error } = await supabase
        .from('inspections')
        .select('station, status')
        .eq('status', 'completed');

      if (error) throw error;

      const stationData: Record<string, number> = {};

      inspections?.forEach((inspection: { station: string }) => {
        stationData[inspection.station] = (stationData[inspection.station] || 0) + 1;
      });

      const chartData = Object.entries(stationData).map(([station, count]) => ({
        station,
        inspections: count,
      }));

      return { data: chartData, error: null };
    } catch (error: any) {
      console.error('Error fetching station stats:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtiene equipos con más no conformidades
   */
  static async getProblematicEquipment(limit: number = 10) {
    try {
      const { data: allEquipment, error } = await supabase
        .from('equipment')
        .select('code, type, checklist_data');

      if (error) throw error;

      const equipmentIssues = allEquipment?.map((eq: EquipmentWithMetaRow) => {
        const checklist = eq.checklist_data as Record<string, ChecklistItem>;
        let noConformeCount = 0;

        if (checklist) {
          Object.values(checklist).forEach((item) => {
            if (item.status === 'no_conforme') {
              noConformeCount++;
            }
          });
        }

        return {
          code: eq.code,
          type: eq.type,
          issues: noConformeCount,
        };
      });

      const sortedEquipment = equipmentIssues
        ?.filter((eq: { issues: number }) => eq.issues > 0)
        .sort((a: { issues: number }, b: { issues: number }) => b.issues - a.issues)
        .slice(0, limit);

      return { data: sortedEquipment, error: null };
    } catch (error: any) {
      console.error('Error fetching problematic equipment:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtiene reporte de cumplimiento por categoría
   */
  static async getComplianceByCategory() {
    try {
      const { data: allEquipment, error } = await supabase
        .from('equipment')
        .select('checklist_data');

      if (error) throw error;

      const categoryStats: Record<
        string,
        { conforme: number; noConforme: number; noAplica: number }
      > = {
        documentacion: { conforme: 0, noConforme: 0, noAplica: 0 },
        electrico: { conforme: 0, noConforme: 0, noAplica: 0 },
        mecanico: { conforme: 0, noConforme: 0, noAplica: 0 },
        hidraulico: { conforme: 0, noConforme: 0, noAplica: 0 },
        general: { conforme: 0, noConforme: 0, noAplica: 0 },
      };

      allEquipment?.forEach((eq: EquipmentChecklistRow) => {
        const checklist = eq.checklist_data as Record<string, ChecklistItem>;
        if (checklist) {
          Object.entries(checklist).forEach(([code, item]) => {
            // Determinar categoría por el prefijo del código
            let category = 'general';
            if (code.startsWith('DOC-')) category = 'documentacion';
            else if (code.startsWith('ELE-')) category = 'electrico';
            else if (code.startsWith('MEC-')) category = 'mecanico';
            else if (code.startsWith('HID-')) category = 'hidraulico';
            else if (code.startsWith('GEN-')) category = 'general';

            if (item.status === 'conforme') {
              categoryStats[category].conforme++;
            } else if (item.status === 'no_conforme') {
              categoryStats[category].noConforme++;
            } else if (item.status === 'no_aplica') {
              categoryStats[category].noAplica++;
            }
          });
        }
      });

      return { data: categoryStats, error: null };
    } catch (error: any) {
      console.error('Error fetching compliance by category:', error);
      return { data: null, error: error.message };
    }
  }
}
