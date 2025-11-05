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
   * Parámetros opcionales para filtrar por estación y mes
   */
  static getMonthRange(month?: string) {
    // month formato 'YYYY-MM'. Si no, usar mes actual
    const now = new Date();
    const [y, m] = month ? month.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
    const start = new Date(y!, (m! - 1), 1);
    const end = new Date(y!, (m! - 1) + 1, 0);
    return { start: start.toISOString(), end: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString(), daysInMonth: end.getDate() };
  }
  /**
   * Obtiene estadísticas generales
   */
  static async getOverallStats(filters?: { station?: string; month?: string }) {
    try {
      const { start, end } = ComplianceService.getMonthRange(filters?.month);
      // Base query por rango de mes y estado completado
      const baseInspections = supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end);

      // Total de inspecciones completadas (aplicando filtro de estación si corresponde)
      const totalQuery = filters?.station ? baseInspections.eq('station', filters.station) : baseInspections;
      const { count: totalInspections, error: totalError } = await totalQuery;

      if (totalError) throw totalError;

      // Inspecciones completadas este mes (mismo rango, mismo filtro)
      const monthQuery = filters?.station ? baseInspections.eq('station', filters.station) : baseInspections;
      const { count: completedThisMonth, error: monthError } = await monthQuery;

      if (monthError) throw monthError;

      // Total de equipos inspeccionados (vinculados a inspecciones COMPLETADAS del mes y filtrados por estación)
      // 1) Obtener IDs de inspecciones dentro del rango y estado completado
      const baseIdsQuery = supabase
        .from('inspections')
        .select('id')
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end);
      const idsQuery = filters?.station ? baseIdsQuery.eq('station', filters.station) : baseIdsQuery;
      const { data: inspectionsForMonth, error: idsError } = await idsQuery;
      if (idsError) throw idsError;

      const ids = (inspectionsForMonth || [])
        .map((i: { id?: string | null }) => i?.id || null)
        .filter((v: string | null): v is string => typeof v === 'string' && v.length > 0);

      let equipmentInspected = 0;
      if (ids.length > 0) {
        const { count, error: equipmentError } = await supabase
          .from('equipment')
          .select('*', { count: 'exact', head: true })
          .in('inspection_id', ids);
        if (equipmentError) throw equipmentError;
        equipmentInspected = count || 0;
      } else {
        equipmentInspected = 0;
      }

      // Calcular tasa de cumplimiento
      const eqDataQuery = supabase
        .from('equipment')
        .select('checklist_data');
      const { data: allEquipment, error: equipmentDataError } = await (
        filters?.station ? eqDataQuery.eq('station', filters.station) : eqDataQuery
      );

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
  static async getMonthlyTrends(filters?: { station?: string; month?: string }) {
    try {
      const { start, end } = ComplianceService.getMonthRange(filters?.month);
      const base = supabase
        .from('inspections')
        .select('created_at')
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: true });
      const query = filters?.station ? base.eq('station', filters.station) : base;
      const { data: inspections, error } = await query;

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
  static async getComplianceBreakdown(filters?: { station?: string }) {
    try {
      const base = supabase
        .from('equipment')
        .select('checklist_data');
      const { data: allEquipment, error } = await (filters?.station ? base.eq('station', filters.station) : base);

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
  static async getTopIssues(limit: number = 10, filters?: { station?: string }) {
    try {
      const base = supabase
        .from('equipment')
        .select('checklist_data');
      const { data: allEquipment, error } = await (filters?.station ? base.eq('station', filters.station) : base);

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

  /**
   * Cumplimiento por días del mes: una inspección al día
   * Cuenta máximo una por día. Para SIG/Admin puede agregarse por todas las estaciones.
   */
  static async getDailyCompliance(filters?: { station?: string; month?: string; aggregateAll?: boolean }) {
    try {
      const { start, end, daysInMonth } = ComplianceService.getMonthRange(filters?.month);
      const base = supabase
        .from('inspections')
        .select('created_at, station, status')
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end);
      const query = filters?.station && !filters.aggregateAll ? base.eq('station', filters.station) : base;
      const { data, error } = await query;
      if (error) throw error;

      // Contar máximo 1 inspección COMPLETADA por día, sin duplicar por estación
      const seenDays: Set<string> = new Set();
      data?.forEach((i: { created_at: string }) => {
        const d = new Date(i.created_at);
        const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
        if (!seenDays.has(dayKey)) {
          seenDays.add(dayKey);
        }
      });

      // Construir desglose por día (0/1), para graficar contra la meta 1/día
      const startDate = new Date(start);
      const year = startDate.getFullYear();
      const monthIndex = startDate.getMonth();
      const breakdown = Array.from({ length: daysInMonth }, (_, idx) => {
        const date = new Date(year, monthIndex, idx + 1);
        const key = date.toDateString();
        const has = seenDays.has(key);
        return { day: idx + 1, value: has ? 1 : 0 };
      });

      const daysWithInspection = seenDays.size;
      const rate = daysInMonth > 0 ? Math.round((daysWithInspection / daysInMonth) * 100) : 0;
      return { data: { daysWithInspection, daysInMonth, rate, breakdown }, error: null };
    } catch (error: any) {
      console.error('Error fetching daily compliance:', error);
      return { data: null, error: error.message };
    }
  }
}
