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
  const globalScope = !!canViewAllStations || stationStr === 'todas' || stationStr === 'all';
  if (globalScope) return inspections || [];
  // Si el usuario NO puede ver todas y su estación no está definida,
  // no elevamos a alcance global: retornamos vacío para evitar mezclar estaciones.
  if (!stationStr) return [];
  return (inspections || []).filter((i) => i.station === station);
}