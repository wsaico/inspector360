"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@/hooks";
import { UserService } from "@/lib/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2, UserPlus, MapPin, Key, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { User } from "@/types";
import { UserFormDialog } from "@/components/settings/user-form-dialog";
import { ChangePasswordDialog } from "@/components/settings/change-password-dialog";

export default function UsersPage() {
  const { canManageUsers, canAccessSettings } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    if (!canManageUsers && !canAccessSettings) {
      return;
    }
    loadUsers();
  }, [canManageUsers, canAccessSettings]);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await UserService.getUsers();
    if (error) {
      toast.error("Error al cargar usuarios");
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

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmed = window.confirm("¿Eliminar usuario de forma permanente?");
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = result && (result.error as string) ? result.error : "Error eliminando usuario";
        toast.error(msg);
        return;
      }
      toast.success("Usuario eliminado");
      loadUsers();
    } catch (error: any) {
      toast.error(error?.message || "Error eliminando usuario");
    }
  };

  const handleToggleActive = async (user: User) => {
    const { data, error } = await UserService.updateUser(user.id!, {
      is_active: !user.is_active,
    });
    if (error) {
      toast.error("Error al actualizar usuario");
    } else {
      toast.success(user.is_active ? "Usuario desactivado" : "Usuario activado");
      loadUsers();
    }
  };

  const handleDialogClose = (shouldRefresh: boolean) => {
    setDialogOpen(false);
    setEditingUser(null);
    if (shouldRefresh) {
      loadUsers();
    }
  };

  const handleChangePassword = (user: User) => {
    setPasswordUser(user);
    setPasswordDialogOpen(true);
  };

  const handlePasswordDialogClose = () => {
    setPasswordDialogOpen(false);
    setPasswordUser(null);
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "success"> = {
      admin: "default",
      supervisor: "secondary",
      sig: "success",
      operador: "secondary",
      mecanico: "secondary",
      inspector: "default",
    };
    const labels: Record<string, string> = {
      admin: "Administrador",
      supervisor: "Supervisor",
      sig: "SIG",
      operador: "Operador",
      mecanico: "Mecánico",
      inspector: "Inspector",
    };
    return <Badge variant={variants[role] || "default"}>{labels[role] || role}</Badge>;
  };

  if (!canManageUsers && !canAccessSettings) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-lg text-muted-foreground">No tienes permisos para acceder a esta página</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        {canManageUsers && (
          <Button onClick={handleCreateUser}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Usuarios ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserPlus className="mb-4 h-12 w-12 text-gray-400" />
              <p className="mb-2 text-lg font-semibold text-gray-900">No hay usuarios registrados</p>
              <p className="mb-4 text-sm text-gray-500">Comienza creando tu primer usuario</p>
              {canManageUsers && (
                <Button onClick={handleCreateUser}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Usuario
                </Button>
              )}
            </div>
          ) : (
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
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.station ? (
                        <div className="flex items-center text-sm">
                          <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                          {user.station}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Todas</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "success" : "destructive"}>
                        {user.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canManageUsers ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleChangePassword(user)}>
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={user.is_active ? "outline" : "default"}
                              onClick={() => handleToggleActive(user)}
                            >
                              {user.is_active ? "Desactivar" : "Activar"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id!)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Solo lectura</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {/* Pagination Footer */}
        {users.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100">
            <span className="text-sm text-slate-500 font-medium">
              Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, users.length)} - {Math.min(currentPage * itemsPerPage, users.length)} de {users.length} usuarios
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 md:h-9 md:w-auto md:px-3"
              >
                <ChevronLeft className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Anterior</span>
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum = i + 1;
                  // Simple sliding window for page numbers if totalPages > 5
                  if (totalPages > 5) {
                    if (currentPage > 3) {
                      pageNum = currentPage - 2 + i;
                    }
                    else {
                      pageNum = i + 1;
                    }
                    if (pageNum > totalPages) return null;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 w-8 p-0 font-bold ${currentPage === pageNum ? 'bg-[#0A3161] hover:bg-[#0c3c75]' : 'text-slate-500'}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0 md:h-9 md:w-auto md:px-3"
              >
                <span className="hidden md:inline">Siguiente</span>
                <ChevronRight className="h-4 w-4 md:ml-2" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <UserFormDialog open={dialogOpen} user={editingUser} onClose={handleDialogClose} />

      {
        passwordUser && (
          <ChangePasswordDialog
            open={passwordDialogOpen}
            onClose={handlePasswordDialogClose}
            userId={passwordUser.id!}
            userName={passwordUser.full_name}
            isOwnProfile={false}
          />
        )
      }
    </div >
  );
}
