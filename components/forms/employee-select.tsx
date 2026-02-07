'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus, User, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Drawer,
    DrawerContent,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { useEmployees } from '@/hooks'; // Ahora usamos el hook con cache
import { Employee } from '@/types/safety-talks';
import { EmployeeQuickCreateDialog } from './employee-quick-create';
import { Badge } from '@/components/ui/badge';

interface EmployeeSelectProps {
    stationCode: string;
    value?: string; // Employee Full Name (legacy text)
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

export function EmployeeSelect({
    stationCode,
    value,
    onChange,
    placeholder = "Seleccionar personal...",
    className
}: EmployeeSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [isDesktop, setIsDesktop] = React.useState(true);

    // ✅ OPTIMIZACIÓN: Usar hook con cache (React Query)
    // Esto evita llamadas redundantes si hay múltiples selectores en la misma página
    const { employees, isLoading: loading, invalidateEmployees } = useEmployees(stationCode);

    const [search, setSearch] = React.useState('');
    const [showQuickCreate, setShowQuickCreate] = React.useState(false);

    // Detectar si es móvil
    React.useEffect(() => {
        const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    const handleSelect = (currentValue: string) => {
        // We pass the Name back mainly because the Inspection schema expects a string name currently.
        // In future should update schema to store ID.
        onChange(currentValue);
        setOpen(false);
    };

    const handleQuickCreateSuccess = (newEmp: Employee) => {
        // Al crear, invalidamos la cache para que se refresque la lista globalmente
        invalidateEmployees();
        onChange(newEmp.full_name); // Auto-select new employee
        setShowQuickCreate(false);
        setOpen(false);
    };

    const CommandContent = () => (
        <Command shouldFilter={false} className="rounded-lg border-0">
            {/* We implement custom filtering or simple client filtering since list might be small enough currently */}
            <CommandInput
                placeholder="Buscar por nombre o DNI..."
                value={search}
                onValueChange={setSearch}
                className="h-12"
            />
            <CommandList className="max-h-[300px] md:max-h-[200px]">
                {loading && <div className="py-6 text-center text-sm text-muted-foreground">Cargando...</div>}

                {!loading && search.length < 2 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        Escriba nombre o DNI para buscar...
                    </div>
                )}

                {!loading && search.length >= 2 && employees.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        No se encontraron resultados en esta estación.
                    </div>
                )}

                {!loading && search.length >= 2 && (
                    <CommandEmpty>
                        <p className="py-2 text-sm text-muted-foreground">No encontrado.</p>
                        <Button
                            variant="ghost"
                            type="button"
                            className="mt-2 w-full justify-start text-blue-600 h-auto py-2"
                            onClick={() => setShowQuickCreate(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Crear "{search || 'Nuevo'}"
                        </Button>
                    </CommandEmpty>
                )}

                {search.length >= 2 && (
                    <CommandGroup>
                        {employees
                            .filter(e => e.full_name.toLowerCase().includes(search.toLowerCase()) || e.dni.includes(search))
                            .slice(0, 50)
                            .map((employee) => (
                                <CommandItem
                                    key={employee.id}
                                    value={`${employee.full_name} ${employee.dni}`}
                                    onSelect={() => handleSelect(employee.full_name)}
                                    disabled={false}
                                    className="cursor-pointer data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto text-black aria-selected:bg-blue-50" // Override pointer-events-none
                                    onMouseDown={(e: React.MouseEvent) => {
                                        // Force selection on mouse down
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSelect(employee.full_name);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === employee.full_name ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{employee.full_name}</span>
                                        <div className="flex gap-2">
                                            <span className="text-xs text-muted-foreground">{employee.position}</span>
                                            <span className="text-xs text-gray-400 font-mono">DNI:{employee.dni}</span>
                                        </div>
                                    </div>
                                </CommandItem>
                            ))}
                    </CommandGroup>
                )}

                {/* Always show Create option at bottom if searched */}
                {!loading && search.length > 2 && (
                    <div className="p-1 border-t mt-1">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => setShowQuickCreate(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Crear nuevo empleado
                        </Button>
                    </div>
                )}
            </CommandList>
        </Command>
    );

    if (!isDesktop) {
        // MOBILE: Use Drawer for better UX
        return (
            <>
                <Drawer open={open} onOpenChange={setOpen}>
                    <DrawerTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            type="button"
                            aria-expanded={open}
                            className={cn("w-full justify-between truncate font-normal", !value && "text-muted-foreground", className)}
                        >
                            {value ? (
                                <div className="flex items-center gap-2 truncate">
                                    <User className="h-4 w-4 shrink-0 opacity-50" />
                                    <span className="truncate">{value}</span>
                                </div>
                            ) : (
                                placeholder
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[80vh]">
                        <div className="px-4 py-4">
                            <CommandContent />
                        </div>
                    </DrawerContent>
                </Drawer>

                <EmployeeQuickCreateDialog
                    open={showQuickCreate}
                    onOpenChange={setShowQuickCreate}
                    stationCode={stationCode}
                    defaultName={search}
                    onSuccess={handleQuickCreateSuccess}
                />
            </>
        );
    }

    // DESKTOP: Use Popover with smart positioning
    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        type="button" // Important: preventing form submit
                        aria-expanded={open}
                        className={cn("w-full justify-between truncate font-normal", !value && "text-muted-foreground", className)}
                    >
                        {value ? (
                            <div className="flex items-center gap-2 truncate">
                                <User className="h-4 w-4 shrink-0 opacity-50" />
                                <span className="truncate">{value}</span>
                            </div>
                        ) : (
                            placeholder
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                    side="bottom"
                    sideOffset={4}
                    avoidCollisions={true}
                    collisionPadding={8}
                >
                    <CommandContent />
                </PopoverContent>
            </Popover>

            <EmployeeQuickCreateDialog
                open={showQuickCreate}
                onOpenChange={setShowQuickCreate}
                stationCode={stationCode}
                defaultName={search}
                onSuccess={handleQuickCreateSuccess}
            />
        </>
    );
}
