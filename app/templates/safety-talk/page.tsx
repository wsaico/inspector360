'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function SafetyTalkTemplateContent() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Puppeteer injects data into window.__PRELOADED_DATA__
        if ((window as any).__PRELOADED_DATA__) {
            setData((window as any).__PRELOADED_DATA__);
            setLoading(false);
            (window as any).__forata057_ready = true; // Signal for PDF generator
            return;
        }

        // Fallback for manual testing
        const id = searchParams.get('id');
        if (id) {
            loadData(id);
        }
    }, [searchParams]);

    const loadData = async (id: string) => {
        const { data: execution, error } = await supabase
            .from('talk_executions')
            .select(`
                *,
                schedule:talk_schedules (
                    *,
                    bulletin:bulletins (*)
                ),
                bulletin:bulletins (*),
                presenter:employees (*),
                attendees:talk_attendees (
                    *,
                    employee:employees (*)
                )
            `)
            .eq('id', id)
            .single();

        if (execution) {
            // Get station info
            const { data: station } = await supabase
                .from('stations')
                .select('*')
                .eq('code', execution.station_code)
                .single();

            setData({ ...execution, station_info: station });
        }
        setLoading(false);
        (window as any).__forata057_ready = true;
    };

    if (loading || !data) return <div className="p-10 text-center uppercase font-black text-slate-300 tracking-widest">Cargando Reporte...</div>;

    const { schedule, presenter, attendees, station_info } = data;
    const executionDate = data.executed_at ? new Date(data.executed_at) : null;

    return (
        <div className="report-container bg-white p-[10mm] min-h-screen text-[10px] font-sans text-black leading-tight" suppressHydrationWarning>
            <style jsx global>{`
                @page {
                    size: A4 portrait;
                    margin: 0;
                }
                body {
                    background: white;
                }
                .report-container {
                    width: 190mm; /* A4 portrait width minus margins approximation */
                    margin: 0 auto;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 0;
                }
                th, td {
                    border: 1px solid black;
                    padding: 4px 6px;
                }
                .no-border td {
                    border: none;
                    padding: 2px 4px;
                }
                .bg-header {
                    background-color: #f3f4f6;
                }
                .bg-talma-green {
                    background-color: #7BB342;
                    color: black;
                }
                .checkbox {
                    width: 10px;
                    height: 10px;
                    border: 1px solid black;
                    display: inline-block;
                    margin-right: 4px;
                    text-align: center;
                    line-height: 8px;
                    font-size: 8px;
                }
                /* Hide global UI noise like toasts, floating buttons, etc. */
                [data-sonner-toaster], .sonner-toast, button:not(.print-only), .floating-button, .bolt-icon,
                nextjs-portal, #nextjs-proxy-error-portal, [data-nextjs-dialog-overlay], [data-nextjs-toast],
                div[id^="nextjs"], div[class^="nextjs"] {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }
                @media print {
                    body > *:not(.report-container) {
                        display: none !important;
                    }
                }
            `}</style>

            {/* HEADER TABLE */}
            <table>
                <tbody>
                    <tr>
                        <td rowSpan={3} className="w-[20%] text-center">
                            <img src="/logo-talma-official.png" alt="Talma" className="h-10 mx-auto" />
                        </td>
                        <td rowSpan={3} className="w-[55%] text-center font-bold text-sm">
                            LISTA DE ASISTENCIA A INDUCCIÓN, CHARLA,<br />
                            ENTRENAMIENTO, SIMULACRO Y CAPACITACIÓN*
                        </td>
                        <td className="w-[10%] bg-header font-bold text-[8px]">Código:</td>
                        <td className="w-[15%] text-center">CORP-FOR-SIG-003</td>
                    </tr>
                    <tr>
                        <td className="bg-header font-bold text-[8px]">Fecha de Emisión:</td>
                        <td className="text-center">19/07/2022</td>
                    </tr>
                    <tr>
                        <td className="bg-header font-bold text-[8px]">Versión:</td>
                        <td className="text-center">1</td>
                    </tr>
                </tbody>
            </table>

            {/* DATA SECTION */}
            <div className="mt-4 flex justify-between gap-4">
                <div className="w-[65%]">
                    <table className="no-border !w-full">
                        <tbody>
                            <tr>
                                <td className="w-32 font-bold whitespace-nowrap">Razón social:</td>
                                <td>{station_info?.legal_name || 'Talma Servicios Aeroportuarios S.A.'}</td>
                            </tr>
                            <tr>
                                <td className="font-bold whitespace-nowrap">RUC/NIT/RFC:</td>
                                <td>{station_info?.ruc || '20204621242'}</td>
                            </tr>
                            <tr>
                                <td className="font-bold whitespace-nowrap">Domicilio:</td>
                                <td>{station_info?.address || 'Av Francisco Carle S/N, Jauja'}</td>
                            </tr>
                            <tr>
                                <td className="font-bold whitespace-nowrap">Tipo de actividad:</td>
                                <td>CIIU 63037 - Otras actividades de transporte</td>
                            </tr>
                            <tr>
                                <td className="font-bold whitespace-nowrap">N° de trabajadores: --</td>
                                <td>{attendees?.length || 0}</td>
                            </tr>
                            <tr>
                                <td className="font-bold whitespace-nowrap">Fecha:</td>
                                <td>{executionDate ? format(executionDate, 'dd/MM/yyyy') : '--/--/----'}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="mt-6 space-y-1">
                        <div className="flex">
                            <span className="font-bold w-32 shrink-0">Tema a tratar:</span>
                            <span className="uppercase">
                                {schedule?.bulletin?.title || data.bulletin?.title || 'Charla de Seguridad'}
                            </span>
                        </div>
                        <div className="flex">
                            <span className="font-bold w-32 shrink-0">Expositor:</span>
                            <span className="uppercase">{presenter?.full_name || 'No especificado'}</span>
                        </div>
                    </div>
                </div>

                <div className="w-[30%] flex flex-col justify-between">
                    <div className="space-y-1">
                        {[
                            { id: 'capacitacion', label: 'Capacitación' },
                            { id: 'induccion', label: 'Inducción' },
                            { id: 'charla', label: 'Charla (Briefing)' },
                            { id: 'entrenamiento', label: 'Entrenamiento' },
                            { id: 'simulacro', label: 'Simulacro' },
                            { id: 'otros', label: 'Otros' },
                        ].map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[9px]">
                                <span className={item.id === 'otros' ? 'font-bold' : ''}>{item.label}</span>
                                <span className="checkbox text-center">{data?.activity_type === item.id ? 'X' : ''}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-6 flex justify-between items-center border-t-0">
                        <span className="font-bold">Total de horas: ----</span>
                        <span className="font-mono">{data.duration_min >= 60 ? `${Math.floor(data.duration_min / 60)}:${(data.duration_min % 60).toString().padStart(2, '0')}:00` : `00:${data.duration_min.toString().padStart(2, '0')}:00`}</span>
                    </div>
                </div>
            </div>

            {/* PARTICIPANTS TABLE */}
            <table className="mt-4">
                <thead>
                    <tr>
                        <th colSpan={6} className="bg-talma-green font-bold text-center uppercase">ASISTENCIA DE PARTICIPANTES</th>
                    </tr>
                    <tr className="bg-talma-green text-[9px]">
                        <th className="w-[5%] text-center">N°</th>
                        <th className="w-[30%]">Apellidos y Nombres</th>
                        <th className="w-[15%]">Documento de ID</th>
                        <th className="w-[20%]">Área/Empresa</th>
                        <th className="w-[20%]">Firma</th>
                        <th className="w-[10%]">Calificación*</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Fill rows, ensure at least some rows to keep height consistent */}
                    {Array.from({ length: Math.max(12, attendees?.length || 0) }).map((_, i) => {
                        const att = attendees && attendees[i];
                        return (
                            <tr key={i} className="h-8">
                                <td className="text-center font-bold text-gray-500">{i + 1}</td>
                                <td>{att?.employee?.full_name || ''}</td>
                                <td className="text-center">{att?.employee?.dni || ''}</td>
                                <td className="text-center">{att?.employee?.area || ''}</td>
                                <td className="text-center">
                                    {att?.signature && <img src={att.signature} className="h-6 mx-auto" alt="signature" />}
                                </td>
                                <td></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* FOOTER SECTION */}
            <div className="mt-2 border-t border-black pt-1">
                <table className="mt-0">
                    <tbody>
                        <tr className="h-5">
                            <td colSpan={2} className="font-bold bg-header">Observaciones:</td>
                        </tr>
                        <tr className="h-8">
                            <td colSpan={2}>{data.observations || ''}</td>
                        </tr>
                        <tr>
                            <td className="w-[70%]">
                                <div className="space-y-4">
                                    <div className="flex">
                                        <span className="font-bold w-24">Responsable:</span>
                                        <span className="uppercase border-b border-black flex-1 text-center">{presenter?.full_name || 'No asignado'}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-24">Cargo:</span>
                                        <span className="uppercase border-b border-black flex-1 text-center">{presenter?.position || 'AUXILIAR'}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="w-[30%] text-center align-bottom relative h-20">
                                {data?.presenter_signature && <img src={data.presenter_signature} className="h-14 mx-auto mb-1" alt="presenter signature" />}
                                <div className="border-t border-black text-[8px] font-bold">Firma de Responsable</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* LEGAL NOTES */}
            <div className="mt-2 text-[7px] leading-tight opacity-70">
                <p className="font-bold">*Nota 1: El presente formato es aplicable para temas de capacitación en SST solo en Perú.</p>
                <p><span className="font-bold">Nota 2:</span> Al firmar este documento el personal afirma su consentimiento y autorización del uso de sus datos personales aquí expuestos, dentro del marco de protección de datos personales:</p>
                <p className="pl-4"><span className="font-bold">En PERÚ:</span> Ley de Protección de Datos Personales N° 29733 y su reglamento</p>
                <p className="pl-4"><span className="font-bold">En COLOMBIA:</span> Ley 1581 2012</p>
                <p className="pl-4"><span className="font-bold">En ECUADOR:</span> Ley Organica de Protección de datos personales - PAN-CLC-2021-0384, Quinto suplemento 459 del registro oficial</p>
                <p className="pl-4"><span className="font-bold">En MÉXICO:</span> Ley de protección de datos personales en posesión de sujetos obligados de la ciudad de México</p>
            </div>
        </div>
    );
}

export default function SafetyTalkTemplatePage() {
    return (
        <Suspense fallback={<div className="p-10 text-center uppercase font-black text-slate-300 tracking-widest">Cargando Módulo...</div>}>
            <SafetyTalkTemplateContent />
        </Suspense>
    );
}
