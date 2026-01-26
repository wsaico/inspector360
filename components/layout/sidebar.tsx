'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Menu,
  X as CloseIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { InspectionTypeService } from '@/lib/services';
import { InspectionSystemType } from '@/types/inspection';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RolePermissions } from '@/types/roles';

interface SidebarProps {
  permissions: RolePermissions;
  loading: boolean;
  signOut: () => Promise<{ success: boolean; error: string | null }>;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  permission: string | null;
  dynamic?: boolean;
  submenu?: { name: string; href: string; permission?: string }[];
  staticItems?: { name: string; isComingSoon: boolean }[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: null },
      { name: 'Cumplimiento', href: '/compliance', icon: BarChart3, permission: null },
    ]
  },
  {
    title: 'Operaciones',
    items: [
      {
        name: 'Inspecciones',
        href: '/inspections',
        icon: ClipboardList,
        permission: null,
        dynamic: true,
        staticItems: [
          { name: 'Inspección de Extintores', isComingSoon: true },
          { name: 'Inspección de Botiquín', isComingSoon: true },
          { name: 'Inspección Interna', isComingSoon: true },
        ]
      },
    ]
  },
  {
    title: 'Seguridad',
    items: [
      {
        name: 'Charlas de Seguridad',
        href: '/talks',
        icon: ShieldCheck,
        permission: null,
        submenu: [
          { name: 'Registrar Charla', href: '/talks/register' },
          { name: 'Programación', href: '/talks/schedule', permission: 'canManageUsers' },
          { name: 'Temas / Boletines', href: '/talks/bulletins', permission: 'canManageUsers' },
          { name: 'Historial', href: '/talks/history' },
        ]
      },
    ]
  },
  {
    title: 'Administración',
    items: [
      {
        name: 'Configuración',
        href: '/settings',
        icon: Settings,
        permission: 'canAccessSettings',
        submenu: [
          { name: 'Gestión de Usuarios', href: '/settings/users' },
          { name: 'Base de Empleados', href: '/settings/employees' },
          { name: 'Ajustes de Sistema', href: '/settings' },
        ]
      },
    ]
  }
];

export function Sidebar({ permissions, loading, signOut, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [inspectionTypes, setInspectionTypes] = useState<InspectionSystemType[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'Inspecciones': true,
    'Charlas de Seguridad': true,
    'Configuración': false
  });

  useEffect(() => {
    const loadTypes = async () => {
      try {
        const { data } = await InspectionTypeService.getAll();
        if (data) setInspectionTypes(data);
      } catch (err) {
        console.error('Error loading inspection types:', err);
      }
    };
    loadTypes();
  }, []);

  useEffect(() => {
    if (pathname.startsWith('/inspections')) setExpandedMenus(p => ({ ...p, 'Inspecciones': true }));
    if (pathname.startsWith('/talks')) setExpandedMenus(p => ({ ...p, 'Charlas de Seguridad': true }));
    if (pathname.startsWith('/settings')) setExpandedMenus(p => ({ ...p, 'Configuración': true }));
  }, [pathname]);

  const toggleMenu = (name: string) => {
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      toast.success('Sesión cerrada correctamente');
      router.replace('/login');
    } else {
      toast.error(result.error || 'Error al cerrar sesión');
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[50] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-[55] w-72 transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 shadow-2xl lg:shadow-none h-full bg-[#0A3161]",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center gap-3 px-6 border-b border-white/5 bg-white/5 backdrop-blur-sm shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 overflow-hidden">
              <img src="/I360.svg" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-lg font-black text-white uppercase tracking-tighter leading-none">
                Inspector 360
              </span>
              <span className="text-[10px] font-black text-[#B3D400] uppercase tracking-[0.1em] mt-1">
                Digitaliza procesos
              </span>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 py-6">
            <div className="space-y-8 pb-8">
              {navigationGroups.map((group) => {
                const visibleItems = group.items.filter(item => {
                  if (loading) return false;
                  if (item.permission && !permissions[item.permission as keyof RolePermissions]) return false;
                  return true;
                });

                if (visibleItems.length === 0) return null;

                return (
                  <div key={group.title} className="space-y-3">
                    <h3 className="px-3 text-[10px] font-black uppercase text-white/30 tracking-[0.3em]">
                      {group.title}
                    </h3>
                    <div className="space-y-1">
                      {visibleItems.map((item) => {
                        const hasSubmenu = !!item.submenu || item.dynamic;
                        const isExpanded = expandedMenus[item.name];
                        const isActive = pathname.startsWith(item.href);

                        if (hasSubmenu) {
                          return (
                            <div key={item.name} className="space-y-1">
                              <button
                                onClick={() => toggleMenu(item.name)}
                                className={cn(
                                  'group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-black transition-all',
                                  isActive
                                    ? 'bg-[#B3D400]/10 text-white border-l-2 border-[#B3D400]'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <item.icon className={cn('h-5 w-5', isActive ? 'text-[#B3D400]' : 'text-white/40 group-hover:text-white')} />
                                  <span className="uppercase tracking-tight">{item.name}</span>
                                </div>
                                {isExpanded ? <ChevronDown className="h-3 w-3 text-white/20" /> : <ChevronRight className="h-3 w-3 text-white/20" />}
                              </button>

                              {isExpanded && (
                                <div className="ml-4 pl-4 space-y-1 mt-1 border-l border-white/5">
                                  {item.name === 'Inspecciones' && inspectionTypes.map((type) => (
                                    <Link
                                      key={type.id}
                                      href={`/inspections/${type.code}`}
                                      onClick={onClose}
                                      className={cn(
                                        'flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold uppercase transition-all',
                                        pathname === `/inspections/${type.code}` ? 'text-[#B3D400] bg-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'
                                      )}
                                    >
                                      <div className={cn('w-1.5 h-1.5 rounded-full', pathname === `/inspections/${type.code}` ? 'bg-[#B3D400]' : 'bg-white/10')} />
                                      <span className="truncate">{type.name}</span>
                                    </Link>
                                  ))}
                                  {item.name === 'Inspecciones' && item.staticItems?.filter(s => !inspectionTypes.some(t => t.name.toLowerCase().includes(s.name.toLowerCase().replace('inspección de ', '')))).map((staticSub) => (
                                    <div key={staticSub.name} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[10px] font-bold uppercase text-white/20 cursor-not-allowed">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
                                        <span className="truncate">{staticSub.name}</span>
                                      </div>
                                      <Badge className="bg-white/5 border-0 text-[6px] text-white/30 font-black h-3 px-1 shrink-0">PRÓX.</Badge>
                                    </div>
                                  ))}
                                  {item.submenu?.map((sub) => {
                                    if (sub.permission && !permissions[sub.permission as keyof RolePermissions]) return null;
                                    const isSubActive = pathname === sub.href;
                                    return (
                                      <Link
                                        key={sub.href}
                                        href={sub.href}
                                        onClick={onClose}
                                        className={cn(
                                          'flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold uppercase transition-all',
                                          isSubActive ? 'text-[#B3D400] bg-white/5' : 'text-white/40 hover:text-white hover:bg-white/5'
                                        )}
                                      >
                                        <div className={cn('w-1.5 h-1.5 rounded-full', isSubActive ? 'bg-[#B3D400]' : 'bg-white/10')} />
                                        <span className="truncate">{sub.name}</span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black transition-all',
                              isActive ? 'bg-[#B3D400]/10 text-white border-l-2 border-[#B3D400]' : 'text-white/60 hover:bg-white/5 hover:text-white'
                            )}
                          >
                            <item.icon className={cn('h-5 w-5', isActive ? 'text-[#B3D400]' : 'text-white/40 group-hover:text-white')} />
                            <span className="uppercase tracking-tight">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-white/5 bg-white/5 shrink-0">
            <Button
              variant="ghost"
              className="w-full justify-start text-white/40 hover:bg-white/10 hover:text-white rounded-xl h-11 px-3 group"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-5 w-5 group-hover:text-red-400 transition-colors" />
              <span className="text-[11px] font-black uppercase tracking-widest">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
