'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks';
import { UserService } from '@/lib/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Edit,
  Loader2,
  UserPlus,
  UserX,
  UserCheck,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile, ROLE_LABELS, STATIONS } from '@/types/roles';
import UserForm from '@/components/forms/user-form';

export default function UsersPage() {
  const { profile, loading: profileLoading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const canManageUsers = profile?.role === 'admin';

  useEffect(() => {
    // Wait for profile to load before checking permissions
    if (profileLoading) return;

    if (!canManageUsers) {
      toast.error('No tienes permisos para acceder a esta página');
      return;
    }
    loadUsers();
  }, [canManageUsers, profileLoading]);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await UserService.getUsers();

    if (error) {
      toast.error('Error al cargar usuarios');
      console.error(error);
    } else {
      setUsers(data || []);
    }

    setLoading(false);
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setDialogOpen(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const { data, error } = await UserService.toggleUserStatus(userId, !currentStatus);

    if (error) {
      toast.error('Error al actualizar usuario');
    } else {
      toast.success(
        !currentStatus ? 'Usuario activado exitosamente' : 'Usuario desactivado exitosamente'
      );
      loadUsers();
    }
  };

  const handleUserSaved = () => {
    setDialogOpen(false);
    setEditingUser(null);
    loadUsers();
  };

  // Show loading while profile is loading
  if (profileLoading || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show permission error after profile loads
  if (!canManageUsers) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-lg text-muted-foreground">
          No tienes permisos para acceder a esta página
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Gestión de Usuarios</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateUser}>
                <UserPlus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                </DialogTitle>
              </DialogHeader>
              <UserForm user={editingUser} onSuccess={handleUserSaved} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserPlus className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-2 text-lg font-semibold">
                No hay usuarios registrados
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                Comienza creando tu primer usuario
              </p>
              <Button onClick={handleCreateUser}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Usuario
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.station ? (
                          <div className="flex items-center text-sm">
                            <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                            {STATIONS[user.station]}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Todas
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge className="bg-green-500">Activo</Badge>
                        ) : (
                          <Badge variant="destructive">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStatus(user.id, user.is_active)}
                          >
                            {user.is_active ? (
                              <UserX className="h-4 w-4 text-destructive" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estadísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Usuarios</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Usuarios Activos</p>
              <p className="text-2xl font-bold text-green-600">
                {users.filter((u) => u.is_active).length}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Usuarios Inactivos</p>
              <p className="text-2xl font-bold text-destructive">
                {users.filter((u) => !u.is_active).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
