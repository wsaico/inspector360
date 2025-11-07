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
  const TTL_MS = 5 * 60 * 1000; // 5 minutos: evita sesiones zombis tras expirar

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const readPersisted = (): { user: SupabaseUser | null; profile: UserProfile | null; savedAt: number } => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(PERSIST_KEY) : null;
      if (!raw) return { user: null, profile: null, savedAt: 0 };
      const obj = JSON.parse(raw);
      return { user: obj.user || null, profile: obj.profile || null, savedAt: obj.savedAt || 0 };
    } catch {
      return { user: null, profile: null, savedAt: 0 };
    }
  };

  const writePersisted = (user: SupabaseUser | null, profile: UserProfile | null) => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(PERSIST_KEY, JSON.stringify({ user, profile, savedAt: Date.now() }));
    } catch {}
  };

  const clearPersisted = () => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(PERSIST_KEY);
    } catch {}
  };

  useEffect(() => {
    // IMPORTANTE: Confiar en el middleware para validación de sesión
    // Solo cargar sesión inicial y escuchar cambios - sin validaciones periódicas
    const initSession = async () => {
      try {
        // Intentar cargar sesión existente (sin timeout agresivo)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('[useAuth] Error obteniendo sesión:', error.message);
          clearPersisted();
          setAuthState({ user: null, profile: null, loading: false, error: null });
          return;
        }

        if (session?.user) {
          // Cargar perfil en background - no bloquear UI
          loadUserProfile(session.user).then((profile) => {
            writePersisted(session.user, profile);
          });
        } else {
          // Sin sesión: limpiar estado
          clearPersisted();
          setAuthState({ user: null, profile: null, loading: false, error: null });
        }
      } catch (error) {
        console.error('[useAuth] Error inicializando sesión:', error);
        clearPersisted();
        setAuthState({ user: null, profile: null, loading: false, error: null });
      }
    };

    initSession();

    // Escuchar cambios de autenticación (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('[useAuth] Auth event:', event);

        if (session?.user) {
          // Usuario autenticado - cargar perfil
          const loadedProfile = await loadUserProfile(session.user);
          writePersisted(session.user, loadedProfile);
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
      // Cargar perfil sin timeout - confiar en RLS y Supabase
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        // Usar metadata como fallback
        const metaProfile = buildProfileFromMetadata(supabaseUser);
        console.warn('[useAuth] Error cargando perfil, usando metadata:', error.message);

        if (metaProfile) {
          setAuthState({ user: supabaseUser, profile: metaProfile, loading: false, error: null });
          return metaProfile;
        }

        // Sin perfil disponible
        setAuthState({ user: supabaseUser, profile: null, loading: false, error: 'Error al cargar perfil' });
        return null;
      }

      if (!profile) {
        // Intentar metadata
        const metaProfile = buildProfileFromMetadata(supabaseUser);
        if (metaProfile) {
          setAuthState({ user: supabaseUser, profile: metaProfile, loading: false, error: null });
          return metaProfile;
        }

        setAuthState({ user: supabaseUser, profile: null, loading: false, error: 'Perfil no encontrado' });
        return null;
      }

      // Verificar usuario activo
      const isActive = profile.is_active === true || profile.is_active === 'true';
      if (!isActive) {
        setAuthState({ user: supabaseUser, profile: null, loading: false, error: 'Usuario inactivo' });
        return null;
      }

      // Perfil cargado exitosamente
      setAuthState({
        user: supabaseUser,
        profile: profile as UserProfile,
        loading: false,
        error: null,
      });

      return profile as UserProfile;
    } catch (error: any) {
      console.error('[useAuth] Error inesperado cargando perfil:', error);

      // Intentar metadata como último recurso
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
    const full_name = (meta && meta.full_name) ? meta.full_name : (email || '');
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