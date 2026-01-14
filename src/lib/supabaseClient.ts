import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nrrskptkdlxflxhlqfng.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_u1frutv4azCie6IvJYKOxg_KbpmxrX7';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is incomplete. Please check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);