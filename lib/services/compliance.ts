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

      // Calcular días transcurridos para rango explícito
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      let effectiveEnd = end < endOfDay ? end : endOfDay;

      // Si el inicio es futuro, 0 días transcurridos
      let daysElapsed = 0;
      if (start <= endOfDay) {
        const diffTimeElapsed = Math.abs(effectiveEnd.getTime() - start.getTime());
        daysElapsed = Math.ceil(diffTimeElapsed / (1000 * 60 * 60 * 24));
      }

      // Formatear fechas sin timezone para evitar problemas de conversión
      const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };

      return {
        start: formatDate(start),
        end: formatDate(end),
        daysInMonth,
        daysElapsed: Math.max(0, daysElapsed)
      };
    }

    // Fallback a lógica mensual si no hay rango explícito
    const now = new Date();
    const [y, m] = filters?.month ? filters.month.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
    const start = new Date(y!, (m! - 1), 1);
    const end = new Date(y!, (m! - 1) + 1, 0);

    // Calcular días transcurridos (para el cálculo de tasa de cumplimiento)
    // El "meta" debe ser hasta el día actual si estamos en el mes en curso
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Si el rango termina antes de hoy, usamos todo el rango (mes pasado)
    // Si el rango termina después de hoy (mes actual o futuro), cortamos en hoy
    let effectiveEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
    if (effectiveEnd > endOfDay) {
      effectiveEnd = endOfDay;
    }

    // Helper para formatear sin timezone
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    };

    // Si el inicio es futuro, 0 días transcurridos
    if (start > endOfDay) {
      return {
        start: formatDate(start),
        end: formatDate(new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59)),
        daysInMonth: end.getDate(),
        daysElapsed: 0
      };
    }

    const diffTimeElapsed = Math.abs(effectiveEnd.getTime() - start.getTime());
    // +1 porque si estamos en el día 1, ha pasado 1 día (el día 1)
    const daysElapsed = Math.ceil(diffTimeElapsed / (1000 * 60 * 60 * 24));

    return {
      start: formatDate(start),
      end: formatDate(new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59)),
      daysInMonth: end.getDate(),
      daysElapsed: Math.max(0, daysElapsed) // Asegurar no negativo
    };
  }

  /**
   * Obtiene estadísticas generales
   */
  static async getOverallStats(filters?: { station?: string; stations?: string[]; startDate?: string; endDate?: string; month?: string }) {
    try {
      const { start, end } = ComplianceService.getDateRange(filters);
      // Base query por rango de fecha y estado completado
      const baseInspections = supabase
        .from('inspections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('inspection_date', start)
        .lte('inspection_date', end);

      // Total de inspecciones completadas (aplicando filtro de estación si corresponde)
      let totalQuery = baseInspections;
      if (filters?.stations && filters.stations.length > 0) {
        totalQuery = totalQuery.in('station', filters.stations);
      } else if (filters?.station) {
        totalQuery = totalQuery.eq('station', filters.station);
      }

      const { count: totalInspections, error: totalError } = await totalQuery;

      if (totalError) throw totalError;

      // Inspecciones completadas en el rango (mismo valor que totalInspections en este contexto de rango)
      const completedThisMonth = totalInspections;

      // Total de equipos inspeccionados
      const baseIdsQuery = supabase
        .from('inspections')
        .select('id')
        .eq('status', 'completed')
        .gte('inspection_date', start)
        .lte('inspection_date', end);

      let idsQuery = baseIdsQuery;
      if (filters?.stations && filters.stations.length > 0) {
        idsQuery = idsQuery.in('station', filters.stations);
      } else if (filters?.station) {
        idsQuery = idsQuery.eq('station', filters.station);
      }

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
  static async getMonthlyTrends(filters?: { station?: string; stations?: string[]; startDate?: string; endDate?: string; month?: string }) {
    try {
      const { start, end, daysInMonth } = ComplianceService.getDateRange(filters);
      const base = supabase
        .from('inspections')
        .select('inspection_date')
        .eq('status', 'completed')
        .gte('inspection_date', start)
        .lte('inspection_date', end)
        .order('inspection_date', { ascending: true });

      let query = base;
      if (filters?.stations && filters.stations.length > 0) {
        query = query.in('station', filters.stations);
      } else if (filters?.station) {
        query = query.eq('station', filters.station);
      }

      const { data: inspections, error } = await query;

      if (error) throw error;

      // Si el rango es mayor a 2 meses, agrupar por mes. Si no, por día.
      const isLongRange = daysInMonth > 62;
      const trendData: Record<string, number> = {};
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

      inspections?.forEach((inspection: { inspection_date: string }) => {
        const date = new Date(inspection.inspection_date);
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
  static async getComplianceBreakdown(filters?: { station?: string; stations?: string[]; startDate?: string; endDate?: string; month?: string }) {
    try {
      const { start, end } = ComplianceService.getDateRange(filters);

      // Primero obtener IDs de inspecciones en el rango
      const baseIds = supabase
        .from('inspections')
        .select('id')
        .eq('status', 'completed')
        .gte('inspection_date', start)
        .lte('inspection_date', end);

      let idsQuery = baseIds;
      if (filters?.stations && filters.stations.length > 0) {
        idsQuery = idsQuery.in('station', filters.stations);
      } else if (filters?.station) {
        idsQuery = idsQuery.eq('station', filters.station);
      }

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
  static async getTopIssues(limit: number = 10, filters?: { station?: string; stations?: string[]; startDate?: string; endDate?: string; month?: string }) {
    try {
      const { start, end } = ComplianceService.getDateRange(filters);

      const baseIds = supabase
        .from('inspections')
        .select('id')
        .eq('status', 'completed')
        .gte('inspection_date', start)
        .lte('inspection_date', end);

      let idsQuery = baseIds;
      if (filters?.stations && filters.stations.length > 0) {
        idsQuery = idsQuery.in('station', filters.stations);
      } else if (filters?.station) {
        idsQuery = idsQuery.eq('station', filters.station);
      }

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
   * Incluye métricas de puntualidad y cobertura
   */
  static async getStationComplianceStatus(filters?: { startDate?: string; endDate?: string; month?: string; stations?: string[] }) {
    try {
      let stationsQuery = supabase
        .from('stations')
        .select('code, name')
        .eq('is_active', true);

      if (filters?.stations && filters.stations.length > 0) {
        stationsQuery = stationsQuery.in('code', filters.stations);
      }

      const { data: stations, error: stationsError } = await stationsQuery;

      if (stationsError) throw stationsError;

      const { start, end, daysElapsed } = ComplianceService.getDateRange(filters);

      // Fetch inspections with created_at for punctuality check
      const { data: inspections, error: inspectionsError } = await supabase
        .from('inspections')
        .select(`
          id,
          station,
          inspection_date,
          created_at,
          status
        `)
        .in('status', ['completed', 'pending'])
        .gte('inspection_date', start)
        .lte('inspection_date', end);

      if (inspectionsError) throw inspectionsError;

      // Fetch equipment count for completed inspections
      const completedIds = inspections?.filter((i: any) => i.status === 'completed').map((i: any) => i.id) || [];
      let equipmentByInspection: Record<string, number> = {};

      if (completedIds.length > 0) {
        const { data: equipmentData, error: equipmentError } = await supabase
          .from('equipment')
          .select('inspection_id')
          .in('inspection_id', completedIds);

        if (equipmentError) throw equipmentError;

        // Count equipment per inspection
        equipmentData?.forEach((eq: any) => {
          equipmentByInspection[eq.inspection_id] = (equipmentByInspection[eq.inspection_id] || 0) + 1;
        });
      }

      // Map: StationCode -> Stats
      const stationMap: Record<string, {
        count: number;
        pendingCount: number;
        daysWithInspection: number;
        complianceRate: number;
        punctualityRate: number;
        coverageRate: number;
        equipmentCount: number;
        status: 'on_track' | 'behind' | 'no_inspections'
      }> = {};

      stations?.forEach((station: { code: string; name: string }) => {
        const stationInspections = inspections?.filter((i: any) => i.station === station.code) || [];
        const completedInspections = stationInspections.filter((i: any) => i.status === 'completed');
        const pendingInspections = stationInspections.filter((i: any) => i.status === 'pending');

        const uniqueDays = new Set<string>();
        let onTimeCount = 0;
        let totalEquipment = 0;

        completedInspections.forEach((i: any) => {
          const d = new Date(i.inspection_date);
          const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
          uniqueDays.add(dayKey);

          // Punctuality Check - Considerar puntual si se registra el mismo día o dentro de 2 días
          if (i.created_at && i.inspection_date) {
            const created = new Date(i.created_at);
            const inspectionDate = new Date(i.inspection_date);

            // Normalizar a medianoche para comparar solo fechas
            const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());
            const inspectionDay = new Date(inspectionDate.getFullYear(), inspectionDate.getMonth(), inspectionDate.getDate());

            // Calcular diferencia en días
            const diffTime = createdDay.getTime() - inspectionDay.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            // Considerar puntual si se creó el mismo día o hasta 2 días después
            if (diffDays >= 0 && diffDays <= 2) {
              onTimeCount++;
            }
          }

          // Equipment Count
          const eqCount = equipmentByInspection[i.id] || 0;
          totalEquipment += eqCount;
        });

        const daysWithInspection = uniqueDays.size;
        const complianceRate = daysElapsed > 0 ? Math.min(100, Math.round((daysWithInspection / daysElapsed) * 100)) : 0;

        const punctualityRate = completedInspections.length > 0
          ? Math.round((onTimeCount / completedInspections.length) * 100)
          : 0;

        // Coverage Rate: 100% if totalEquipment > 0
        const coverageRate = totalEquipment > 0 ? 100 : 0;

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
          punctualityRate,
          coverageRate,
          equipmentCount: totalEquipment,
          status,
        };
      });

      const stationStats = stations?.map((station: { code: string; name: string }) => ({
        code: station.code,
        name: station.name,
        ...stationMap[station.code],
      })) || [];

      // Sort by Compliance Rate desc, then Punctuality desc
      stationStats.sort((a: { complianceRate: number; punctualityRate: number }, b: { complianceRate: number; punctualityRate: number }) => {
        if (b.complianceRate !== a.complianceRate) return b.complianceRate - a.complianceRate;
        return b.punctualityRate - a.punctualityRate;
      });

      return { data: stationStats, error: null };
    } catch (error: any) {
      console.error('Error fetching station compliance status:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Cumplimiento diario acumulativo en el rango seleccionado
   */
  static async getDailyCompliance(filters?: { station?: string; stations?: string[]; startDate?: string; endDate?: string; month?: string; aggregateAll?: boolean }) {
    try {
      const { start, end, daysInMonth, daysElapsed } = ComplianceService.getDateRange(filters);
      const base = supabase
        .from('inspections')
        .select('inspection_date, station, status')
        .eq('status', 'completed')
        .gte('inspection_date', start)
        .lte('inspection_date', end);

      let query = base;
      if (filters?.stations && filters.stations.length > 0 && !filters.aggregateAll) {
        query = query.in('station', filters.stations);
      } else if (filters?.station && !filters.aggregateAll) {
        query = query.eq('station', filters.station);
      }

      const { data, error } = await query;
      if (error) throw error;

      const seenDays: Set<string> = new Set();
      data?.forEach((i: { inspection_date: string }) => {
        const d = new Date(i.inspection_date);
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
      // Usar daysElapsed para el cálculo de tasa
      const rate = daysElapsed > 0 ? Math.min(100, Math.round((daysWithInspection / daysElapsed) * 100)) : 0;

      return {
        data: {
          daysWithInspection,
          daysInMonth,
          daysElapsed,
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

  /**
   * Obtiene el estado diario de cumplimiento por estación (Heatmap data)
   */
  static async getStationDailyStatus(filters?: { startDate?: string; endDate?: string; month?: string; stations?: string[] }) {
    try {
      let stationsQuery = supabase
        .from('stations')
        .select('code, name')
        .eq('is_active', true)
        .order('name');

      if (filters?.stations && filters.stations.length > 0) {
        stationsQuery = stationsQuery.in('code', filters.stations);
      }

      const { data: stations, error: stationsError } = await stationsQuery;

      if (stationsError) throw stationsError;

      const { start, end, daysInMonth } = ComplianceService.getDateRange(filters);

      // Fetch all completed inspections in range
      const { data: inspections, error: inspectionsError } = await supabase
        .from('inspections')
        .select('station, inspection_date')
        .eq('status', 'completed')
        .gte('inspection_date', start)
        .lte('inspection_date', end);

      if (inspectionsError) throw inspectionsError;

      const startDateObj = new Date(start);
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      // Map: StationCode -> { DateString -> Status }
      const stationStatus: Record<string, { name: string; days: Record<string, 'completed' | 'missing' | 'future' | 'no_obligation'> }> = {};

      // Initialize all stations
      stations?.forEach((station: { code: string; name: string }) => {
        stationStatus[station.code] = {
          name: station.name,
          days: {}
        };
      });

      // Populate inspections
      inspections?.forEach((i: { station: string; inspection_date: string }) => {
        if (stationStatus[i.station]) {
          // Parse date as local to avoid timezone issues
          let key: string;
          if (i.inspection_date.includes('T')) {
            // If it's ISO format, extract just the date part
            key = i.inspection_date.split('T')[0];
          } else {
            // If it's already YYYY-MM-DD, use as is
            key = i.inspection_date;
          }
          stationStatus[i.station].days[key] = 'completed';
        }
      });

      // Fill gaps
      const result = Object.entries(stationStatus).map(([code, data]) => {
        const days = [];
        for (let i = 0; i < daysInMonth; i++) {
          const currentDate = new Date(startDateObj);
          currentDate.setDate(startDateObj.getDate() + i);

          const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

          let status = data.days[key];

          if (!status) {
            // If no inspection, check if it's future or past
            const currentEndOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59);

            if (currentEndOfDay > endOfDay) {
              status = 'future';
            } else {
              status = 'missing';
            }
          }

          days.push({
            date: key,
            day: i + 1,
            status
          });
        }

        return {
          code,
          name: data.name,
          days
        };
      });

      return { data: result, error: null };
    } catch (error: any) {
      console.error('Error fetching station daily status:', error);
      return { data: null, error: error.message };
    }
  }
  /**
   * Obtiene estadísticas de Cumplimiento de Charlas de Seguridad
   * - Ejecución: Realizadas vs Programadas
   * - Puntualidad: Realizadas a tiempo vs Total Realizadas
   */
  static async getSafetyTalkStats(filters?: { startDate?: string; endDate?: string; month?: string; stations?: string[]; station?: string }) {
    try {
      const { start, end } = ComplianceService.getDateRange(filters);

      // 1. Obtener Programaciones (Scheduled) en el rango
      let scheduleQuery = supabase
        .from('talk_schedules')
        .select(`
          id, 
          scheduled_date, 
          station_code, 
          is_completed,
          bulletin:bulletins(title)
        `, { count: 'exact', head: false })
        .gte('scheduled_date', start)
        .lte('scheduled_date', end);

      // Filtro de estación para SCHEDULES (Nota: station_code pude ser null si es Global)
      // Si el filtro de estaciones está activo, debemos incluir las globales O las específicas
      if (filters?.stations && filters.stations.length > 0) {
        // Lógica compleja para OR (station_code is NULL OR station_code in filters)
        // Por simplicidad, asumimos que si hay filtro, queremos ver lo específico de esas estaciones + globales
        // Supabase OR syntax: .or(`station_code.in.(${filters.stations.join(',')}),station_code.is.null`)
        // Pero para "Cumplimiento" estricto de una estación, la global cuenta.
        scheduleQuery = scheduleQuery.or(`station_code.in.(${filters.stations.map(s => `"${s}"`).join(',')}),station_code.is.null`);
      } else if (filters?.station) {
        scheduleQuery = scheduleQuery.or(`station_code.eq."${filters.station}",station_code.is.null`);
      }

      const { data: schedules, error: scheduleError } = await scheduleQuery;
      if (scheduleError) throw scheduleError;

      // 2. Obtener Ejecuciones (Executions) en el rango
      let executionQuery = supabase
        .from('talk_executions')
        .select('id, executed_at, created_at, station_code, schedule_id')
        .gte('executed_at', start)
        .lte('executed_at', end);

      if (filters?.stations && filters.stations.length > 0) {
        executionQuery = executionQuery.in('station_code', filters.stations);
      } else if (filters?.station) { // Fallback legacy
        executionQuery = executionQuery.eq('station_code', filters.station);
      }

      const { data: executions, error: executionError } = await executionQuery;
      if (executionError) throw executionError;

      // --- CÁLCULOS ---

      // A) EJECUCIÓN
      // Total Programado: Todas las schedules en el rango.
      // Total Ejecutado: Executions en el rango.
      // Nota: Una ejecución puede no tener schedule (ad-hoc).
      // 0. Determinar el "Universo" de estaciones aplicables para expandir las Globales
      let applicableStationsCount = 0;
      if (filters?.stations && filters.stations.length > 0) {
        applicableStationsCount = filters.stations.length;
      } else if (filters?.station) {
        applicableStationsCount = 1;
      } else {
        // Si no hay filtro, obtenemos el total de estaciones activas
        const { count, error: countError } = await supabase
          .from('stations')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);
        if (!countError) {
          applicableStationsCount = count || 0;
        }
      }

      // --- CÁLCULOS ---

      // A) EJECUCIÓN
      // Total Programado: Expandir globales según el número de estaciones aplicables

      // Total Programado: Expandir globales según el número de estaciones aplicables
      let calculatedTotalScheduled = 0;
      schedules?.forEach((sch: any) => {
        if (sch.station_code) {
          // Programación específica: cuenta como 1
          calculatedTotalScheduled += 1;
        } else {
          // Programación global: cuenta como N (todas las estaciones del alcance actual)
          calculatedTotalScheduled += applicableStationsCount;
        }
      });
      // ... 
      // D) LISTA DE PENDIENTES
      const pendingList: Array<{ date: string; title: string; type: 'global' | 'specific'; missingCount: number }> = [];

      // Mapa para contar ejecuciones por Schedule ID
      const executionsBySchedule: Record<string, number> = {};
      executions?.forEach((ex: any) => {
        if (ex.schedule_id) {
          executionsBySchedule[ex.schedule_id] = (executionsBySchedule[ex.schedule_id] || 0) + 1;
        }
      });

      schedules?.forEach((sch: any) => {
        const executionsCount = executionsBySchedule[sch.id] || 0;
        let requiredCount = 0;
        // ...
        // Calcular Rates finales
        const result = Object.values(statsMap).map((s: any) => {
          const execRate = s.scheduled > 0
          // ...
          schedules?.forEach((sch: any) => {
            // Si tiene station_code, asignar a esa. Si es null (Global), asignar a TODAS las activas.
            // ...
            // Procesar Executions (Ejecución y Puntualidad)
            executions?.forEach((exc: any) => {
              if (statsMap[exc.station_code]) {
                calculatedTotalScheduled += 1;
              } else {
                // Programación global: cuenta como N (todas las estaciones del alcance actual)
                calculatedTotalScheduled += applicableStationsCount;
              }
            });

            const totalScheduled = calculatedTotalScheduled;
            const totalExecuted = executions?.length || 0;

            const executionRate = totalScheduled > 0
              ? Math.min(100, Math.round((totalExecuted / totalScheduled) * 100))
              : (totalExecuted > 0 ? 100 : 0); // Si no hubo programado pero sí ejecutado, 100%.

            // B) PUNTUALIDAD
            // El usuario prefiere que la puntualidad refleje el cumplimiento GLOBAL.
            // Es decir: % de PUNTUALES respecto al TOTAL PROGRAMADO.
            // Si hay 10 programadas y solo 1 se hace (puntual), la puntualidad es 10% (no 100%).

            let onTimeCount = 0;
            let lateCount = 0;

            executions?.forEach((ex: any) => {
              if (!ex.created_at || !ex.executed_at) return;

              const executedDate = new Date(ex.executed_at);
              const createdDate = new Date(ex.created_at);
              const execDay = new Date(executedDate.getFullYear(), executedDate.getMonth(), executedDate.getDate());
              const createDay = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());

              const diffValid = createDay.getTime() - execDay.getTime();
              const diffDays = Math.floor(diffValid / (1000 * 60 * 60 * 24));

              if (diffDays <= 1) {
                onTimeCount++;
              } else {
                lateCount++;
              }
            });

            const punctualityRate = totalScheduled > 0
              ? Math.round((onTimeCount / totalScheduled) * 100)
              : (totalExecuted > 0 && onTimeCount > 0 ? 100 : 0); // Fallback si no hubo programado pero sí puntual

            // C) REGULARIZACIÓN
            // Ahora también respecto al TOTAL PROGRAMADO para que sumen lógico (Puntual + Tarde = Ejecutado)
            const regularizationRate = totalScheduled > 0
              ? Math.round((lateCount / totalScheduled) * 100)
              : (totalExecuted > 0 && lateCount > 0 ? 100 : 0);

            // D) LISTA DE PENDIENTES
            const pendingList: Array<{ date: string; title: string; type: 'global' | 'specific'; missingCount: number }> = [];

            // Mapa para contar ejecuciones por Schedule ID
            const executionsBySchedule: Record<string, number> = {};
            executions?.forEach((ex: any) => {
              if (ex.schedule_id) {
                executionsBySchedule[ex.schedule_id] = (executionsBySchedule[ex.schedule_id] || 0) + 1;
              }
            });

            schedules?.forEach((sch: any) => {
              const executionsCount = executionsBySchedule[sch.id] || 0;
              let requiredCount = 0;
              let type: 'global' | 'specific' = 'specific';

              if (sch.station_code) {
                requiredCount = 1;
                type = 'specific';
              } else {
                requiredCount = applicableStationsCount;
                type = 'global';
              }

              const missing = requiredCount - executionsCount;
              if (missing > 0) {
                pendingList.push({
                  date: sch.scheduled_date,
                  title: sch.bulletin?.title || 'Charla Programada',
                  type,
                  missingCount: missing
                });
              }
            });

            // Ordenar pendientes por fecha (más reciente primero)
            pendingList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return {
              data: {
                execution: {
                  totalScheduled,
                  totalExecuted,
                  rate: executionRate
                },
                punctuality: {
                  totalExecuted,
                  onTime: onTimeCount,
                  rate: punctualityRate,
                  regularizationRate
                },
                pending: pendingList
              },
              error: null
            };

          } catch (error: any) {
            console.error('Error fetching safety talk stats:', error);
            return { data: null, error: error.message };
          }
        }
  /**
   * Obtiene ranking de cumplimiento de charlas por estación
   */
  static async getSafetyTalkStationStatus(filters ?: { startDate?: string; endDate?: string; month?: string; stations?: string[] }) {
          try {
            const { start, end } = ComplianceService.getDateRange(filters);

            // 1. Obtener todas las estaciones activas
            let stationsQuery = supabase
              .from('stations')
              .select('code, name')
              .eq('is_active', true);

            if(filters?.stations && filters.stations.length > 0) {
              stationsQuery = stationsQuery.in('code', filters.stations);
      }

      const { data: stations, error: stationsError } = await stationsQuery;
      if (stationsError) throw stationsError;

      // 2. Fetch Schedules
      const { data: schedules, error: scheduleError } = await supabase
        .from('talk_schedules')
        .select('id, station_code, is_completed')
        .gte('scheduled_date', start)
        .lte('scheduled_date', end);

      if (scheduleError) throw scheduleError;

      // 3. Fetch Executions
      const { data: executions, error: executionError } = await supabase
        .from('talk_executions')
        .select('id, station_code, executed_at, created_at')
        .gte('executed_at', start)
        .lte('executed_at', end);

      if (executionError) throw executionError;

      // 4. Calcular stats por estación
      const statsMap: Record<string, any> = {};

      stations?.forEach(s => {
        statsMap[s.code] = {
          name: s.name,
          code: s.code,
          scheduled: 0,
          executed: 0,
          onTime: 0,
          executionRate: 0,
          punctualityRate: 0,
          status: 'pending' // pending | good | warning | critical
        };
      });

      // Procesar Schedules (Ejecución)
      schedules?.forEach(sch => {
        // Si tiene station_code, asignar a esa. Si es null (Global), asignar a TODAS las activas.
        if (sch.station_code && statsMap[sch.station_code]) {
          statsMap[sch.station_code].scheduled++;
        } else if (!sch.station_code) {
          // Charlas globales cuentan para todas
          Object.keys(statsMap).forEach(code => {
            statsMap[code].scheduled++;
          });
        }
      });

      // Procesar Executions (Ejecución y Puntualidad)
      executions?.forEach(exc => {
        if (statsMap[exc.station_code]) {
          statsMap[exc.station_code].executed++;

          // Puntualidad Check
          if (exc.executed_at && exc.created_at) {
            const execDate = new Date(exc.executed_at).setHours(0, 0, 0, 0);
            const createDate = new Date(exc.created_at).setHours(0, 0, 0, 0);
            const diffDays = (createDate - execDate) / (1000 * 60 * 60 * 24);

            if (diffDays <= 1) { // Tolerancia 1 día
              statsMap[exc.station_code].onTime++;
            }
          }
        }
      });

      // Calcular Rates finales
      const result = Object.values(statsMap).map((s: any) => {
        const execRate = s.scheduled > 0
          ? Math.round((s.executed / s.scheduled) * 100)
          : (s.executed > 0 ? 100 : 0);

        // Alineado con el KPI Global: Puntualidad sobre Total Programado
        const punctRate = s.scheduled > 0
          ? Math.round((s.onTime / s.scheduled) * 100)
          : (s.executed > 0 && s.onTime > 0 ? 100 : 0);

        return {
          ...s,
          executionRate: Math.min(100, execRate),
          punctualityRate: punctRate
        };
      });

      // Ordenar: Prioridad a los que tienen problemas (Menor Ejecución, luego Menor Puntualidad)
      result.sort((a, b) => {
        if (a.executionRate !== b.executionRate) return a.executionRate - b.executionRate;
        return a.punctualityRate - b.punctualityRate;
      });

      return { data: result, error: null };

    } catch (error: any) {
      console.error('Error in getSafetyTalkStationStatus:', error);
      return { data: null, error: error.message };
    }
  }
}
