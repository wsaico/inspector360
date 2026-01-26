'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Bulletin } from '@/types/safety-talks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, FileText, ExternalLink, Edit2, Trash2, FileSpreadsheet, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SafetyTalksService } from '@/lib/services/safety-talks';

export default function BulletinsPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();

    // List state
    const [bulletins, setBulletins] = useState<Bulletin[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [orgFilter, setOrgFilter] = useState('ALL');

    // Modal state
    const [open, setOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form
    const [formData, setFormData] = useState({
        code: '',
        title: '',
        alert_level: 'VERDE',
        organization: 'TALMA',
        document_url: ''
    });

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadBulletins();
        }, 300);
        return () => clearTimeout(timeout);
    }, [page, search, orgFilter]);

    const loadBulletins = async () => {
        setLoading(true);
        const { data, total: totalCount } = await SafetyTalksService.listBulletins({
            page,
            pageSize: 10,
            search,
            organization: orgFilter
        });
        setBulletins(data || []);
        setTotal(totalCount);
        setLoading(false);
    };

    const handleCreate = () => {
        setIsEditing(false);
        setEditingId(null);
        setFormData({ code: '', title: '', alert_level: 'VERDE', organization: 'TALMA', document_url: '' });
        setOpen(true);
    };

    const handleEdit = (bulletin: Bulletin) => {
        setIsEditing(true);
        setEditingId(bulletin.id);
        setFormData({
            code: bulletin.code,
            title: bulletin.title,
            alert_level: bulletin.alert_level || 'VERDE',
            organization: bulletin.organization || 'TALMA',
            document_url: bulletin.document_url || ''
        });
        setOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este boletín?')) return;

        const { error } = await supabase.from('bulletins').delete().eq('id', id);

        if (error) {
            toast.error('Error al eliminar: ' + error.message);
        } else {
            toast.success('Boletín eliminado');
            loadBulletins();
        }
    };

    const handleSubmit = async () => {
        if (!formData.code || !formData.title || !formData.document_url) {
            toast.error('Complete los campos requeridos');
            return;
        }

        let error;

        if (isEditing && editingId) {
            const result = await supabase.from('bulletins')
                .update({ ...formData })
                .eq('id', editingId);
            error = result.error;
        } else {
            const result = await supabase.from('bulletins').insert({
                ...formData,
                is_active: true
            });
            error = result.error;
        }

        if (error) {
            toast.error('Error: ' + error.message);
        } else {
            toast.success(isEditing ? 'Boletín actualizado' : 'Boletín creado');
            setOpen(false);
            loadBulletins();
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0A3161] uppercase leading-none">
                        Boletines de Seguridad
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Gestión de contenido y material para capacitación</p>
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <Button
                        variant="outline"
                        className="flex-1 md:flex-none border-2 border-[#0A3161] text-[#0A3161] font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-2xl hover:bg-[#0A3161] hover:text-white transition-all shadow-sm"
                        onClick={() => router.push('/talks/bulletins/upload')}
                    >
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Carga Masiva
                    </Button>
                    <Button
                        className="flex-1 md:flex-none bg-[#B3D400] hover:bg-[#a2c100] text-[#0A3161] font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-2xl transition-all shadow-lg shadow-[#B3D400]/20 border-0"
                        onClick={handleCreate}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Boletín
                    </Button>
                </div>
            </div>

            <Card className="border-0 shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white rounded-3xl overflow-hidden p-0">
                <CardHeader className="pb-6 p-6 md:p-8 bg-white border-b border-slate-50">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-[#0A3161] transition-colors" />
                            <Input
                                placeholder="Buscar por código o título..."
                                className="pl-11 h-11 bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-[#0A3161]/10 rounded-xl font-bold text-[#0A3161] placeholder:text-slate-400"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            />
                        </div>
                        <Select value={orgFilter} onValueChange={(v) => { setOrgFilter(v); setPage(1); }}>
                            <SelectTrigger className="w-full md:w-[220px] h-11 bg-slate-50 border-0 focus:ring-2 focus:ring-[#0A3161]/10 rounded-xl font-bold text-[#0A3161]">
                                <SelectValue placeholder="Organización" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                <SelectItem value="ALL" className="font-bold text-[#0A3161]">Todas las Orgs</SelectItem>
                                <SelectItem value="TALMA" className="font-bold text-[#0A3161]">TALMA</SelectItem>
                                <SelectItem value="LATAM" className="font-bold text-[#0A3161]">LATAM</SelectItem>
                                <SelectItem value="SKY" className="font-bold text-[#0A3161]">SKY</SelectItem>
                                <SelectItem value="JETSMART" className="font-bold text-[#0A3161]">JETSMART</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-[#0A3161] border-b border-[#0A3161]/10">
                                <TableRow>
                                    <TableHead className="w-[150px] p-5 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Código</TableHead>
                                    <TableHead className="p-5 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Título del Tema</TableHead>
                                    <TableHead className="w-[120px] p-5 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Alerta</TableHead>
                                    <TableHead className="w-[120px] p-5 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Organización</TableHead>
                                    <TableHead className="w-[150px] p-5 text-right font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100">
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="h-10 w-10 border-4 border-[#B3D400] border-t-[#0A3161] rounded-full animate-spin" />
                                                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Cargando boletines...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : bulletins.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                                                    <FileText className="w-8 h-8" />
                                                </div>
                                                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No se encontraron boletines</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    bulletins.map((b) => (
                                        <TableRow key={b.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <TableCell className="p-5">
                                                <div className="px-3 py-1.5 bg-slate-100 rounded-lg inline-block">
                                                    <span className="font-mono text-[10px] font-black text-[#0A3161]">{b.code}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-5">
                                                <span className="font-black text-[#0A3161] uppercase text-xs leading-tight group-hover:text-[#0A3161] transition-colors">{b.title}</span>
                                            </TableCell>
                                            <TableCell className="p-5">
                                                <Badge className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border-0 ${b.alert_level === 'ROJA' ? 'bg-red-100 text-red-600 shadow-sm shadow-red-100/50' :
                                                    b.alert_level === 'AMBAR' ? 'bg-amber-100 text-amber-600 shadow-sm shadow-amber-100/50' :
                                                        'bg-[#B3D400]/20 text-[#0A3161] shadow-sm shadow-[#B3D400]/10'
                                                    }`} variant="outline">
                                                    {b.alert_level}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="p-5">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{b.organization}</span>
                                            </TableCell>
                                            <TableCell className="p-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {b.document_url && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-10 w-10 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                            onClick={() => window.open(b.document_url, '_blank')}
                                                            title="Ver Documento"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 text-[#0A3161] hover:bg-[#B3D400]/20 rounded-xl transition-all"
                                                        onClick={() => handleEdit(b)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        onClick={() => handleDelete(b.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            Mostrando <span className="text-[#0A3161]">{bulletins.length}</span> de <span className="text-[#0A3161]">{total}</span> boletines
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1 || loading}
                                onClick={() => setPage(p => p - 1)}
                                className="h-10 px-4 border-[#0A3161] text-[#0A3161] font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-[#0A3161] hover:text-white transition-all shadow-sm"
                            >
                                <ChevronLeft className="h-3.5 w-3.5 mr-2" /> Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page * 10 >= total || loading}
                                onClick={() => setPage(p => p + 1)}
                                className="h-10 px-4 border-[#0A3161] text-[#0A3161] font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-[#0A3161] hover:text-white transition-all shadow-sm"
                            >
                                Siguiente <ChevronRight className="h-3.5 w-3.5 ml-2" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-3xl border-0 shadow-2xl p-0 overflow-hidden">
                    <div className="bg-[#0A3161] p-8">
                        <DialogHeader>
                            <DialogTitle className="text-[#B3D400] text-2xl font-black uppercase tracking-tight">
                                {isEditing ? 'Editar Boletín' : 'Nuevo Boletín'}
                            </DialogTitle>
                            <p className="text-white/60 font-bold uppercase tracking-widest text-[10px] mt-1">
                                {isEditing ? 'Actualice los datos del material' : 'Complete la información para el nuevo tema'}
                            </p>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Código del Boletín</label>
                                <Input
                                    placeholder="Ej: TLM-AR-21014"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    className="h-12 bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-[#0A3161]/10 rounded-xl font-bold text-[#0A3161]"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Título del Tema</label>
                                <Input
                                    placeholder="Ej: Uso correcto de EPP"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="h-12 bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-[#0A3161]/10 rounded-xl font-bold text-[#0A3161]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Organización</label>
                                    <Select
                                        value={formData.organization}
                                        onValueChange={v => setFormData({ ...formData, organization: v })}
                                    >
                                        <SelectTrigger className="h-12 bg-slate-50 border-0 focus:ring-2 focus:ring-[#0A3161]/10 rounded-xl font-bold text-[#0A3161]">
                                            <SelectValue placeholder="Org" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                            <SelectItem value="TALMA" className="font-bold text-[#0A3161]">TALMA</SelectItem>
                                            <SelectItem value="LATAM" className="font-bold text-[#0A3161]">LATAM</SelectItem>
                                            <SelectItem value="SKY" className="font-bold text-[#0A3161]">SKY</SelectItem>
                                            <SelectItem value="JETSMART" className="font-bold text-[#0A3161]">JETSMART</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Nivel de Alerta</label>
                                    <Select
                                        value={formData.alert_level}
                                        onValueChange={v => setFormData({ ...formData, alert_level: v as any })}
                                    >
                                        <SelectTrigger className="h-12 bg-slate-50 border-0 focus:ring-2 focus:ring-[#0A3161]/10 rounded-xl font-bold text-[#0A3161]">
                                            <SelectValue placeholder="Nivel" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                            <SelectItem value="VERDE" className="font-bold text-[#0A3161]">Verde (Informativo)</SelectItem>
                                            <SelectItem value="AMBAR" className="font-bold text-[#0A3161]">Ámbar (Alerta)</SelectItem>
                                            <SelectItem value="ROJA" className="font-bold text-[#0A3161]">Roja (Crítico)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">URL del Documento (PDF/Link)</label>
                                <Input
                                    placeholder="https://..."
                                    value={formData.document_url}
                                    onChange={e => setFormData({ ...formData, document_url: e.target.value })}
                                    className="h-12 bg-slate-50 border-0 focus-visible:ring-2 focus-visible:ring-[#0A3161]/10 rounded-xl font-bold text-[#0A3161]"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleSubmit}
                            className="w-full bg-[#B3D400] hover:bg-[#a2c100] text-[#0A3161] h-14 uppercase font-black tracking-widest text-[12px] rounded-2xl shadow-lg shadow-[#B3D400]/20 transition-all border-0"
                        >
                            {isEditing ? 'Actualizar Boletín' : 'Guardar Boletín'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
