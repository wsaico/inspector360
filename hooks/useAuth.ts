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
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Obtener sesión inicial con guardia de tiempo
    const getSession = async () => {
      try {
        const sessionRes = await withTimeout(supabase.auth.getSession(), 4000);

        if (!sessionRes) {
          // Si tarda demasiado, no bloqueamos la UI
          setAuthState({ user: null, profile: null, loading: false, error: 'Tiempo de espera al validar sesión' });
          return;
        }

        const { data: { session }, error } = sessionRes as { data: { session: Session | null }, error: any };

        if (error) throw error;

        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setAuthState({ user: null, profile: null, loading: false, error: null });
        }
      } catch (error) {
        console.error('Error loading session:', error);
        setAuthState({ user: null, profile: null, loading: false, error: 'Error al cargar la sesión' });
      }
    };

    getSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setAuthState({ user: null, profile: null, loading: false, error: null });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const profileRes = await withTimeout(
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', supabaseUser.id)
          .single(),
        6000
      );

      // Si el perfil tarda, no bloquear: usar metadata como fallback
      if (!profileRes) {
        const metaProfile = buildProfileFromMetadata(supabaseUser);
        if (metaProfile) {
          setAuthState({ user: supabaseUser, profile: metaProfile, loading: false, error: 'Perfil cargado parcialmente (timeout DB)' });
          console.warn('Perfil cargado desde metadata por timeout de DB');
          return;
        }
        // Sin metadata útil, mantener usuario y error
        setAuthState({ user: supabaseUser, profile: null, loading: false, error: 'Tiempo de espera al obtener perfil' });
        return;
      }

      const { data: profile, error } = profileRes as { data: any, error: any };

      if (error) {
        const metaProfile = buildProfileFromMetadata(supabaseUser);
        const errMsg = (error && (error.message || JSON.stringify(error))) || 'Error desconocido';
        console.warn('Error loading user profile:', errMsg);
        if (metaProfile) {
          setAuthState({ user: supabaseUser, profile: metaProfile, loading: false, error: `Perfil parcial: ${errMsg}` });
          return;
        }
        throw new Error(errMsg);
      }

      if (!profile) {
        const metaProfile = buildProfileFromMetadata(supabaseUser);
        if (metaProfile) {
          setAuthState({ user: supabaseUser, profile: metaProfile, loading: false, error: 'Perfil cargado parcialmente (no encontrado en DB)' });
          console.warn('Perfil cargado desde metadata por ausencia en DB');
          return;
        }
        throw new Error('No se encontró el perfil del usuario');
      }

      const isActive = profile.is_active === true || profile.is_active === 'true';
      if (!isActive) {
        // Usuario inactivo: mantener usuario para permitir signOut pero indicar error
        setAuthState({ user: supabaseUser, profile: null, loading: false, error: 'Usuario inactivo' });
        return;
      }

      setAuthState({
        user: supabaseUser,
        profile: profile as UserProfile,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Failed to load user profile:', error?.message || error);
      const metaProfile = buildProfileFromMetadata(supabaseUser);
      if (metaProfile) {
        setAuthState({ user: supabaseUser, profile: metaProfile, loading: false, error: `Perfil parcial: ${error?.message || 'Error desconocido'}` });
      } else {
        // IMPORTANTE: NO cerrar sesión del usuario, solo mostrar error para evitar loop
        setAuthState({ user: supabaseUser, profile: null, loading: false, error: `Error al cargar perfil: ${error?.message || 'Error'}` });
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
        await loadUserProfile(data.user);
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
    signIn,
    signOut,
  };
}
  const buildProfileFromMetadata = (supabaseUser: SupabaseUser): UserProfile | null => {
    try {
      const meta = (supabaseUser as any).user_metadata || (supabaseUser as any).app_metadata || {};
      const email = (supabaseUser as any).email as string | undefined;
      const full_name = (meta && meta.full_name) ? meta.full_name : (email || '');
      const metaRole = meta?.role;
      const allowedRoles = ['admin', 'supervisor', 'inspector'];
      const role = typeof metaRole === 'string' && allowedRoles.includes(metaRole) ? (metaRole as UserProfile['role']) : undefined;
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
