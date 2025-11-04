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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
  const { profile, signOut } = useAuth();
  const permissions = usePermissions();

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
          <span className="text-xs text-white/70">FOR-ATA-057</span>
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
      <nav className="flex-1 space-y-1 p-4">
        {filteredNavigation.map((item) => {
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
