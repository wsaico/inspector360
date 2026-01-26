import { SafetyTalkScheduler } from "@/components/safety-talks/scheduler";

export default function SchedulePage() {
    return (
        <div className="p-4 md:p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0A3161] uppercase leading-none">
                        Programación de Charlas
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Planificación estratégica de capacitaciones</p>
                </div>
            </div>

            <SafetyTalkScheduler />
        </div>
    );
}
