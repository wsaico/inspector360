'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Runtime Error:', error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-6 text-center">
            <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-md w-full border border-slate-100">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Algo salió mal</h2>
                <p className="text-slate-500 mb-8 font-medium">Ha ocurrido un error inesperado en la aplicación.</p>

                <div className="bg-slate-50 p-4 rounded-xl w-full mb-6 border border-slate-100">
                    <code className="text-xs text-slate-400 font-mono break-all line-clamp-3">
                        {error.message || 'Error desconocido'}
                    </code>
                </div>

                <Button
                    onClick={reset}
                    className="w-full h-12 rounded-xl font-black bg-[#0A3161] text-white hover:bg-[#0c3c75] flex items-center justify-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" /> Intentar de nuevo
                </Button>
            </div>
        </div>
    );
}
