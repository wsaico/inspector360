'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafetyTalksService } from '@/lib/services/safety-talks';
import { StationsService } from '@/lib/services/stations';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const PREDEFINED_POSITIONS = [
    'Supervisor',
    'Operador 1',
    'Operador 2',
    'Operador 3',
    'Auxiliar de Rampa',
    'Supervisor de Tráfico',
    'Agente de Tráfico',
    'Técnico Senior 1',
    'Técnico Senior 2',
    'Admin'
];

const employeeSchema = z.object({
    dni: z.string()
        .length(8, 'El DNI debe tener exactamente 8 dígitos')
        .regex(/^\d+$/, 'El DNI solo debe contener números'),
    full_name: z.string()
        .min(3, 'El nombre debe tener al menos 3 caracteres')
        .transform(val => val.trim().toUpperCase()),
    position: z.string().optional(),
    area: z.enum(['RAMPA', 'PAX', 'MANTTO', 'ADMIN'] as const),
    station_code: z.string().min(1, 'Debe seleccionar una estación'),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeCreateDialogProps {
    open: boolean;
    onClose: (refresh: boolean) => void;
    supervisorStation?: string; // Estación del supervisor (restricción)
}

export function EmployeeCreateDialog({ open, onClose, supervisorStation }: EmployeeCreateDialogProps) {
    const [stations, setStations] = useState<{ value: string; label: string }[]>([]);
    const [loadingStations, setLoadingStations] = useState(true);
    const [isCustomPosition, setIsCustomPosition] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        setValue,
        watch,
        control,
    } = useForm<EmployeeFormData>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            dni: '',
            full_name: '',
            position: '',
            area: undefined,
            station_code: supervisorStation || '',
        },
    });

    // Cargar estaciones
    useEffect(() => {
        async function loadStations() {
            setLoadingStations(true);
            const { data } = await StationsService.listActive();
            setStations(data.map(s => ({ value: s.code, label: s.name })));
            setLoadingStations(false);
        }
        loadStations();
    }, []);

    // Si hay estación de supervisor, establecerla por defecto
    useEffect(() => {
        if (supervisorStation) {
            setValue('station_code', supervisorStation);
        }
    }, [supervisorStation, setValue]);

    useEffect(() => {
        if (!open) {
            reset();
            setIsCustomPosition(false);
        }
    }, [open, reset]);

    const onSubmit = async (data: EmployeeFormData) => {
        try {
            // Validar que la estación sea la del supervisor si está restringido
            if (supervisorStation && data.station_code !== supervisorStation) {
                toast.error('Solo puedes crear empleados para tu estación');
                return;
            }

            const { error } = await SafetyTalksService.createEmployee({
                dni: data.dni,
                full_name: data.full_name,
                position: data.position,
                area: data.area,
                station_code: data.station_code,
                is_active: true
            });

            if (error) throw new Error(error);

            toast.success('Empleado creado exitosamente');
            onClose(true);
        } catch (error: any) {
            console.error('Error creating employee:', error);
            toast.error(error.message || 'Error al crear empleado');
        }
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose(false)}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Nuevo Empleado</DialogTitle>
                    <DialogDescription>
                        Registra un nuevo empleado. Los nombres se convertirán automáticamente a MAYÚSCULAS.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="dni">DNI *</Label>
                        <Input
                            id="dni"
                            type="text"
                            maxLength={8}
                            {...register('dni')}
                            placeholder="12345678"
                        />
                        {errors.dni && (
                            <p className="text-sm text-red-500">{errors.dni.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="full_name">Nombre Completo *</Label>
                        <Input
                            id="full_name"
                            {...register('full_name')}
                            placeholder="Juan Pérez García"
                            className="uppercase"
                        />
                        {errors.full_name && (
                            <p className="text-sm text-red-500">{errors.full_name.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Se convertirá automáticamente a MAYÚSCULAS
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="position">Cargo</Label>
                        <div className="space-y-2">
                            <Select
                                value={isCustomPosition ? 'custom' : (watch('position') || '')}
                                onValueChange={(val) => {
                                    if (val === 'custom') {
                                        setIsCustomPosition(true);
                                        setValue('position', '');
                                    } else {
                                        setIsCustomPosition(false);
                                        setValue('position', val);
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona cargo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PREDEFINED_POSITIONS.map((p) => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                    <SelectItem value="custom" className="text-blue-600 font-medium">
                                        + Otro / Personalizado
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {isCustomPosition && (
                                <Input
                                    id="position-custom"
                                    placeholder="Escribe el cargo manualmente..."
                                    {...register('position')}
                                    autoFocus
                                />
                            )}
                        </div>
                        {errors.position && (
                            <p className="text-sm text-red-500">{errors.position.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="area">Área *</Label>
                        <Controller
                            name="area"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona área" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RAMPA">RAMPA</SelectItem>
                                        <SelectItem value="PAX">PAX</SelectItem>
                                        <SelectItem value="MANTTO">MANTTO</SelectItem>
                                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.area && (
                            <p className="text-sm text-red-500">{errors.area.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="station">Estación *</Label>
                        <Controller
                            name="station_code"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    disabled={!!supervisorStation || loadingStations}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={
                                                loadingStations
                                                    ? "Cargando estaciones..."
                                                    : "Seleccionar estación"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stations.map((station) => (
                                            <SelectItem key={station.value} value={station.value}>
                                                {station.label} ({station.value})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.station_code && (
                            <p className="text-sm text-red-500">{errors.station_code.message}</p>
                        )}
                        {supervisorStation && (
                            <p className="text-xs text-muted-foreground">
                                Solo puedes crear empleados para tu estación
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onClose(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear Empleado
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
