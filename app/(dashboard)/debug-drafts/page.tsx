'use client';

/**
 * Página de diagnóstico temporal para verificar inspecciones en borrador
 * Acceder en: /debug-drafts
 *
 * ELIMINAR después de verificar
 */

import { useEffect, useState } from 'react';
import { useAuth, usePermissions, useInspections } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Inspection } from '@/types';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function DebugDraftsPage() {
  const { profile, user, loading: authLoading } = useAuth();
  const { canCreateInspections, canViewAllStations } = usePermissions();
  const [allStats, setAllStats] = useState<{ draft: number; pending: number; completed: number } | null>(null);

  // Cargar solo borradores con filtro
  const { data: draftsData, isLoading: draftsLoading } = useInspections({
    page: 1,
    pageSize: 100,
    status: 'draft',
  });

  // Cargar todas las inspecciones para contar
  const { data: allData } = useInspections({
    page: 1,
    pageSize: 1000,
  });

  useEffect(() => {
    if (allData?.data) {
      const draft = allData.data.filter((i: Inspection) => i.status === 'draft').length;
      const pending = allData.data.filter((i: Inspection) => i.status === 'pending').length;
      const completed = allData.data.filter((i: Inspection) => i.status === 'completed').length;
      setAllStats({ draft, pending, completed });
    }
  }, [allData]);

  const drafts = draftsData?.data || [];

  if (authLoading || draftsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando diagnóstico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Página de Diagnóstico Temporal</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Esta página es solo para verificar el problema. Elimínala después de resolver.
            </p>
          </div>
        </div>
      </div>

      <h1 className="text-3xl font-bold">🔍 Diagnóstico: Botón Continuar</h1>

      {/* Estado del Usuario */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle>👤 Usuario Actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Email:</p>
              <p className="font-medium">{user?.email || 'No disponible'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Perfil ID:</p>
              <p className="font-medium">{profile?.id || 'No disponible'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Rol:</p>
              <p className="font-medium">{profile?.role || 'No disponible'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estación:</p>
              <p className="font-medium">{profile?.station || 'No disponible'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permisos */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle>🔐 Permisos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Puede crear inspecciones</span>
              {canCreateInspections ? (
                <Badge className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  SÍ
                </Badge>
              ) : (
                <Badge className="bg-red-500">
                  <XCircle className="h-3 w-3 mr-1" />
                  NO
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Puede ver todas las estaciones</span>
              {canViewAllStations ? (
                <Badge className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  SÍ
                </Badge>
              ) : (
                <Badge className="bg-gray-500">
                  <XCircle className="h-3 w-3 mr-1" />
                  NO
                </Badge>
              )}
            </div>
          </div>

          {!canCreateInspections && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ El usuario NO tiene permiso para crear inspecciones
              </p>
              <p className="text-sm text-red-700 mt-2">
                El botón "Continuar" solo aparece si tienes permiso para crear inspecciones.
                Verifica que tu rol tenga este permiso en la base de datos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle>📊 Resumen de Inspecciones</CardTitle>
        </CardHeader>
        <CardContent>
          {allStats ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-600">{allStats.draft}</p>
                <p className="text-sm text-gray-600 mt-1">Borrador</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-3xl font-bold text-yellow-600">{allStats.pending}</p>
                <p className="text-sm text-gray-600 mt-1">Pendiente</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{allStats.completed}</p>
                <p className="text-sm text-gray-600 mt-1">Completada</p>
              </div>
            </div>
          ) : (
            <p>Cargando estadísticas...</p>
          )}
        </CardContent>
      </Card>

      {/* Borradores Encontrados */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle>📋 Inspecciones en Borrador ({drafts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <div className="text-center py-12">
              <XCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">
                No hay inspecciones en estado borrador
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Para ver el botón "Continuar", primero necesitas crear una inspección en borrador:
              </p>
              <ol className="text-left max-w-md mx-auto space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="font-bold mr-2">1.</span>
                  <span>Ve a "Nueva Inspección"</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">2.</span>
                  <span>Llena el Step 1 (Información General)</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">3.</span>
                  <span>Cierra el navegador sin completar</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">4.</span>
                  <span>Vuelve al listado de inspecciones</span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-4">
              {drafts.map((draft: Inspection) => (
                <div
                  key={draft.id}
                  className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-lg">{draft.form_code || 'Sin código'}</p>
                      <p className="text-sm text-gray-600">{draft.inspection_type}</p>
                    </div>
                    <Badge className="bg-gray-500">Borrador</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">ID:</p>
                      <p className="font-mono text-xs">{draft.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Estación:</p>
                      <p className="font-medium">{draft.station}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Inspector:</p>
                      <p className="font-medium">{draft.inspector_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Fecha:</p>
                      <p className="font-medium">
                        {new Date(draft.inspection_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium mb-2">
                      ¿Debe aparecer botón "Continuar"?
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center">
                        {draft.status === 'draft' ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mr-2" />
                        )}
                        <span>
                          Estado es 'draft': <strong>{draft.status === 'draft' ? 'SÍ' : 'NO'}</strong>
                        </span>
                      </div>
                      <div className="flex items-center">
                        {canCreateInspections ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mr-2" />
                        )}
                        <span>
                          Usuario tiene permiso: <strong>{canCreateInspections ? 'SÍ' : 'NO'}</strong>
                        </span>
                      </div>
                    </div>

                    {draft.status === 'draft' && canCreateInspections ? (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm text-green-800 font-medium">
                          ✅ El botón "Continuar" DEBE aparecer para esta inspección
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800 font-medium">
                          ❌ El botón "Continuar" NO aparecerá
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          {!canCreateInspections && 'Usuario sin permiso para crear inspecciones'}
                          {draft.status !== 'draft' && `Estado es '${draft.status}' en vez de 'draft'`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardHeader>
          <CardTitle>💡 Próximos Pasos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="font-medium">Si el diagnóstico muestra que TODO está correcto pero aún no ves el botón:</p>
          <ol className="list-decimal list-inside space-y-2 ml-4">
            <li>Limpia el caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)</li>
            <li>Cierra y vuelve a abrir el navegador</li>
            <li>Verifica que el código esté desplegado en el servidor</li>
            <li>Ve a /inspections y busca las inspecciones listadas arriba</li>
            <li>El botón debe aparecer en color azul junto a "Ver"</li>
          </ol>
          <p className="mt-4 p-3 bg-white border border-blue-200 rounded">
            <strong>Elimina esta página después:</strong><br />
            Borra el archivo <code className="bg-gray-100 px-1 rounded">app/(dashboard)/debug-drafts/page.tsx</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
