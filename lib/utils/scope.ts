import type { Inspection } from '@/types';

type ScopeOptions = {
  station?: string | null;
  canViewAllStations?: boolean;
};

// Filtra inspecciones por estación, evitando duplicación de lógica en componentes
export function scopeInspectionsByStation(
  inspections: Inspection[],
  { station, canViewAllStations }: ScopeOptions
): Inspection[] {
  const stationStr = station?.toString?.().toLowerCase?.();
  const globalScope = !!canViewAllStations || stationStr === 'todas' || stationStr === 'all' || !stationStr;
  if (globalScope) return inspections || [];
  return (inspections || []).filter((i) => i.station === station);
}