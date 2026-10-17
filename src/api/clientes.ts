import { supabase } from '../lib/supabase';

export interface Cliente {
  id: string;
  nombre_completo: string;
  documento_identidad?: string;
  telefono?: string;
  direccion?: string;
  email?: string;
  creado_en: string;
  actualizado_en: string;
}

export interface CrearClienteRequest {
  nombre_completo: string;
  documento_identidad?: string;
  telefono?: string;
  direccion?: string;
  email?: string;
}

export interface ActualizarClienteRequest extends Partial<CrearClienteRequest> {}

export const clientesAPI = {
  obtenerTodos: async (): Promise<Cliente[]> => {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre_completo', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  obtenerPorId: async (id: string): Promise<Cliente> => {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  crear: async (datos: CrearClienteRequest): Promise<Cliente> => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('No estás autenticado');

    const { data, error } = await supabase
      .from('clientes')
      .insert({
        usuario_id: user.id,
        nombre_completo: datos.nombre_completo,
        documento_identidad: datos.documento_identidad || null,
        telefono: datos.telefono || null,
        direccion: datos.direccion || null,
        email: datos.email || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  actualizar: async (id: string, datos: ActualizarClienteRequest): Promise<Cliente> => {
    const { data, error } = await supabase
      .from('clientes')
      .update({
        nombre_completo: datos.nombre_completo,
        documento_identidad: datos.documento_identidad || null,
        telefono: datos.telefono || null,
        direccion: datos.direccion || null,
        email: datos.email || null,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  eliminar: async (id: string): Promise<void> => {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};
