'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { useAuth, usePermissions } from '@/hooks';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile, user, loading, signOut } = useAuth();
  const permissions = usePermissions();
  const canViewAllStations = permissions.canViewAllStations;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar - Ahora recibe permisos y loading como props */}
      <Sidebar
        permissions={permissions}
        loading={loading}
        signOut={signOut}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navbar - Recibe perfil y permisos como props */}
        <Navbar
          profile={profile}
          user={user}
          canViewAllStations={canViewAllStations}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}