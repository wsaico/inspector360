'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getENEquipmentInspections, getENEquipmentStats, type ENEquipmentHeatmapData } from '@/lib/services/en-equipment-tracking';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, XCircle, Calendar } from 'lucide-react';

interface ENEquipmentHeatmapProps {
    startDate: string;
    endDate: string;
    selectedStations: string[];
}

export function ENEquipmentHeatmap({ startDate, endDate, selectedStations }: ENEquipmentHeatmapProps) {
    const router = useRouter();
    const [data, setData] = useState<ENEquipmentHeatmapData | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [startDate, endDate, selectedStations]);

    // Helper to parse "YYYY-MM-DD" as local date 00:00:00
    function parseLocalDate(dateStr: string) {
        if (!dateStr) return new Date();
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    async function loadData() {
        setLoading(true);
        setError(null);

        try {
            // Fix: Parse dates explicitly as local time to avoid UTC-5 offset issues
            const start = parseLocalDate(startDate);
            const end = parseLocalDate(endDate);

            // Pasar el array completo de estaciones seleccionadas
            // Si está vacío, el backend cargará todas las estaciones
            const stationCodes = selectedStations.length > 0 ? selectedStations : undefined;

            const [heatmapData, statsData] = await Promise.all([
                getENEquipmentInspections(stationCodes, start, end),
                getENEquipmentStats(stationCodes, start, end),
            ]);

            setData(heatmapData);
            setStats(statsData);
        } catch (err) {
            console.error('Error loading EN equipment data:', err);
            setError('Error al cargar datos de equipos EN');
        } finally {
            setLoading(false);
        }
    }

    function getCellColor(inspected: boolean, hasObservations?: boolean, isFuture?: boolean): string {
        if (isFuture) return 'bg-gray-100';
        if (!inspected) return 'bg-red-100 hover:bg-red-200';
        if (hasObservations) return 'bg-yellow-100 hover:bg-yellow-200';
        return 'bg-green-100 hover:bg-green-200';
    }

    function getCellIcon(inspected: boolean, hasObservations?: boolean) {
        if (!inspected) return <XCircle className="h-3 w-3 text-red-600" />;
        if (hasObservations) return <AlertCircle className="h-3 w-3 text-yellow-600" />;
        return <CheckCircle2 className="h-3 w-3 text-green-600" />;
    }

    function handleCellClick(inspectionId?: string) {
        if (inspectionId) {
            router.push(`/inspections/${inspectionId}`);
        }
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center text-red-600">
                        <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                        <p>{error}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data || data.equipment.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Escaleras (EN) - Mapa de Cumplimiento</CardTitle>
                    <CardDescription>
                        No se encontraron estaciones con escaleras EN en el sistema
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    return (
        <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Equipos EN</CardDescription>
                        <CardTitle className="text-3xl">{stats?.totalEquipment || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Cumplimiento</CardDescription>
                        <CardTitle className="text-3xl">{stats?.complianceRate || 0}%</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Inspecciones Realizadas</CardDescription>
                        <CardTitle className="text-3xl">{stats?.totalInspected || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Con Observaciones</CardDescription>
                        <CardTitle className="text-3xl">{stats?.observationRate || 0}%</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Heatmap */}
            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Cumplimiento de Escaleras (EN) por Estación</CardTitle>
                        <CardDescription>
                            {format(parseLocalDate(startDate), "d 'de' MMMM", { locale: es })} - {format(parseLocalDate(endDate), "d 'de' MMMM 'de' yyyy", { locale: es })}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Legend */}
                    <div className="flex items-center gap-6 mb-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded" />
                            <span>Inspeccionado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded" />
                            <span>Con observaciones</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded" />
                            <span>No inspeccionado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded" />
                            <span>Día futuro</span>
                        </div>
                    </div>

                    {/* Heatmap Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 z-10 bg-white border-r-2 border-gray-300 p-2 text-left font-semibold min-w-[120px]">
                                        Estación
                                    </th>
                                    {data.dailyInspections.map((day) => {
                                        const dayDate = parseLocalDate(day.date);
                                        const dayNum = format(dayDate, 'd');
                                        const monthAbbr = format(dayDate, 'MMM', { locale: es });
                                        const isToday = day.date === today;
                                        return (
                                            <th
                                                key={day.date}
                                                className={`p-1 text-center font-medium min-w-[50px] ${isToday ? 'bg-blue-50' : ''
                                                    }`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{dayNum}</span>
                                                    <span className="text-[9px] text-gray-500">{monthAbbr}</span>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {data.equipment.map((station) => (
                                    <tr key={station.code} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="sticky left-0 z-10 bg-white border-r-2 border-gray-300 p-2 font-medium">
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{station.code}</span>
                                                <span className="text-gray-500 text-[10px]">{station.type}</span>
                                            </div>
                                        </td>
                                        {data.dailyInspections.map((day) => {
                                            const status = day.inspections[station.code];
                                            const isFuture = day.date > today;
                                            const cellColor = getCellColor(status?.inspected || false, status?.hasObservations, isFuture);

                                            return (
                                                <td
                                                    key={day.date}
                                                    className={`p-1 text-center ${cellColor} transition-colors ${status?.inspectionId ? 'cursor-pointer' : ''
                                                        }`}
                                                    onClick={() => handleCellClick(status?.inspectionId)}
                                                    title={
                                                        isFuture
                                                            ? 'Día futuro'
                                                            : status?.inspected
                                                                ? `Inspeccionado${status.hasObservations ? ' (con observaciones)' : ''}`
                                                                : 'No inspeccionado'
                                                    }
                                                >
                                                    {!isFuture && (
                                                        <div className="flex items-center justify-center">
                                                            {getCellIcon(status?.inspected || false, status?.hasObservations)}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {data.equipment.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No hay equipos EN para mostrar</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
