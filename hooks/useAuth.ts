'use client';

/**
 * Hook de Autenticación
 * Maneja el estado de autenticación del usuario
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { User as SupabaseUser, type AuthChangeEvent, type Session } from '@supabase/supabase-js';
import { UserProfile } from '@/types/roles';

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
    // Obtener sesión inicial
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

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
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        throw error;
      }

      if (!profile) {
        throw new Error('No se encontró el perfil del usuario');
      }

      const isActive = profile.is_active === true || profile.is_active === 'true';

      if (!isActive) {
        throw new Error('Usuario inactivo');
      }

      setAuthState({
        user: supabaseUser,
        profile: profile as UserProfile,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Failed to load user profile:', error.message);

      // IMPORTANTE: NO cerrar sesión del usuario, solo mostrar error
      // Esto previene el loop de login
      setAuthState({
        user: supabaseUser, // Mantener usuario autenticado
        profile: null,
        loading: false,
        error: `Error al cargar perfil: ${error.message}`,
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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
