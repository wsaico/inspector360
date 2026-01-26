'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X, Download, Loader2 } from 'lucide-react';
import { SafetyTalksService } from '@/lib/services/safety-talks';
import { toast } from 'sonner';

interface BulletinPreview {
    code: string;
    title: string;
    alert_level: string;
    organization: string;
    document_url: string;
    isValid: boolean;
    errors: string[];
}

export function BulkBulletinUploadForm() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<BulletinPreview[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadStats, setUploadStats] = useState<{ total: number; valid: number } | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = async (file: File) => {
        setIsProcessing(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (rawData.length < 2) {
                toast.error('El archivo parece estar vacío o sin datos');
                setIsProcessing(false);
                return;
            }

            const seenCodes = new Set<string>();
            const processed: BulletinPreview[] = (rawData.slice(1) as any[]).map((row: any[]) => {
                const code = String(row[0] || '').trim();
                const title = String(row[1] || '').trim();
                const alert_level = String(row[2] || '').trim().toUpperCase(); // ROJA, AMBAR, VERDE
                const organization = String(row[3] || '').trim();
                const document_url = String(row[4] || '').trim();

                const errors: string[] = [];
                if (!code) {
                    errors.push('Falta Código');
                } else if (seenCodes.has(code)) {
                    errors.push(`Código duplicado en el archivo: ${code}`);
                } else {
                    seenCodes.add(code);
                }

                if (!title) errors.push('Falta Título');
                if (!document_url) errors.push('Falta URL del documento');
                if (alert_level && !['ROJA', 'AMBAR', 'VERDE'].includes(alert_level)) {
                    errors.push(`Nivel de alerta inválido: ${alert_level} (Use: ROJA, AMBAR, VERDE)`);
                }

                return {
                    code,
                    title,
                    alert_level: alert_level || 'VERDE',
                    organization,
                    document_url,
                    isValid: errors.length === 0,
                    errors
                };
            }).filter(item => item.code !== '');

            setPreviewData(processed);
            setUploadStats({
                total: processed.length,
                valid: processed.filter(p => p.isValid).length
            });

        } catch (err) {
            console.error(err);
            toast.error('Error al leer el archivo Excel');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpload = async () => {
        if (!uploadStats || uploadStats.valid === 0) return;

        setIsProcessing(true);
        const validRows = previewData.filter(p => p.isValid).map(p => ({
            code: p.code,
            title: p.title,
            alert_level: p.alert_level as any,
            organization: p.organization,
            document_url: p.document_url,
            is_active: true
        }));

        const { count, error } = await SafetyTalksService.bulkUploadBulletins(validRows);

        if (error) {
            toast.error('Error al guardar boletines: ' + error);
        } else {
            toast.success(`¡Disfruta! Se procesaron ${count} boletines correctamente.`);
            setFile(null);
            setPreviewData([]);
            setUploadStats(null);
        }
        setIsProcessing(false);
    };

    const downloadTemplate = () => {
        const headers = ['Código', 'Título', 'Nivel Alerta', 'Organización', 'URL Documento'];
        const example = ['CORP-TLM-AR-001', 'Uso Correcto de EPP', 'VERDE', 'Talma', 'https://example.com/pdf'];

        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, "Plantilla_Boletines_Inspector360.xlsx");
    };

    return (
        <div className="space-y-8">
            <Card className="border-0 shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white rounded-3xl overflow-hidden">
                <div className="bg-[#0A3161] p-8">
                    <CardHeader className="p-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#B3D400]/20 rounded-2xl flex items-center justify-center text-[#B3D400]">
                                <FileSpreadsheet className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-[#B3D400] text-2xl font-black uppercase tracking-tight">Carga Masiva</CardTitle>
                                <p className="text-white/60 font-bold uppercase tracking-widest text-[10px] mt-1">Sube múltiples temas de una sola vez</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadTemplate}
                            className="h-11 px-6 border-2 border-[#B3D400] text-[#B3D400] font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-[#B3D400] hover:text-[#0A3161] transition-all shadow-sm bg-transparent"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Descargar Plantilla
                        </Button>
                    </CardHeader>
                </div>
                <CardContent className="p-8">
                    <div
                        className={`group relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ${file ? 'border-[#B3D400] bg-[#B3D400]/5' : 'border-slate-200 hover:border-[#0A3161]/30 hover:bg-slate-50'
                            }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        {!file ? (
                            <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer space-y-4">
                                <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                                    <Upload className="h-10 w-10 text-[#0A3161]/40" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-[#0A3161] uppercase tracking-tight">Suelta tu archivo aquí</h3>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">O haz clic para buscar en tu equipo</p>
                                </div>
                                <div className="max-w-md mx-auto grid grid-cols-2 lg:grid-cols-3 gap-2 mt-8 text-[9px]">
                                    {['Código (ID)', 'Título', 'Nivel Alerta', 'Organización', 'URL Documento'].map((col) => (
                                        <div key={col} className="bg-white/50 border border-slate-100 p-2 rounded-xl font-black text-[#0A3161]/60 uppercase tracking-widest">
                                            {col}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-white rounded-2xl shadow-sm border border-[#B3D400]/20">
                                <div className="flex items-center gap-4 text-left">
                                    <div className="w-14 h-14 bg-[#B3D400] rounded-2xl flex items-center justify-center text-[#0A3161]">
                                        <FileSpreadsheet className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <p className="font-black text-[#0A3161] uppercase text-sm leading-none">{file.name}</p>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1.5">
                                            {(file.size / 1024).toFixed(1)} KB • {isProcessing ? 'Procesando...' : 'Listo para procesar'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { setFile(null); setPreviewData([]); }}
                                    className="h-12 w-12 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 mt-4 md:mt-0"
                                >
                                    <X className="h-6 w-6" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {previewData.length > 0 && (
                        <div className="mt-12 space-y-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="px-3 py-1 bg-[#0A3161] rounded-lg">
                                        <span className="text-[#B3D400] text-[10px] font-black uppercase tracking-widest">Vista Previa</span>
                                    </div>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                        <span className="text-[#0A3161]">{uploadStats?.valid}</span> válidos de <span className="text-[#0A3161]">{uploadStats?.total}</span>
                                    </p>
                                </div>
                                <Button
                                    onClick={handleUpload}
                                    disabled={isProcessing || uploadStats?.valid === 0}
                                    className="w-full md:w-auto h-12 px-8 bg-[#B3D400] hover:bg-[#a2c100] text-[#0A3161] font-black uppercase text-[11px] tracking-widest rounded-2xl transition-all shadow-lg shadow-[#B3D400]/20 border-0"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                    )}
                                    {isProcessing ? 'Procesando...' : `Subir ${uploadStats?.valid} Boletines`}
                                </Button>
                            </div>

                            <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[#0A3161] border-b border-[#0A3161]/10">
                                            <tr>
                                                <th className="p-4 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest w-[80px]">Estado</th>
                                                <th className="p-4 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Código</th>
                                                <th className="p-4 text-left font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Título</th>
                                                <th className="p-4 text-center font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Alerta</th>
                                                <th className="p-4 text-right font-black text-[#B3D400] text-[10px] uppercase tracking-widest">Organización</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {previewData.map((row, i) => (
                                                <tr key={i} className={`${!row.isValid ? 'bg-red-50/50' : 'hover:bg-slate-50 transition-colors'}`}>
                                                    <td className="p-4 text-center">
                                                        {row.isValid ? (
                                                            <div className="w-6 h-6 bg-[#B3D400]/20 rounded-lg flex items-center justify-center text-[#0A3161] mx-auto">
                                                                <CheckCircle className="h-4 w-4" />
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1 group relative cursor-help">
                                                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[8px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                                                    <p className="font-black uppercase tracking-widest mb-1 border-b border-white/10 pb-1">Errores detectados:</p>
                                                                    <ul className="space-y-1">
                                                                        {row.errors.map((err, idx) => <li key={idx} className="flex items-start gap-1"><span>•</span> {err}</li>)}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="font-mono text-[10px] font-black text-[#0A3161] bg-slate-100 px-2 py-1 rounded">
                                                            {row.code}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="font-black text-[#0A3161] uppercase text-[10px] leading-tight line-clamp-2">{row.title}</p>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Badge className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border-0 ${row.alert_level === 'ROJA' ? 'bg-red-100 text-red-600 shadow-sm shadow-red-100/50' :
                                                            row.alert_level === 'AMBAR' ? 'bg-amber-100 text-amber-600 shadow-sm shadow-amber-100/50' :
                                                                'bg-[#B3D400]/20 text-[#0A3161] shadow-sm shadow-[#B3D400]/10'
                                                            }`}>
                                                            {row.alert_level}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{row.organization}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
