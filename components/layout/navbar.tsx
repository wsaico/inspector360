'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu, Loader2, ChevronRight, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InspectionService } from '@/lib/services';
import type { Inspection, Observation } from '@/types';
import { getMissingSignaturesLabel } from '@/lib/utils';
import { scopeInspectionsByStation } from '@/lib/utils/scope';
import { Badge } from '@/components/ui/badge';
import { UserProfile } from '@/types/roles';
import { User } from '@supabase/supabase-js';

type NavbarProps = {
  profile: UserProfile | null;
  user: User | null;
  canViewAllStations: boolean;
  onMenuToggle?: () => void;
};

export function Navbar({ profile, user, canViewAllStations, onMenuToggle }: NavbarProps) {
  const pathname = usePathname();

  // Configuración de Headers Dinámicos "Naturales"
  const getHeaderInfo = (path: string, userProfile: UserProfile | null) => {
    // 1. Dashboard - Personalizado
    if (path === '/dashboard') {
      let displayName = userProfile?.full_name || '';

      // Si el nombre parece un correo, ignorarlo y usar fallback
      if (displayName.includes('@')) {
        displayName = '';
      }

      const name = displayName.split(' ')[0] || 'Usuario';
      return {
        title: `Hola, ${name}`,
        subtitle: 'Aquí tienes el resumen de tus operaciones hoy.'
      };
    }

    // 2. Charlas de Seguridad
    if (path.includes('/talks/register')) {
      return {
        title: 'Registro de Charla de Seguridad',
        subtitle: 'Complete la asistencia y firmas para la charla del día.'
      };
    }
    if (path.includes('/talks/history')) {
      return {
        title: 'Historial de Charlas',
        subtitle: 'Consulta y descarga los registros de capacitaciones pasadas.'
      };
    }
    if (path.includes('/talks/bulletins')) {
      return {
        title: 'Biblioteca de Boletines',
        subtitle: 'Gestione los temas y comunicados de seguridad.'
      };
    }
    if (path.includes('/talks')) {
      return {
        title: 'Charlas de Seguridad',
        subtitle: 'Gestión de capacitaciones y briefings diarios.'
      };
    }

    // 3. Inspecciones
    if (path.includes('/inspections/new')) {
      return {
        title: 'Nueva Inspección',
        subtitle: 'Inicia el registro técnico de una unidad.'
      };
    }
    if (path.includes('/inspections/') && path.split('/').length > 2) {
      return {
        title: 'Detalle de Inspección',
        subtitle: 'Revisión completa y observaciones del equipo.'
      };
    }
    if (path.includes('/inspections')) {
      return {
        title: 'Inspecciones Técnicas',
        subtitle: 'Monitoreo y control de estado de equipos GSE.'
      };
    }

    // 4. Módulos Principal
    if (path.includes('/compliance')) {
      return {
        title: 'Panel de Cumplimiento',
        subtitle: 'Métricas, KPIs y nivel de operatividad.'
      };
    }

    // 5. Configuración
    if (path.includes('/settings/users')) {
      return {
        title: 'Gestión de Usuarios',
        subtitle: 'Administra los accesos y roles del sistema.'
      };
    }
    if (path.includes('/settings/employees')) {
      return {
        title: 'Base de Colaboradores',
        subtitle: 'Directorio de personal operativo y administrativo.'
      };
    }
    if (path.includes('/settings')) {
      return {
        title: 'Configuración Global',
        subtitle: 'Ajustes generales y preferencias de la plataforma.'
      };
    }

    // Default Amigable
    return {
      title: 'Inspector 360°',
      subtitle: 'Plataforma de Gestión Operativa Integral'
    };
  };

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inspections, setInspections] = useState<Inspection[]>([]);

  const loadInspections = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await InspectionService.getInspections();
      if (error) {
        setInspections([]);
      } else {
        setInspections(data || []);
      }
    } catch (err) {
      console.error('Error loading inspections:', err);
      setInspections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInspections();
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

  // Inspecciones dentro del alcance
  const scopedInspections = useMemo(() => {
    return scopeInspectionsByStation(inspections, {
      station: profile?.station,
      canViewAllStations,
    });
  }, [inspections, profile?.station, canViewAllStations]);

  const pendingByEquipment = useMemo(() => {
    const byEq: Record<string, { count: number; latestInspectionId: string | undefined }> = {};
    scopedInspections.forEach((i) => {
      (i.observations || []).forEach((obs: Observation) => {
        const operatorHasText = !!obs.obs_operator && obs.obs_operator.trim().length > 0;
        const mechanicMissing = !obs.obs_maintenance || obs.obs_maintenance.trim().length === 0;
        if (operatorHasText && mechanicMissing) {
          const key = obs.equipment_code;
          if (!byEq[key]) {
            byEq[key] = { count: 0, latestInspectionId: i.id };
          }
          byEq[key].count += 1;
          byEq[key].latestInspectionId = i.id;
        }
      });
    });
    return byEq;
  }, [scopedInspections]);

  const pendingCount = useMemo(() => Object.keys(pendingByEquipment).length, [pendingByEquipment]);

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

  const headerInfo = getHeaderInfo(pathname, profile);

  return (
    <header className="flex h-20 items-center justify-between border-b bg-white px-3 md:px-6">
      <div className="flex items-center gap-3">
        {/* Usamos el logo oficial en móvil si no está el sidebar expandido */}
        <Link href="/dashboard" className="flex items-center gap-3 lg:hidden shrink-0">
          <img src="/I360.svg" alt="Inspector 360" className="h-8 md:h-10 w-auto" />
        </Link>
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">{headerInfo.title}</h1>
          <p className="hidden sm:block text-xs md:text-sm text-gray-500">
            {headerInfo.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Botón Inteligente de Novedades */}
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-black text-[10px] uppercase tracking-tighter"
          onClick={() => window.dispatchEvent(new CustomEvent('i360_open_whats_new'))}
        >
          <div className="relative">
            <Sparkles className="h-4 w-4 animate-pulse" />
            <div className="absolute -top-1 -right-1 h-1.5 w-1.5 bg-blue-500 rounded-full border border-white" />
          </div>
          <span className="hidden md:inline">Lo Nuevo</span>
        </Button>

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
                <p className="text-sm font-semibold">Notificaciones</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">
                  {canViewAllStations ? 'Todas las estaciones' : profile?.station || 'General'}
                </p>
              </div>

              <div className="max-h-80 overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="divide-y">
                    <div className="p-3">
                      <p className="mb-2 text-xs font-black text-gray-400 uppercase tracking-widest">Pendientes mecánico</p>
                      {pendingCount === 0 ? (
                        <div className="text-center py-2 text-sm text-muted-foreground">Sin pendientes</div>
                      ) : (
                        Object.entries(pendingByEquipment).map(([code, info]) => (
                          <div key={code} className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{code}</p>
                              <p className="text-[10px] text-muted-foreground">{info.count} pendiente(s)</p>
                            </div>
                            <Link href={`/inspections/${info.latestInspectionId}`} className="text-primary hover:underline group">
                              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-3">
                      <p className="mb-2 text-xs font-black text-gray-400 uppercase tracking-widest">Firmas faltantes</p>
                      {missingCount === 0 ? (
                        <div className="text-center py-2 text-sm text-muted-foreground">Todo firmado</div>
                      ) : (
                        missingSignatures.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{item.formCode || 'Inspección'}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                            </div>
                            <Link href={`/inspections/${item.id}`} className="text-primary hover:underline group">
                              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t p-2 bg-gray-50/50">
                <Link href="/inspections" className="block text-center text-xs font-bold text-primary hover:underline p-1">
                  Ver todas las inspecciones
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Info Section */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-100 min-w-0">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-[11px] font-black text-gray-900 uppercase tracking-tighter truncate max-w-[150px]">
              {(() => {
                let rawName = profile?.full_name || user?.user_metadata?.full_name || '';

                // Si el nombre parece un correo, ignorarlo
                if (rawName.includes('@')) rawName = '';

                // Simplificar nombres robóticos
                if (rawName.toLowerCase().includes('administrador principal')) return 'Administrador';

                if (rawName) return rawName;
                if (user?.email?.toLowerCase() === 'admin@inspector360.com') return 'Administrador';
                return user?.email?.split('@')[0] || 'Usuario';
              })()}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="h-4 text-[7px] border-primary/20 text-primary px-1 font-black uppercase">
                {profile?.role}
              </Badge>
              {profile?.station && (
                <span className="text-[9px] text-gray-400 font-bold uppercase truncate">
                  {profile.station}
                </span>
              )}
            </div>
          </div>
          <div className="relative shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-black text-sm shadow-md">
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
