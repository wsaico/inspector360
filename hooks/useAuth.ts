'use client';

/**
 * Hook de Autenticación
 * Maneja el estado de autenticación del usuario
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User as SupabaseUser, type AuthChangeEvent, type Session } from '@supabase/supabase-js';
import { UserProfile } from '@/types/roles';
import { withTimeout } from '@/lib/utils/async';

interface AuthState {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  // Persistencia manual para mejorar experiencia ante cortes de red
  const PERSIST_KEY = 'i360.auth.persist';

  const readPersisted = (): { user: SupabaseUser | null; profile: UserProfile | null; savedAt: number } => {
    try {
      if (typeof window === 'undefined') return { user: null, profile: null, savedAt: 0 };
      const raw = window.localStorage.getItem(PERSIST_KEY);
      if (!raw) return { user: null, profile: null, savedAt: 0 };
      const obj = JSON.parse(raw);
      // Validar si la sesión guardada no es demasiado antigua (opcional, pero ayuda)
      return { user: obj.user || null, profile: obj.profile || null, savedAt: obj.savedAt || 0 };
    } catch {
      return { user: null, profile: null, savedAt: 0 };
    }
  };

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const writePersisted = (user: SupabaseUser | null, profile: UserProfile | null) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(PERSIST_KEY, JSON.stringify({ user, profile, savedAt: Date.now() }));
    } catch { }
  };

  const clearPersisted = () => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(PERSIST_KEY);
    } catch { }
  };

  useEffect(() => {
    // 1. Cargar persistencia INMEDIATAMENTE al montar el componente (Client-side only)
    const persisted = readPersisted();
    if (persisted.user) {
      setAuthState({
        user: persisted.user,
        profile: persisted.profile,
        loading: false,
        error: null,
      });
    }

    // 2. Confiar en el middleware para validación de sesión
    // Solo cargar sesión inicial y escuchar cambios - sin validaciones periódicas
    const initSession = async () => {
      try {
        // Intentar cargar sesión existente
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('[useAuth] Error obteniendo sesión:', error.message);
          // Solo limpiar si realmente hay un error de sesión, no si no hay sesión
          if (error.status !== 401) {
            clearPersisted();
            setAuthState({ user: null, profile: null, loading: false, error: null });
          }
          return;
        }

        if (session?.user) {
          // Si ya tenemos datos persistidos, no los reseteamos a profile: null
          const persisted = readPersisted();
          const currentProfile = (persisted.user?.id === session.user.id) ? persisted.profile : null;

          setAuthState({
            user: session.user,
            profile: currentProfile,
            loading: !currentProfile, // Seguir cargando solo si no tenemos perfil
            error: null
          });

          // Sincronizar perfil en background
          loadUserProfile(session.user).then((profile) => {
            writePersisted(session.user, profile);
          });
        } else {
          // Sin sesión real: ahora sí limpiar estado
          clearPersisted();
          setAuthState({ user: null, profile: null, loading: false, error: null });
        }
      } catch (error) {
        console.error('[useAuth] Error inicializando sesión:', error);
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    initSession();

    // Escuchar cambios de autenticación (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        // console.log('[useAuth] Auth event:', event);

        if (session?.user) {
          // ✅ OPTIMIZADO: Login INMEDIATO - Perfil en background
          // Primero marcar como autenticado SIN esperar perfil
          setAuthState({ user: session.user, profile: null, loading: false, error: null });

          // Cargar perfil en background sin bloquear
          loadUserProfile(session.user).then((loadedProfile) => {
            writePersisted(session.user, loadedProfile);
          });
        } else {
          // Sesión terminada - limpiar
          clearPersisted();
          setAuthState({ user: null, profile: null, loading: false, error: null });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Solo ejecutar una vez al montar

  const loadUserProfile = async (supabaseUser: SupabaseUser): Promise<UserProfile | null> => {
    try {
      // ✅ OPTIMIZACIÓN CRÍTICA: Usar metadata PRIMERO (INSTANT - sin query)
      // Esto hace que el perfil esté disponible INMEDIATAMENTE incluso en móvil con conexión lenta
      const metaProfile = buildProfileFromMetadata(supabaseUser);

      if (metaProfile) {
        // console.log('[useAuth] ⚡ Perfil cargado INSTANTÁNEAMENTE desde metadata JWT');
        // Establecer perfil INMEDIATAMENTE sin esperar query
        setAuthState({ user: supabaseUser, profile: metaProfile, loading: false, error: null });

        // ✅ Verificar con base de datos en BACKGROUND (no bloquea UI)
        // Solo para sincronizar cambios recientes o datos adicionales
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single()
          .then(({ data, error }: { data: UserProfile | null; error: any }) => {
            if (data && !error) {
              // Verificar si usuario está activo
              const isActive = data.is_active === true;
              if (isActive) {
                // console.log('[useAuth] ✓ Perfil verificado con base de datos');
                setAuthState({ user: supabaseUser, profile: data as UserProfile, loading: false, error: null });
              } else {
                console.warn('[useAuth] ⚠ Usuario inactivo según base de datos');
                setAuthState({ user: supabaseUser, profile: null, loading: false, error: 'Usuario inactivo' });
              }
            }
          })
          .catch((err: any) => {
            console.warn('[useAuth] Error verificando perfil en background:', err);
            // Mantener perfil de metadata si la verificación falla
          });

        return metaProfile;
      }

      // ❌ Metadata no disponible: FALLBACK a query (más lento pero necesario)
      console.warn('[useAuth] ⚠ Metadata no disponible, consultando base de datos...');
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('[useAuth] Error consultando perfil:', error.message);
        setAuthState({ user: supabaseUser, profile: null, loading: false, error: 'Error al cargar perfil' });
        return null;
      }

      if (!profile) {
        setAuthState({ user: supabaseUser, profile: null, loading: false, error: 'Perfil no encontrado' });
        return null;
      }

      // Verificar usuario activo
      const isActive = profile.is_active === true || profile.is_active === 'true';
      if (!isActive) {
        setAuthState({ user: supabaseUser, profile: null, loading: false, error: 'Usuario inactivo' });
        return null;
      }

      // Perfil cargado desde DB
      setAuthState({
        user: supabaseUser,
        profile: profile as UserProfile,
        loading: false,
        error: null,
      });

      return profile as UserProfile;
    } catch (error: any) {
      console.error('[useAuth] Error inesperado cargando perfil:', error);

      // Último recurso: intentar metadata
      const metaProfile = buildProfileFromMetadata(supabaseUser);
      if (metaProfile) {
        setAuthState({ user: supabaseUser, profile: metaProfile, loading: false, error: null });
        return metaProfile;
      }

      setAuthState({ user: supabaseUser, profile: null, loading: false, error: 'Error al cargar perfil' });
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const errorMessage = error.message || 'Error al iniciar sesión';
        setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }

      if (data.user) {
        // onAuthStateChange se encargará de cargar el perfil
        setAuthState(prev => ({ ...prev, user: data.user, loading: false }));
      }

      return { success: true, error: null };
    } catch (error: any) {
      const errorMessage = error.message || 'Error al iniciar sesión';
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setAuthState({ user: null, profile: null, loading: false, error: null });
      clearPersisted();
      return { success: true, error: null };
    } catch (error: any) {
      const errorMessage = error.message || 'Error al cerrar sesión';
      return { success: false, error: errorMessage };
    }
  };

  return {
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    error: authState.error,
    // Estado explícito para evitar avisos falsos durante la carga
    status: (authState.loading
      ? 'loading'
      : (authState.user ? 'authenticated' : 'unauthenticated')) as 'loading' | 'authenticated' | 'unauthenticated',
    signIn,
    signOut,
  };
}

const buildProfileFromMetadata = (supabaseUser: SupabaseUser): UserProfile | null => {
  try {
    const meta = (supabaseUser as any).user_metadata || (supabaseUser as any).app_metadata || {};
    const email = (supabaseUser as any).email as string | undefined;

    // NO usar el correo como full_name por defecto para evitar parpadeos feos
    let full_name = (meta && meta.full_name) ? meta.full_name : '';

    // Simplificar nombres robóticos
    if (full_name.toLowerCase() === 'administrador principal') {
      full_name = 'Administrador';
    }

    // Si es el admin conocido y no tiene nombre, ponerle Administrador
    if (!full_name && email?.toLowerCase() === 'admin@inspector360.com') {
      full_name = 'Administrador';
    }
    const metaRoleRaw = meta?.role as string | undefined;
    const allowedRoles = ['admin', 'supervisor', 'inspector', 'sig'] as const;
    const normalizedRole = typeof metaRoleRaw === 'string' ? metaRoleRaw.trim().toLowerCase() : undefined;
    const synonyms: Record<string, UserProfile['role']> = {
      admin: 'admin',
      administrador: 'admin',
      'administrador principal': 'admin',
      supervisor: 'supervisor',
      inspectora: 'inspector',
      inspector: 'inspector',
      sig: 'sig',
      'sistema de información geográfica': 'sig',
    };
    const mappedRole = normalizedRole ? (synonyms[normalizedRole] || normalizedRole) : undefined;
    let role = mappedRole && (allowedRoles as readonly string[]).includes(mappedRole)
      ? (mappedRole as UserProfile['role'])
      : undefined;

    // Fallback explícito para el administrador conocido si no hay role en metadata
    if (!role && email && email.trim().toLowerCase() === 'admin@inspector360.com') {
      role = 'admin';
    }
    const station = meta?.station || undefined;

    // Solo construir perfil parcial si metadata tiene un rol válido
    if (!email || !full_name || !role) {
      return null;
    }

    return {
      id: supabaseUser.id,
      email,
      full_name,
      role,
      station,
      phone: meta?.phone || undefined,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as UserProfile;
  } catch {
    return null;
  }
};