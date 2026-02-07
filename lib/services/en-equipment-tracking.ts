/**
 * Servicio para rastrear inspecciones de equipos EN
 */

import { supabase } from '@/lib/supabase/client';
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

export interface ENEquipment {
    code: string;
    type: string;
    station: string;
    brand?: string;
    model?: string;
}

export interface DailyInspectionStatus {
    inspected: boolean;
    inspectionId?: string;
    hasObservations?: boolean;
    inspectionDate?: string;
}

export interface ENEquipmentHeatmapData {
    equipment: ENEquipment[];
    dailyInspections: Array<{
        date: string;
        inspections: Record<string, DailyInspectionStatus>;
    }>;
    dateRange: {
        start: string;
        end: string;
    };
}

/**
 * Obtiene datos de inspecciones de equipos EN para el mapa de calor
 */
export async function getENEquipmentInspections(
    stationCodes?: string[],
    startDate?: Date,
    endDate?: Date
): Promise<ENEquipmentHeatmapData> {
    // Validar y usar fechas recibidas, o usar mes actual por defecto
    const isValidDate = (date: any): date is Date => date instanceof Date && !isNaN(date.getTime());

    const start = (startDate && isValidDate(startDate)) ? startDate : startOfMonth(new Date());
    const end = (endDate && isValidDate(endDate)) ? endDate : endOfMonth(new Date());

    try {
        // 1. Obtener todos los equipos activos con "EN" en el código, agrupados por estación
        let equipmentQuery = supabase
            .from('equipment_master')
            .select('code, type, station, brand, model')
            .ilike('code', '%EN%')
            .eq('is_active', true)
            .order('station');

        if (stationCodes && stationCodes.length > 0) {
            equipmentQuery = equipmentQuery.in('station', stationCodes);
        }

        const { data: equipmentData, error: equipmentError } = await equipmentQuery;

        if (equipmentError) {
            console.error('Error fetching EN equipment:', equipmentError);
            throw equipmentError;
        }

        // Agrupar equipos por estación
        const equipmentByStation: Record<string, ENEquipment[]> = {};
        equipmentData?.forEach((eq: any) => {
            if (!equipmentByStation[eq.station]) {
                equipmentByStation[eq.station] = [];
            }
            equipmentByStation[eq.station].push({
                code: eq.code,
                type: eq.type,
                station: eq.station,
                brand: eq.brand,
                model: eq.model,
            });
        });

        // Crear lista de estaciones únicas
        const stations = Object.keys(equipmentByStation).sort();

        const equipment: ENEquipment[] = stations.map(station => ({
            code: station,
            type: `${equipmentByStation[station].length} escaleras`,
            station: station,
        }));

        // 2. Obtener todas las inspecciones del período
        let inspectionsQuery = supabase
            .from('inspections')
            .select(`
        id,
        inspection_date,
        station,
        status,
        equipment (
          code,
          equipment_id
        ),
        observations (
          id,
          equipment_code
        )
      `)
            .gte('inspection_date', format(start, 'yyyy-MM-dd'))
            .lte('inspection_date', format(end, 'yyyy-MM-dd'))
            .eq('status', 'completed');

        if (stationCodes && stationCodes.length > 0) {
            inspectionsQuery = inspectionsQuery.in('station', stationCodes);
        }

        const { data: inspectionsData, error: inspectionsError } = await inspectionsQuery;

        if (inspectionsError) {
            console.error('Error fetching inspections:', inspectionsError);
            throw inspectionsError;
        }

        // 3. Crear mapa de inspecciones por fecha y estación
        const inspectionsByDateAndStation: Record<string, Record<string, { total: number; inspected: number; hasObservations: boolean }>> = {};

        inspectionsData?.forEach((inspection: any) => {
            const dateKey = format(new Date(inspection.inspection_date), 'yyyy-MM-dd');
            const station = inspection.station;

            if (!inspectionsByDateAndStation[dateKey]) {
                inspectionsByDateAndStation[dateKey] = {};
            }

            if (!inspectionsByDateAndStation[dateKey][station]) {
                inspectionsByDateAndStation[dateKey][station] = {
                    total: equipmentByStation[station]?.length || 0,
                    inspected: 0,
                    hasObservations: false,
                };
            }

            // Contar cuántas escaleras EN fueron inspeccionadas
            const enEquipmentInspected = new Set<string>();
            inspection.equipment?.forEach((eq: any) => {
                if (eq.code && eq.code.includes('EN')) {
                    enEquipmentInspected.add(eq.code);
                }
            });

            inspectionsByDateAndStation[dateKey][station].inspected = enEquipmentInspected.size;

            // Verificar si hay observaciones
            const hasObs = inspection.observations?.some(
                (obs: any) => obs.equipment_code && obs.equipment_code.includes('EN')
            ) || false;

            if (hasObs) {
                inspectionsByDateAndStation[dateKey][station].hasObservations = true;
            }
        });

        // 4. Generar array de días con estado de inspección por estación
        const days = eachDayOfInterval({ start, end });
        const dailyInspections = days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const inspections: Record<string, DailyInspectionStatus> = {};

            // Para cada estación, calcular el cumplimiento
            stations.forEach(station => {
                const totalEN = equipmentByStation[station]?.length || 0;
                const inspectedEN = inspectionsByDateAndStation[dateKey]?.[station]?.inspected || 0;
                const hasObs = inspectionsByDateAndStation[dateKey]?.[station]?.hasObservations || false;

                // Considerar "inspeccionado" si se inspeccionó al menos 1 escalera EN
                inspections[station] = {
                    inspected: inspectedEN > 0,
                    hasObservations: hasObs,
                    inspectionDate: dateKey,
                };
            });

            return {
                date: dateKey,
                inspections,
            };
        });

        return {
            equipment,
            dailyInspections,
            dateRange: {
                start: format(start, 'yyyy-MM-dd'),
                end: format(end, 'yyyy-MM-dd'),
            },
        };
    } catch (error) {
        console.error('Error in getENEquipmentInspections:', error);
        throw error;
    }
}

/**
 * Obtiene estadísticas de cumplimiento para equipos EN
 */
export async function getENEquipmentStats(
    stationCodes?: string[],
    startDate?: Date,
    endDate?: Date
) {
    const data = await getENEquipmentInspections(stationCodes, startDate, endDate);

    const totalEquipment = data.equipment.length;
    const totalDays = data.dailyInspections.length;
    const totalPossibleInspections = totalEquipment * totalDays;

    let totalInspected = 0;
    let totalWithObservations = 0;

    data.dailyInspections.forEach(day => {
        Object.values(day.inspections).forEach(status => {
            if (status.inspected) {
                totalInspected++;
                if (status.hasObservations) {
                    totalWithObservations++;
                }
            }
        });
    });

    const complianceRate = totalPossibleInspections > 0
        ? Math.round((totalInspected / totalPossibleInspections) * 100)
        : 0;

    const observationRate = totalInspected > 0
        ? Math.round((totalWithObservations / totalInspected) * 100)
        : 0;

    return {
        totalEquipment,
        totalDays,
        totalPossibleInspections,
        totalInspected,
        totalWithObservations,
        complianceRate,
        observationRate,
    };
}
