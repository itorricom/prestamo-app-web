import { supabase } from '../lib/supabase';
export * from './types';
import type { IniciarSesionRequest, AuthResponse } from './types';

export const authAPI = {
  login: async (datos: IniciarSesionRequest): Promise<AuthResponse> => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: datos.email,
      password: datos.password,
    });

    if (error) {
      throw new Error(
        error.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos'
          : error.message
      );
    }

    if (!authData.user || !authData.session) {
      throw new Error('No se pudo iniciar sesión');
    }

    return {
      accessToken: authData.session.access_token,
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
        role: 'ADMIN',
        tenantId: null,
      },
    };
  },

  logout: async (): Promise<void> => {
    await supabase.auth.signOut();
  },
};
