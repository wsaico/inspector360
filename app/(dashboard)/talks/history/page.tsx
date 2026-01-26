'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { TalkExecution } from '@/types/safety-talks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks';
import { SafetyTalksService } from '@/lib/services/safety-talks';
import { toast } from 'sonner';

export default function HistoryPage() {
    // const supabase = createClientComponentClient(); // REMOVED

    const { profile } = useAuth();
    const [executions, setExecutions] = useState<TalkExecution[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        try {
            // Usar RPC para garantizar visibilidad (bypass RLS de DB)
            const { data, error } = await supabase.rpc('get_completed_talks');

            if (error) throw error;

            if (data) setExecutions(data as any[]);
        } catch (error: any) {
            console.error('Error loading history:', error);
            toast.error('Error cargando historial: ' + (error.message || 'Error desconocido'));
        } finally {
            setLoading(false);
        }
    };

    const [downloading, setDownloading] = useState<string | null>(null);

    const handleDownloadPdf = async (id: string) => {
        setDownloading(id);
        try {
            const response = await fetch(`/api/talks/execution/${id}/pdf`);
            if (!response.ok) throw new Error('No se pudo generar el PDF');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Reporte-Charla-${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('PDF descargado correctamente');
        } catch (error: any) {
            console.error('Error downloading PDF:', error);
            toast.error('Error descargando PDF: ' + error.message);
        } finally {
            setDownloading(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar esta charla? Esta acción no se puede deshacer.')) return;

        const { error } = await SafetyTalksService.deleteExecution(id);
        if (error) {
            toast.error('Error eliminando charla: ' + error);
        } else {
            toast.success('Charla eliminada correctamente');
            loadHistory(); // Recargar lista
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0A3161] uppercase leading-none">
                        Historial de Charlas
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Registro maestro de capacitaciones ejecutadas</p>
                </div>
                <div className="w-12 h-12 bg-[#B3D400] rounded-2xl flex items-center justify-center shadow-lg shadow-[#B3D400]/20">
                    <Calendar className="w-6 h-6 text-[#0A3161]" />
                </div>
            </div>

            <Card className="border-0 shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#0A3161] border-b border-[#0A3161]/10">
                                <tr>
                                    <th className="p-5 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Fecha y Hora</th>
                                    <th className="p-5 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Tema / Boletín</th>
                                    <th className="p-5 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Estación</th>
                                    <th className="p-5 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Expositor</th>
                                    <th className="p-5 text-right font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {executions.map((ex) => (
                                    <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#B3D400]/20 group-hover:text-[#0A3161] transition-all">
                                                    <Calendar className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold text-[#0A3161]">{format(new Date(ex.executed_at), 'dd/MM/yyyy HH:mm')}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="space-y-1">
                                                <p className="font-black text-[#0A3161] leading-tight uppercase text-xs">{ex.schedule?.bulletin?.title || 'Tema General'}</p>
                                                <p className="text-[10px] font-mono font-bold text-slate-400">{ex.schedule?.bulletin?.code}</p>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <Badge className="bg-slate-100 text-[#0A3161] border-0 font-black px-3 py-1 rounded-lg text-[9px] uppercase tracking-widest">{ex.station_code}</Badge>
                                        </td>
                                        <td className="p-5 text-[#0A3161] font-bold text-xs uppercase">
                                            {ex.presenter?.full_name}
                                        </td>
                                        <td className="p-5 text-right space-x-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDownloadPdf(ex.id)}
                                                disabled={downloading === ex.id}
                                                className="border-[#0A3161] text-[#0A3161] font-black uppercase text-[9px] tracking-widest h-9 px-4 rounded-xl hover:bg-[#0A3161] hover:text-white transition-all shadow-sm"
                                            >
                                                {downloading === ex.id ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="h-3 w-3 border-2 border-[#0A3161] border-t-transparent rounded-full animate-spin" />
                                                    </span>
                                                ) : (
                                                    <>
                                                        <FileText className="mr-2 h-3.5 w-3.5" /> Descargar PDF
                                                    </>
                                                )}
                                            </Button>

                                            {profile?.role === 'admin' && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDelete(ex.id)}
                                                    className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border-0 shadow-none h-9 w-9 p-0 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {executions.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center space-y-4">
                                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                                <FileText className="w-8 h-8" />
                                            </div>
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No hay registros históricos aún</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
