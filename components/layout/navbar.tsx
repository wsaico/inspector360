'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, usePermissions } from '@/hooks';
import { InspectionService } from '@/lib/services';
import type { Inspection, Observation } from '@/types';
import { getMissingSignaturesLabel } from '@/lib/utils';
import { scopeInspectionsByStation } from '@/lib/utils/scope';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inspections': 'Inspecciones',
  '/inspections/new': 'Nueva Inspección',
  '/compliance': 'Panel de Cumplimiento',
  '/settings': 'Configuración',
  '/settings/users': 'Gestión de Usuarios',
};

type NavbarProps = {
  onMenuToggle?: () => void;
};

export function Navbar({ onMenuToggle }: NavbarProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Inspector 360°';
  const { profile, user } = useAuth();
  const { canViewAllStations } = usePermissions();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inspections, setInspections] = useState<Inspection[]>([]);

  const loadInspections = useCallback(async () => {
    setLoading(true);
    const { data, error } = await InspectionService.getInspections();
    if (error) {
      setInspections([]);
    } else {
      setInspections(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadInspections();
    })();
    return () => {
      mounted = false;
    };
  }, [loadInspections]);

  // Refrescar al abrir el panel y hacer polling mientras esté abierto
  useEffect(() => {
    let interval: any;
    if (open) {
      loadInspections();
      interval = setInterval(() => {
        loadInspections();
      }, 8000); // cada 8s mientras esté abierto
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [open, loadInspections]);

  // Refrescar en navegación o cambio de estación/permisos
  useEffect(() => {
    loadInspections();
  }, [pathname, profile?.station, canViewAllStations, loadInspections]);

  // Inspecciones dentro del alcance (todas o filtradas por estación del perfil)
  const scopedInspections = useMemo(() => {
    return scopeInspectionsByStation(inspections, {
      station: profile?.station,
      canViewAllStations,
    });
  }, [inspections, profile?.station, canViewAllStations]);

  const pendingByEquipment = useMemo(() => {
    const scoped = scopedInspections;

    const byEq: Record<string, { count: number; latestInspectionId: string | undefined }> = {};
    scoped.forEach((i) => {
      (i.observations || []).forEach((obs: Observation) => {
        // Pendiente si el operador escribió algo y el mecánico aún no
        const operatorHasText = !!obs.obs_operator && obs.obs_operator.trim().length > 0;
        const mechanicMissing = !obs.obs_maintenance || obs.obs_maintenance.trim().length === 0;
        const pending = operatorHasText && mechanicMissing;
        if (!pending) return;
        const key = obs.equipment_code;
        if (!byEq[key]) {
          byEq[key] = { count: 0, latestInspectionId: i.id };
        }
        byEq[key].count += 1;
        byEq[key].latestInspectionId = i.id;
      });
    });
    return byEq;
  }, [scopedInspections]);

  const pendingCount = useMemo(() => Object.keys(pendingByEquipment).length, [pendingByEquipment]);

  // Firmas pendientes por inspección
  const missingSignatures = useMemo(() => {
    return scopedInspections
      .filter((i) => !!getMissingSignaturesLabel(i))
      .map((i) => ({
        id: i.id,
        formCode: i.form_code,
        label: getMissingSignaturesLabel(i) as string,
      }));
  }, [scopedInspections]);

  const missingCount = useMemo(() => missingSignatures.length, [missingSignatures]);
  const bellCount = pendingCount + missingCount;

  return (
    <header className="flex h-14 md:h-16 items-center justify-between border-b bg-white px-3 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuToggle}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <img src="/I360.svg" alt="Inspector 360" className="h-8 md:h-10 w-auto" />
        </Link>
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">{title}</h1>
          <p className="hidden sm:block text-xs md:text-sm text-gray-500">
            Sistema de Inspección Técnica de Equipos
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setOpen((v) => !v)}
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5" />
            {bellCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[1.25rem] rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {bellCount}
              </span>
            )}
          </Button>

          {open && (
            <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border bg-white shadow-lg">
              <div className="border-b p-3">
                <p className="text-sm font-semibold">Pendientes de Mecánico</p>
                <p className="text-xs text-muted-foreground">
                  {canViewAllStations
                    ? 'Estaciones: Todas'
                    : profile?.station
                      ? `Estación: ${profile.station}`
                      : 'Sin estación asignada'}
                </p>
              </div>

              <div className="max-h-80 overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="divide-y">
                    {/* Sección: Observaciones pendientes de mecánico */}
                    <div className="p-3">
                      {pendingCount === 0 ? (
                        <div className="text-center text-sm text-muted-foreground">
                          No hay equipos con observaciones pendientes.
                        </div>
                      ) : (
                        Object.entries(pendingByEquipment).map(([code, info]) => (
                          <div key={code} className="flex items-center justify-between gap-3 border-b p-2 last:border-b-0">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{code}</p>
                              <p className="text-xs text-muted-foreground">{info.count} observación(es) pendiente(s)</p>
                            </div>
                            {info.latestInspectionId && (
                              <Link href={`/inspections/${info.latestInspectionId}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                Ver
                                <ChevronRight className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Sección: Firmas pendientes */}
                    <div className="p-3">
                      <p className="mb-2 text-sm font-semibold">Firmas pendientes</p>
                      {missingCount === 0 ? (
                        <div className="text-center text-sm text-muted-foreground">No hay firmas pendientes.</div>
                      ) : (
                        missingSignatures.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 border-b p-2 last:border-b-0">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{item.formCode || item.id}</p>
                              <p className="text-xs text-muted-foreground">{item.label}</p>
                            </div>
                            {item.id && (
                              <Link href={`/inspections/${item.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                Ver
                                <ChevronRight className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total pendientes: {bellCount}</span>
                  <Link href="/inspections" className="text-xs text-primary hover:underline">Ver inspecciones</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
