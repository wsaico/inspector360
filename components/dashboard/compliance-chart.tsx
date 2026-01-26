"use client"

import {
    ComposedChart,
    Bar,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp } from "lucide-react"

interface ComplianceChartProps {
    data: any[]
    daysInMonth: number
    currentDay: number
    daysElapsed?: number
}

export function ComplianceChart({ data, daysInMonth, currentDay, daysElapsed }: ComplianceChartProps) {
    // Calcular porcentaje de avance actual
    // Buscamos el último dato que tenga valor acumulativo (no futuro)
    const lastDataPoint = data.findLast(d => d.cumulative !== null);
    const currentCumulative = lastDataPoint?.cumulative || 0;
    // Usar daysElapsed si está disponible, sino daysInMonth como fallback
    const effectiveDays = daysElapsed || daysInMonth;
    const progressPercentage = effectiveDays > 0 ? Math.round((currentCumulative / effectiveDays) * 100) : 0;

    return (
        <Card className="shadow-lg border-t-4 border-t-blue-500">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <TrendingUp className="h-6 w-6 text-blue-600" />
                            Cumplimiento Diario Acumulado
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Días con inspección vs Meta (1 inspección/día)
                        </CardDescription>
                    </div>
                    <div className="flex flex-col items-end">
                        <Badge variant="outline" className="bg-white text-lg font-bold px-3 py-1 border-blue-200 text-blue-700 mb-1">
                            {progressPercentage}%
                        </Badge>
                        <span className="text-xs text-gray-500">Avance del Periodo</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={data}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 0,
                                bottom: 0,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis
                                dataKey="day"
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                label={{ value: 'Fecha', position: 'insideBottom', offset: -5, fill: '#9CA3AF', fontSize: 12 }}
                                interval="preserveStartEnd"
                            />
                            {/* Eje izquierdo: Días Cumplidos (0 - 30) */}
                            <YAxis
                                yAxisId="left"
                                domain={[0, daysInMonth]}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                label={{ value: 'Días Cumplidos', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 12 }}
                            />
                            {/* Eje derecho (oculto): Para las barras de actividad (0 - 3 para que las barras sean cortas) */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                domain={[0, 3]}
                                hide
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                }}
                                labelFormatter={(label) => `${label}`}
                                formatter={(value: any, name: string) => {
                                    if (name === "Inspección Diaria") return value === 1 ? "Sí" : "No";
                                    return value;
                                }}
                            />
                            <Legend verticalAlign="top" height={36} />

                            {/* Barras de Actividad Diaria */}
                            <Bar
                                yAxisId="right"
                                dataKey="value"
                                name="Inspección Diaria"
                                fill="#A5B4FC" // Indigo 300
                                barSize={20}
                                radius={[4, 4, 0, 0]}
                            />

                            {/* Línea de Meta */}
                            <ReferenceLine
                                yAxisId="left"
                                y={daysInMonth}
                                stroke="#10B981"
                                strokeDasharray="3 3"
                                label={{ value: 'Meta', position: 'insideTopRight', fill: '#10B981', fontSize: 12, fontWeight: 'bold' }}
                            />

                            {/* Área de "Ritmo Ideal" */}
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="target"
                                stroke="#9CA3AF"
                                strokeDasharray="5 5"
                                fill="url(#colorTarget)"
                                fillOpacity={0.1}
                                name="Ritmo Ideal"
                                isAnimationActive={false}
                            />

                            {/* Línea de Progreso Real */}
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="cumulative"
                                stroke="#3B82F6"
                                strokeWidth={4}
                                dot={{ r: 4, fill: "#3B82F6", strokeWidth: 2, stroke: "#fff" }}
                                activeDot={{ r: 7, strokeWidth: 0 }}
                                name="Progreso Real"
                                connectNulls
                            />

                            <defs>
                                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex items-center justify-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 bg-indigo-300 rounded-sm"></div>
                        <span>Inspección Diaria</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-6 bg-blue-500 rounded-full"></div>
                        <span>Tu Progreso</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-6 bg-emerald-500 border-t border-dashed border-emerald-500"></div>
                        <span>Meta ({daysInMonth})</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
