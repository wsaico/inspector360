'use client';

import { useState, useRef, useEffect } from 'react'; // Added useEffect
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X, Download } from 'lucide-react';
import { SafetyTalksService } from '@/lib/services/safety-talks';
import { toast } from 'sonner';
import { useStations } from '@/hooks';

interface UploadPreview {
    dni: string;
    full_name: string;
    position: string;
    area: string;
    station_code: string;
    isValid: boolean;
    errors: string[];
}

export function BulkUploadForm() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<UploadPreview[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadStats, setUploadStats] = useState<{ total: number; valid: number } | null>(null);

    // Obtener estaciones válidas para validación
    const { stations } = useStations({ activeOnly: true });
    const validStationCodes = new Set(stations.map(s => s.code));

    // Re-validate if stations load late? No, usually static.
    // We will use the Set inside parseFile.

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
            // Leer como array de arrays para cabeceras
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (rawData.length < 2) {
                toast.error('El archivo parece estar vacío o sin datos');
                setIsProcessing(false);
                return;
            }

            // 1. Detect Header Row and Column Indices
            let headerRowIdx = -1;
            let colMap = { dni: 0, name: -1, position: -1, area: -1, station: -1 };

            // Search first 5 rows for headers
            for (let i = 0; i < Math.min(rawData.length, 5); i++) {
                const row = (rawData[i] as any[]).map(c => String(c || '').toUpperCase().trim());
                if (row.some(c => c.includes('DNI') || c.includes('DOCUMENTO'))) {
                    headerRowIdx = i;
                    colMap.dni = row.findIndex(c => c.includes('DNI') || c.includes('DOCUMENTO'));
                    colMap.name = row.findIndex(c => c.includes('NOMBRE') || c.includes('APELLIDO')); // Takes the first one
                    colMap.position = row.findIndex(c => c.includes('CARGO') || c.includes('PUESTO') || c.includes('ROL'));
                    colMap.area = row.findIndex(c => c.includes('AREA') || c.includes('ÁREA'));
                    colMap.station = row.findIndex(c => c.includes('ESTACION') || c.includes('ESTACIÓN') || c.includes('SEDE') || c.includes('CODIGO'));
                    break;
                }
            }

            // Heuristic fallbacks for Area if not found in headers
            const knownAreas = ['RAMPA', 'PAX', 'MANTTO', 'ADMIN', 'SEGURIDAD', 'OPERACIONES', 'COMERCIAL', 'TRAFICO', 'TRÁFICO', 'ALMACEN', 'LOGISTICA', 'SERVICIOS'];

            const seenDnis = new Set<string>();

            // Start processing from the row AFTER the header, or row 1 if no header found
            const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 1;

            const processed: UploadPreview[] = (rawData.slice(startRow) as any[]).map((row: any[]) => {
                // Determine DNI
                const dniIdx = colMap.dni !== -1 ? colMap.dni : 0;
                const dni = String(row[dniIdx] || '').trim();

                let full_name = '';
                let position = 'OPERADOR';
                let area = '';
                let station_code = '';

                // STRATEGY 1: Trust Headers if available
                if (colMap.area !== -1) {
                    area = String(row[colMap.area] || '').trim().toUpperCase();

                    // Gap Heuristic: If we have Name (e.g. 1) and Area (e.g. 3), and there is exactly 1 column in between, assume it is Position
                    if (colMap.position === -1 && colMap.name !== -1 && (colMap.area - colMap.name === 2)) {
                        colMap.position = colMap.name + 1;
                    }

                    if (colMap.position !== -1) {
                        position = String(row[colMap.position] || '').trim();
                    }

                    if (colMap.station !== -1) {
                        station_code = String(row[colMap.station] || '').trim().toUpperCase();
                    } else {
                        // Fallback: Station often is next to Area
                        station_code = String(row[colMap.area + 1] || '').trim().toUpperCase();
                    }

                    // For Name: Join all columns between DNI and the first "Data" column (Position or Area)
                    // If we have specific name headers, we could use them, but "Split Name" issue implies dynamic range.
                    // We define 'end of name' = min(positionIdx, areaIdx) > nameIdx

                    let nameEndIdx = 999;
                    if (colMap.position !== -1 && colMap.position > dniIdx) nameEndIdx = Math.min(nameEndIdx, colMap.position);
                    if (colMap.area !== -1 && colMap.area > dniIdx) nameEndIdx = Math.min(nameEndIdx, colMap.area);

                    const nameParts = [];
                    // Start from DNI + 1
                    for (let i = dniIdx + 1; i < nameEndIdx; i++) {
                        const part = String(row[i] || '').trim();
                        if (part) nameParts.push(part);
                    }
                    full_name = nameParts.join(' ');

                } else {
                    // STRATEGY 2: Smart Heuristic (No Headers found)
                    // Look for known Area keywords to anchor the row
                    let areaIdx = -1;
                    for (let i = 2; i < Math.min(row.length, 12); i++) {
                        const cell = String(row[i] || '').trim().toUpperCase();
                        if (knownAreas.some(a => cell === a || (cell.length > 3 && a.includes(cell)))) {
                            areaIdx = i;
                            break;
                        }
                    }

                    if (areaIdx !== -1) {
                        area = String(row[areaIdx] || '').trim().toUpperCase();
                        station_code = String(row[areaIdx + 1] || '').trim().toUpperCase();

                        // Refined Heuristic: Check if column BEFORE Area is a Position?
                        // If the file is "Clean" (has position col), then row[areaIdx-1] is Position.
                        // If "Split Name", row[areaIdx-1] is LastName.
                        // Hard to distinguish without headers. 
                        // BUT, if we assume standard template order: DNI, Name, Pos, Area
                        // Then Position is ALWAYS at areaIdx - 1.

                        // Let's assume if we found Area via Heuristic, and we didn't find headers, 
                        // we act conservatively. 
                        // The user complained about "Names stuck together", so we prefer joining.
                        // BUT if the user complains about "Clean File Fails", maybe we are consuming Position into Name.

                        // Compromise: If row[areaIdx - 1] is "OPERADOR" or "SUPERVISOR" etc, treat as Position.
                        // Else treat as Name.

                        const candidatePos = String(row[areaIdx - 1] || '').trim();
                        const likelyPosition = [
                            'OPERADOR', 'SUPERVISOR', 'JEF', 'COORDINADOR', 'ASISTENTE', 'AGENTE', 'TECNICO', 'TÉCNICO', 'PRACTICANTE',
                            'INSPECTOR', 'GERENTE', 'CHOFER', 'CONDUCTOR', 'AUXILIAR', 'SEGURIDAD', 'ANALISTA', 'ESPECIALISTA'
                        ];
                        const isPosition = likelyPosition.some(p => candidatePos.toUpperCase().includes(p));

                        if (isPosition) {
                            position = candidatePos;
                            // Name ends before Position
                            const nameParts = [];
                            for (let i = 1; i < areaIdx - 1; i++) {
                                const part = String(row[i] || '').trim();
                                if (part) nameParts.push(part);
                            }
                            full_name = nameParts.join(' ');
                        } else {
                            // Treat as part of name (Original Logic for Split Names)
                            const nameParts = [];
                            for (let i = 1; i < areaIdx; i++) {
                                const part = String(row[i] || '').trim();
                                if (part) nameParts.push(part);
                            }
                            full_name = nameParts.join(' ');
                        }
                    } else {
                        // Fallback Strict
                        full_name = String(row[1] || '').trim();
                        position = String(row[2] || '').trim();
                        area = String(row[3] || '').trim().toUpperCase();
                        station_code = String(row[4] || '').trim().toUpperCase();
                    }
                }

                const errors: string[] = [];
                if (!dni) {
                    return null;
                } else if (seenDnis.has(dni)) {
                    errors.push(`DNI duplicado en el archivo: ${dni}`);
                } else {
                    seenDnis.add(dni);
                }

                if (!full_name) errors.push('Falta Nombre');

                if (!station_code) {
                    if (area && !station_code) {
                        errors.push('Falta Estación (Columna siguiente al Área)');
                    } else {
                        errors.push('Falta Estación');
                    }
                }

                if (!area) {
                    errors.push('Falta Área');
                }

                return {
                    dni,
                    full_name, // Ahora con espacios garantizados si venían columnas separadas
                    position,
                    area,
                    station_code,
                    isValid: errors.length === 0,
                    errors
                };
            }).filter((item): item is UploadPreview => item !== null && item.dni !== '');

            if (processed.length === 0) {
                toast.warning('No se encontraron filas válidas con DNI. Verifique que la columna A contenga los DNI.');
                setPreviewData([]);
                setUploadStats(null);
                setFile(null); // Resetear archivo para permitir reintentar
                setIsProcessing(false);
                return;
            }

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
            dni: p.dni,
            full_name: p.full_name,
            position: p.position,
            area: p.area as any,
            station_code: p.station_code,
            is_active: true
        }));

        // Batch processing to avoid payload limits or timeouts
        const BATCH_SIZE = 50;
        let totalProcessed = 0;
        let errors = 0;

        try {
            for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
                const chunk = validRows.slice(i, i + BATCH_SIZE);
                const { error } = await SafetyTalksService.bulkUploadEmployees(chunk);

                if (error) {
                    console.error('Error uploading batch:', error);
                    errors++;
                    toast.error(`Error en bloque ${i} - ${i + BATCH_SIZE}: ${error}`);
                } else {
                    totalProcessed += chunk.length;
                    // Optional: toast.info(`Procesando... ${Math.min(i + BATCH_SIZE, validRows.length)} / ${validRows.length}`);
                }
            }

            if (errors > 0) {
                toast.warning(`Proceso finalizado. Se cargaron ${totalProcessed} de ${validRows.length}. Hubo errores en algunos bloques.`);
            } else {
                toast.success(`¡Éxito! Se cargaron correctamente ${totalProcessed} empleados.`);
                // Reset form
                setFile(null);
                setPreviewData([]);
                setUploadStats(null);
            }
        } catch (err: any) {
            toast.error('Error crítico durante la carga: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadTemplate = () => {
        const headers = ['DNI', 'Nombre Completo', 'Cargo', 'Área', 'Código Estación'];
        const example = ['12345678', 'Juan Pérez', 'Operador', 'RAMPA', 'LIM'];

        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, "Plantilla_Empleados_Inspector360.xlsx");
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-6 w-6 text-green-600" />
                        Carga Masiva de Empleados
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                        <Download className="h-4 w-4" />
                        Descargar Plantilla
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={handleFileSelect}
                        />

                        {!file ? (
                            <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">Suelta tu Excel aquí</h3>
                                <p className="text-sm text-gray-500 mt-1">o haz clic para buscar archivo</p>
                                <div className="mt-4 text-xs text-gray-400 bg-gray-100 p-2 rounded inline-block text-left">
                                    Columnas requeridas:<br />
                                    1. DNI<br />
                                    2. Nombre Completo<br />
                                    3. Cargo<br />
                                    4. Área (RAMPA, PAX, MANTTO, ADMIN)<br />
                                    5. Código Estación (LIM, AQP...)
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                                    <div className="text-left">
                                        <p className="font-medium text-gray-900">{file.name}</p>
                                        <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => { setFile(null); setPreviewData([]); }}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {previewData.length > 0 && (
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium">Vista Previa ({uploadStats?.valid} válidos de {uploadStats?.total})</h4>
                                <Button onClick={handleUpload} disabled={isProcessing || uploadStats?.valid === 0}>
                                    {isProcessing ? 'Procesando...' : `Subir ${uploadStats?.valid} Empleados`}
                                </Button>
                            </div>

                            <div className="max-h-[300px] overflow-auto border rounded-md">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="p-2 text-left">Estado</th>
                                            <th className="p-2 text-left">DNI</th>
                                            <th className="p-2 text-left">Nombre</th>
                                            <th className="p-2 text-left">Área</th>
                                            <th className="p-2 text-left">Estación</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row, i) => (
                                            <tr key={i} className={`border-t ${!row.isValid ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                                                <td className="p-2">
                                                    {row.isValid ? (
                                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <div className="flex items-center gap-1 text-red-500" title={row.errors.join(', ')}>
                                                            <AlertTriangle className="h-4 w-4" />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-2 font-mono">{row.dni}</td>
                                                <td className="p-2">{row.full_name}</td>
                                                <td className="p-2">{row.area}</td>
                                                <td className="p-2 font-mono">{row.station_code}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
