import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://idtckvvlkogsjoyjigrd.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdGNrdnZsa29nc2pveWppZ3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMzYwMzUsImV4cCI6MjEwNzgxMjAzNX0.VGaT0oz_bKHoYwvG3qEd7UipeNjVUBumnMmlFd6Ig04';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
