'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link'; // Import correcto de Link
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Search,
    Plus,
    Upload,
    Users,
    MapPin,
    Briefcase,
    Loader2
} from 'lucide-react';
import { SafetyTalksService } from '@/lib/services/safety-talks';
import { StationsService } from '@/lib/services/stations';
import { useAuth } from '@/hooks';
import { Employee } from '@/types/safety-talks';
import { Badge } from '@/components/ui/badge';
import {
    MoreHorizontal,
    Pencil,
    Trash2,
    Power,
    CheckCircle2,
    X
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmployeeCreateDialog } from '@/components/settings/employee-create-dialog';


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

export default function EmployeesPage() {
    const { profile } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const loadEmployees = async () => {
        setLoading(true);
        const { data, total: totalCount } = await SafetyTalksService.listEmployees({
            page,
            pageSize: 20,
            search,
            station: profile?.station || undefined // Filtrar por estación si el usuario tiene una asignada
        });
        setEmployees(data || []);
        setTotal(totalCount);
        setLoading(false);
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadEmployees();
        }, 300); // Debounce search
        return () => clearTimeout(timeout);
    }, [page, search, profile?.station]);

    const [stations, setStations] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        const loadStations = async () => {
            const { data } = await StationsService.listActive();
            setStations(data.map(s => ({ value: s.code, label: s.name })));
        };
        loadStations();
    }, []);

    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCustomPosition, setIsCustomPosition] = useState(false);

    const handleToggleStatus = async (dni: string, currentStatus: boolean) => {
        const action = currentStatus ? 'desactivar' : 'activar';
        const confirm = window.confirm(`¿Estás seguro de que deseas ${action} a este empleado?`);
        if (!confirm) return;

        const { error } = await SafetyTalksService.updateEmployee(dni, { is_active: !currentStatus });

        if (error) {
            toast.error(`Error al ${action} empleado`);
        } else {
            toast.success(`Empleado ${currentStatus ? 'cesado' : 'reactivado'} correctamente`);
            loadEmployees(); // Recargar lista
        }
    };

    const handleEditClick = (employee: Employee) => {
        setEditingEmployee({ ...employee });
        setIsCustomPosition(!PREDEFINED_POSITIONS.includes(employee.position || '') && !!employee.position);
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingEmployee) return;
        setIsSaving(true);
        // Validar campos mínimos
        if (!editingEmployee.full_name || !editingEmployee.dni || !editingEmployee.station_code) {
            toast.error("Por favor completa los campos obligatorios");
            setIsSaving(false);
            return;
        }

        const { error } = await SafetyTalksService.updateEmployee(editingEmployee.dni, {
            full_name: editingEmployee.full_name,
            position: editingEmployee.position,
            area: editingEmployee.area,
            station_code: editingEmployee.station_code
        });

        if (error) {
            toast.error("Error al actualizar empleado");
        } else {
            toast.success("Empleado actualizado correctamente");
            setIsEditDialogOpen(false);
            setEditingEmployee(null);
            loadEmployees();
        }
        setIsSaving(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Empleados</h2>
                    <p className="text-muted-foreground">
                        Gestiona el personal para las charlas de seguridad.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/settings/employees/upload">
                        <Button variant="outline" className="gap-2">
                            <Upload className="h-4 w-4" />
                            Carga Masiva
                        </Button>
                    </Link>
                    <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Nuevo Empleado
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar por DNI o Nombre..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : employees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Users className="h-12 w-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No hay empleados encontrados</h3>
                            <p className="text-sm text-gray-500 mb-4">Prueba ajustar la búsqueda o carga nuevos empleados.</p>
                            <Link href="/settings/employees/upload">
                                <Button variant="outline">Ir a Carga Masiva</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>DNI</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Cargo</TableHead>
                                        <TableHead>Área</TableHead>
                                        <TableHead>Estación</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.map((emp) => (
                                        <TableRow key={emp.id || emp.dni}>
                                            <TableCell className="font-mono text-xs">{emp.dni}</TableCell>
                                            <TableCell className="font-medium">{emp.full_name}</TableCell>
                                            <TableCell className="text-muted-foreground">{emp.position}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {emp.area}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <MapPin className="h-3 w-3" />
                                                    {emp.station_code}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={emp.is_active ? 'default' : 'secondary'} className={emp.is_active ? 'bg-green-500 hover:bg-green-600' : ''}>
                                                    {emp.is_active ? 'Activo' : 'Cesado'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Abrir menú</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleEditClick(emp)}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleToggleStatus(emp.dni, emp.is_active)}
                                                            className={emp.is_active ? 'text-red-600' : 'text-green-600'}
                                                        >
                                                            {emp.is_active ? (
                                                                <>
                                                                    <Power className="mr-2 h-4 w-4" />
                                                                    Cesar (Desactivar)
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                    Reactivar
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    <div className="flex items-center justify-end space-x-2 py-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Anterior
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            Página {page}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={employees.length < 20}
                        >
                            Siguiente
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de Edición */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Empleado</DialogTitle>
                        <DialogDescription>
                            Modifica los datos del empleado. Los cambios se reflejarán inmediatamente.
                        </DialogDescription>
                    </DialogHeader>
                    {editingEmployee && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="dni" className="text-right">
                                    DNI
                                </Label>
                                <Input
                                    id="dni"
                                    value={editingEmployee.dni}
                                    disabled // DNI no editable por seguridad/key
                                    className="col-span-3 bg-muted"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Nombre
                                </Label>
                                <Input
                                    id="name"
                                    value={editingEmployee.full_name}
                                    onChange={(e) => setEditingEmployee({ ...editingEmployee, full_name: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="position" className="text-right">
                                    Cargo
                                </Label>
                                <div className="col-span-3 space-y-2">
                                    <Select
                                        value={isCustomPosition ? 'custom' : (PREDEFINED_POSITIONS.includes(editingEmployee.position || '') ? editingEmployee.position : 'custom')}
                                        onValueChange={(val) => {
                                            if (val === 'custom') {
                                                setIsCustomPosition(true);
                                                // Mantenemos el valor actual si ya era custom, si no, limpiamos
                                                if (!isCustomPosition) {
                                                    setEditingEmployee({ ...editingEmployee, position: '' });
                                                }
                                            } else {
                                                setIsCustomPosition(false);
                                                setEditingEmployee({ ...editingEmployee, position: val });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Selecciona cargo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PREDEFINED_POSITIONS.map((p) => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                            <SelectItem value="custom" className="text-blue-600 font-medium">+ Otro / Personalizado</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {isCustomPosition && (
                                        <Input
                                            id="position-custom"
                                            placeholder="Escribe el cargo manualmente..."
                                            value={editingEmployee.position}
                                            onChange={(e) => setEditingEmployee({ ...editingEmployee, position: e.target.value })}
                                            autoFocus
                                            className="mt-2"
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="area" className="text-right">
                                    Área
                                </Label>
                                <Select
                                    value={editingEmployee.area}
                                    onValueChange={(val) => setEditingEmployee({ ...editingEmployee, area: val as any })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecciona área" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RAMPA">RAMPA</SelectItem>
                                        <SelectItem value="PAX">PAX</SelectItem>
                                        <SelectItem value="MANTTO">MANTTO</SelectItem>
                                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="station" className="text-right">
                                    Estación
                                </Label>
                                <Select // 3. Replace the Input component for Station with Select.
                                    value={editingEmployee.station_code}
                                    onValueChange={(val) => setEditingEmployee({ ...editingEmployee, station_code: val })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecciona estación" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stations.map((station) => (
                                            <SelectItem key={station.value} value={station.value}>
                                                {station.label} ({station.value})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Creación */}
            <EmployeeCreateDialog
                open={isCreateDialogOpen}
                onClose={(refresh) => {
                    setIsCreateDialogOpen(false);
                    if (refresh) loadEmployees();
                }}
                supervisorStation={profile?.station}
            />
        </div>
    );
}
