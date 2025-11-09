import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Cambiar Contraseña de Usuario
 * Permite a administradores cambiar la contraseña de cualquier usuario
 * Permite a usuarios cambiar su propia contraseña
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Service role key no configurada' },
        { status: 500 }
      );
    }

    // Cliente con permisos de admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await request.json();
    const { newPassword, currentPassword } = body;
    const userId = params.id;

    // Validaciones
    if (!newPassword) {
      return NextResponse.json(
        { error: 'Nueva contraseña es requerida' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Si se proporciona contraseña actual, verificarla (cambio por el propio usuario)
    if (currentPassword) {
      // Obtener el email del usuario
      const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

      if (userError || !user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      // Verificar contraseña actual
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: user.user.email!,
        password: currentPassword,
      });

      if (signInError) {
        return NextResponse.json(
          { error: 'Contraseña actual incorrecta' },
          { status: 401 }
        );
      }
    }

    // Actualizar contraseña
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error('Error cambiando contraseña:', error);
      return NextResponse.json(
        { error: error.message || 'Error al cambiar contraseña' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Contraseña actualizada exitosamente',
        data
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en API change password:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
