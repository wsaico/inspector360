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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate dates for the header
    const allDates: { day: number; month: number | null; dateString: string | null; isFuture: boolean }[] = [];
    if (startDate && endDate) {
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

            const itemDate = new Date(d);
            itemDate.setHours(0, 0, 0, 0);

            allDates.push({
                day: d.getDate(),
                month: d.getMonth() + 1,
                dateString,
                isFuture: itemDate > today
            });
        }
    } else {
        for (let i = 1; i <= daysInMonth; i++) {
            allDates.push({
                day: i,
                month: null,
                dateString: null,
                isFuture: false
            });
        }
    }

    // Filtrar para no mostrar días futuros (según pedido del usuario)
    const dates = allDates.filter(d => !d.isFuture);

    return (
        <Card className="shadow-lg border-t-2 border-t-blue-200 h-full">
            <CardHeader className="pb-2 pt-4 px-6">
                <CardTitle className="text-lg font-bold">Mapa de Inspecciones Diarias</CardTitle>
                <CardDescription className="text-xs">
                    Cumplimiento por estación hasta el día de hoy.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-2">
                <ScrollArea className="w-full whitespace-nowrap rounded-md border bg-slate-50/30">
                    <div className="p-2">
                        <div className="flex flex-col gap-[1px]">
                            {/* Header Row */}
                            <div className="flex mb-1 relative">
                                <div className="w-40 flex-shrink-0 font-bold text-[10px] text-slate-500 uppercase py-0.5 sticky left-0 z-20 bg-white border-r border-slate-100 flex items-center px-4">
                                    Estación
                                </div>
                                <div className="flex gap-[3px] pl-3">
                                    {dates.map((d, i) => (
                                        <div key={i} className="w-6 flex-shrink-0 text-center text-[10px] font-bold text-slate-400">
                                            {d.day}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Station Rows */}
                            {data.map((station) => (
                                <div key={station.code} className="flex group border-b last:border-0 border-slate-50 relative">
                                    <div className="w-40 flex-shrink-0 text-[11px] font-bold text-slate-700 truncate px-4 py-1 sticky left-0 z-10 bg-white border-r border-slate-100 group-hover:bg-slate-50 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.02)]" title={station.name}>
                                        {station.name}
                                    </div>
                                    <div className="flex items-center gap-[3px] pl-3 py-0.5">
                                        {dates.map((d, i) => {
                                            let status = 'no_obligation';

                                            if (d.dateString) {
                                                const dayData = station.days.find(day => day.date === d.dateString);
                                                status = dayData?.status || 'no_obligation';
                                            } else {
                                                const dayData = station.days[i];
                                                status = dayData?.status || 'no_obligation';
                                            }

                                            return (
                                                <TooltipProvider key={i}>
                                                    <Tooltip delayDuration={100}>
                                                        <TooltipTrigger asChild>
                                                            <div
                                                                className={cn(
                                                                    "w-6 h-6 rounded-[3px] transition-all cursor-crosshair",
                                                                    status === 'completed' && "bg-emerald-500 hover:scale-110 shadow-sm",
                                                                    status === 'missing' && "bg-rose-500 hover:scale-110 shadow-sm",
                                                                    status === 'future' && "bg-slate-100",
                                                                    status === 'no_obligation' && "bg-slate-100 opacity-40"
                                                                )}
                                                            />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="text-[10px] p-2">
                                                            <div className="font-bold">{station.name}</div>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <div className={cn(
                                                                    "w-2 h-2 rounded-full",
                                                                    status === 'completed' ? "bg-emerald-500" : "bg-rose-500"
                                                                )} />
                                                                <span className="capitalize">
                                                                    {status === 'completed' ? 'Completado' : 'Faltante'} - Día {d.day}
                                                                </span>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>

                <div className="flex items-center gap-6 mt-4 text-[11px] text-slate-500 font-medium px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                        <span>Cumplió</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-rose-500 rounded-sm" />
                        <span>Faltó</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-slate-100 rounded-sm" />
                        <span>Sin registro</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
