"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, FileSignature } from "lucide-react"

interface PendingInspectionsListProps {
    data: any[];
}

export function PendingInspectionsList({ data }: PendingInspectionsListProps) {
    // Filter stations with pending inspections and sort by count (descending)
    const pendingStations = data
        .filter(s => s.pendingCount > 0)
        .sort((a, b) => b.pendingCount - a.pendingCount);

    return (
        <Card className="col-span-full lg:col-span-3">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSignature className="h-5 w-5 text-amber-500" />
                    Pendientes de Firma
                </CardTitle>
                <CardDescription>
                    Estaciones con inspecciones por regularizar
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    {pendingStations.map((station) => (
                        <div
                            key={station.code}
                            className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/50 border-amber-100"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 p-2 rounded-full">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{station.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {station.code}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200">
                                {station.pendingCount} pendientes
                            </Badge>
                        </div>
                    ))}

                    {pendingStations.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <div className="bg-green-50 p-3 rounded-full mb-2">
                                <FileSignature className="h-6 w-6 text-green-500" />
                            </div>
                            <p className="text-sm">¡Todo al día!</p>
                            <p className="text-xs">No hay firmas pendientes</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
