'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SignaturePad from '@/components/forms/signature-pad';
import { Employee } from '@/types/safety-talks';
import { Check, ChevronRight, User, PenTool } from 'lucide-react';
import { toast } from 'sonner';

interface AttendeeSignatureCaptureProps {
    attendees: Employee[];
    existingSignatures: Record<string, string>; // employee_id -> base64
    isOpen: boolean;
    onClose: () => void;
    onSaveSignature: (employeeId: string, signature: string) => void;
}

export function AttendeeSignatureCapture({
    attendees,
    existingSignatures,
    isOpen,
    onClose,
    onSaveSignature
}: AttendeeSignatureCaptureProps) {
    // Encontramos el primer asistente que NO tenga firma aún
    const firstUnsignedIndex = attendees.findIndex(a => !existingSignatures[a.id]);
    // Si todos firmaron, empezamos en 0 (o podríamos cerrar)
    const [currentIndex, setCurrentIndex] = useState(firstUnsignedIndex >= 0 ? firstUnsignedIndex : 0);

    const currentAttendee = attendees[currentIndex];
    // Controlamos la firma actual temporalmente antes de guardar
    const [currentSignature, setCurrentSignature] = useState<string | null>(null);

    if (!currentAttendee) return null;

    const handleSave = () => {
        if (!currentSignature) {
            toast.error('Por favor firme para continuar');
            return;
        }
        handleQuickSave(currentSignature);
    };

    const handleQuickSave = (sig: string) => {
        if (!sig) return;
        // Guardar firma en el padre
        onSaveSignature(currentAttendee.id, sig);
        setCurrentSignature(null);

        // Avanzar al siguiente
        if (currentIndex < attendees.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            toast.success('¡Todos los asistentes han firmado!');
            onClose();
        }
    };

    const handleSkip = () => {
        if (currentIndex < attendees.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setCurrentSignature(null);
        } else {
            onClose();
        }
    };

    const progress = ((Object.keys(existingSignatures).length) / attendees.length) * 100;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-lg border-0 rounded-[40px] shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="bg-[#0A3161] p-8 text-white">
                    <DialogTitle className="flex items-center justify-between">
                        <span className="font-black uppercase tracking-widest text-sm italic flex items-center gap-2">
                            <PenTool className="w-5 h-5 text-[#B3D400]" /> Captura de Firmas
                        </span>
                        <Badge className="bg-[#B3D400] text-[#0A3161] font-black border-0">
                            {currentIndex + 1} / {attendees.length}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="p-8 space-y-8">
                    {/* Info del Empleado - AUTHENTIC STYLE */}
                    <div className="bg-slate-50 p-6 rounded-[30px] flex items-center gap-6 border-2 border-slate-100 shadow-inner">
                        <div className="h-16 w-16 rounded-2xl bg-[#0A3161] flex items-center justify-center text-[#B3D400] font-black text-2xl shadow-lg">
                            {currentAttendee.full_name.charAt(0)}
                        </div>
                        <div className="space-y-1">
                            <p className="font-black text-2xl text-[#0A3161] tracking-tight">{currentAttendee.full_name}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                {currentAttendee.position || 'OPERACIONES'} • {currentAttendee.dni}
                            </p>
                        </div>
                    </div>

                    {/* Pad de Firma */}
                    <div className="border-2 border-dashed border-slate-200 rounded-[30px] p-2 bg-white">
                        <SignaturePad
                            label="Dibuje su firma aquí"
                            onChange={(sig) => setCurrentSignature(sig)}
                            onSave={handleQuickSave}
                            key={currentAttendee.id}
                        />
                    </div>

                    {/* Barra de progreso - LIME */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Progreso de Ronda</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#B3D400] transition-all duration-700"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 bg-slate-50 flex justify-between sm:justify-between items-center border-t">
                    <Button variant="ghost" onClick={handleSkip} className="font-black text-slate-400 text-xs uppercase tracking-widest">
                        Saltar Firma
                    </Button>
                    <Button onClick={handleSave} className="h-14 px-8 bg-[#0A3161] text-white hover:bg-[#0c3c75] font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest">
                        Siguiente Colaborador <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
