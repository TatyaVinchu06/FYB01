import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wyrtszihluajwpnqymfr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_L99RXV12szdWfHrKxbYjUA_L_KKgUZz';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is incomplete. Please check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
