import { supabase } from '@/lib/supabase/client';
import {
    TalkSchedule,
    TalkExecution,
    Employee,
    TalkAttendee,
    Bulletin
} from '@/types/safety-talks';

// const supabase = createClientComponentClient(); // REMOVED


export class SafetyTalksService {

    /**
     * Obtiene la charla sugerida para el día actual y la estación del usuario.
     * Prioridad:
     * 1. Charla programada específicamente para esta estación y fecha.
     * 2. Charla programada GLOBAL (station_code = null) para esta fecha.
     * 3. Charlas atrasadas (opcional, por ahora solo del día).
     */
    static async getSuggestedTalk(stationCode: string): Promise<{ data: TalkSchedule | null; error: any }> {
        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Buscar TODAS las charlas candidatas para HOY (Globales o Locales)
            // No filtramos por is_completed aquí porque eso es compartido globalmente.
            const { data: candidates, error } = await supabase
                .from('talk_schedules')
                .select(`
                  *,
                  bulletin:bulletins(*)
                `)
                .eq('scheduled_date', today)
                .or(`station_code.eq.${stationCode},station_code.is.null`)
                .order('is_mandatory', { ascending: false });

            if (error) throw error;
            if (!candidates || candidates.length === 0) return { data: null, error: null };

            // 2. Verificar cuáles ya ejecutó ESTA estación
            // Recuperamos los IDs de schedules que ya tienen ejecución para esta estación
            const candidateIds = candidates.map((c: any) => c.id);
            const { data: executions } = await supabase
                .from('talk_executions')
                .select('schedule_id')
                .in('schedule_id', candidateIds)
                .eq('station_code', stationCode);

            const executedScheduleIds = new Set(executions?.map((e: any) => e.schedule_id) || []);

            // 3. Devolver la primera que NO haya sido ejecutada
            const pendingTalk = candidates.find((c: any) => !executedScheduleIds.has(c.id));

            return { data: pendingTalk || null, error: null };
        } catch (error: any) {
            console.error('[SafetyTalks] Error fetching suggested talk:', error);
            return { data: null, error: error.message };
        }
    }

    /**
     * Obtiene la lista de empleados ACTIVOS de una estación para tomar asistencia.
     * @deprecated Use listEmployees instead for management
     */
    static async getStationEmployees(stationCode: string): Promise<{ data: Employee[]; error: any }> {
        return this.listEmployees({ station: stationCode, activeOnly: true, pageSize: 1000 }).then(res => ({
            data: res.data || [],
            error: res.error
        }));
    }

    /**
     * Lista empleados con filtros y paginación para gestión (Admin)
     */
    static async listEmployees(params?: {
        station?: string;
        search?: string;
        page?: number;
        pageSize?: number;
        activeOnly?: boolean;
    }) {
        try {
            const page = params?.page || 1;
            const pageSize = params?.pageSize || 50;
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from('employees')
                .select('*', { count: 'exact' });

            if (params?.station) {
                query = query.eq('station_code', params.station);
            }

            if (params?.activeOnly) {
                query = query.eq('is_active', true);
            }

            if (params?.search) {
                query = query.or(`full_name.ilike.%${params.search}%,dni.ilike.%${params.search}%`);
            }

            const { data, error, count } = await query
                .order('full_name')
                .range(from, to);

            if (error) throw error;

            return { data: data as Employee[], error: null, total: count || 0 };
        } catch (error: any) {
            console.error('[SafetyTalks] Error listing employees:', error);
            return { data: [], error: error.message, total: 0 };
        }
    }

    /**
     * Registra la ejecución de una charla con sus asistentes y firmas.
     * Realiza múltiples inserciones (Header + Detalle) en "transacción".
     */
    static async registerExecution(
        executionData: Partial<TalkExecution>,
        attendees: { employee_id: string; signature: string; attended: boolean }[]
    ) {
        try {
            // 1. Insertar Cabecera (Talk Execution)
            const { data: execution, error: executionError } = await supabase
                .from('talk_executions')
                .insert({
                    schedule_id: executionData.schedule_id,
                    station_code: executionData.station_code,
                    executed_at: executionData.executed_at || new Date().toISOString(),
                    start_time: executionData.start_time,
                    end_time: executionData.end_time,
                    scheduled_headcount: executionData.scheduled_headcount || 0,
                    duration_min: executionData.duration_min || 5,
                    presenter_id: executionData.presenter_id,
                    presenter_signature: executionData.presenter_signature,
                    observations: executionData.observations,
                    activity_type: executionData.activity_type || 'charla',
                    bulletin_id: executionData.bulletin_id
                })
                .select()
                .single();

            if (executionError) throw executionError;

            // 2. Insertar Asistentes
            const attendeesToInsert = attendees.map(att => ({
                talk_id: execution.id,
                employee_id: att.employee_id,
                signature: att.signature,
                attended: att.attended
            }));

            const { error: attendeesError } = await supabase
                .from('talk_attendees')
                .insert(attendeesToInsert);

            if (attendeesError) {
                // Nota: En un sistema real idealmente haríamos rollback manual o usaríamos RPC.
                // Por ahora, asumimos éxito y alertamos error parcial.
                console.error('[SafetyTalks] Error registering attendees:', attendeesError);
                throw attendeesError;
            }

            // 3. Marcar Schedule como completado
            // NO TOCAR 'is_completed' en schedules globales si queremos que siga pendiente para otros.
            // La validación ahora es dinámica (paso 2 de getSuggestedTalk).
            // Solo marcamos si es una charla ESPECÍFICA de esta estación (opcional, por ahora lo omitimos para consistencia)
            if (executionData.schedule_id) {
                // Check if it's local? For now, simpler to rely on dynamic check.
                // We leave this empty or remove it.
            }

            return { data: execution, error: null };

        } catch (error: any) {
            console.error('[SafetyTalks] Error executing talk:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                full: error
            });
            return { data: null, error: error.message || 'Unknown error' };
        }
    }

    /**
     * Actualiza un empleado (ej: cambiar estado, cargo, estación)
     */
    static async updateEmployee(dni: string, updates: Partial<Employee>) {
        try {
            const { data, error } = await supabase
                .from('employees')
                .update(updates)
                .eq('dni', dni) // Usamos DNI como identificador estable
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error: any) {
            console.error('[SafetyTalks] Error updating employee:', error);
            return { data: null, error: error.message };
        }
    }

    /**
     * Bulk Upload: Carga masiva de empleados.
     * Usa "Upsert" (Actualiza si existe DNI, Crea si no).
     */
    static async bulkUploadEmployees(employees: Partial<Employee>[]) {
        try {
            // 1. Auto-create missing stations to prevent FK errors
            const uniqueStations = Array.from(new Set(employees.map(e => e.station_code).filter(Boolean))) as string[];

            if (uniqueStations.length > 0) {
                const stationsPayload = uniqueStations.map(code => ({
                    code,
                    name: `Estación ${code}`,
                    is_active: true
                }));

                const { error: stationError } = await supabase
                    .from('stations')
                    .upsert(stationsPayload, { onConflict: 'code', ignoreDuplicates: true });

                if (stationError) {
                    console.error('[SafetyTalks] Error auto-creating stations:', stationError);
                    // We continue anyway, hoping the stations exist or the error was specific to one
                }
            }

            // 2. Upsert Employees
            const { data, error } = await supabase
                .from('employees')
                .upsert(employees, { onConflict: 'dni' }) // Clave es DNI
                .select();

            if (error) throw error;

            return { data, error: null, count: data?.length || 0 };
        } catch (error: any) {
            console.error('[SafetyTalks] Bulk upload error:', JSON.stringify(error, null, 2));
            return { data: null, error: error.message || error.details || 'Error desconocido al cargar empleados' };
        }
    }

    /**
     * Crea un único boletín (útil para creación al vuelo)
     */
    static async createBulletin(bulletin: Partial<Bulletin>) {
        try {
            const { data, error } = await supabase
                .from('bulletins')
                .insert({
                    ...bulletin,
                    is_active: true
                })
                .select()
                .single();

            if (error) throw error;
            return { data: data as Bulletin, error: null };
        } catch (error: any) {
            console.error('[SafetyTalks] Error creating bulletin:', error);
            return { data: null, error: error.message };
        }
    }

    /**
     * Elimina una ejecución de charla (Admin Only).
     * Los asistentes se eliminan en cascada si la FK está configurada, sino hay que hacerlo manual.
     * Asumimos Cascade Delete en DB o lo hacemos explícito.
     */
    static async deleteExecution(executionId: string) {
        try {
            // Eliminar dependencias primero si no hay CASCADE (por seguridad)
            await supabase.from('talk_attendees').delete().eq('talk_id', executionId);

            const { error } = await supabase
                .from('talk_executions')
                .delete()
                .eq('id', executionId);

            if (error) throw error;
            return { error: null };
        } catch (error: any) {
            console.error('[SafetyTalks] Error deleting execution:', error);
            return { error: error.message };
        }
    }

    /**
     * Lista boletines con filtros y paginación
     */
    static async listBulletins(params?: {
        search?: string;
        page?: number;
        pageSize?: number;
        organization?: string;
    }) {
        try {
            const page = params?.page || 1;
            const pageSize = params?.pageSize || 20;
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from('bulletins')
                .select('*', { count: 'exact' });

            if (params?.search) {
                query = query.or(`title.ilike.%${params.search}%,code.ilike.%${params.search}%`);
            }

            if (params?.organization && params.organization !== 'ALL') {
                query = query.eq('organization', params.organization);
            }

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            return { data: data as Bulletin[], error: null, total: count || 0 };
        } catch (error: any) {
            console.error('[SafetyTalks] Error listing bulletins:', error);
            return { data: [], error: error.message, total: 0 };
        }
    }

    /**
     * Bulk Upload: Carga masiva de boletines.
     */
    static async bulkUploadBulletins(bulletins: Partial<Bulletin>[]) {
        try {
            const { data, error } = await supabase
                .from('bulletins')
                .upsert(bulletins, { onConflict: 'code' }) // Clave es code
                .select();

            if (error) throw error;

            return { data, error: null, count: data?.length || 0 };
        } catch (error: any) {
            console.error('[SafetyTalks] Bulk upload bulletins error:', error);
            return { data: null, error: error.message };
        }
    }
}
