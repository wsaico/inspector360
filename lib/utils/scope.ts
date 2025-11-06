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
  const stationStr = station?.toString?.().trim().toLowerCase();
  const globalScope = !!canViewAllStations || stationStr === 'todas' || stationStr === 'all';

  if (globalScope) return inspections || [];

  // Si el usuario NO puede ver todas y su estación no está definida,
  // no elevamos a alcance global: retornamos vacío para evitar mezclar estaciones.
  if (!stationStr) return [];

  // Case-insensitive comparison con trim para evitar problemas de espacios
  return (inspections || []).filter((i) => {
    const inspectionStation = i.station?.toString?.().trim().toLowerCase();
    return inspectionStation === stationStr;
  });
}