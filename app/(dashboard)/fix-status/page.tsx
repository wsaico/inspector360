"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { InspectionService } from "@/lib/services/inspections"
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export default function FixStatusPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [logs, setLogs] = useState<string[]>([])
    const [stats, setStats] = useState({ total: 0, updated: 0, skipped: 0, errors: 0 })

    const addLog = (message: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev])
    }

    const runFix = async () => {
        setIsLoading(true)
        setProgress(0)
        setLogs([])
        setStats({ total: 0, updated: 0, skipped: 0, errors: 0 })
        addLog("Iniciando proceso de corrección...")

        try {
            // 1. Fetch all inspections that are NOT completed
            // We'll fetch in batches or all at once if not too many. Let's try fetching pending/draft.
            // Since we can't easily "fetch all not completed" with one simple query without custom logic,
            // let's fetch 'pending' and 'draft' separately or just fetch all recent ones.
            // Better: fetch all and filter client side for safety if count is manageable, 
            // or use the service to get page by page.

            // Let's assume we want to fix ALL history.
            // We'll fetch a large number, e.g., 1000.
            addLog("Obteniendo inspecciones...")
            const { data: inspections, error } = await InspectionService.getInspections({ pageSize: 1000 })

            if (error) {
                throw new Error(error)
            }

            if (!inspections || inspections.length === 0) {
                addLog("No se encontraron inspecciones.")
                setIsLoading(false)
                return
            }

            const total = inspections.length
            setStats(prev => ({ ...prev, total }))
            addLog(`Se encontraron ${total} inspecciones. Analizando...`)

            let processed = 0
            let updatedCount = 0
            let skippedCount = 0
            let errorCount = 0

            for (const inspection of inspections) {
                processed++
                setProgress(Math.round((processed / total) * 100))

                // Check if it needs update
                // We want to update if it has supervisor signature BUT status is not completed
                const hasSupervisor = !!inspection.supervisor_signature_url
                const isCompleted = inspection.status === 'completed'

                if (hasSupervisor && !isCompleted) {
                    addLog(`Corrigiendo ID: ${inspection.id.slice(0, 8)}... (Tiene firma pero status=${inspection.status})`)

                    const { data: newStatus, error: updateError } = await InspectionService.recalculateInspectionStatus(inspection.id)

                    if (updateError) {
                        addLog(`❌ Error al actualizar ${inspection.id}: ${updateError}`)
                        errorCount++
                    } else {
                        addLog(`✅ Actualizado a: ${newStatus}`)
                        updatedCount++
                    }
                } else {
                    skippedCount++
                }

                // Update stats periodically
                setStats({
                    total,
                    updated: updatedCount,
                    skipped: skippedCount,
                    errors: errorCount
                })

                // Small delay to not choke the UI
                await new Promise(resolve => setTimeout(resolve, 10))
            }

            addLog("Proceso finalizado.")
            toast.success(`Proceso completado. ${updatedCount} inspecciones corregidas.`)

        } catch (error: any) {
            addLog(`❌ Error crítico: ${error.message}`)
            toast.error("Hubo un error en el proceso")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Corrección de Estados</h1>
                    <p className="text-muted-foreground">
                        Herramienta para actualizar el estado de inspecciones antiguas.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Actualizar Inspecciones Firmadas</CardTitle>
                    <CardDescription>
                        Este script buscará inspecciones que tengan firma de supervisor pero que NO estén marcadas como "Completadas", y corregirá su estado.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                        <p className="text-sm">
                            Esta acción modificará la base de datos. Asegúrate de que nadie esté editando inspecciones en este momento.
                        </p>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-center">
                        <div className="p-4 bg-slate-50 rounded-lg border">
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <div className="text-xs text-muted-foreground uppercase">Total</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                            <div className="text-2xl font-bold text-green-600">{stats.updated}</div>
                            <div className="text-xs text-green-600 uppercase">Corregidas</div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border">
                            <div className="text-2xl font-bold text-slate-500">{stats.skipped}</div>
                            <div className="text-xs text-muted-foreground uppercase">Omitidas</div>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                            <div className="text-xs text-red-600 uppercase">Errores</div>
                        </div>
                    </div>

                    {isLoading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Progreso</span>
                                <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}

                    <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-slate-950 text-slate-50 font-mono text-xs">
                        {logs.length === 0 ? (
                            <div className="text-slate-500 italic">Esperando inicio...</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="mb-1 border-b border-slate-800/50 pb-1 last:border-0">
                                    {log}
                                </div>
                            ))
                        )}
                    </ScrollArea>

                    <Button
                        onClick={runFix}
                        disabled={isLoading}
                        className="w-full"
                        size="lg"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Ejecutar Corrección
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
