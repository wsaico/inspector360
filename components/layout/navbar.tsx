'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu, Loader2, ChevronRight, Zap } from 'lucide-react';
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
    <header className="flex h-16 md:h-20 items-center justify-between border-b bg-white px-3 md:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {/* Botón de Menú para Sidebar en Móvil */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={onMenuToggle}
          aria-label="Abrir Menú"
        >
          <Menu className="h-6 w-6 text-gray-600" />
        </Button>

        {/* Logo oficial en móvil - Oculto en desktop para evitar duplicidad */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0 lg:hidden">
          <img src="/I360.svg" alt="Inspector 360" className="h-7 md:h-10 w-auto" />
        </Link>

        {/* Títulos - OCULTOS TOTALMENTE EN MÓVIL (sm:hidden) */}
        <div className="hidden sm:block truncate ml-2">
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">{headerInfo.title}</h1>
          <p className="hidden md:block text-xs md:text-sm text-gray-500 truncate">
            {headerInfo.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-4 shrink-0">


        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9"
            onClick={() => setOpen((v) => !v)}
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5" />
            {bellCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-[1.2rem] h-[1.2rem] rounded-full bg-red-500 flex items-center justify-center text-[9px] font-black text-white border-2 border-white">
                {bellCount}
              </span>
            )}
          </Button>

          {open && (
            <div className="absolute right-0 z-50 mt-2 w-[calc(100vw-24px)] md:w-80 rounded-2xl border bg-white shadow-2xl overflow-hidden">
              <div className="border-b p-4 bg-gray-50/50">
                <p className="text-sm font-black text-[#0A3161] uppercase tracking-widest">Notificaciones</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">
                  {canViewAllStations ? 'Todas las estaciones' : profile?.station || 'General'}
                </p>
              </div>

              <div className="max-h-[60vh] overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    <div className="p-4">
                      <p className="mb-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none">Pendientes mecánico</p>
                      {pendingCount === 0 ? (
                        <div className="text-center py-4 text-xs text-muted-foreground font-medium italic">Sin pendientes</div>
                      ) : (
                        Object.entries(pendingByEquipment).map(([code, info]) => (
                          <div key={code} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-gray-900">{code}</p>
                              <p className="text-[10px] font-bold text-blue-500/70 uppercase tracking-tighter">{info.count} pendiente(s)</p>
                            </div>
                            <Link href={`/inspections/${info.latestInspectionId}`} className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors">
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-4">
                      <p className="mb-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none">Firmas faltantes</p>
                      {missingCount === 0 ? (
                        <div className="text-center py-4 text-xs text-muted-foreground font-medium italic">Todo firmado</div>
                      ) : (
                        missingSignatures.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-gray-900 uppercase tracking-tighter">{item.formCode || 'Inspección'}</p>
                              <p className="text-[9px] font-black text-amber-600/70 uppercase tracking-tighter bg-amber-50 px-1.5 py-0.5 rounded-sm inline-block mt-0.5">{item.label}</p>
                            </div>
                            <Link href={`/inspections/${item.id}`} className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors">
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t p-3 bg-slate-100/80">
                <Link href="/inspections" className="block text-center text-[10px] font-black text-primary hover:text-blue-700 uppercase tracking-widest py-1">
                  Ver todo el historial
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Info Section - Más compacto en móvil */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-100 shrink-0">
          <div className="flex flex-col items-end hidden md:flex">
            <span className="text-[11px] font-black text-gray-900 uppercase tracking-tighter truncate max-w-[120px]">
              {(() => {
                let rawName = profile?.full_name || user?.user_metadata?.full_name || '';
                if (rawName.includes('@')) rawName = '';
                if (rawName.toLowerCase().includes('administrador principal')) return 'Administrador';
                if (rawName) return rawName;
                if (user?.email?.toLowerCase() === 'admin@inspector360.com') return 'Administrador';
                return user?.email?.split('@')[0] || 'Usuario';
              })()}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <Badge variant="outline" className="h-3.5 text-[7px] border-primary/20 text-primary px-1 font-black uppercase tracking-tighter leading-none">
                {profile?.role}
              </Badge>
              {profile?.station && (
                <span className="text-[8px] text-gray-400 font-bold uppercase truncate max-w-[40px]">
                  {profile.station}
                </span>
              )}
            </div>
          </div>
          <div className="relative shrink-0">
            <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-xl bg-primary text-white font-black text-xs md:text-sm shadow-md ring-2 ring-white">
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
          </div>
        </div>
      </div>
    </header>
  );
}
