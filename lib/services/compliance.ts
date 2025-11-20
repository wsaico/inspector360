/**
 * Servicio de Cumplimiento
 * Gestiona estadísticas y métricas de cumplimiento
 */

import { supabase } from '@/lib/supabase/client';
import { ChecklistItem } from '@/types';
import { getChecklistItem } from '@/lib/checklist-template';

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
   * Helper para obtener rango de fechas.
   * Si se pasan fechas, las usa. Si no, usa el mes actual.
   */
  static getDateRange(filters?: { startDate?: string; endDate?: string; month?: string }) {
    if (filters?.startDate && filters?.endDate) {
      // Parsear fechas explícitamente como locales para evitar problemas de timezone
      const [sy, sm, sd] = filters.startDate.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd); // 00:00:00 Local

      const [ey, em, ed] = filters.endDate.split('-').map(Number);
      const end = new Date(ey, em - 1, ed);
      end.setHours(23, 59, 59, 999); // 23:59:59.999 Local

      // Calcular días en el rango
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const daysInMonth = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        start: start.toISOString(),
        end: end.toISOString(),
        daysInMonth
      };
    }

    // Fallback a lógica mensual si no hay rango explícito
    const now = new Date();
    const [y, m] = filters?.month ? filters.month.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
    const start = new Date(y!, (m! - 1), 1);
    const end = new Date(y!, (m! - 1) + 1, 0);
    return {
      start: start.toISOString(),
      end: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59).toISOString(),
      daysInMonth: end.getDate()
    };
  }

  /**
   * Obtiene estadísticas generales
   */
  static async getOverallStats(filters?: { station?: string; startDate?: string; endDate?: string; month?: string }) {
    try {
      const { start, end } = ComplianceService.getDateRange(filters);
      // Base query por rango de fecha y estado completado
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

      // Inspecciones completadas en el rango (mismo valor que totalInspections en este contexto de rango)
      const completedThisMonth = totalInspections;

      // Total de equipos inspeccionados
      const baseIdsQuery = supabase
        .from('inspections')
        .select('id')
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end);
      const idsQuery = filters?.station ? baseIdsQuery.eq('station', filters.station) : baseIdsQuery;
      const { data: inspectionsForRange, error: idsError } = await idsQuery;
      if (idsError) throw idsError;

      const ids = (inspectionsForRange || [])
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
      }

      // Calcular tasa de cumplimiento (items conformes vs totales)
      // Nota: Esto podría ser costoso si el rango es muy amplio, optimizar si es necesario
      const eqDataQuery = supabase
        .from('equipment')
        .select('checklist_data')
        .in('inspection_id', ids); // Solo equipos de las inspecciones filtradas

      const { data: allEquipment, error: equipmentDataError } = await eqDataQuery;

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
   * Obtiene tendencias (agrupadas por mes si el rango es amplio, o por día si es corto)
   * Por simplicidad para el evolutivo, si es rango corto (< 60 días) devolvemos por día.
   */
  static async getMonthlyTrends(filters?: { station?: string; startDate?: string; endDate?: string; month?: string }) {
    try {
      const { start, end, daysInMonth } = ComplianceService.getDateRange(filters);
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

      // Si el rango es mayor a 2 meses, agrupar por mes. Si no, por día.
      const isLongRange = daysInMonth > 62;
      const trendData: Record<string, number> = {};
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

      inspections?.forEach((inspection: { created_at: string }) => {
        const date = new Date(inspection.created_at);
        let key;
        if (isLongRange) {
          key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        } else {
          // DD/MM
          key = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        trendData[key] = (trendData[key] || 0) + 1;
      });

      const chartData = Object.entries(trendData).map(([label, inspections]) => ({
        month: label, // Mantenemos la key 'month' para compatibilidad con el gráfico existente, aunque sea día
        inspections,
      }));

      return { data: chartData, error: null };
    } catch (error: any) {
      console.error('Error fetching trends:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Obtiene desglose de cumplimiento (Pie Chart)
   * Debe filtrar por las inspecciones del rango seleccionado
   */
  static async getComplianceBreakdown(filters?: { station?: string; startDate?: string; endDate?: string; month?: string }) {
    try {
      const { start, end } = ComplianceService.getDateRange(filters);

      // Primero obtener IDs de inspecciones en el rango
      const baseIds = supabase
        .from('inspections')
        .select('id')
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end);
      const idsQuery = filters?.station ? baseIds.eq('station', filters.station) : baseIds;
      const { data: inspections, error: idsError } = await idsQuery;

      if (idsError) throw idsError;

      const ids = (inspections || []).map((i: any) => i.id);

      if (ids.length === 0) {
        return {
          data: [
            { name: 'Conforme', value: 0 },
            { name: 'No Conforme', value: 0 },
            { name: 'No Aplica', value: 0 },
          ], error: null
        };
      }

      const { data: allEquipment, error } = await supabase
        .from('equipment')
        .select('checklist_data')
        .in('inspection_id', ids);

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
   * Obtiene top de no conformidades por ítem en el rango
   */
  static async getTopIssues(limit: number = 10, filters?: { station?: string; startDate?: string; endDate?: string; month?: string }) {
    try {
      const { start, end } = ComplianceService.getDateRange(filters);

      const baseIds = supabase
        .from('inspections')
        .select('id')
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end);
      const idsQuery = filters?.station ? baseIds.eq('station', filters.station) : baseIds;
      const { data: inspections, error: idsError } = await idsQuery;

      if (idsError) throw idsError;
      const ids = (inspections || []).map((i: any) => i.id);

      if (ids.length === 0) return { data: [], error: null };

      const { data: allEquipment, error } = await supabase
        .from('equipment')
        .select('checklist_data')
        .in('inspection_id', ids);

      if (error) throw error;

      const issueCount: Record<string, { code: string; description: string; count: number }> = {};

      allEquipment?.forEach((eq: EquipmentChecklistRow) => {
        const checklist = eq.checklist_data as Record<string, ChecklistItem>;
        if (checklist) {
          Object.entries(checklist).forEach(([code, item]) => {
            if (item.status === 'no_conforme') {
              if (!issueCount[code]) {
                // Intentar obtener descripción del item si existe, o buscarla en el template, o usar el código como fallback
                const templateItem = getChecklistItem(code);
                const description = item.description || templateItem?.description || code;
                issueCount[code] = { code, description, count: 0 };
              }
              issueCount[code].count++;
            }
          });
        }
      });

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
   * Obtiene cumplimiento por estación para el rango actual
   */
  static async getStationComplianceStatus(filters?: { startDate?: string; endDate?: string; month?: string }) {
    try {
      const { data: stations, error: stationsError } = await supabase
        .from('stations')
        .select('code, name')
        .eq('is_active', true);

      if (stationsError) throw stationsError;

      const { start, end, daysInMonth } = ComplianceService.getDateRange(filters);

      const { data: inspections, error: inspectionsError } = await supabase
        .from('inspections')
        .select('station, created_at, status')
        .in('status', ['completed', 'pending']) // Fetch both completed and pending
        .gte('created_at', start)
        .lte('created_at', end);

      if (inspectionsError) throw inspectionsError;

      const stationMap: Record<string, { count: number; pendingCount: number; daysWithInspection: number; complianceRate: number; status: 'on_track' | 'behind' | 'no_inspections' }> = {};

      stations?.forEach((station: { code: string; name: string }) => {
        const stationInspections = inspections?.filter((i: { station: string }) => i.station === station.code) || [];
        const completedInspections = stationInspections.filter((i: { status: string }) => i.status === 'completed');
        const pendingInspections = stationInspections.filter((i: { status: string }) => i.status === 'pending');

        const uniqueDays = new Set<string>();
        completedInspections.forEach((i: { created_at: string }) => {
          const d = new Date(i.created_at);
          const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
          uniqueDays.add(dayKey);
        });

        const daysWithInspection = uniqueDays.size;
        const complianceRate = daysInMonth > 0 ? Math.round((daysWithInspection / daysInMonth) * 100) : 0;

        let status: 'on_track' | 'behind' | 'no_inspections';
        if (stationInspections.length === 0) {
          status = 'no_inspections';
        } else if (complianceRate >= 80) {
          status = 'on_track';
        } else {
          status = 'behind';
        }

        stationMap[station.code] = {
          count: completedInspections.length,
          pendingCount: pendingInspections.length,
          daysWithInspection,
          complianceRate,
          status,
        };
      });

      const stationStats = stations?.map((station: { code: string; name: string }) => ({
        code: station.code,
        name: station.name,
        ...stationMap[station.code],
      })) || [];

      return { data: stationStats, error: null };
    } catch (error: any) {
      console.error('Error fetching station compliance status:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Cumplimiento diario acumulativo en el rango seleccionado
   */
  static async getDailyCompliance(filters?: { station?: string; startDate?: string; endDate?: string; month?: string; aggregateAll?: boolean }) {
    try {
      const { start, end, daysInMonth } = ComplianceService.getDateRange(filters);
      const base = supabase
        .from('inspections')
        .select('created_at, station, status')
        .eq('status', 'completed')
        .gte('created_at', start)
        .lte('created_at', end);
      const query = filters?.station && !filters.aggregateAll ? base.eq('station', filters.station) : base;
      const { data, error } = await query;
      if (error) throw error;

      const seenDays: Set<string> = new Set();
      data?.forEach((i: { created_at: string }) => {
        const d = new Date(i.created_at);
        const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
        if (!seenDays.has(dayKey)) {
          seenDays.add(dayKey);
        }
      });

      const startDateObj = new Date(start);
      let cumulativeCount = 0;

      const breakdown = Array.from({ length: daysInMonth }, (_, idx) => {
        // Generar fecha sumando idx días a startDate
        const date = new Date(startDateObj);
        date.setDate(startDateObj.getDate() + idx);

        const key = date.toDateString();
        const has = seenDays.has(key);

        if (has) {
          cumulativeCount++;
        }

        const isFuture = date > new Date();

        return {
          day: `${date.getDate()}/${date.getMonth() + 1}`, // Formato DD/MM para el gráfico
          value: has ? 1 : 0,
          cumulative: isFuture ? null : cumulativeCount,
          target: idx + 1 // Meta ideal acumulativa
        };
      });

      const daysWithInspection = seenDays.size;
      const rate = daysInMonth > 0 ? Math.round((daysWithInspection / daysInMonth) * 100) : 0;

      return {
        data: {
          daysWithInspection,
          daysInMonth,
          rate,
          breakdown
        },
        error: null
      };
    } catch (error: any) {
      console.error('Error fetching daily compliance:', error);
      return { data: null, error: error.message };
    }
  }
}
