"use client"

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Legend
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface StationComplianceChartProps {
    data: any[];
    daysInPeriod: number;
}

export function StationComplianceChart({ data, daysInPeriod }: StationComplianceChartProps) {
    // Sort data by compliance rate (descending)
    const sortedData = [...data].sort((a, b) => b.complianceRate - a.complianceRate);

    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>Cumplimiento por Estación</CardTitle>
                <CardDescription>
                    Comparativa de días cumplidos vs meta del periodo ({daysInPeriod} días)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={sortedData}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 5,
                            }}
                            stackOffset="sign"
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="code"
                                tick={{ fontSize: 12 }}
                                interval={0}
                            />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                label={{ value: 'Días / Inspecciones', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white p-3 border rounded-lg shadow-lg">
                                                <p className="font-bold mb-1">{data.name} ({data.code})</p>
                                                <div className="space-y-1">
                                                    <p className="text-sm text-green-600">
                                                        ✓ Completados: <span className="font-semibold">{data.daysWithInspection}</span> días
                                                    </p>
                                                    {data.pendingCount > 0 && (
                                                        <p className="text-sm text-amber-600">
                                                            ⚠ Pendientes: <span className="font-semibold">{data.pendingCount}</span> insp.
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="mt-2 pt-2 border-t">
                                                    <p className={`text-sm font-bold ${data.complianceRate >= 80 ? 'text-green-600' :
                                                            data.complianceRate >= 50 ? 'text-amber-600' : 'text-red-600'
                                                        }`}>
                                                        Cumplimiento: {data.complianceRate}%
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend />
                            <ReferenceLine y={daysInPeriod} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Meta', position: 'insideTopRight', fill: '#10B981' }} />

                            {/* Stacked Bars */}
                            <Bar dataKey="daysWithInspection" name="Días Cumplidos" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="pendingCount" name="Pendientes de Firma" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
