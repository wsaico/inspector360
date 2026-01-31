'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Video, Play, HelpCircle, X } from 'lucide-react';

interface TutorialModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    url: string;
    description?: string;
}

export function TutorialModal({ isOpen, onOpenChange, title, url, description }: TutorialModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md border-0 shadow-2xl rounded-[30px] overflow-hidden p-0">
                <div className="bg-[#0A3161] p-6 text-white relative">
                    <DialogHeader>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                                <Video className="h-6 w-6 text-[#B3D400]" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tight text-white leading-tight">
                                    Tutorial: {title}
                                </DialogTitle>
                                <p className="text-slate-300 text-xs font-bold uppercase tracking-widest mt-1">
                                    Centro de Aprendizaje
                                </p>
                            </div>
                        </div>
                        <DialogDescription className="text-slate-200 text-sm mt-4 font-medium leading-relaxed">
                            {description || "Mira este video para aprender a usar este módulo rápidamente y de manera correcta."}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6 bg-white">
                    <div
                        className="aspect-video bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 group cursor-pointer hover:border-indigo-400 hover:bg-slate-100/50 transition-all"
                        onClick={() => window.open(url, '_blank')}
                    >
                        <div className="text-center group-hover:scale-110 transition-transform">
                            <div className="h-16 w-16 bg-white rounded-full shadow-lg flex items-center justify-center mx-auto mb-3 border border-slate-100">
                                <Play className="h-8 w-8 text-[#0A3161] fill-[#0A3161]" />
                            </div>
                            <p className="text-sm font-black text-[#0A3161] uppercase tracking-wider">Reproducir Video</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Se abrirá en una nueva pestaña de Drive</p>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-indigo-50/50 p-4 border border-indigo-100">
                        <div className="flex gap-3">
                            <HelpCircle className="h-5 w-5 text-indigo-600 shrink-0" />
                            <p className="text-xs text-indigo-800 font-bold leading-relaxed">
                                Si el video no carga, asegúrate de haber iniciado sesión en tu navegador con tu cuenta corporativa.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
                        >
                            Cerrar
                        </Button>
                        <Button
                            onClick={() => window.open(url, '_blank')}
                            className="flex-[2] h-12 rounded-xl bg-[#0A3161] hover:bg-[#152d6f] text-white font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]"
                        >
                            Ver ahora
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
