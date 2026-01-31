'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { TalkExecution } from '@/types/safety-talks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Trash2, UserPlus, Download, Lock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks';
import { SafetyTalksService } from '@/lib/services/safety-talks';
import { toast } from 'sonner';

export default function HistoryPage() {
    // const supabase = createClientComponentClient(); // REMOVED

    const { profile } = useAuth();
    const [executions, setExecutions] = useState<TalkExecution[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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
                <Button
                    className="bg-[#B3D400] text-[#0A3161] hover:bg-[#c9ee00] font-black uppercase tracking-widest shadow-lg hover:shadow-xl transition-all h-12 px-6 rounded-xl"
                    onClick={() => window.location.href = '/talks/register'}
                >
                    <Plus className="w-5 h-5 mr-2" /> Nueva Charla
                </Button>
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
                                    <th className="p-5 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Turno</th>
                                    <th className="p-5 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Puntualidad</th>
                                    <th className="p-5 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Expositor</th>
                                    <th className="p-5 text-right font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {executions
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((ex) => (
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
                                            <td className="p-5">
                                                <span className="text-xs font-bold text-slate-500">{ex.shift || 'N/A'}</span>
                                            </td>
                                            <td className="p-5">
                                                {(() => {
                                                    if (!ex.created_at) return <Badge variant="outline">N/A</Badge>;
                                                    const execDate = new Date(ex.executed_at);
                                                    const createDate = new Date(ex.created_at);
                                                    const diffTime = createDate.getTime() - execDate.getTime();
                                                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                                                    // Logic: <= 1 day = On Time (100%), > 1 day = Regularized (50%)
                                                    // Future improvements: Compare with scheduled_date for Late (0%)

                                                    if (diffDays <= 1) {
                                                        return (
                                                            <div className="flex flex-col">
                                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 w-fit">A Tiempo</Badge>
                                                                <span className="text-[9px] font-bold text-emerald-600 mt-1">100% PUNTUAL</span>
                                                            </div>
                                                        );
                                                    } else {
                                                        return (
                                                            <div className="flex flex-col">
                                                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 w-fit">Regularizado</Badge>
                                                                <span className="text-[9px] font-bold text-amber-600 mt-1">REGISTRO TARDÍO</span>
                                                            </div>
                                                        );
                                                    }
                                                })()}
                                            </td>
                                            <td className="p-5 text-[#0A3161] font-bold text-xs uppercase">
                                                {ex.presenter?.full_name}
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => handleDownloadPdf(ex.id)}
                                                        disabled={downloading === ex.id}
                                                        className="border-[#0A3161] text-[#0A3161] h-9 w-9 rounded-xl hover:bg-[#0A3161] hover:text-white transition-all shadow-sm"
                                                        title="Descargar PDF"
                                                    >
                                                        {downloading === ex.id ? (
                                                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Download className="h-4 w-4" />
                                                        )}
                                                    </Button>

                                                    {(() => {
                                                        const execDate = new Date(ex.executed_at).getTime();
                                                        const nowView = new Date().getTime();
                                                        const hoursDiff = (nowView - execDate) / (1000 * 60 * 60);
                                                        const isLocked = hoursDiff > 24;

                                                        return (
                                                            <div className="relative group/tooltip">
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    onClick={() => !isLocked && (window.location.href = `/talks/register?edit=${ex.id}`)}
                                                                    disabled={isLocked}
                                                                    className={`h-9 w-9 rounded-xl transition-all shadow-sm ${isLocked ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'border-[#0A3161] text-[#0A3161] hover:bg-[#0A3161] hover:text-white'}`}
                                                                    title={isLocked ? "Bloqueado por límite de 24h" : "Agregar Personal"}
                                                                >
                                                                    {isLocked ? <Lock className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                                                                </Button>
                                                            </div>
                                                        );
                                                    })()}

                                                    {profile?.role === 'admin' && (
                                                        <Button
                                                            size="icon"
                                                            variant="destructive"
                                                            onClick={() => handleDelete(ex.id)}
                                                            className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border-0 shadow-none h-9 w-9 rounded-xl transition-all"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
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

            {/* Pagination Controls */}
            {
                executions.length > itemsPerPage && (
                    <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="text-[#0A3161] font-bold"
                        >
                            Anterior
                        </Button>
                        <span className="text-[#0A3161] font-bold text-sm">
                            Página {currentPage} de {Math.ceil(executions.length / itemsPerPage)}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(executions.length / itemsPerPage), p + 1))}
                            disabled={currentPage >= Math.ceil(executions.length / itemsPerPage)}
                            className="text-[#0A3161] font-bold"
                        >
                            Siguiente
                        </Button>
                    </div>
                )
            }
        </div >
    );
}
