"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Trophy, Medal, Award, Clock, ChevronDown, ChevronUp, Package, Calendar, CheckCircle2, AlertTriangle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface StationData {
    code: string;
    name: string;
    complianceRate: number;
    punctualityRate: number;
    coverageRate: number;
    daysWithInspection: number;
    equipmentCount: number;
    count: number;
}

interface ComplianceTrendProps {
    data: StationData[];
    daysInPeriod: number;
}

export function ComplianceTrend({ data, daysInPeriod }: ComplianceTrendProps) {
    const [showAll, setShowAll] = useState(true); // Mostrar todas por defecto

    // Take top 5 or all based on state
    const displayedStations = showAll ? data : data.slice(0, 5);

    const getRankIcon = (index: number) => {
        switch (index) {
            case 0:
                return <Trophy className="h-6 w-6 text-yellow-500" />;
            case 1:
                return <Medal className="h-6 w-6 text-gray-400" />;
            case 2:
                return <Award className="h-6 w-6 text-orange-500" />;
            default:
                return <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>;
        }
    };

    const getStatusColor = (rate: number) => {
        if (rate >= 90) return "text-green-600";
        if (rate >= 70) return "text-yellow-600";
        return "text-red-600";
    };

    const getProgressColor = (rate: number) => {
        if (rate >= 90) return "bg-green-500";
        if (rate >= 70) return "bg-yellow-500";
        return "bg-red-500";
    };

    return (
        <Card className="shadow-lg border-t-4 border-t-indigo-500 flex flex-col h-full">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-sm font-bold">
                            <Trophy className="h-4 w-4 text-indigo-600" />
                            Ranking de Estaciones
                        </CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
                {/* Header Labels */}
                <div className="flex items-center gap-3 px-6 py-1 border-b bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <div className="w-6 flex-shrink-0"></div>
                    <div className="flex-1">Estación</div>
                    <div className="flex items-center gap-4">
                        <span className="w-11 text-right">Punt.</span>
                        <span className="w-[52px] text-right pr-2">Cump.</span>
                    </div>
                </div>

                <ScrollArea className="h-[430px] px-4 py-1">
                    <div className="space-y-1">
                        {data.map((station, index) => {
                            const isTop3 = index < 3;
                            const rankColor = index === 0 ? "text-yellow-500" : index === 1 ? "text-slate-400" : index === 2 ? "text-orange-500" : "text-slate-400";

                            return (
                                <div key={station.code} className={cn(
                                    "flex items-center gap-3 py-1.5 px-2 rounded-md transition-colors border-b last:border-0 border-slate-50",
                                    isTop3 ? "bg-slate-50/50" : "hover:bg-slate-50/30"
                                )}>
                                    {/* Rank Number/Icon */}
                                    <div className="w-6 flex-shrink-0 flex items-center justify-center">
                                        {index === 0 ? <Trophy className="h-4 w-4 text-yellow-500" /> :
                                            index === 1 ? <Medal className="h-4 w-4 text-slate-400" /> :
                                                index === 2 ? <Award className="h-4 w-4 text-orange-500" /> :
                                                    <span className="text-[10px] font-medium text-slate-400">#{index + 1}</span>}
                                    </div>

                                    {/* Station Name */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <span className={cn(
                                                "text-xs font-semibold truncate",
                                                isTop3 ? "text-slate-900" : "text-slate-700"
                                            )}>
                                                {station.name}
                                            </span>
                                            <span className="text-[9px] text-slate-400 uppercase">{station.code}</span>
                                        </div>
                                    </div>

                                    {/* Metrics - Ultra Compact */}
                                    <div className="flex items-center gap-3">
                                        <TooltipProvider>
                                            <div className="flex items-center gap-4">
                                                {/* Punctuality Icon Badge */}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-center gap-1">
                                                            <Clock className={cn("h-3 w-3", station.punctualityRate >= 90 ? "text-green-500" : "text-amber-500")} />
                                                            <span className="text-[10px] font-medium w-7 text-right">{station.punctualityRate}%</span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p className="text-[10px]">Puntualidad</p></TooltipContent>
                                                </Tooltip>

                                                {/* Compliance Rate */}
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-xs font-bold w-9 text-right",
                                                        getStatusColor(station.complianceRate)
                                                    )}>
                                                        {station.complianceRate}%
                                                    </span>
                                                    {station.daysWithInspection === daysInPeriod ? (
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                    ) : (
                                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                    )}
                                                </div>
                                            </div>
                                        </TooltipProvider>
                                    </div>
                                </div>
                            );
                        })}
                        {data.length === 0 && (
                            <div className="text-center text-muted-foreground py-8 text-xs italic">
                                No hay datos disponibles
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
