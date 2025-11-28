"use client"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface StationDailyStatus {
    code: string;
    name: string;
    days: {
        date: string;
        day: number;
        status: 'completed' | 'missing' | 'future' | 'no_obligation';
    }[];
}

interface StationComplianceHeatmapProps {
    data: StationDailyStatus[];
    daysInMonth: number;
    startDate?: string;
    endDate?: string;
}

export function StationComplianceHeatmap({ data, daysInMonth, startDate, endDate }: StationComplianceHeatmapProps) {
    // Generate dates for the header based on range or daysInMonth
    const dates: { day: number; month: number | null; dateString: string | null }[] = [];
    if (startDate && endDate) {
        // Parse dates as local to avoid timezone issues
        const [sy, sm, sd] = startDate.split('-').map(Number);
        const [ey, em, ed] = endDate.split('-').map(Number);
        const start = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        for (let i = 0; i <= diffDays; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            dates.push({
                day: d.getDate(),
                month: d.getMonth() + 1,
                dateString
            });
        }
    } else {
        // Fallback to 1..daysInMonth
        for (let i = 1; i <= daysInMonth; i++) {
            dates.push({
                day: i,
                month: null,
                dateString: null
            });
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mapa de Inspecciones Diarias</CardTitle>
                <CardDescription>
                    Visualización de cumplimiento por día. Los días en rojo indican inspecciones faltantes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                    <div className="flex w-max space-x-4 p-4">
                        <div className="flex flex-col gap-1">
                            {/* Header Row */}
                            <div className="flex gap-1 mb-2">
                                <div className="w-32 flex-shrink-0 font-bold text-sm text-gray-500">Estación</div>
                                {dates.map((d, i) => (
                                    <div key={i} className="w-8 text-center text-xs font-medium text-gray-500">
                                        {d.day}
                                        {d.month && <span className="block text-[9px] text-gray-400">/{d.month}</span>}
                                    </div>
                                ))}
                            </div>

                            {/* Station Rows */}
                            {data.map((station) => (
                                <div key={station.code} className="flex gap-1 items-center">
                                    <div className="w-32 flex-shrink-0 text-sm font-medium truncate" title={station.name}>
                                        {station.name}
                                    </div>
                                    {dates.map((d, i) => {
                                        // Find status for this date
                                        // If using date range, match by date string. If fallback, match by index/day.
                                        let status = 'no_obligation';

                                        if (d.dateString) {
                                            const dayData = station.days.find(day => day.date === d.dateString);
                                            status = dayData?.status || 'no_obligation';

                                            // Fallback: if not found by exact string, try to match by day number if within same month (legacy support)
                                            if (!dayData && !startDate) {
                                                const dayDataByIndex = station.days[i];
                                                status = dayDataByIndex?.status || 'no_obligation';
                                            }
                                        } else {
                                            // Fallback logic
                                            const dayData = station.days[i];
                                            status = dayData?.status || 'no_obligation';
                                        }

                                        return (
                                            <TooltipProvider key={i}>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <div
                                                            className={cn(
                                                                "w-8 h-8 rounded-sm transition-colors",
                                                                status === 'completed' && "bg-green-500 hover:bg-green-600",
                                                                status === 'missing' && "bg-red-500 hover:bg-red-600",
                                                                status === 'future' && "bg-gray-100",
                                                                status === 'no_obligation' && "bg-gray-100 opacity-50"
                                                            )}
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="capitalize">{status === 'completed' ? 'Completado' : status === 'missing' ? 'Faltante' : 'Sin obligación'}</p>
                                                        {d.dateString && <p className="text-xs text-muted-foreground">{d.dateString}</p>}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>

                <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded-sm" />
                        <span>Completado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded-sm" />
                        <span>Faltante</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-100 rounded-sm" />
                        <span>Futuro / No aplica</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
