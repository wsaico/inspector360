"use client"

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
        <Card className="shadow-lg border-t-4 border-t-indigo-500">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4 text-indigo-600" />
                    Ranking de Estaciones
                </CardTitle>
                <CardDescription className="text-xs">
                    Desempeño: cumplimiento, puntualidad y equipos
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
                <div className="space-y-2">
                    {data.map((station, index) => (
                        <div key={station.code} className="border rounded p-2 hover:shadow transition-shadow bg-white">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    <div className="flex-shrink-0 w-6 flex items-center justify-center">
                                        {index < 3 ? (
                                            getRankIcon(index)
                                        ) : (
                                            <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold leading-tight truncate">{station.name}</p>
                                        <p className="text-[9px] text-muted-foreground">{station.code}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className={`text-lg font-bold ${getStatusColor(station.complianceRate)}`}>
                                        {station.complianceRate}%
                                    </span>
                                    {station.daysWithInspection === daysInPeriod ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                    )}
                                </div>
                            </div>

                            {/* Compact Progress Bar */}
                            <Progress value={station.complianceRate} className="h-1 mb-1.5" />

                            {/* Compact Metrics Row */}
                            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                                <div className="flex items-center justify-center gap-1 p-1 bg-blue-50 rounded">
                                    <Calendar className="w-2.5 h-2.5 text-blue-600" />
                                    <span className="font-semibold text-blue-900">{station.daysWithInspection}/{daysInPeriod}</span>
                                </div>
                                <div className="flex items-center justify-center gap-1 p-1 bg-purple-50 rounded">
                                    <Package className="w-2.5 h-2.5 text-purple-600" />
                                    <span className="font-semibold text-purple-900">{station.equipmentCount || 0}</span>
                                </div>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center justify-center gap-1 p-1 bg-green-50 rounded cursor-help">
                                                <Clock className="w-2.5 h-2.5 text-green-600" />
                                                <span className="font-semibold text-green-900">{station.punctualityRate}%</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs">Inspecciones registradas a tiempo<br />(máx. 2 días después)</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                            No hay datos disponibles
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
