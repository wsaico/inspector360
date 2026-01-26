'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const VERSION_KEY = 'i360_whats_new_v1';

export function WhatsNewBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const isDismissed = localStorage.getItem(VERSION_KEY);
        if (!isDismissed) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(VERSION_KEY, 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-1 shadow-lg"
            >
                <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 rounded-[14px] bg-white/95 backdrop-blur-sm p-4 md:p-5 px-6">
                    {/* Background Decorative Element */}
                    <div className="absolute -right-8 -top-8 opacity-10">
                        <Sparkles className="h-32 w-32 text-blue-600" />
                    </div>

                    <div className="flex items-center gap-4 z-10">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-inner">
                            <Zap className="h-6 w-6 fill-blue-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-blue-600 text-white hover:bg-blue-700 border-none px-2 py-0 text-[10px] font-bold uppercase tracking-wider">Nuevo</Badge>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">¡Actualizaciones enInspector 360!</h3>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">
                                Hemos mejorado la <span className="font-bold text-blue-700">Multi-selección de estaciones</span>, integrado <span className="font-bold text-emerald-600">accesos directos</span> para Charlas de Seguridad y optimizado la carga de tu perfil para una experiencia más fluida.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 z-10 shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDismiss}
                            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 font-bold text-xs"
                        >
                            Ignorar
                        </Button>
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md font-bold text-xs px-4 group"
                            onClick={handleDismiss}
                        >
                            ¡Entendido!
                            <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
