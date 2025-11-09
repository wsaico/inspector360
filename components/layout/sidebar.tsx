'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth, usePermissions } from '@/hooks';
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
  Users,
  LogOut,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { InspectionTypeService } from '@/lib/services';
import { InspectionSystemType } from '@/types/inspection';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: null,
  },
  {
    name: 'Inspecciones',
    href: '/inspections',
    icon: ClipboardList,
    permission: null,
  },
  {
    name: 'Cumplimiento',
    href: '/compliance',
    icon: BarChart3,
    permission: null,
  },
  {
    name: 'Usuarios',
    href: '/settings/users',
    icon: Users,
    permission: 'canManageUsers' as const,
  },
  {
    name: 'Configuración',
    href: '/settings',
    icon: Settings,
    permission: 'canAccessSettings' as const,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading, signOut } = useAuth();
  const permissions = usePermissions();
  const [inspectionTypes, setInspectionTypes] = useState<InspectionSystemType[]>([]);
  const [inspectionsExpanded, setInspectionsExpanded] = useState(false);

  // Cargar tipos de inspección
  useEffect(() => {
    const loadTypes = async () => {
      const { data } = await InspectionTypeService.getAll();
      if (data) {
        setInspectionTypes(data);
      }
    };
    loadTypes();
  }, []);

  // Auto-expandir si estamos en una ruta de inspecciones
  useEffect(() => {
    if (pathname.startsWith('/inspections')) {
      setInspectionsExpanded(true);
    }
  }, [pathname]);

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      toast.success('Sesión cerrada correctamente');
      router.replace('/login');
    } else {
      toast.error(result.error || 'Error al cerrar sesión');
    }
  };

  const filteredNavigation = navigation.filter((item) => {
    // Mientras el perfil está cargando, no filtramos para evitar parpadeo
    if (loading) return true;
    if (!item.permission) return true;
    return permissions[item.permission];
  });

  return (
    <div className="flex h-full w-64 flex-col bg-primary">
      {/* Header */}
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <span className="text-lg font-bold text-white">I360</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">
            Inspector 360°
          </span>
          <span className="text-xs text-white/70">Sistema de Inspecciones</span>
        </div>
      </div>

      {/* User Info */}
      {profile && (
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <span className="text-sm font-semibold text-white">
                {profile.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile.full_name}
              </p>
              <p className="text-xs text-white/70 capitalize">{profile.role}</p>
              {profile.station && (
                <p className="text-xs text-white/70">{profile.station}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {filteredNavigation.map((item) => {
          // Manejo especial para "Inspecciones" con submenu
          if (item.name === 'Inspecciones') {
            const isInspectionRoute = pathname.startsWith('/inspections');
            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => setInspectionsExpanded(!inspectionsExpanded)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isInspectionRoute
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                  {inspectionsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {inspectionsExpanded && (
                  <div className="ml-6 space-y-1 mt-1">
                    {inspectionTypes.map((type) => {
                      const typeHref = type.code === 'technical' ? '/inspections' : `/inspections/${type.code}`;
                      const isTypeActive = pathname === typeHref || (type.code === 'technical' && pathname.startsWith('/inspections'));

                      return (
                        <Link
                          key={type.id}
                          href={type.is_active ? typeHref : '#'}
                          onClick={(e) => {
                            if (!type.is_active) {
                              e.preventDefault();
                              toast.info(`${type.name} estará disponible próximamente`);
                            }
                          }}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors',
                            isTypeActive
                              ? 'bg-white/10 text-white'
                              : type.is_active
                                ? 'text-white/60 hover:bg-white/5 hover:text-white'
                                : 'text-white/40 cursor-not-allowed'
                          )}
                        >
                          <span className={type.is_active ? '' : 'grayscale opacity-50'}>
                            {type.icon}
                          </span>
                          <span className="flex-1">{type.name}</span>
                          {!type.is_active && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded">
                              Pronto
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Navegación normal para otros items
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="border-t border-white/10 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-white/70 hover:bg-white/5 hover:text-white"
          onClick={handleSignOut}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
