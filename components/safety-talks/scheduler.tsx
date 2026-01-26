'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Bulletin, Station, TalkSchedule } from '@/types/safety-talks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CalendarIcon, Save, Trash2, Globe, Loader2, Search, X, ListPlus, Calendar, ArrowRight, Zap } from 'lucide-react';
import { format, addDays, isWeekend, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function SafetyTalkScheduler() {
    const supabase = createClientComponentClient();

    // Data
    const [bulletins, setBulletins] = useState<Bulletin[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [schedules, setSchedules] = useState<TalkSchedule[]>([]);
    const [loading, setLoading] = useState(true);

    // Form
    const [selectedBulletin, setSelectedBulletin] = useState<string>('');
    const [selectedBulletinData, setSelectedBulletinData] = useState<Bulletin | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [targetStation, setTargetStation] = useState<string>('GLOBAL'); // 'GLOBAL' or station_code
    const [isMandatory, setIsMandatory] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Search
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Bulk Mode
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkSelection, setBulkSelection] = useState<Bulletin[]>([]);
    const [draftSchedules, setDraftSchedules] = useState<{ bulletin: Bulletin; date: string }[]>([]);
    const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);

    const filteredBulletins = bulletins.filter(b =>
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleBulletinInBulk = (bulletin: Bulletin) => {
        setBulkSelection(prev => {
            const exists = prev.find(b => b.id === bulletin.id);
            if (exists) return prev.filter(b => b.id !== bulletin.id);
            return [...prev, bulletin];
        });
    };

    const generateDraft = () => {
        if (bulkSelection.length === 0 || !selectedDate) {
            toast.error('Selecciona temas y una fecha de inicio primero');
            return;
        }

        let current = new Date(selectedDate);
        const newDraft = bulkSelection.map((bulletin) => {
            // Find next weekday if weekend
            while (isWeekend(current)) {
                current = addDays(current, 1);
            }
            const dateStr = format(current, 'yyyy-MM-dd');
            current = addDays(current, 1); // Increment for next one
            return { bulletin, date: dateStr };
        });

        setDraftSchedules(newDraft);
        // We don't toast anymore, it's part of the flow
    };

    useEffect(() => {
        loadMasterData();
        loadSchedules();
    }, []);

    const loadMasterData = async () => {
        setLoading(true);
        // Cargar Boletines
        const { data: bData } = await supabase.from('bulletins').select('*').eq('is_active', true);
        if (bData) setBulletins(bData as Bulletin[]);

        // Cargar Estaciones
        const { data: sData } = await supabase.from('stations').select('*').eq('is_active', true);
        if (sData) setStations(sData as Station[]);

        setLoading(false);
    };

    const loadSchedules = async () => {
        // Cargar próximas charlas (o recientes)
        const today = format(new Date(), 'yyyy-MM-dd');

        const { data, error } = await supabase
            .from('talk_schedules')
            .select(`*, bulletin:bulletins(title, code)`)
            .order('scheduled_date', { ascending: false }) // Show newest created/scheduled first
            .limit(20);

        if (error) {
            console.error('Error loading schedules:', error);
            toast.error('Error cargando lista');
        }

        if (data) setSchedules(data as unknown as TalkSchedule[]);
    };

    const handleSchedule = async () => {
        if (isBulkMode) {
            if (draftSchedules.length === 0) {
                toast.error('No hay una propuesta de calendario generada');
                return;
            }
            setIsSubmitting(true);
            try {
                const stationCode = targetStation === 'GLOBAL' ? null : targetStation;
                const inserts = draftSchedules.map(item => ({
                    bulletin_id: item.bulletin.id,
                    scheduled_date: item.date,
                    station_code: stationCode,
                    is_mandatory: isMandatory,
                }));

                const { error } = await supabase.from('talk_schedules').insert(inserts);
                if (error) throw error;

                toast.success(`¡Disfruta! Se programaron ${inserts.length} charlas.`);
                setDraftSchedules([]);
                setBulkSelection([]);
                loadSchedules();
            } catch (error: any) {
                toast.error('Error masivo: ' + error.message);
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        if (!selectedBulletin || !selectedDate) {
            toast.error('Complete todos los campos obligatorios');
            return;
        }

        setIsSubmitting(true);
        try {
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const stationCode = targetStation === 'GLOBAL' ? null : targetStation;

            const { error } = await supabase.from('talk_schedules').insert({
                bulletin_id: selectedBulletin,
                scheduled_date: formattedDate,
                station_code: stationCode,
                is_mandatory: isMandatory,
            });

            if (error) throw error;

            toast.success('Charla programada correctamente');
            // Reset simple
            setSelectedBulletin('');
            setSelectedBulletinData(null);
            loadSchedules(); // Actualizar lista
        } catch (error: any) {
            toast.error('Error al programar: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta programación?')) return;

        const { error } = await supabase.from('talk_schedules').delete().eq('id', id);
        if (error) toast.error(error.message);
        else {
            toast.success('Eliminado');
            loadSchedules();
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <Card className="lg:col-span-5 border-0 shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white rounded-3xl overflow-hidden">
                <div className="bg-[#0A3161] p-8">
                    <CardHeader className="p-0 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-[#B3D400] text-2xl font-black uppercase tracking-tight">Programar Charla</CardTitle>
                            <CardDescription className="text-white/60 font-bold uppercase tracking-widest text-[10px] mt-1">Asigne temas de seguridad a la operación</CardDescription>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl border border-white/5">
                            <Zap className={`w-4 h-4 ${isBulkMode ? 'text-[#B3D400]' : 'text-white/20'}`} />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Ráfaga</span>
                            <Switch checked={isBulkMode} onCheckedChange={(val) => {
                                setIsBulkMode(val);
                                if (!val) {
                                    setBulkSelection([]);
                                    setDraftSchedules([]);
                                }
                            }} />
                        </div>
                    </CardHeader>
                </div>
                <CardContent className="p-8 space-y-6">
                    {/* Boletín Searchable / Multi-Searchable */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                            {isBulkMode ? `Temas Seleccionados (${bulkSelection.length})` : 'Tema / Boletín'}
                        </label>
                        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full h-12 bg-slate-50 border-0 hover:bg-slate-100 justify-between px-4 rounded-xl font-bold text-[#0A3161] overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <Search className="h-4 w-4 text-slate-400 shrink-0" />
                                        {isBulkMode ? (
                                            bulkSelection.length > 0 ? (
                                                <span className="text-[#0A3161] font-black">{bulkSelection.length} temas seleccionados</span>
                                            ) : (
                                                <span className="text-slate-400">Seleccionar múltiples temas...</span>
                                            )
                                        ) : selectedBulletinData ? (
                                            <span className="truncate">
                                                <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded mr-2 font-mono">{selectedBulletinData.code}</span>
                                                {selectedBulletinData.title}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">Buscar un boletín...</span>
                                        )}
                                    </div>
                                    {!isBulkMode && selectedBulletinData && (
                                        <X className="h-4 w-4 text-slate-300" onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedBulletin('');
                                            setSelectedBulletinData(null);
                                        }} />
                                    )}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl rounded-3xl">
                                <DialogHeader className="bg-[#0A3161] p-6">
                                    <div className="flex items-center justify-between">
                                        <DialogTitle className="text-[#B3D400] text-xl font-black uppercase tracking-tight">
                                            {isBulkMode ? 'Selección Múltiple' : 'Seleccionar Boletín'}
                                        </DialogTitle>
                                        {isBulkMode && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsSearchOpen(false)}
                                                className="h-8 border-[#B3D400] text-[#B3D400] font-black uppercase text-[10px] tracking-widest rounded-lg hover:bg-[#B3D400] hover:text-[#0A3161] bg-transparent"
                                            >
                                                Listo ({bulkSelection.length})
                                            </Button>
                                        )}
                                    </div>
                                    <div className="relative mt-4">
                                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-white/40" />
                                        <Input
                                            placeholder="Buscar por código o título..."
                                            className="h-12 pl-12 bg-white/10 border-0 text-white placeholder:text-white/40 focus-visible:ring-1 focus-visible:ring-[#B3D400]/50 rounded-xl font-bold"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </DialogHeader>
                                <div className="max-h-[400px] overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                    {filteredBulletins.length > 0 ? (
                                        filteredBulletins.map(b => {
                                            const isSelected = isBulkMode
                                                ? bulkSelection.some(item => item.id === b.id)
                                                : selectedBulletin === b.id;

                                            return (
                                                <div
                                                    key={b.id}
                                                    onClick={() => {
                                                        if (isBulkMode) {
                                                            toggleBulletinInBulk(b);
                                                        } else {
                                                            setSelectedBulletin(b.id);
                                                            setSelectedBulletinData(b);
                                                            setIsSearchOpen(false);
                                                            setSearchTerm('');
                                                        }
                                                    }}
                                                    className={`p-4 border-2 rounded-2xl cursor-pointer transition-all flex items-start gap-4 ${isSelected
                                                        ? 'border-[#B3D400] bg-[#B3D400]/5'
                                                        : 'border-slate-50 hover:border-[#0A3161]/20 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{b.code}</span>
                                                            <Badge variant="outline" className={`text-[8px] font-black uppercase border-0 ${b.alert_level === 'ROJA' ? 'bg-red-100 text-red-600' :
                                                                b.alert_level === 'AMBAR' ? 'bg-amber-100 text-amber-600' :
                                                                    'bg-green-100 text-green-600'
                                                                }`}>
                                                                {b.alert_level}
                                                            </Badge>
                                                        </div>
                                                        <p className="font-black text-[#0A3161] text-sm leading-tight uppercase tracking-tight">{b.title}</p>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-6 h-6 bg-[#B3D400] rounded-full flex items-center justify-center text-[#0A3161]">
                                                            {isBulkMode ? <Zap className="h-3 w-3" /> : <Save className="h-3 w-3" />}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-12 text-center space-y-4 text-slate-300">
                                            <Search className="w-12 h-12 mx-auto opacity-20" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">No se encontraron resultados</p>
                                        </div>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Fecha */}
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                                {isBulkMode ? 'Fecha de Inicio' : 'Fecha de Ejecución'}
                            </label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                                <input
                                    type="date"
                                    className="w-full h-12 pl-11 pr-4 bg-slate-50 border-0 focus:ring-2 focus:ring-[#0A3161]/10 rounded-xl font-bold text-[#0A3161] outline-none transition-all"
                                    value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                                />
                            </div>
                        </div>

                        {/* Alcance */}
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Alcance (Estación)</label>
                            <Select value={targetStation} onValueChange={setTargetStation}>
                                <SelectTrigger className="h-12 bg-slate-50 border-0 focus:ring-2 focus:ring-[#0A3161]/10 rounded-xl font-bold text-[#0A3161]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                    <SelectItem value="GLOBAL" className="font-bold text-[#0A3161]">TODAS LAS BASES</SelectItem>
                                    {stations.map(s => (
                                        <SelectItem key={s.code} value={s.code} className="font-bold text-[#0A3161]">
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {isBulkMode && bulkSelection.length > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-400">
                            <Button
                                className="w-full h-14 bg-[#0A3161] hover:bg-[#0A3161]/90 text-white font-black uppercase text-[12px] tracking-widest rounded-2xl transition-all shadow-lg"
                                onClick={() => {
                                    if (draftSchedules.length === 0) generateDraft();
                                    setIsDraftModalOpen(true);
                                }}
                            >
                                <ListPlus className="mr-2 h-5 w-5 text-[#B3D400]" />
                                Configurar Calendario ({bulkSelection.length})
                            </Button>

                            <Dialog open={isDraftModalOpen} onOpenChange={setIsDraftModalOpen}>
                                <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 shadow-2xl rounded-[2rem] bg-slate-50">
                                    <div className="flex flex-col h-[85vh]">
                                        {/* Header */}
                                        <div className="bg-[#0A3161] p-8 shrink-0">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <DialogTitle className="text-[#B3D400] text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                                        <Zap className="h-6 w-6" />
                                                        Modo Ráfaga: Configuración
                                                    </DialogTitle>
                                                    <DialogDescription className="text-white/60 font-bold uppercase tracking-widest text-[10px] mt-1">
                                                        Revise la distribución de fechas y ajustes operacionales
                                                    </DialogDescription>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => setIsDraftModalOpen(false)}
                                                    className="text-white/40 hover:text-white hover:bg-white/10 rounded-xl"
                                                >
                                                    <X className="h-6 w-6" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                                            {/* Panel Izquierdo: Configuración Global */}
                                            <div className="w-full md:w-80 bg-white p-8 border-r border-slate-100 flex flex-col gap-6 shrink-0">
                                                <div className="space-y-4">
                                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ajustes Globales</h3>

                                                    {/* Fecha Inicio */}
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Fecha Inicio</label>
                                                        <input
                                                            type="date"
                                                            className="w-full h-12 px-4 bg-slate-50 border-0 rounded-xl font-bold text-[#0A3161] outline-none"
                                                            value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                                                            onChange={(e) => {
                                                                const newDate = new Date(e.target.value);
                                                                setSelectedDate(newDate);
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Alcance Modal */}
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Alcance (Estación)</label>
                                                        <Select value={targetStation} onValueChange={setTargetStation}>
                                                            <SelectTrigger className="h-12 bg-slate-50 border-0 rounded-xl font-bold text-[#0A3161]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="GLOBAL">TODAS LAS BASES</SelectItem>
                                                                {stations.map(s => (
                                                                    <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Mandatory Toggle */}
                                                    <div
                                                        className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 group cursor-pointer"
                                                        onClick={() => setIsMandatory(!isMandatory)}
                                                    >
                                                        <Checkbox checked={isMandatory} onCheckedChange={(c) => setIsMandatory(!!c)} />
                                                        <div className="space-y-0.5">
                                                            <p className="text-[10px] font-black uppercase text-[#0A3161]">Mandatorio</p>
                                                            <p className="text-[8px] text-slate-400 font-bold uppercase">Requiere firma</p>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        variant="outline"
                                                        onClick={generateDraft}
                                                        className="w-full h-12 border-2 border-[#0A3161] text-[#0A3161] font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-[#0A3161] hover:text-white"
                                                    >
                                                        Re-distribuir Fechas
                                                    </Button>
                                                </div>

                                                <div className="mt-auto p-4 bg-[#B3D400]/10 rounded-2xl border border-[#B3D400]/20">
                                                    <p className="text-[9px] font-bold text-[#0A3161] uppercase leading-relaxed italic text-center">
                                                        "El sistema asigna un tema por día hábil automáticamente."
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Panel Derecho: Lista de Temas */}
                                            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-slate-50">
                                                <div className="max-w-2xl mx-auto space-y-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Distribución por Tema</h3>
                                                        <Badge className="bg-[#0A3161] text-white border-0 font-black">{draftSchedules.length} Días</Badge>
                                                    </div>

                                                    {draftSchedules.map((item, idx) => (
                                                        <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group hover:border-[#0A3161]/20 transition-all">
                                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-[#0A3161] font-black group-hover:bg-[#B3D400]/20 transition-colors">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-black text-[#0A3161] uppercase truncate leading-tight">{item.bulletin.title}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[9px] font-black font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{item.bulletin.code}</span>
                                                                    <Badge className="h-4 text-[7px] font-black px-1 border-0" style={{
                                                                        backgroundColor: item.bulletin.alert_level === 'ROJA' ? '#fee2e2' : item.bulletin.alert_level === 'AMBAR' ? '#fef3c7' : '#dcfce7',
                                                                        color: item.bulletin.alert_level === 'ROJA' ? '#ef4444' : item.bulletin.alert_level === 'AMBAR' ? '#d97706' : '#16a34a'
                                                                    }}>
                                                                        {item.bulletin.alert_level}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0">
                                                                <input
                                                                    type="date"
                                                                    value={item.date}
                                                                    onChange={(e) => {
                                                                        const newDraft = [...draftSchedules];
                                                                        newDraft[idx].date = e.target.value;
                                                                        setDraftSchedules(newDraft);
                                                                    }}
                                                                    className="h-10 px-3 text-[11px] font-black text-[#0A3161] bg-slate-50 border-0 rounded-xl outline-none focus:ring-2 focus:ring-[#B3D400]/50"
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    const bId = item.bulletin.id;
                                                                    setDraftSchedules(prev => prev.filter((_, i) => i !== idx));
                                                                    setBulkSelection(prev => prev.filter(b => b.id !== bId));
                                                                }}
                                                                className="h-10 w-10 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="p-8 bg-white border-t border-slate-100 shrink-0">
                                            <div className="max-w-2xl mx-auto flex items-center justify-between gap-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex -space-x-3 overflow-hidden">
                                                        {bulkSelection.slice(0, 4).map((b, i) => (
                                                            <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-[#0A3161]">
                                                                {b.code}
                                                            </div>
                                                        ))}
                                                        {bulkSelection.length > 4 && (
                                                            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-[#0A3161] text-white flex items-center justify-center text-[8px] font-black">
                                                                +{bulkSelection.length - 4}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-[#0A3161] uppercase leading-none">Confirmar Selección</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Se crearán {draftSchedules.length} registros</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    className="h-14 px-8 bg-[#B3D400] hover:bg-[#a2c100] text-[#0A3161] font-black uppercase text-[12px] tracking-widest rounded-2xl transition-all shadow-xl shadow-[#B3D400]/20 min-w-[240px]"
                                                    onClick={async () => {
                                                        await handleSchedule();
                                                        setIsDraftModalOpen(false);
                                                    }}
                                                    disabled={isSubmitting || draftSchedules.length === 0}
                                                >
                                                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                                    Programar Todo
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#0A3161]/60 leading-relaxed">
                            {targetStation === 'GLOBAL'
                                ? 'La charla aparecerá sugerida en TODAS las bases operacionales del sistema.'
                                : `Solo el personal asignado a la base ${targetStation} verá esta charla en su panel.`}
                        </p>
                    </div>

                    {/* Obligatorio */}
                    <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 group cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={() => setIsMandatory(!isMandatory)}>
                        <Checkbox
                            id="mandatory"
                            checked={isMandatory}
                            onCheckedChange={(c) => setIsMandatory(!!c)}
                            className="h-5 w-5 rounded-lg border-2 border-[#0A3161]/20 data-[state=checked]:bg-[#0A3161] data-[state=checked]:border-[#0A3161]"
                        />
                        <div className="space-y-0.5">
                            <label
                                htmlFor="mandatory"
                                className="text-[11px] font-black uppercase tracking-wider text-[#0A3161] cursor-pointer"
                            >
                                Marcar como Obligatorio
                            </label>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Requiere firma de asistencia</p>
                        </div>
                    </div>

                    {!isBulkMode && (
                        <Button
                            className="w-full h-14 bg-[#B3D400] hover:bg-[#a2c100] text-[#0A3161] font-black uppercase text-[12px] tracking-widest rounded-2xl transition-all shadow-lg shadow-[#B3D400]/20 border-0"
                            onClick={handleSchedule}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-5 w-5" />
                            )}
                            {isSubmitting ? 'Guardando...' : 'Programar Charla'}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* LISTA DE PROGRAMACION ACTIVA */}
            <Card className="lg:col-span-7 border-0 shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white rounded-3xl overflow-hidden p-0">
                <CardHeader className="pb-6 p-6 md:p-8 bg-white border-b border-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#B3D400]/10 rounded-xl flex items-center justify-center text-[#B3D400]">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-[#0A3161] text-xl font-black uppercase tracking-tight">Próximas Charlas</CardTitle>
                            <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Calendario operacional activo</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#0A3161] border-b border-[#0A3161]/10">
                                <tr>
                                    <th className="p-5 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Fecha</th>
                                    <th className="p-5 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Boletín</th>
                                    <th className="p-5 text-center font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Alcance</th>
                                    <th className="p-5 text-right w-[80px]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="h-10 w-10 border-4 border-[#B3D400] border-t-[#0A3161] rounded-full animate-spin" />
                                                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Cargando calendario...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : schedules.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                                                    <CalendarIcon className="w-8 h-8" />
                                                </div>
                                                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No hay charlas programadas</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    schedules.map(sch => (
                                        <tr key={sch.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-5 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-[#0A3161] text-xs">
                                                        {format(new Date(sch.scheduled_date + 'T00:00:00'), 'dd MMM yyyy', { locale: es }).toUpperCase()}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Día Programado</span>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <div className="space-y-1">
                                                    <p className="font-black text-[#0A3161] uppercase text-xs leading-tight line-clamp-2">{sch.bulletin?.title}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-mono font-black text-slate-500">{sch.bulletin?.code}</span>
                                                        {sch.is_mandatory && (
                                                            <Badge className="bg-[#B3D400]/20 text-[#0A3161] hover:bg-[#B3D400]/30 border-0 text-[8px] font-black px-1.5 py-0 h-4">MANDATORIO</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5 text-center">
                                                {sch.station_code ? (
                                                    <Badge variant="outline" className="border-slate-200 text-[#0A3161] font-black text-[9px] px-2 py-1 rounded-lg">
                                                        {sch.station_code}
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-[#0A3161] text-white hover:bg-[#0A3161]/90 border-0 text-[8px] font-black px-2 py-1 rounded-lg">
                                                        <Globe className="h-2.5 w-2.5 mr-1" /> GLOBAL
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="p-5 text-right w-[80px]">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                    onClick={() => handleDelete(sch.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
