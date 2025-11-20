"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crown, Medal, Award, TrendingUp, ArrowUpCircle } from "lucide-react"
import { motion } from "framer-motion"

interface TopStationsProps {
    data: any[];
    daysInPeriod: number;
}

export function TopStations({ data, daysInPeriod }: TopStationsProps) {
    // Sort data by compliance rate (descending)
    const sortedStations = [...data]
        .sort((a, b) => b.complianceRate - a.complianceRate);

    const top3 = sortedStations.slice(0, 3);
    const runnersUp = sortedStations.slice(3, 6); // Show next 3

    const getPodiumColor = (index: number) => {
        switch (index) {
            case 0: return "from-yellow-50 to-white border-yellow-200 text-yellow-900";
            case 1: return "from-slate-50 to-white border-slate-200 text-slate-900";
            case 2: return "from-orange-50 to-white border-orange-200 text-orange-900";
            default: return "from-gray-50 to-white border-gray-100";
        }
    };

    const getIcon = (index: number) => {
        switch (index) {
            case 0: return <Crown className="h-6 w-6 text-yellow-600 fill-yellow-100" />;
            case 1: return <Medal className="h-6 w-6 text-slate-500 fill-slate-100" />;
            case 2: return <Award className="h-6 w-6 text-orange-600 fill-orange-100" />;
            default: return <ArrowUpCircle className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <Card className="col-span-full lg:col-span-3 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4 border-b bg-gray-50/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-800">
                            <Crown className="h-5 w-5 text-yellow-500" />
                            Ranking de Cumplimiento
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                            Líderes del periodo actual
                        </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-white border shadow-sm text-xs font-normal">
                        Top {sortedStations.length > 6 ? 6 : sortedStations.length}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-8">
                    {/* Podium Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {top3.map((station, index) => (
                            <motion.div
                                key={station.code}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.15, type: "spring", stiffness: 100 }}
                                className={`relative flex flex-col p-4 rounded-xl border bg-gradient-to-b ${getPodiumColor(index)} shadow-sm`}
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-10 font-black text-5xl select-none">
                                    {index + 1}
                                </div>

                                <div className="mb-4 bg-white p-2.5 rounded-full shadow-sm w-fit ring-1 ring-black/5">
                                    {getIcon(index)}
                                </div>

                                <div className="mt-auto relative z-10">
                                    <h3 className="font-bold text-base leading-tight mb-2 truncate" title={station.name}>
                                        {station.name}
                                    </h3>

                                    <div className="flex flex-col mb-3">
                                        <span className="text-3xl font-black tracking-tighter">
                                            {station.complianceRate}%
                                        </span>
                                        <span className="text-[10px] uppercase tracking-wider font-bold opacity-60">
                                            Cumplimiento
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-white/50 rounded-md p-1.5 mb-2">
                                        <span className="opacity-80">Avance</span>
                                        <span className="font-bold text-gray-800">
                                            {station.daysWithInspection}/{daysInPeriod}
                                        </span>
                                    </div>

                                    <div className="w-full bg-black/5 h-1.5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${station.complianceRate}%` }}
                                            transition={{ delay: 0.5 + (index * 0.1), duration: 1 }}
                                            className={`h-full rounded-full ${index === 0 ? 'bg-yellow-500' :
                                                    index === 1 ? 'bg-slate-500' : 'bg-orange-500'
                                                }`}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Runners Up Section - Vertical List for better responsiveness */}
                    {runnersUp.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="space-y-3"
                        >
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                                <TrendingUp className="h-3 w-3" />
                                Pisando los talones
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                                {runnersUp.map((station, i) => (
                                    <motion.div
                                        key={station.code}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.7 + (i * 0.1) }}
                                        className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:border-blue-100 hover:bg-blue-50/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 text-sm font-bold text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors border border-gray-100">
                                                {i + 4}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm text-gray-900 truncate">
                                                    {station.name}
                                                </p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                    {station.daysWithInspection} días cumplidos
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pl-2">
                                            <div className="text-right">
                                                <span className="block text-sm font-bold text-gray-900">{station.complianceRate}%</span>
                                            </div>
                                            <ArrowUpCircle className="h-4 w-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {sortedStations.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-xl border border-dashed">
                            <Crown className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>No hay datos suficientes para el ranking</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
