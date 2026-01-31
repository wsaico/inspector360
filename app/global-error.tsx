'use client';

import { RefreshCw } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-6 text-center font-sans">
                    <div className="bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-md w-full border border-slate-100">
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Error Crítico</h2>
                        <p className="text-slate-500 mb-8 font-medium">La aplicación ha encontrado un error fatal.</p>

                        <button
                            onClick={() => reset()}
                            className="w-full h-12 rounded-xl font-black bg-[#0A3161] text-white hover:bg-[#0c3c75] flex items-center justify-center gap-2 transition-all"
                        >
                            <RefreshCw className="w-4 h-4" /> Recargar Aplicación
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
