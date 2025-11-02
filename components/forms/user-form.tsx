'use client';

import { useState } from 'react';
import { UserService } from '@/lib/services';
import { UserProfile, UserRole, ROLE_LABELS, STATIONS, Station } from '@/types/roles';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserFormProps {
  user: UserProfile | null;
  onSuccess: () => void;
}

export default function UserForm({ user, onSuccess }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    full_name: user?.full_name || '',
    role: user?.role || ('inspector' as UserRole),
    station: user?.station || ('' as Station | ''),
    phone: user?.phone || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user && !formData.password) {
      toast.error('La contraseña es requerida para nuevos usuarios');
      return;
    }

    if (!formData.email || !formData.full_name || !formData.role) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);

    try {
      if (user) {
        // Actualizar usuario existente
        const { data, error } = await UserService.updateUser(user.id, {
          full_name: formData.full_name,
          role: formData.role,
          station: formData.station || undefined,
          phone: formData.phone || undefined,
        });

        if (error) throw new Error(error);
        toast.success('Usuario actualizado exitosamente');
      } else {
        // Crear nuevo usuario
        const { data, error } = await UserService.createUser({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          station: formData.station || undefined,
          phone: formData.phone || undefined,
        });

        if (error) throw new Error(error);
        toast.success('Usuario creado exitosamente');
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar usuario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={!!user}
            required
          />
          {user && (
            <p className="text-xs text-muted-foreground">
              El email no puede ser modificado
            </p>
          )}
        </div>

        {/* Nombre Completo */}
        <div className="space-y-2">
          <Label htmlFor="full_name">
            Nombre Completo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="full_name"
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
        </div>

        {/* Contraseña (solo para crear) */}
        {!user && (
          <div className="space-y-2">
            <Label htmlFor="password">
              Contraseña <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              minLength={6}
              required
            />
            <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
          </div>
        )}

        {/* Teléfono */}
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        {/* Rol */}
        <div className="space-y-2">
          <Label htmlFor="role">
            Rol <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
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
        </div>

        {/* Estación */}
        <div className="space-y-2">
          <Label htmlFor="station">Estación</Label>
          <Select
            value={formData.station || 'none'}
            onValueChange={(value) => setFormData({ ...formData, station: value === 'none' ? '' : value as Station })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estación (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ninguna (Todas)</SelectItem>
              {Object.entries(STATIONS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Dejar vacío para acceso a todas las estaciones (solo admin)
          </p>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>{user ? 'Actualizar Usuario' : 'Crear Usuario'}</>
          )}
        </Button>
      </div>
    </form>
  );
}
