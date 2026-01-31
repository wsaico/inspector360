'use client';

import { SafetyTalkWizard } from "@/components/safety-talks/wizard/safety-talk-wizard";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

export default function RegisterTalkPage() {
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-[#0A3161] uppercase tracking-tight">
                        Ejecución de Charla
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Complete los pasos para registrar la charla de seguridad.
                    </p>
                </div>
                <Button
                    variant="outline"
                    className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-bold shadow-sm transition-all"
                    onClick={() => window.open('https://drive.google.com/file/d/17bP9h0eQzSJn0GvhLm7mOK97nbQlgUaV/view?usp=sharing', '_blank')}
                >
                    <Video className="w-5 h-5 mr-2" />
                    Ver Tutorial
                </Button>
            </div>

            <SafetyTalkWizard editId={editId || undefined} />
        </div>
    );
}
