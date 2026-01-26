'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const VERSION_KEY = 'i360_whats_new_modal_v3_0';

export function WhatsNewModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('i360_open_whats_new', handleOpen);

        // Pequeño delay para que no aparezca de golpe al cargar
        const timer = setTimeout(() => {
            const isDismissed = localStorage.getItem(VERSION_KEY);
            if (!isDismissed) {
                setIsOpen(true);
            }
        }, 1000);

        return () => {
            window.removeEventListener('i360_open_whats_new', handleOpen);
            clearTimeout(timer);
        };
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(VERSION_KEY, 'true');
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[550px] p-0 border-none shadow-2xl rounded-3xl bg-white overflow-hidden">
                <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
                    {/* Header con gradiente */}
                    <div className="relative h-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 flex items-center justify-center">
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-0 left-0 w-24 h-24 bg-white rounded-full -translate-x-12 -translate-y-12 blur-2xl" />
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-400 rounded-full translate-x-16 translate-y-16 blur-3xl" />
                        </div>

                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="z-10 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-xl"
                        >
                            <Sparkles className="h-10 w-10 text-white fill-white/20" />
                        </motion.div>

                        {/* Sparkles flotantes */}
                        <motion.div
                            animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute top-8 right-12"
                        >
                            <Zap className="h-4 w-4 text-blue-200 fill-blue-200" />
                        </motion.div>
                    </div>

                    <div className="p-8 bg-white">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none font-black text-[10px] uppercase tracking-widest px-2 py-0.5">Versión 3.0</Badge>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Nueva Era Digital</span>
                        </div>

                        <DialogTitle className="text-2xl font-black text-gray-900 leading-tight mb-4">
                            ¡Bienvenido a la <br /><span className="text-blue-600 underline decoration-blue-200 underline-offset-4">Nueva Experiencia 3.0</span>!
                        </DialogTitle>

                        <DialogDescription className="text-gray-600 text-sm mb-6 leading-relaxed">
                            Hemos transformado Inspector 360 en una herramienta más moderna, profesional y humana, integrando procesos críticos que antes estaban dispersos.
                        </DialogDescription>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-start gap-4 group">
                                <div className="h-10 w-10 shrink-0 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform shadow-sm">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 tracking-tight">Charlas de 5 Minutos Integradas</h4>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Adiós AppSheet. Ahora las charlas de seguridad se gestionan, firman y registran 100% aquí de forma automática.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 group">
                                <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shadow-sm">
                                    <LayoutDashboard className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 tracking-tight">Inspección de Escaleras</h4>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Control total de escaleras motorizadas y no motorizadas. Recuerda darlas de alta primero para inspeccionarlas.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 group">
                                <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform shadow-sm">
                                    <Zap className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 tracking-tight">Nueva Matriz de Empleados</h4>
                                    <p className="text-[11px] text-gray-500 mt-0.5">Búsqueda inteligente de inspectores y operadores. Registro más rápido y sin errores manuales.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-4 mb-8 border border-gray-100">
                            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Próximamente en 3.1</h5>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-[9px] font-bold border-gray-200 text-gray-500 bg-white">EXTINTORES</Badge>
                                <Badge variant="outline" className="text-[9px] font-bold border-gray-200 text-gray-500 bg-white">BOTIQUÍN</Badge>
                                <Badge variant="outline" className="text-[9px] font-bold border-gray-200 text-gray-500 bg-white">INSPECCIÓN SST</Badge>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={handleDismiss}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-12 rounded-xl shadow-lg shadow-blue-200 transition-all group"
                            >
                                ¡Descubrir Funciones!
                                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
