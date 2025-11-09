import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/users/[id]
 * Elimina un usuario por ID usando Supabase Admin API (service_role).
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Variables de entorno de Supabase faltantes' },
        { status: 500 }
      );
    }

    // Obtener id desde params o, si no viene, parsearlo desde la URL
    const url = new URL(request.url);
    const segments = url.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    const resolvedParams = await (params as Promise<{ id: string }>);
    const userId = (resolvedParams?.id) || lastSegment;
    if (!userId) {
      return NextResponse.json(
        { error: 'Falta el parámetro id' },
        { status: 400 }
      );
    }

    // Cliente Admin con service_role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1) Eliminar en auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error('Error eliminando en auth.users:', deleteAuthError);
      return NextResponse.json(
        { error: deleteAuthError.message || 'Error eliminando usuario en auth' },
        { status: 500 }
      );
    }

    // 2) Eliminar el perfil en user_profiles (si existe)
    const { error: deleteProfileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      console.warn('Usuario borrado en auth, pero fallo al borrar perfil:', deleteProfileError);
      // No bloqueamos si el perfil no se elimina; retornamos éxito parcial.
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error en DELETE /api/users/[id]:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
