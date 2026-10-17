import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno requeridas: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. ' +
    'Asegúrate de configurarlas en tu archivo .env.local o en el panel de Vercel.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
