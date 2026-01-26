'use client';

import { BulkBulletinUploadForm } from "@/components/safety-talks/bulk-bulletin-upload-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function BulkBulletinUploadPage() {
    return (
        <div className="p-4 md:p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-2 font-black uppercase tracking-widest text-[9px]">
                        <Link href="/talks/bulletins" className="hover:text-[#0A3161] transition-colors">Boletines</Link>
                        <span>/</span>
                        <span className="text-[#0A3161]">Carga Masiva</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0A3161] uppercase leading-none">Carga Masiva</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Sube tu lista de temas mediante un archivo Excel</p>
                </div>
                <Link href="/talks/bulletins">
                    <Button variant="outline" className="h-10 border-2 border-[#0A3161] text-[#0A3161] font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-[#0A3161] hover:text-white transition-all shadow-sm">
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Volver a la Lista
                    </Button>
                </Link>
            </div>

            <BulkBulletinUploadForm />
        </div>
    );
}
