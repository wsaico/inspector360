'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks';
import { SafetyTalksService } from '@/lib/services/safety-talks';
import { StationsService, StationConfig } from '@/lib/services/stations';
import { Employee, TalkSchedule, Bulletin, AlertLevel } from '@/types/safety-talks';
import { sortEmployeesByHierarchy } from '@/lib/utils/employee-sorting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    Plus, X, PlayCircle, Clock, FileText, UserCheck, Users,
    ChevronRight, ChevronLeft, PenTool, CheckCircle,
    AlertCircle, Search, Building2, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import SignaturePad from '@/components/forms/signature-pad';
import { AttendeeSignatureCapture } from '@/components/safety-talks/attendee-signature-capture';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Info } from 'lucide-react';

// Steps
// 0: Start (Punch In)
// 1: Context & Presenter
// 2: Attendees
// 3: Signatures
// 4: Summary

export function SafetyTalkWizard() {
    const { profile } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(0);
    const [loading, setLoading] = useState(true);

    // Data State
    const [currentStation, setCurrentStation] = useState<string>('LIM');
    const [schedule, setSchedule] = useState<TalkSchedule | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [allStations, setAllStations] = useState<StationConfig[]>([]);

    // Execution State
    const [startTime, setStartTime] = useState<string | null>(null);
    const [presenterId, setPresenterId] = useState('');
    const [presenterSignature, setPresenterSignature] = useState('');
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [attendeeSignatures, setAttendeeSignatures] = useState<Record<string, string>>({});
    const [observations, setObservations] = useState('');
    const [activityType, setActivityType] = useState('charla');
    const [selectedBulletin, setSelectedBulletin] = useState<Bulletin | null>(null);
    const [isManualSelection, setIsManualSelection] = useState(false);
    const [allBulletins, setAllBulletins] = useState<Bulletin[]>([]);
    const [searchBulletin, setSearchBulletin] = useState('');
    const [attendeeSearch, setAttendeeSearch] = useState('');
    const [isQuickCreating, setIsQuickCreating] = useState(false);
    const [quickTitle, setQuickTitle] = useState('');
    const [quickAlert, setQuickAlert] = useState<AlertLevel>('VERDE');
    const [quickOrg, setQuickOrg] = useState('TALMA');
    const [quickDocUrl, setQuickDocUrl] = useState('');

    // Brand Colors (from globals.css tokens)
    const brandNavy = "bg-[#0A3161]"; // primary
    const brandLime = "bg-[#B3D400]"; // secondary
    const textNavy = "text-[#0A3161]";
    const borderNavy = "border-[#0A3161]";

    // Init Loading
    useEffect(() => {
        if (profile?.station) setCurrentStation(profile.station);
        if (profile?.role === 'admin') {
            StationsService.listActive().then(res => setAllStations(res.data));
        }
    }, [profile]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data: talk } = await SafetyTalksService.getSuggestedTalk(currentStation);
            const { data: emps } = await SafetyTalksService.getStationEmployees(currentStation);

            setSchedule(talk);
            setSelectedBulletin(talk?.bulletin || null);
            setEmployees(sortEmployeesByHierarchy(emps || []));
            setLoading(false);
        };
        load();
    }, [currentStation]);

    // Load all bulletins when manual selection is active
    useEffect(() => {
        if (isManualSelection) {
            SafetyTalksService.listBulletins({ pageSize: 100 }).then(res => {
                setAllBulletins(res.data || []);
            });
        }
    }, [isManualSelection]);

    const filteredBulletins = useMemo(() => {
        if (!searchBulletin) return allBulletins;
        return allBulletins.filter(b =>
            b.title.toLowerCase().includes(searchBulletin.toLowerCase()) ||
            b.code.toLowerCase().includes(searchBulletin.toLowerCase())
        );
    }, [allBulletins, searchBulletin]);

    // Reset signature when presenter changes
    useEffect(() => {
        setPresenterSignature('');
    }, [presenterId]);

    const handleNext = () => {
        setDirection(1);
        setStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        setDirection(-1);
        setStep(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStartTalk = async () => {
        let bulletinToUse = selectedBulletin;

        if (isQuickCreating && quickTitle) {
            setLoading(true);
            const genCode = `ADHOC-${new Date().getTime().toString().slice(-6)}`;
            const { data: newBulletin, error } = await SafetyTalksService.createBulletin({
                title: quickTitle,
                alert_level: quickAlert,
                code: genCode,
                organization: quickOrg,
                document_url: quickDocUrl
            });

            if (error) {
                toast.error('Error al crear tema: ' + error);
                setLoading(false);
                return;
            }

            bulletinToUse = newBulletin;
            setSelectedBulletin(newBulletin);
            setLoading(false);
        }

        if (!bulletinToUse) {
            toast.error('Debe seleccionar o crear un tema');
            return;
        }

        setStartTime(new Date().toISOString());
        toast.success('¡Charla Iniciada!');
        handleNext();
    };

    // Attendance groupings
    const byArea = useMemo(() => {
        return {
            'RAMPA': employees.filter(e => e.area === 'RAMPA'),
            'PAX': employees.filter(e => e.area === 'PAX'),
            'MANTTO': employees.filter(e => e.area === 'MANTTO'),
            'ADMIN': employees.filter(e => e.area === 'ADMIN'),
            'OTROS': employees.filter(e => !['RAMPA', 'PAX', 'MANTTO', 'ADMIN'].includes(e.area))
        };
    }, [employees]);

    const toggleEmp = (id: string) => {
        setSelectedEmployees(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
        if (selectedEmployees.includes(id)) {
            setAttendeeSignatures(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    const toggleArea = (areaKey: string) => {
        const areaIds = byArea[areaKey as keyof typeof byArea].map(e => e.id);
        const allSelected = areaIds.every(id => selectedEmployees.includes(id));
        if (allSelected) {
            setSelectedEmployees(prev => prev.filter(id => !areaIds.includes(id)));
            setAttendeeSignatures(prev => {
                const next = { ...prev };
                areaIds.forEach(id => delete next[id]);
                return next;
            });
        } else {
            setSelectedEmployees(prev => [...new Set([...prev, ...areaIds])]);
        }
    };

    const handleSubmitExecution = async () => {
        setLoading(true);
        try {
            const endTime = new Date().toISOString();
            const start = new Date(startTime!);
            const end = new Date(endTime);
            const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

            const attendeesPayload = selectedEmployees.map(id => ({
                employee_id: id,
                signature: attendeeSignatures[id],
                attended: true
            }));

            const { error } = await SafetyTalksService.registerExecution({
                schedule_id: schedule?.id,
                bulletin_id: !schedule ? selectedBulletin?.id : undefined,
                station_code: currentStation,
                executed_at: startTime!,
                start_time: startTime!,
                end_time: endTime,
                scheduled_headcount: employees.length,
                presenter_id: presenterId,
                presenter_signature: presenterSignature,
                observations,
                duration_min: Math.max(1, durationMin),
                activity_type: activityType
            }, attendeesPayload);

            if (error) throw error;

            toast.success('Charla registrada correctamente');
            router.push('/talks/history');
        } catch (err: any) {
            toast.error('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER ---

    if (loading && step === 0 && !schedule) {
        return <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 font-medium">
            <div className="h-10 w-10 border-4 border-[#0A3161] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="animate-pulse">Sincronizando con estación {currentStation}...</p>
        </div>;
    }

    return (
        <div className="max-w-6xl mx-auto min-h-screen p-4 md:p-8 bg-[#F8FAFC]">
            {/* Stepper Indicator - AUTHENTIC STYLE */}
            <div className="mb-16 flex justify-between items-center max-w-3xl mx-auto relative px-4">
                {[0, 1, 2, 3, 4].map(s => (
                    <div key={s} className="flex flex-col items-center relative z-10 group">
                        <div className={`
                            h-14 w-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 transform
                            ${step === s ? 'bg-[#0A3161] border-[#0A3161] text-white shadow-[0_8px_20px_-6px_rgba(10,49,97,0.4)] -translate-y-1' :
                                step > s ? 'bg-[#B3D400] border-[#B3D400] text-[#0A3161]' : 'bg-white border-slate-200 text-slate-400'}
                        `}>
                            {step > s ? <CheckCircle className="w-7 h-7" /> : <span className="text-xl font-black">{s + 1}</span>}
                        </div>
                        <span className={`text-[10px] font-black mt-3 uppercase tracking-[0.1em] ${step === s ? 'text-[#0A3161]' : 'text-slate-400'}`}>
                            {s === 0 ? 'Inicio' : s === 1 ? 'Líder' : s === 2 ? 'Colaboradores' : s === 3 ? 'Firmas' : 'Final'}
                        </span>
                        {step === s && <motion.div layoutId="step-indicator" className="h-1 w-6 bg-[#B3D400] rounded-full mt-1" />}
                    </div>
                ))}
                {/* Background tracks */}
                <div className="absolute top-[28px] left-[10%] right-[10%] h-[2px] bg-slate-200 -z-0" />
                <div
                    className="absolute top-[28px] left-[10%] h-[2px] bg-[#0A3161] -z-0 transition-all duration-700 ease-in-out"
                    style={{ width: `${(step / 4) * 80}%` }}
                />
            </div>

            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={step}
                    custom={direction}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                    {/* STEP 0: START */}
                    {step === 0 && (
                        <div className="max-w-4xl mx-auto space-y-10 py-4 logo-animate">
                            <div className="text-center space-y-6">
                                <h1 className="text-5xl font-black tracking-tight text-[#0A3161]">Charla de Seguridad</h1>

                                <div className="flex items-center justify-center gap-4">
                                    <div className="h-[2px] w-12 bg-slate-200" />
                                    {profile?.role === 'admin' ? (
                                        <div className="flex flex-col items-center space-y-3">
                                            <div className="flex items-center gap-2 text-[#0A3161] font-bold text-sm uppercase">
                                                <Building2 className="w-4 h-4" /> Configuración de Estación
                                            </div>
                                            <select
                                                className="bg-white border-2 border-slate-200 rounded-xl px-6 py-3 text-2xl font-black text-[#0A3161] focus:border-[#0A3161] outline-none shadow-xl transition-all hover:bg-slate-50"
                                                value={currentStation}
                                                onChange={(e) => setCurrentStation(e.target.value)}
                                            >
                                                {allStations.map(s => (
                                                    <option key={s.code} value={s.code}>{s.name} — {s.code}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <p className="text-2xl text-slate-500 font-bold tracking-tight">Estación <span className="text-[#0A3161]">{currentStation}</span> • {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                    )}
                                    <div className="h-[2px] w-12 bg-slate-200" />
                                </div>
                            </div>

                            <Card className="border-0 shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white rounded-3xl overflow-hidden">
                                <div className="grid md:grid-cols-5 h-full">
                                    <div className="md:col-span-3 p-10 space-y-6">
                                        {!schedule && !isManualSelection ? (
                                            <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                                                <div className="w-16 h-16 bg-[#B3D400]/20 rounded-2xl flex items-center justify-center">
                                                    <CheckCircle className="w-10 h-10 text-[#7BB342]" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h2 className="text-3xl font-black text-[#0A3161] leading-tight flex items-center gap-3">
                                                        ¡Estación al día!
                                                    </h2>
                                                    <p className="text-slate-500 font-medium">No hay charlas programadas pendientes para este turno.</p>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    className="border-[#0A3161] text-[#0A3161] font-black uppercase tracking-widest text-[10px] h-12 px-6 rounded-xl hover:bg-slate-50"
                                                    onClick={() => setIsManualSelection(true)}
                                                >
                                                    <Plus className="w-4 h-4 mr-2" /> Realizar Charla No Programada
                                                </Button>
                                            </div>
                                        ) : isManualSelection && !selectedBulletin ? (
                                            <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[#B3D400] font-black text-xs uppercase tracking-[0.2em]">
                                                        {isQuickCreating ? 'Crear Nuevo Tema' : 'Seleccionar Boletín'}
                                                    </p>
                                                    <Button variant="ghost" size="sm" onClick={() => { setIsManualSelection(false); setIsQuickCreating(false); }} className="h-6 text-slate-400">Cancelar</Button>
                                                </div>

                                                {!isQuickCreating ? (
                                                    <>
                                                        <div className="relative">
                                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                            <Input
                                                                placeholder="Buscar por código o título..."
                                                                className="pl-9 h-11 border-slate-200 rounded-xl"
                                                                value={searchBulletin}
                                                                onChange={(e) => setSearchBulletin(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                            {filteredBulletins.map(b => (
                                                                <div
                                                                    key={b.id}
                                                                    onClick={() => setSelectedBulletin(b)}
                                                                    className="p-3 border-2 border-slate-50 rounded-xl hover:border-[#B3D400] cursor-pointer transition-all hover:bg-slate-50"
                                                                >
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <span className="text-[9px] font-black font-mono text-slate-400">{b.code}</span>
                                                                        <Badge className={`text-[8px] font-black ${b.alert_level === 'ROJA' ? 'bg-red-50 text-red-600' :
                                                                            b.alert_level === 'AMBAR' ? 'bg-amber-50 text-amber-600' :
                                                                                'bg-green-50 text-green-600'
                                                                            }`} variant="outline">{b.alert_level}</Badge>
                                                                    </div>
                                                                    <p className="font-bold text-[#0A3161] text-sm leading-tight">{b.title}</p>
                                                                </div>
                                                            ))}

                                                            <div
                                                                className="p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-[#0A3161] hover:bg-[#0A3161]/5 cursor-pointer flex flex-col items-center justify-center text-center gap-2 transition-all mt-4"
                                                                onClick={() => setIsQuickCreating(true)}
                                                            >
                                                                <Plus className="w-5 h-5 text-[#0A3161]" />
                                                                <span className="text-[10px] font-black text-[#0A3161] uppercase tracking-widest">¿No encuentras el tema? Créalo ahora</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="space-y-4 py-2 animate-in fade-in duration-300">
                                                        <div className="grid gap-2">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título del Tema</label>
                                                            <Input
                                                                placeholder="Ej: Medidas preventivas calor..."
                                                                className="h-11 border-slate-200 rounded-xl"
                                                                value={quickTitle}
                                                                onChange={(e) => setQuickTitle(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel de Alerta</label>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {['VERDE', 'AMBAR', 'ROJA'].map(level => (
                                                                    <button
                                                                        key={level}
                                                                        type="button"
                                                                        onClick={() => setQuickAlert(level as AlertLevel)}
                                                                        className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${quickAlert === level
                                                                            ? (level === 'ROJA' ? 'bg-red-500 border-red-500 text-white' :
                                                                                level === 'AMBAR' ? 'bg-amber-500 border-amber-500 text-white' :
                                                                                    'bg-[#B3D400] border-[#B3D400] text-[#0A3161]')
                                                                            : 'bg-white border-slate-100 text-slate-400'
                                                                            }`}
                                                                    >
                                                                        {level}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="grid gap-2">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Organización</label>
                                                                <Select value={quickOrg} onValueChange={setQuickOrg}>
                                                                    <SelectTrigger className="h-11 border-slate-200 rounded-xl">
                                                                        <SelectValue placeholder="Org" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="TALMA">TALMA</SelectItem>
                                                                        <SelectItem value="LATAM">LATAM</SelectItem>
                                                                        <SelectItem value="SKY">SKY</SelectItem>
                                                                        <SelectItem value="JETSMART">JETSMART</SelectItem>
                                                                        <SelectItem value="SST">OTRO/SST</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Link Documento (PDF)</label>
                                                                <Input
                                                                    placeholder="https://..."
                                                                    className="h-11 border-slate-200 rounded-xl"
                                                                    value={quickDocUrl}
                                                                    onChange={(e) => setQuickDocUrl(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-xl flex gap-3 text-blue-700">
                                                            <Info className="w-5 h-5 shrink-0 mt-0.5" />
                                                            <div className="space-y-1">
                                                                <p className="text-[11px] font-bold leading-tight">Recomendación para archivos</p>
                                                                <p className="text-[9px] leading-tight font-medium">Sube el boletín a <span className="font-bold">Google Drive o OneDrive</span> y pega aquí el enlace público para que otros lo puedan leer.</p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            className="w-full text-[10px] font-black uppercase text-slate-400 mt-2"
                                                            onClick={() => setIsQuickCreating(false)}
                                                        >
                                                            ← Volver al buscador
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <p className="text-[#B3D400] font-black text-xs uppercase tracking-[0.2em]">
                                                            {isManualSelection ? 'Charla No Programada' : 'Tema del Día'}
                                                        </p>
                                                        <h2 className="text-3xl font-black text-[#0A3161] leading-tight">
                                                            {selectedBulletin?.title}
                                                        </h2>
                                                        <p className="text-slate-400 font-mono text-sm">{selectedBulletin?.code}</p>
                                                    </div>
                                                    {isManualSelection && (
                                                        <Button variant="ghost" size="icon" onClick={() => setSelectedBulletin(null)} className="text-slate-300">
                                                            <X className="w-5 h-5" />
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="pt-6 flex gap-4">
                                                    {selectedBulletin?.document_url && (
                                                        <Button
                                                            variant="outline"
                                                            className="border-2 border-[#0A3161] text-[#0A3161] font-black uppercase text-xs tracking-widest hover:bg-[#0A3161] hover:text-white transition-all px-6 py-6"
                                                            onClick={() => window.open(selectedBulletin.document_url, '_blank')}
                                                        >
                                                            <FileText className="w-4 h-4 mr-2" /> Leer Boletín
                                                        </Button>
                                                    )}
                                                    <div className="flex -space-x-2">
                                                        {[1, 2, 3].map(i => (
                                                            <div key={i} className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">I360</div>
                                                        ))}
                                                        <div className="w-10 h-10 rounded-full bg-[#B3D400] border-2 border-white flex items-center justify-center text-[10px] font-black text-[#0A3161]">+{employees.length}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`md:col-span-2 p-10 flex flex-col items-center justify-center text-center space-y-6 transition-all duration-700 ${!selectedBulletin ? 'bg-slate-100' : 'bg-[#0A3161]'}`}>
                                        <PlayCircle className={`w-20 h-20 transition-colors ${!selectedBulletin ? 'text-slate-300' : 'text-[#B3D400] animate-pulse'}`} strokeWidth={1.5} />
                                        <div className="space-y-1">
                                            <p className={`font-black text-xl uppercase tracking-tighter ${(!selectedBulletin && !isQuickCreating) || (isQuickCreating && !quickTitle) ? 'text-slate-400' : 'text-white'}`}>
                                                {isQuickCreating ? (quickTitle ? '¿Listos con el tema?' : 'Creando...') : (!selectedBulletin ? 'Esperando...' : '¿Listos para iniciar?')}
                                            </p>
                                            <p className={`${(!selectedBulletin && !isQuickCreating) || (isQuickCreating && !quickTitle) ? 'text-slate-400/50' : 'text-blue-200/60'} text-xs uppercase font-black tracking-widest`}>
                                                {isQuickCreating ? (quickTitle ? 'Confirma para registrar' : 'Escribe el nombre abajo') : (!selectedBulletin ? 'Selecciona un tema primero' : `Punch in: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)}
                                            </p>
                                        </div>
                                        <Button
                                            size="lg"
                                            className={`w-full font-black py-8 rounded-2xl shadow-2xl transition-all text-lg uppercase tracking-widest ${(!selectedBulletin && !isQuickCreating) || (isQuickCreating && !quickTitle) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#B3D400] text-[#0A3161] hover:bg-[#c9ee00] hover:scale-[1.03] active:scale-95'}`}
                                            onClick={handleStartTalk}
                                            disabled={(!selectedBulletin && !isQuickCreating) || (isQuickCreating && !quickTitle)}
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : 'Iniciar Registro'}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* STEP 1: PRESENTER */}
                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-[#0A3161]/10 pb-6">
                                <div className="space-y-1">
                                    <Badge className="bg-[#0A3161] text-white rounded-md mb-2">Paso 01</Badge>
                                    <h2 className="text-4xl font-black text-[#0A3161] flex items-center gap-3">
                                        Responsable de Charla
                                    </h2>
                                </div>
                                <div className="bg-white border-2 border-[#0A3161] rounded-2xl px-6 py-3 flex items-center gap-4 shadow-sm">
                                    <Clock className="w-5 h-5 text-[#0A3161]" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cronómetro Iniciado</p>
                                        <p className="text-lg font-black text-[#0A3161]">{startTime ? new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
                                        <CardHeader className="bg-slate-50/50 border-b">
                                            <CardTitle className="text-[#0A3161] font-black uppercase text-sm tracking-widest">Seleccionar Atala (Expositor)</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-8">
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tipo de Actividad</label>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        {[
                                                            { id: 'charla', label: 'Charla' },
                                                            { id: 'capacitacion', label: 'Capacitación' },
                                                            { id: 'induccion', label: 'Inducción' },
                                                            { id: 'entrenamiento', label: 'Entrenamiento' },
                                                            { id: 'simulacro', label: 'Simulacro' },
                                                            { id: 'otros', label: 'Otros' }
                                                        ].map(type => (
                                                            <button
                                                                key={type.id}
                                                                type="button"
                                                                onClick={() => setActivityType(type.id)}
                                                                className={`
                                                                    px-4 py-3 rounded-xl border-2 font-bold text-xs transition-all
                                                                    ${activityType === type.id
                                                                        ? 'bg-[#0A3161] border-[#0A3161] text-white'
                                                                        : 'bg-white border-slate-100 text-slate-400 hover:border-[#0A3161]/30 hover:text-[#0A3161]'}
                                                                `}
                                                            >
                                                                {type.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Líder / Expositor</label>
                                                    <select
                                                        className="w-full p-4 text-xl border-2 border-slate-100 rounded-2xl bg-white focus:border-[#0A3161] outline-none font-bold text-[#0A3161] transition-all"
                                                        value={presenterId}
                                                        onChange={(e) => setPresenterId(e.target.value)}
                                                    >
                                                        <option value="">-- Seleccione Líder --</option>
                                                        {employees.map(emp => (
                                                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {presenterId && (
                                                    <div className="bg-[#B3D400]/10 border-l-4 border-[#B3D400] p-6 rounded-r-2xl space-y-2">
                                                        <p className="text-[10px] font-black text-[#0A3161]/60 uppercase tracking-widest">Cargo Operativo</p>
                                                        <p className="text-xl font-black text-[#0A3161]">{employees.find(e => e.id === presenterId)?.position || 'Sin cargo asignado'}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className={`border-0 shadow-2xl rounded-3xl transition-all duration-700 bg-white ${presenterId ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 pointer-events-none'}`}>
                                    <CardHeader className="bg-[#0A3161] text-white">
                                        <CardTitle className="font-black uppercase text-xs tracking-[0.2em] flex items-center gap-2">
                                            <PenTool className="w-4 h-4 text-[#B3D400]" /> Firma del Responsable
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-8 flex flex-col items-center">
                                        <SignaturePad
                                            key={`presenter-${presenterId}`}
                                            onSave={setPresenterSignature}
                                            label="Firma de Validación"
                                        />
                                        {presenterSignature && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-4 bg-[#B3D400] text-[#0A3161] px-4 py-2 rounded-full font-black text-xs uppercase flex items-center gap-2 shadow-lg">
                                                <CheckCircle className="w-4 h-4" /> Firma Vinculada
                                            </motion.div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="flex justify-end pt-10 border-t border-slate-100">
                                <Button
                                    size="lg"
                                    onClick={handleNext}
                                    disabled={!presenterId || !presenterSignature}
                                    className={`h-20 px-16 rounded-2xl font-black text-lg transition-all duration-500 shadow-xl ${presenterSignature ? 'bg-[#0A3161] hover:bg-[#0c3c75] text-white' : 'bg-slate-200 text-slate-400'}`}
                                >
                                    Siguiente: Asistencia <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: ATTENDANCE */}
                    {step === 2 && (
                        <div className="space-y-8">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-[#0A3161]/10 pb-6">
                                <div className="space-y-1">
                                    <Badge className="bg-[#B3D400] text-[#0A3161] rounded-md mb-2">Paso 02</Badge>
                                    <h2 className="text-4xl font-black text-[#0A3161]">Registro Colaboradores</h2>
                                </div>
                                <div className="bg-[#0A3161] rounded-2xl px-8 py-4 text-white shadow-xl flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-blue-200/50 uppercase tracking-widest">Colaboradores</p>
                                        <p className="text-2xl font-black">{selectedEmployees.length}</p>
                                    </div>
                                    <div className="w-[1px] h-10 bg-white/10" />
                                    <div className="text-center">
                                        <p className="text-[10px] font-black text-blue-200/50 uppercase tracking-widest">Estación</p>
                                        <p className="text-2xl font-black tracking-tighter">{currentStation}</p>
                                    </div>
                                </div>
                            </div>


                            {/* Search Bar for Attendees */}
                            <div className="sticky top-0 z-20 bg-[#F8FAFC] pb-4 pt-2">
                                <div className="relative max-w-lg">
                                    <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                    <Input
                                        placeholder="Buscar colaborador por nombre, DNI o cargo..."
                                        className="pl-10 h-12 bg-white border-slate-200 rounded-xl shadow-sm text-lg"
                                        value={attendeeSearch}
                                        onChange={(e) => setAttendeeSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-8 pb-24">
                                {Object.entries(byArea).map(([area, areaEmps]) => {
                                    // Filter employees based on search
                                    const filteredEmps = areaEmps.filter(e =>
                                        !attendeeSearch ||
                                        e.full_name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
                                        (e.dni && e.dni.includes(attendeeSearch)) ||
                                        (e.position && e.position.toLowerCase().includes(attendeeSearch.toLowerCase()))
                                    );

                                    if (filteredEmps.length === 0) return null;

                                    const allSelected = filteredEmps.every(e => selectedEmployees.includes(e.id));

                                    return (
                                        <div key={area} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                            <div className="flex items-center justify-between p-4 bg-slate-50/50 border-b border-slate-100">
                                                <h3 className="font-black text-[#0A3161] uppercase tracking-widest text-sm flex items-center gap-2">
                                                    <div className="w-1.5 h-6 bg-[#B3D400] rounded-full" />
                                                    {area}
                                                    <Badge variant="secondary" className="bg-slate-200 text-slate-600 font-bold ml-2">{filteredEmps.length}</Badge>
                                                </h3>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        const ids = filteredEmps.map(e => e.id);
                                                        if (allSelected) {
                                                            setSelectedEmployees(prev => prev.filter(id => !ids.includes(id)));
                                                            setAttendeeSignatures(prev => {
                                                                const next = { ...prev };
                                                                ids.forEach(id => delete next[id]);
                                                                return next;
                                                            });
                                                        } else {
                                                            setSelectedEmployees(prev => [...new Set([...prev, ...ids])]);
                                                        }
                                                    }}
                                                    className="text-[10px] font-black text-[#0A3161] hover:bg-[#0A3161] hover:text-white border border-[#0A3161]/20 px-3 h-8 rounded-lg"
                                                >
                                                    {allSelected ? 'DESMARCAR TODO' : 'SELECCIONAR TODO'}
                                                </Button>
                                            </div>

                                            <div className="divide-y divide-slate-50">
                                                {filteredEmps.map(emp => {
                                                    const isSelected = selectedEmployees.includes(emp.id);
                                                    return (
                                                        <div
                                                            key={emp.id}
                                                            onClick={() => toggleEmp(emp.id)}
                                                            className={`
                                                                flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-slate-50 group
                                                                ${isSelected ? 'bg-blue-50/30' : ''}
                                                            `}
                                                        >
                                                            <div className="flex items-center gap-4 overflow-hidden">
                                                                <div className={`
                                                                    w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0
                                                                    ${isSelected ? 'bg-[#0A3161] border-[#0A3161] text-white' : 'border-slate-300 bg-white group-hover:border-[#0A3161]'}
                                                                `}>
                                                                    {isSelected && <CheckCircle className="w-4 h-4" />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className={`font-bold text-sm truncate ${isSelected ? 'text-[#0A3161]' : 'text-slate-700'}`}>{emp.full_name}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 rounded">{emp.dni || 'S/D'}</span>
                                                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{emp.position || 'Sin Cargo'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="fixed bottom-0 right-0 left-0 lg:left-72 p-4 md:p-6 bg-white/95 backdrop-blur-xl border-t z-40 flex items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-[#0A3161]/5">
                                <Button variant="ghost" onClick={handleBack} className="h-12 md:h-14 px-4 md:px-8 font-black text-[#0A3161] hover:bg-slate-100 rounded-2xl tracking-widest uppercase text-[10px] md:text-xs shrink-0">
                                    <ChevronLeft className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Atrás</span><span className="md:hidden">Atrás</span>
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={handleNext}
                                    disabled={selectedEmployees.length === 0}
                                    className="h-14 md:h-16 px-6 md:px-12 bg-[#0A3161] text-white hover:bg-[#0c3c75] font-black rounded-2xl shadow-xl tracking-widest text-[10px] md:text-sm uppercase flex items-center gap-3 w-full md:w-auto justify-center"
                                >
                                    <span className="truncate">Confirmar ({selectedEmployees.length})</span> <ChevronRight className="w-5 h-5 ml-auto md:ml-2 shrink-0" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SIGNATURES */}
                    {step === 3 && (
                        <div className="space-y-8 pb-20">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-[#0A3161]/10 pb-6">
                                <div className="space-y-1">
                                    <Badge className="bg-[#0A3161] text-white rounded-md mb-2">Paso 03</Badge>
                                    <h2 className="text-4xl font-black text-[#0A3161]">Ronda de Firmas</h2>
                                </div>
                                <div className="flex gap-2">
                                    <div className="bg-[#B3D400] px-6 py-2 rounded-xl text-[#0A3161] font-black flex items-center gap-3 shadow-lg">
                                        <span className="text-2xl">{Object.keys(attendeeSignatures).length}</span>
                                        <div className="w-[1px] h-6 bg-[#0A3161]/20" />
                                        <span className="text-xs uppercase tracking-tighter">Firmados</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[55vh] overflow-y-auto pr-4 p-4 scrollbar-thin scrollbar-thumb-slate-200">
                                {employees.filter(e => selectedEmployees.includes(e.id)).map(emp => (
                                    <Card key={emp.id} className={`border-0 rounded-3xl transition-all duration-300 shadow-sm ${attendeeSignatures[emp.id] ? 'bg-white' : 'bg-white opacity-80'}`}>
                                        <CardContent className="p-6 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all ${attendeeSignatures[emp.id] ? 'bg-[#B3D400] text-[#0A3161]' : 'bg-slate-100 text-slate-400'}`}>
                                                    {emp.full_name.charAt(0)}
                                                </div>
                                                <div className="max-w-[150px]">
                                                    <p className="font-black text-[#0A3161] leading-none truncate">{emp.full_name}</p>
                                                    <p className="text-[9px] font-black text-slate-400 mt-2 tracking-widest">{emp.dni}</p>
                                                </div>
                                            </div>
                                            {attendeeSignatures[emp.id] ? (
                                                <Badge className="bg-[#B3D400]/20 text-[#0A3161] border-0 rounded-lg p-2 font-black">
                                                    <CheckCircle className="w-5 h-5" />
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="border-2 border-slate-100 text-slate-300 font-bold px-3 py-1">ESPERA</Badge>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <div className="flex flex-col items-center justify-center py-16 bg-[#0A3161] rounded-[40px] shadow-2xl relative overflow-hidden group">
                                {/* Background decoration */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#B3D400]/5 -mr-32 -mt-32 rounded-full" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#B3D400]/5 -ml-16 -mb-16 rounded-full" />

                                <TriggerSignaturesButton
                                    attendeesCount={selectedEmployees.length}
                                    signedCount={Object.keys(attendeeSignatures).length}
                                    onSave={(id: string, sig: string) => setAttendeeSignatures(prev => ({ ...prev, [id]: sig }))}
                                    attendees={employees.filter(e => selectedEmployees.includes(e.id))}
                                    existingSignatures={attendeeSignatures}
                                />
                            </div>

                            <div className="flex justify-between pt-10">
                                <Button variant="ghost" onClick={handleBack} className="font-black text-[#0A3161] uppercase tracking-widest text-xs">
                                    ← Volver a Colaboradores
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={handleNext}
                                    disabled={Object.keys(attendeeSignatures).length < selectedEmployees.length}
                                    className={`h-20 px-16 rounded-2xl font-black text-lg transition-all duration-700 shadow-2xl ${Object.keys(attendeeSignatures).length === selectedEmployees.length ? 'bg-[#0A3161] text-white hover:bg-[#0c3c75] hover:scale-105' : 'bg-slate-200 text-slate-400'}`}
                                >
                                    Ver Resumen Final <ChevronRight className="w-6 h-6 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SUMMARY */}
                    {step === 4 && (
                        <div className="max-w-4xl mx-auto space-y-10 animate-in zoom-in duration-700">
                            <div className="text-center space-y-4">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1 }} className="inline-block">
                                    <div className="w-24 h-24 bg-[#B3D400] rounded-[30px] flex items-center justify-center shadow-xl mx-auto">
                                        <CheckCircle className="w-14 h-14 text-[#0A3161]" strokeWidth={2.5} />
                                    </div>
                                </motion.div>
                                <h2 className="text-5xl font-black text-[#0A3161] tracking-tighter">¡Charlas Lista!</h2>
                                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Verificación de cumplimiento finalizada</p>
                            </div>

                            <Card className="border-0 shadow-2xl rounded-[40px] overflow-hidden bg-white">
                                <div className="bg-[#0A3161] p-8 text-white flex justify-between items-center px-10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/10 rounded-2xl">
                                            <FileText className="w-6 h-6 text-[#B3D400]" />
                                        </div>
                                        <span className="font-black text-xl tracking-tight">Reporte Operativo</span>
                                    </div>
                                    <Badge className="bg-[#B3D400] text-[#0A3161] border-0 font-black px-6 py-2 rounded-xl text-lg">{currentStation}</Badge>
                                </div>
                                <CardContent className="p-10 space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        <div className="space-y-6">
                                            <div className="space-y-1">
                                                <p className="text-slate-300 font-black text-[10px] uppercase tracking-[0.2em]">Expositor</p>
                                                <p className="text-2xl font-black text-[#0A3161]">{employees.find(e => e.id === presenterId)?.full_name}</p>
                                                <p className="text-xs font-black text-slate-400">{employees.find(e => e.id === presenterId)?.position}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-slate-300 font-black text-[10px] uppercase tracking-[0.2em]">Cobertura</p>
                                                <div className="flex items-end gap-3 text-[#0A3161]">
                                                    <p className="text-5xl font-black leading-none">{selectedEmployees.length}</p>
                                                    <p className="text-sm font-black pb-1 opacity-40 uppercase">DE {employees.length} COLABORADORES</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4 bg-slate-50 p-8 rounded-[30px]">
                                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duración Estimada</p>
                                                <Badge className="bg-[#0A3161] text-white font-black">{startTime ? Math.max(1, Math.round((new Date().getTime() - new Date(startTime).getTime()) / 60000)) : 0} MIN</Badge>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Participantes que Firmaron</p>
                                                <p className="text-sm font-black text-[#0A3161]">{Object.keys(attendeeSignatures).length} colaboradores</p>
                                            </div>
                                            <div className="max-h-32 overflow-y-auto pr-2 space-y-1">
                                                {employees.filter(e => attendeeSignatures[e.id]).map(emp => (
                                                    <div key={emp.id} className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                                                        <CheckCircle className="w-3 h-3 text-[#B3D400]" />
                                                        {emp.full_name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t space-y-4">
                                        <label className="text-xs font-black text-[#0A3161] uppercase tracking-[0.1em] flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-[#B3D400]" /> Comentarios de Estación
                                        </label>
                                        <Textarea
                                            placeholder="Describa incidentes o ausencias justificadas..."
                                            value={observations}
                                            onChange={(e) => setObservations(e.target.value)}
                                            className="resize-none h-40 border-slate-100 bg-slate-50/50 rounded-[30px] p-6 font-medium text-[#0A3161] focus:bg-white focus:border-[#0A3161] focus:ring-0 transition-all shadow-inner"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex justify-between pt-6 items-center">
                                <Button variant="ghost" onClick={handleBack} disabled={loading} className="px-10 font-bold text-slate-300 hover:text-[#0A3161] uppercase text-xs tracking-widest">Regresar</Button>
                                <Button
                                    size="lg"
                                    onClick={handleSubmitExecution}
                                    disabled={loading}
                                    className="bg-[#0A3161] hover:bg-[#0c3c75] text-white font-black px-16 h-24 text-xl rounded-[30px] shadow-2xl transition-all hover:scale-[1.05] active:scale-95 uppercase tracking-widest"
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-4">
                                            <div className="h-6 w-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                            PROCESANDO
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            FINALIZAR REGISTRO <CheckCircle className="w-6 h-6" />
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function TriggerSignaturesButton({ attendees, existingSignatures, onSave, signedCount, attendeesCount }: {
    attendees: Employee[],
    existingSignatures: Record<string, string>,
    onSave: (id: string, sig: string) => void,
    signedCount: number,
    attendeesCount: number
}) {
    const [isCapturing, setIsCapturing] = useState(false);

    return (
        <div className="flex flex-col items-center gap-8 relative z-10 w-full px-10">
            <div className="space-y-2 text-center">
                <p className="text-white font-black text-2xl uppercase tracking-tighter">CAPTURA DE FIRMAS</p>
                <p className="text-blue-200/40 text-xs font-bold uppercase tracking-widest italic">Personal presente en la capacitación</p>
            </div>

            <Button
                size="lg"
                onClick={() => setIsCapturing(true)}
                className="bg-[#B3D400] text-[#0A3161] hover:bg-[#c9ee00] gap-4 shadow-2xl h-24 w-full max-w-lg text-2xl font-black rounded-[30px] transition-all hover:scale-105 active:scale-95 group shadow-[#B3D400]/20"
            >
                <div className="p-3 bg-white/20 rounded-2xl group-hover:rotate-12 transition-all">
                    <PenTool className="w-8 h-8" />
                </div>
                {signedCount > 0 ? "CONTINUAR RONDA" : "INICIAR RONDA"}
            </Button>

            <div className="flex items-center gap-4 w-full max-w-sm justify-center">
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#B3D400] transition-all duration-700" style={{ width: `${(signedCount / attendeesCount) * 100}%` }} />
                </div>
                <span className="text-blue-200/50 font-black text-xs uppercase">{signedCount}/{attendeesCount}</span>
            </div>

            {isCapturing && (
                <AttendeeSignatureCapture
                    isOpen={isCapturing}
                    onClose={() => setIsCapturing(false)}
                    attendees={attendees}
                    existingSignatures={existingSignatures}
                    onSaveSignature={onSave}
                />
            )}
        </div>
    );
}
