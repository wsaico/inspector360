'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks';
import { SafetyTalksService } from '@/lib/services/safety-talks';
import { StationsService } from '@/lib/services/stations';
import { Employee, TalkSchedule } from '@/types/safety-talks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import SignaturePad from '@/components/forms/signature-pad';
import { AttendeeSignatureCapture } from '@/components/safety-talks/attendee-signature-capture';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, PenTool, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function TalkRegistrationForm() {
    const { profile } = useAuth();
    const router = useRouter();

    // States
    const [schedule, setSchedule] = useState<TalkSchedule | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    // Form Data
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]); // IDs
    const [presenterId, setPresenterId] = useState<string>('');
    const [presenterSignature, setPresenterSignature] = useState<string>('');
    const [attendeeSignatures, setAttendeeSignatures] = useState<Record<string, string>>({});
    const [observations, setObservations] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // UI States
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    // Dynamic Station from Profile
    const [currentStation, setCurrentStation] = useState<string>('LIM');
    const [availableStations, setAvailableStations] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        if (profile?.station) {
            setCurrentStation(profile.station);
        } else {
            // Si es admin o no tiene estación, cargar lista
            StationsService.listActive().then(({ data }) => {
                setAvailableStations(data.map(s => ({ value: s.code, label: s.name })));
                // Default to first if available, or stay LIM
                if (data.length > 0) {
                    // Keep LIM if possible, or JAU if that's what we have
                    // Actually, defaulting to 'LIM' is fine, but checking if it's in list would be better.
                }
            });
        }
    }, [profile]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            // 1. Cargar Charla Sugerida
            const { data: talkData } = await SafetyTalksService.getSuggestedTalk(currentStation);
            setSchedule(talkData);

            // 2. Cargar Empleados de la Estación
            const { data: empData } = await SafetyTalksService.getStationEmployees(currentStation);
            setEmployees(empData || []);
            setLoading(false);
        };
        loadData();
    }, [currentStation]); // Reload on station change

    const handleEmployeeToggle = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedEmployees(prev => [...prev, id]);
        } else {
            setSelectedEmployees(prev => prev.filter(e => e !== id));
            // También quitamos firma si se deselecciona
            const newSigs = { ...attendeeSignatures };
            delete newSigs[id];
            setAttendeeSignatures(newSigs);
        }
    };



    const getSecurityColor = (level?: string) => {
        switch (level) {
            case 'RED': return 'bg-red-500 hover:bg-red-600';
            case 'AMBER': return 'bg-amber-500 hover:bg-amber-600';
            case 'GREEN': return 'bg-green-500 hover:bg-green-600';
            default: return 'bg-blue-500';
        }
    };

    // Filter Logic
    const filteredEmployees = employees.filter(emp => {
        const search = searchTerm.toLowerCase();
        return (
            emp.full_name.toLowerCase().includes(search) ||
            emp.dni.includes(search) ||
            (emp.position || '').toLowerCase().includes(search)
        );
    });

    const isAllFilteredSelected = filteredEmployees.length > 0 && filteredEmployees.every(e => selectedEmployees.includes(e.id));

    const handleSelectAll = () => {
        if (isAllFilteredSelected) {
            // Deselect visible
            const visibleIds = filteredEmployees.map(e => e.id);
            setSelectedEmployees(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            // Select visible
            const visibleIds = filteredEmployees.map(e => e.id);
            // Append new ones avoiding duplicates
            setSelectedEmployees(prev => {
                const unique = new Set([...prev, ...visibleIds]);
                return Array.from(unique);
            });
        }
    };

    const validateForm = () => {
        if (!schedule) return 'No hay charla programada';
        if (!presenterId) return 'Seleccione un expositor';
        if (!presenterSignature) return 'Falta firma del expositor';
        if (selectedEmployees.length === 0) return 'Seleccione al menos un asistente';

        // Validar que todos los seleccionados tengan firma
        const missingSignatures = selectedEmployees.filter(id => !attendeeSignatures[id]);
        if (missingSignatures.length > 0) return `Faltan firmar ${missingSignatures.length} asistentes`;

        return null;
    };

    const handleSubmit = async () => {
        const error = validateForm();
        if (error) {
            toast.error(error);
            return;
        }

        setLoading(true);
        try {
            const attendeesPayload = selectedEmployees.map(id => ({
                employee_id: id,
                signature: attendeeSignatures[id],
                attended: true
            }));

            const { error: saveError } = await SafetyTalksService.registerExecution({
                schedule_id: schedule!.id,
                station_code: currentStation,
                presenter_id: presenterId,
                presenter_signature: presenterSignature,
                observations,
                duration_min: 5 // Podríamos calcularlo real code
            }, attendeesPayload);

            if (saveError) throw saveError;

            toast.success('Charla registrada correctamente');
            router.push('/talks/history'); // Redirigir a historia/lista

        } catch (err: any) {
            toast.error('Error guardando charla: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !schedule) {
        return <div className="p-8 text-center text-muted-foreground">Cargando datos de seguridad...</div>;
    }

    if (!schedule) {
        return (
            <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <CheckCircle className="h-10 w-10 text-green-500" />
                        <div>
                            <h3 className="text-xl font-bold">¡Todo al día!</h3>
                            <p className="text-muted-foreground">No hay charlas pendientes programadas para hoy en {currentStation}.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const bulletin = schedule.bulletin;
    const attendeesList = employees.filter(e => selectedEmployees.includes(e.id));

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Header Charla */}
            <Card className="border-l-4 border-l-blue-600 shadow-md">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <Badge className={`mb-2 ${getSecurityColor(bulletin?.alert_level)}`}>
                                {bulletin?.alert_level} ALERT
                            </Badge>
                            <CardTitle className="text-2xl">{bulletin?.title}</CardTitle>
                            <CardDescription className="text-lg mt-1 font-mono text-slate-600">
                                {bulletin?.code} • {bulletin?.organization}
                            </CardDescription>
                        </div>
                        {bulletin?.document_url && (
                            <Button variant="outline" onClick={() => window.open(bulletin.document_url, '_blank')}>
                                <FileText className="mr-2 h-4 w-4" /> Ver Boletín
                            </Button>
                        )}
                    </div>
                </CardHeader>
            </Card>

            {/* Station Selector for Admins */}
            {(!profile?.station || profile?.role === 'admin') && availableStations.length > 0 && (
                <Card>
                    <CardHeader className="py-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Cambiar Estación de Registro</CardTitle>
                            <select
                                className="p-2 border rounded-md min-w-[200px]"
                                value={currentStation}
                                onChange={(e) => setCurrentStation(e.target.value)}
                            >
                                {availableStations.map(s => (
                                    <option key={s.value} value={s.value}>{s.label} ({s.value})</option>
                                ))}
                            </select>
                        </div>
                    </CardHeader>
                </Card>
            )}

            {/* Expositor */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" /> Expositor
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Responsable de la Charla</label>
                            <select
                                className="w-full p-2 border rounded-md"
                                value={presenterId}
                                onChange={(e) => setPresenterId(e.target.value)}
                            >
                                <option value="">Seleccione...</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.position})</option>
                                ))}
                            </select>
                        </div>
                        <div className="border rounded-md p-1">
                            <SignaturePad
                                label="Firma del Expositor"
                                onChange={setPresenterSignature}
                                onSave={setPresenterSignature}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Asistentes */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" /> Asistencia
                        </CardTitle>
                        <div className="text-sm text-muted-foreground">
                            {selectedEmployees.length} seleccionados / {Object.keys(attendeeSignatures).length} firmados
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-end md:items-center">
                        <div className="flex-1 w-full md:max-w-sm">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre o DNI..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                {isAllFilteredSelected ? `Deseleccionar ${filteredEmployees.length}` : `Seleccionar ${filteredEmployees.length}`}
                            </Button>
                            {selectedEmployees.length > 0 && (
                                <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => setIsSignatureModalOpen(true)}
                                >
                                    <PenTool className="mr-2 h-4 w-4" />
                                    Iniciar Ronda de Firmas
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="border rounded-md max-h-[400px] overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="p-3 text-left w-10"></th>
                                    <th className="p-3 text-left">Nombre</th>
                                    <th className="p-3 text-left">Cargo</th>
                                    <th className="p-3 text-center">Firma</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map(emp => (
                                        <tr key={emp.id} className="border-t hover:bg-gray-50">
                                            <td className="p-3">
                                                <Checkbox
                                                    checked={selectedEmployees.includes(emp.id)}
                                                    onCheckedChange={(c) => handleEmployeeToggle(emp.id, !!c)}
                                                />
                                            </td>
                                            <td className="p-3 font-medium">{emp.full_name}</td>
                                            <td className="p-3 text-muted-foreground">{emp.position}</td>
                                            <td className="p-3 text-center">
                                                {attendeeSignatures[emp.id] ? (
                                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                        <CheckCircle className="h-3 w-3 mr-1" /> Firmado
                                                    </Badge>
                                                ) : selectedEmployees.includes(emp.id) ? (
                                                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                                        Pendiente
                                                    </Badge>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                            No se encontraron empleados con "{searchTerm}"
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6">
                    <label className="text-sm font-medium mb-2 block">Observaciones Generales</label>
                    <Textarea
                        placeholder="Ej: Personal faltante por operación en vuelo..."
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                    />
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4 pb-12">
                <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
                <Button size="lg" onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700">
                    {loading ? 'Guardando...' : 'Finalizar y Generar PDF'}
                </Button>
            </div>

            {/* Modal de Firmas */}
            <AttendeeSignatureCapture
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                attendees={attendeesList}
                existingSignatures={attendeeSignatures}
                onSaveSignature={(id, sig) => setAttendeeSignatures(prev => ({ ...prev, [id]: sig }))}
            />
        </div>
    );
}

function UserIcon() {
    return <Users className="h-5 w-5" />;
}
