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
    // Obtener sesión inicial con guardia de tiempo
    const getSession = async () => {
      try {
        const sessionRes = await withTimeout(supabase.auth.getSession(), 10000);

        if (!sessionRes) {
          // Si tarda demasiado, usar persistencia solo si es muy reciente
          const persisted = readPersisted();
          const notExpired = persisted.savedAt > 0 && (Date.now() - persisted.savedAt) < TTL_MS;
          if (notExpired && persisted.user) {
            setAuthState({ user: persisted.user, profile: persisted.profile, loading: false, error: 'Sesión mantenida (timeout), reintenta conexión' });
            return;
          }
          setAuthState({ user: null, profile: null, loading: false, error: 'Tiempo de espera al validar sesión' });
          return;
        }

        const { data: { session }, error } = sessionRes as { data: { session: Session | null }, error: any };

        if (error) throw error;

        if (session?.user) {
          const loadedProfile = await loadUserProfile(session.user);
          // Persistir inmediata para resiliencia con el perfil correcto
          writePersisted(session.user, loadedProfile);
        } else {
          // Sin sesión válida: limpiar y marcar no autenticado
          clearPersisted();
          setAuthState({ user: null, profile: null, loading: false, error: null });
        }
      } catch (error) {
        console.error('Error loading session:', error);
        // Mantener sesión solo si persistencia es muy reciente (error de red puntual)
        const persisted = readPersisted();
        const notExpired = persisted.savedAt > 0 && (Date.now() - persisted.savedAt) < TTL_MS;
        if (notExpired && persisted.user) {
          setAuthState({ user: persisted.user, profile: persisted.profile, loading: false, error: 'Sesión mantenida (error de red)' });
        } else {
          clearPersisted();
          setAuthState({ user: null, profile: null, loading: false, error: 'Error al cargar la sesión' });
        }
      }
    };

    getSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          const loadedProfile = await loadUserProfile(session.user);
          writePersisted(session.user, loadedProfile);
          return;
        }

        // Sin sesión: tratar como sign out para evitar UI zombie
        clearPersisted();
        setAuthState({ user: null, profile: null, loading: false, error: null });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Refresco proactivo de sesión para evitar expiraciones prematuras
  useEffect(() => {
    const refreshNow = async () => {
      try {
        const res = await withTimeout(supabase.auth.getSession(), 8000);
        const { data: { session } } = res as { data: { session: Session | null } };
        if (session?.user) {
          // Asegurar perfil actualizado tras refresh
          const loadedProfile = await loadUserProfile(session.user);
          writePersisted(session.user, loadedProfile);
        } else {
          // Si al refrescar ya no hay sesión, cerrar explícitamente
          clearPersisted();
          setAuthState({ user: null, profile: null, loading: false, error: null });
        }
      } catch {
        // Ignorar errores esporádicos de red
      }
    };

    const interval = setInterval(refreshNow, 5 * 60 * 1000); // cada 5 minutos

    const onVisibleOrOnline = () => {
      // Al volver al foco o conexión, intentar refrescar inmediatamente
      refreshNow();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') onVisibleOrOnline();
      });
      window.addEventListener('online', onVisibleOrOnline);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onVisibleOrOnline);
      }
    };
  }, [authState.user]);

  const loadUserProfile = async (supabaseUser: SupabaseUser): Promise<UserProfile | null> => {
    try {
      const profileRes = await withTimeout(
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single(),
        15000
      );

      // Si el perfil tarda, no bloquear: usar metadata como fallback
      if (!profileRes) {
        const metaProfile = buildProfileFromMetadata(supabaseUser);
        if (metaProfile) {
          setAuthState({ user: supabaseUser, profile: metaProfile, loading: false, error: 'Perfil cargado parcialmente (timeout DB)' });
          console.warn('Perfil cargado desde metadata por timeout de DB');
          return metaProfile;
        }
        // Sin metadata útil, mantener usuario y error
        setAuthState({ user: supabaseUser, profile: null, loading: false, error: 'Tiempo de espera al obtener perfil' });
        return null;
      }

      const { data: profile, error } = profileRes as { data: any, error: any };

      if (error) {
        const metaProfile = buildProfileFromMetadata(supabaseUser);
        const errMsg = (error && (error.message || JSON.stringify(error))) || 'Error desconocido';
        console.warn('Error loading user profile:', errMsg);
        if (metaProfile) {
          setAuthState({ user: supabaseUser, profile: metaProfile, loading: false, error: `Perfil parcial: ${errMsg}` });
          return metaProfile;
        }
        throw new Error(errMsg);
      }

      if (!profile) {
        const metaProfile = buildProfileFromMetadata(supabaseUser);
        if (metaProfile) {
          setAuthState({ user: supabaseUser, profile: metaProfile, loading: false, error: 'Perfil cargado parcialmente (no encontrado en DB)' });
          console.warn('Perfil cargado desde metadata por ausencia en DB');
          return metaProfile;
        }
        throw new Error('No se encontró el perfil del usuario');
      }

      const isActive = profile.is_active === true || profile.is_active === 'true';
      if (!isActive) {
        // Usuario inactivo: mantener usuario para permitir signOut pero indicar error
        setAuthState({ user: supabaseUser, profile: null, loading: false, error: 'Usuario inactivo' });
        return null;
      }

      setAuthState({
        user: supabaseUser,
        profile: profile as UserProfile,
        loading: false,
        error: null,
      });
      return profile as UserProfile;
    } catch (error: any) {
      console.error('Failed to load user profile:', error?.message || error);
      const metaProfile = buildProfileFromMetadata(supabaseUser);
      if (metaProfile) {
        setAuthState({ user: supabaseUser, profile: metaProfile, loading: false, error: `Perfil parcial: ${error?.message || 'Error desconocido'}` });
        return metaProfile;
      } else {
        // IMPORTANTE: NO cerrar sesión del usuario, solo mostrar error para evitar loop
        setAuthState({ user: supabaseUser, profile: null, loading: false, error: `Error al cargar perfil: ${error?.message || 'Error'}` });
        return null;
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const signInRes = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        5000
      );

      if (!signInRes) {
        const errorMessage = 'Tiempo de espera al iniciar sesión';
        setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return { success: false, error: errorMessage };
      }

      const { data, error } = signInRes as { data: { user: SupabaseUser | null }, error: any };

      if (error) throw error;

      if (data.user) {
        // Fast-path: no bloquear inicio por carga de perfil
        setAuthState(prev => ({ ...prev, user: data.user, loading: false }));
        // Carga y persistencia del perfil en background
        loadUserProfile(data.user)
          .then((loadedProfile) => {
            writePersisted(data.user!, loadedProfile);
          })
          .catch(() => {
            // Ignorar fallos puntuales de perfil; usuario ya quedó autenticado
          });
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