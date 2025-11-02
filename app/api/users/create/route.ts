import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: Crear Usuario
 * Solo accesible por administradores
 * Usa Supabase Admin API con service_role key
 */

export async function POST(request: NextRequest) {
  try {
    // Validar que el usuario actual sea admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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

    // Obtener datos del request
    const body = await request.json();
    const { email, password, full_name, role, station, phone } = body;

    // Validaciones
    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: email, password, full_name, role' },
        { status: 400 }
      );
    }

    // Validar rol
    if (!['admin', 'supervisor', 'inspector'].includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    // Crear usuario en auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        station,
      },
    });

    if (authError) {
      console.error('Error creando usuario en auth:', authError);
      return NextResponse.json(
        { error: authError.message || 'Error creando usuario' },
        { status: 500 }
      );
    }

    // El trigger handle_new_user() creará automáticamente el perfil
    // Esperar un momento para que el trigger se ejecute
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Obtener el perfil creado
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error('Error obteniendo perfil:', profileError);
      // Intentar eliminar el usuario creado si el perfil falló
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Error creando perfil de usuario' },
        { status: 500 }
      );
    }

    // Actualizar con campos adicionales si es necesario
    if (phone) {
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ phone })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error actualizando teléfono:', updateError);
      } else {
        return NextResponse.json({ data: updatedProfile }, { status: 201 });
      }
    }

    return NextResponse.json({ data: profile }, { status: 201 });
  } catch (error: any) {
    console.error('Error en API create user:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
