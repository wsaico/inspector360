'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { SafetyTalksService } from '@/lib/services/safety-talks'; // Reusing service for centralized logic
import { Employee } from '@/types/safety-talks';

const createEmployeeSchema = z.object({
    dni: z.string().min(8, 'DNI debe tener 8 dígitos').max(12, 'DNI muy largo'),
    full_name: z.string().min(3, 'Nombre requerido'),
    position: z.string().min(2, 'Cargo requerido'),
});

type FormData = z.infer<typeof createEmployeeSchema>;

interface EmployeeQuickCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stationCode: string;
    onSuccess: (newEmployee: Employee) => void;
    defaultName?: string;
}

export function EmployeeQuickCreateDialog({
    open,
    onOpenChange,
    stationCode,
    onSuccess,
    defaultName = ''
}: EmployeeQuickCreateDialogProps) {
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit, formState: { errors }, reset, setError } = useForm<FormData>({
        resolver: zodResolver(createEmployeeSchema),
        defaultValues: { full_name: defaultName, position: 'TECNICO' }
    });

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        try {
            // 1. Check for duplicates manually (API enforces it, but better UX to check first if possible)
            // We'll rely on UPSERT behavior or check existance.
            // SafetyTalksService.bulkUploadEmployees uses Upsert, but for single create we want to be careful.
            // Let's try to update logic or just attempt insertion.

            // We'll use a direct check first
            const { data: existing } = await SafetyTalksService.listEmployees({
                search: data.dni,
                station: stationCode,
                pageSize: 1
            });

            const duplicate = existing?.find(e => e.dni === data.dni);
            if (duplicate) {
                setError('dni', { message: 'Este DNI ya está registrado en la estación' });
                setLoading(false);
                return;
            }

            // 2. Insert
            // We use bulkUpload for simplicity as it handles insertion well, or create a new method if strict single insert needed.
            // Using bulkUpload for standard Upsert logic
            const result = await SafetyTalksService.bulkUploadEmployees([{
                ...data,
                station_code: stationCode,
                is_active: true,
                area: 'MANTTO' // Default area for technical inspections
            }]);

            if (result.error) throw new Error(result.error);

            if (result.data && result.data.length > 0) {
                toast.success(`Empleado ${data.full_name} creado correctamente`);
                onSuccess(result.data[0] as Employee);
                onOpenChange(false);
                reset();
            } else {
                throw new Error('No se devolvieron datos del servidor');
            }

        } catch (error: any) {
            console.error(error);
            toast.error('Error al crear empleado: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md border-0 rounded-[20px] shadow-2xl">
                <DialogHeader className="bg-[#0A3161] -mx-6 -mt-6 p-6 rounded-t-[20px] text-white">
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                        <UserPlus className="h-5 w-5 text-[#B3D400]" />
                        Nuevo Empleado
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-900 flex gap-2">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <p>Se creará en la estación <strong>{stationCode}</strong> y estará disponible inmediatamente.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dni">DNI / Documento <span className="text-red-500">*</span></Label>
                        <Input
                            id="dni"
                            placeholder="Ej: 12345678"
                            {...register('dni')}
                            className={errors.dni ? 'border-red-500' : ''}
                        />
                        {errors.dni && <p className="text-xs text-red-500">{errors.dni.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="full_name">Nombre Completo <span className="text-red-500">*</span></Label>
                        <Input
                            id="full_name"
                            placeholder="Apellidos y Nombres"
                            {...register('full_name')}
                            className={errors.full_name ? 'border-red-500' : ''}
                            autoComplete="off"
                        />
                        {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="position">Cargo <span className="text-red-500">*</span></Label>
                        <Input
                            id="position"
                            placeholder="Ej: TECNICO, SUPERVISOR"
                            {...register('position')}
                            className={errors.position ? 'border-red-500' : ''}
                        />
                        {errors.position && <p className="text-xs text-red-500">{errors.position.message}</p>}
                    </div>

                    <DialogFooter className="mr-0 mt-4">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-[#0A3161] hover:bg-[#152d6f] text-white font-medium"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Empleado
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
