import { supabase } from '../lib/supabase';
import type { Cliente } from './clientes';

export type EstadoPrestamo = 'ACTIVO' | 'PAGADO' | 'CANCELADO';
export type EstadoCuota = 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO';

export interface Cuota {
  id: string;
  prestamo_id: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto_cuota: string | number;
  monto_capital: string | number;
  monto_interes: string | number;
  saldo_restante: string | number;
  estado: EstadoCuota;
  fecha_pago: string | null;
}

export interface Prestamo {
  id: string;
  cliente_id: string;
  cliente?: { nombre_completo: string };
  monto_prestado: string | number;
  tasa_interes_mensual: string | number;
  plazo_meses: number;
  fecha_inicio: string;
  estado: EstadoPrestamo;
  notas: string | null;
  creado_en: string;
}

export interface DetallePrestamo extends Prestamo {
  cliente: Cliente;
  cuotas: Cuota[];
}

export interface CrearPrestamoRequest {
  cliente_id: string;
  monto_prestado: number;
  tasa_interes_mensual: number;
  plazo_meses: number;
  fecha_inicio: string;
  notas?: string;
}

export const prestamosAPI = {
  obtenerTodos: async (): Promise<Prestamo[]> => {
    const { data, error } = await supabase
      .from('prestamos')
      .select('*, cliente:clientes(nombre_completo)')
      .order('creado_en', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  obtenerPorId: async (id: string): Promise<DetallePrestamo> => {
    const { data: prestamo, error: prestamoError } = await supabase
      .from('prestamos')
      .select('*, cliente:clientes(*)')
      .eq('id', id)
      .single();

    if (prestamoError || !prestamo) {
      throw new Error(prestamoError?.message || 'Préstamo no encontrado');
    }

    const { data: cuotas, error: cuotasError } = await supabase
      .from('cuotas')
      .select('*')
      .eq('prestamo_id', id)
      .order('numero_cuota', { ascending: true });

    if (cuotasError) throw new Error(cuotasError.message);

    return {
      ...prestamo,
      cliente: prestamo.cliente,
      cuotas: cuotas || [],
    };
  },

  crear: async (datos: CrearPrestamoRequest): Promise<DetallePrestamo> => {
    const { data: nuevoPrestamoId, error } = await supabase.rpc('crear_prestamo_con_cuotas', {
      p_cliente_id: datos.cliente_id,
      p_monto_prestado: datos.monto_prestado,
      p_tasa_interes_mensual: datos.tasa_interes_mensual,
      p_plazo_meses: datos.plazo_meses,
      p_fecha_inicio: datos.fecha_inicio,
      p_notas: datos.notas || null,
    });

    if (error) throw new Error(error.message);
    return prestamosAPI.obtenerPorId(nuevoPrestamoId as string);
  },
};
