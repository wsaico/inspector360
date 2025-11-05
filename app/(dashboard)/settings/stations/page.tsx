'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { StationsService, type StationConfig } from '@/lib/services/stations';
import { STATIONS, Station } from '@/types/roles';
import { Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function StationsSettingsPage() {
  const { profile, loading } = useAuth();
  const [listLoading, setListLoading] = useState(false);
  const [stations, setStations] = useState<StationConfig[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const [addCode, setAddCode] = useState<Station | ''>('');
  const [addCustomCode, setAddCustomCode] = useState('');
  const [addCustomName, setAddCustomName] = useState('');

  const allowedOptions = useMemo(() => Object.entries(STATIONS).map(([code, name]) => ({ code: code as Station, name })), []);
  const selectableCodes = useMemo(() => {
    const existingCodes = new Set(stations.map(s => s.code));
    return allowedOptions.filter(opt => !existingCodes.has(opt.code));
  }, [stations, allowedOptions]);

  useEffect(() => {
    async function load() {
      setListLoading(true);
      const res = await StationsService.listAll();
      setStations(res.data);
      setUsingFallback(res.usingFallback);
      setListLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-lg text-muted-foreground">No tienes permisos para acceder a esta página</p>
      </div>
    );
  }

  async function toggleActive(code: Station, active: boolean) {
    const { success, error } = await StationsService.setActive(code, active);
    if (!success) {
      toast.error(error || 'No se pudo actualizar la estación');
      return;
    }
    toast.success(active ? 'Estación activada' : 'Estación desactivada');
    const res = await StationsService.listAll();
    setStations(res.data);
  }

  async function addStation() {
    const codeFromSelect = addCode || '';
    const codeFromInput = addCustomCode.trim().toUpperCase();
    const nameFromInput = addCustomName.trim();
    const finalCode = (codeFromSelect || codeFromInput) as Station | '';
    if (!finalCode) return;
    const nameOverride = nameFromInput || undefined;
    const { success, error } = await StationsService.upsert(finalCode as Station, true, nameOverride);
    if (!success) {
      toast.error(error || 'No se pudo agregar la estación');
      return;
    }
    toast.success('Estación agregada');
    setAddCode('');
    setAddCustomCode('');
    setAddCustomName('');
    const res = await StationsService.listAll();
    setStations(res.data);
  }

  async function removeStation(code: Station) {
    const { success, error } = await StationsService.delete(code);
    if (!success) {
      toast.error(error || 'No se pudo eliminar la estación');
      return;
    }
    toast.success('Estación eliminada');
    const res = await StationsService.listAll();
    setStations(res.data);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Estaciones</h2>
        <p className="mt-2 text-gray-600">Añade o desactiva estaciones disponibles para el sistema</p>
      </div>

      {usingFallback && (
        <Card className="border-yellow-300">
          <CardHeader>
            <CardTitle className="text-yellow-700">Modo sin tabla `stations`</CardTitle>
            <CardDescription>
              Para persistir cambios, crea la tabla `stations` con columnas: `code` (text, PK), `name` (text), `is_active` (boolean, default true), `created_at` (timestamptz, default now()).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Mientras tanto, se usan las estaciones predefinidas.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Listado de estaciones</CardTitle>
          </div>
          <CardDescription>Activa o desactiva estaciones según necesidad</CardDescription>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stations.map((s) => (
                  <TableRow key={s.code}>
                    <TableCell className="font-medium">{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>
                      <select
                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={s.is_active ? 'active' : 'inactive'}
                        onChange={(e) => toggleActive(s.code, e.target.value === 'active')}
                        disabled={usingFallback}
                      >
                        <option value="active">Activa</option>
                        <option value="inactive">Inactiva</option>
                      </select>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        variant={s.is_active ? 'secondary' : 'default'}
                        size="sm"
                        disabled={usingFallback}
                        onClick={() => toggleActive(s.code, !s.is_active)}
                      >
                        {s.is_active ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={usingFallback}
                        onClick={() => removeStation(s.code)}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Añadir estación</CardTitle>
          <CardDescription>Selecciona una estación permitida o añade un código personalizado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <Label htmlFor="station-select">Estación</Label>
              <select
                id="station-select"
                className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={addCode}
                onChange={(e) => setAddCode(e.target.value as Station)}
                disabled={usingFallback}
              >
                <option value="">Selecciona estación</option>
                {selectableCodes.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.code} - {opt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={addStation} disabled={(usingFallback) || (!addCode && !addCustomCode.trim())}>Añadir</Button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="custom-code">Código personalizado</Label>
              <Input
                id="custom-code"
                placeholder="Ej. JAU"
                value={addCustomCode}
                onChange={(e) => setAddCustomCode(e.target.value)}
                disabled={usingFallback}
              />
            </div>
            <div>
              <Label htmlFor="custom-name">Nombre</Label>
              <Input
                id="custom-name"
                placeholder="Nombre de la estación"
                value={addCustomName}
                onChange={(e) => setAddCustomName(e.target.value)}
                disabled={usingFallback}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}