export interface Station {
    code: string;
    name: string;
    address?: string;
    ruc?: string;
    legal_name?: string;
    total_employees?: number;
    is_active?: boolean;
}

export type EmployeeArea = string;

export interface Employee {
    id: string;
    dni: string;
    full_name: string;
    position?: string;
    area: EmployeeArea;
    station_code: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export type AlertLevel = 'ROJA' | 'AMBAR' | 'VERDE';

export interface Bulletin {
    id: string;
    code: string;
    title: string;
    alert_level: AlertLevel;
    organization?: string;
    document_url: string;
    is_active: boolean;
}

export interface TalkSchedule {
    id: string;
    scheduled_date: string;
    bulletin_id: string;
    station_code?: string | null; // Null implies Global
    is_mandatory: boolean;
    is_completed: boolean;
    // Joins
    bulletin?: Bulletin;
}

export interface TalkExecution {
    id: string;
    schedule_id?: string;
    station_code: string;
    executed_at: string;
    start_time?: string; // New: Punch In
    end_time?: string;   // New: Punch Out
    scheduled_headcount?: number; // New: Total active at time of talk
    duration_min?: number;
    presenter_id: string;
    presenter_signature: string; // Base64
    bulletin_id?: string; // New: Direct bulletin link for unscheduled talks
    pdf_url?: string;
    observations?: string;
    activity_type?: string;
    // Joins
    presenter?: Employee;
    schedule?: TalkSchedule;
    bulletin?: Bulletin; // New: Direct join
    attendees?: TalkAttendee[];
}

export interface TalkAttendee {
    id: string;
    talk_id: string;
    employee_id: string;
    signature: string; // Base64
    attended: boolean;
    created_at?: string;
    // Joins
    employee?: Employee;
}
