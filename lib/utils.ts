import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format as formatDateFns } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Inspection, Observation } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatea fecha de inspección evitando desfase por zona horaria
export function formatInspectionDate(date: Date | string) {
  if (typeof date === 'string') {
    // Si viene como 'YYYY-MM-DD' de Postgres (tipo DATE), no convertir a Date
    const match = date.match(/^\d{4}-\d{2}-\d{2}$/);
    if (match) {
      const [y, m, d] = date.split('-');
      return `${d}/${m}/${y}`; // dd/MM/yyyy sin cambio de zona
    }
    // Si incluye tiempo, usar date-fns
    return formatDateFns(new Date(date), 'dd/MM/yyyy', { locale: es });
  }
  return formatDateFns(date, 'dd/MM/yyyy', { locale: es });
}

// Detecta si hay observaciones con respuesta del operador pero sin respuesta del mecánico
export function hasPendingObservations(inspection?: Inspection) {
  if (!inspection || !inspection.observations || inspection.observations.length === 0) return false;
  return (inspection.observations as Observation[]).some(
    (obs) => (obs.obs_operator && obs.obs_operator.trim().length > 0) && (!obs.obs_maintenance || obs.obs_maintenance.trim().length === 0)
  );
}

// Firmas
export function isSupervisorSigned(inspection?: Inspection) {
  if (!inspection) return false;
  const nameOk = !!inspection.supervisor_name && inspection.supervisor_name.trim().length > 0;
  const sigOk = !!inspection.supervisor_signature_url && inspection.supervisor_signature_url.trim().length > 0;
  return nameOk && sigOk;
}

export function isMechanicSigned(inspection?: Inspection) {
  if (!inspection) return false;
  const nameOk = !!inspection.mechanic_name && inspection.mechanic_name.trim().length > 0;
  const sigOk = !!inspection.mechanic_signature_url && inspection.mechanic_signature_url.trim().length > 0;
  return nameOk && sigOk;
}

export function getMissingSignaturesLabel(inspection?: Inspection): string | null {
  if (!inspection) return null;
  const sup = isSupervisorSigned(inspection);
  const mec = isMechanicSigned(inspection);
  if (sup && mec) return null;
  if (!sup && !mec) return 'Faltan firmas: Supervisor y Mecánico';
  if (!sup) return 'Falta firma: Supervisor';
  if (!mec) return 'Falta firma: Mecánico';
  return null;
}
