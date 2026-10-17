import { supabase } from '../lib/supabase';

export type MetodoPago = 'EFECTIVO' | 'DEPOSITO' | 'TRANSFERENCIA';

export interface Pago {
  id: string;
  cuota_id: string;
  monto_pagado: string | number;
  fecha_pago: string;
  metodo_pago: MetodoPago;
  numero_referencia: string | null;
  url_comprobante: string | null;
  notas: string | null;
  creado_en: string;
}

export interface RegistrarPagoRequest {
  cuota_id: string;
  monto_pagado: number;
  fecha_pago: string;
  metodo_pago: MetodoPago;
  numero_referencia?: string;
  url_comprobante?: string;
  notas?: string;
}

export const pagosAPI = {
  obtenerTodos: async (): Promise<Pago[]> => {
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  registrar: async (datos: RegistrarPagoRequest): Promise<string> => {
    const { data: pagoId, error } = await supabase.rpc('registrar_pago', {
      p_cuota_id: datos.cuota_id,
      p_monto_pagado: datos.monto_pagado,
      p_fecha_pago: datos.fecha_pago,
      p_metodo_pago: datos.metodo_pago,
      p_numero_referencia: datos.numero_referencia || null,
      p_url_comprobante: datos.url_comprobante || null,
      p_notas: datos.notas || null,
    });

    if (error) throw new Error(error.message);
    return pagoId as string;
  },
};
