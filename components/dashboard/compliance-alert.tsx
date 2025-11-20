"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle2, Info } from "lucide-react"

interface ComplianceAlertProps {
    missedDays: number
    daysInMonth: number
    currentDay: number
    stationName?: string
}

export function ComplianceAlert({ missedDays, daysInMonth, currentDay, stationName }: ComplianceAlertProps) {
    // Si estamos a principio de mes (día 1 o 2), ser más indulgente
    if (currentDay <= 2 && missedDays <= 1) return null

    if (missedDays === 0) {
        return (
            <Alert className="border-green-200 bg-green-50 text-green-900">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertTitle className="text-green-800 font-semibold">¡Excelente trabajo!</AlertTitle>
                <AlertDescription className="text-green-700">
                    {stationName ? `La estación ${stationName}` : 'Tu estación'} está al día con todas las inspecciones. Sigue así para alcanzar la meta mensual.
                </AlertDescription>
            </Alert>
        )
    }

    if (missedDays <= 2) {
        return (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <Info className="h-5 w-5 text-amber-600" />
                <AlertTitle className="text-amber-800 font-semibold">Atención requerida</AlertTitle>
                <AlertDescription className="text-amber-700">
                    {stationName ? `La estación ${stationName}` : 'Tu estación'} ha perdido {missedDays} {missedDays === 1 ? 'día' : 'días'} de inspección. Es importante recuperar el ritmo para cumplir la meta.
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-900">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-800 font-semibold">Acción Inmediata Requerida</AlertTitle>
            <AlertDescription className="text-red-700">
                Se han perdido {missedDays} días de inspección. El cumplimiento de la meta mensual está en riesgo. Por favor, asegúrate de realizar las inspecciones diarias.
            </AlertDescription>
        </Alert>
    )
}
