'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserService } from '@/lib/services';
import { StationsService, StationConfig } from '@/lib/services/stations';
import { User, UserProfile, ROLE_LABELS, UserRole } from '@/types';
import {
  Dialog,
  DialogContent,
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

const userSchema = z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().min(3, 'Nombre debe tener al menos 3 caracteres'),
  role: z.enum(['admin', 'supervisor', 'sig', 'inspector', 'operador', 'mecanico'], 'Rol requerido'),
  station: z.string().optional(),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres').optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormDialogProps {
  open: boolean;
  onClose: (refresh: boolean) => void;
  user?: User | null;
}

export function UserFormDialog({ open, onClose, user }: UserFormDialogProps) {
  const isEditing = !!user;
  const [stations, setStations] = useState<StationConfig[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      full_name: '',
      role: 'supervisor',
      station: '',
      password: '',
    },
  });

  const selectedRole = watch('role');

  // Cargar estaciones dinámicamente
  useEffect(() => {
    async function loadStations() {
      setLoadingStations(true);
      const { data } = await StationsService.listActive();
      setStations(data);
      setLoadingStations(false);
    }
    loadStations();
  }, []);

  useEffect(() => {
    if (user) {
      setValue('email', user.email);
      setValue('full_name', user.full_name);
      setValue('role', user.role);
      setValue('station', user.station || '');
    } else {
      reset();
    }
  }, [user, reset, setValue]);

  const onSubmit = async (data: UserFormData) => {
    try {
      if (isEditing) {
        // Actualizar usuario
        const updates: Partial<UserProfile> = {
          full_name: data.full_name,
          role: data.role as UserRole,
          station: data.station ? (data.station as any) : undefined,
        };

        const { error } = await UserService.updateUser(user!.id!, updates);

        if (error) throw new Error(error);

        toast.success('Usuario actualizado exitosamente');
      } else {
        // Crear nuevo usuario
        if (!data.password) {
          toast.error('La contraseña es requerida para nuevos usuarios');
          return;
        }

        const { error } = await UserService.createUser({
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          role: data.role as UserRole,
          station: data.station ? (data.station as any) : undefined,
        });

        if (error) throw new Error(error);

        toast.success('Usuario creado exitosamente');
      }

      onClose(true);
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Error al guardar usuario');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              disabled={isEditing}
              placeholder="usuario@ejemplo.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo *</Label>
            <Input
              id="full_name"
              {...register('full_name')}
              placeholder="Juan Pérez"
            />
            {errors.full_name && (
              <p className="text-sm text-red-500">{errors.full_name.message}</p>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder="Mínimo 6 caracteres"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Rol *</Label>
            <Select
              onValueChange={(value) => setValue('role', value as any)}
              defaultValue={user?.role || 'supervisor'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>

          {(selectedRole === 'supervisor' || selectedRole === 'operador' || selectedRole === 'mecanico') && (
            <div className="space-y-2">
              <Label htmlFor="station">Estación *</Label>
              <Select
                onValueChange={(value) => setValue('station', value)}
                defaultValue={user?.station || ''}
                disabled={loadingStations}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingStations ? "Cargando estaciones..." : "Seleccionar estación"} />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station.code} value={station.code}>
                      {station.name} ({station.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.station && (
                <p className="text-sm text-red-500">{errors.station.message}</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
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
              {isEditing ? 'Actualizar' : 'Crear'} Usuario
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
