'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/inspections': 'Inspecciones',
  '/dashboard/inspections/new': 'Nueva Inspección',
  '/dashboard/compliance': 'Panel de Cumplimiento',
  '/dashboard/settings': 'Configuración',
  '/dashboard/settings/users': 'Gestión de Usuarios',
};

export function Navbar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || 'Inspector 360°';

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">
          Sistema de Inspección Técnica de Equipos
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </Button>
      </div>
    </header>
  );
}
