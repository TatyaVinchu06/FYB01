import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wyrtszihluajwpnqymfr.supabase.co';
const supabaseAnonKey = 'sb_publishable_L99RXV12szdWfHrKxbYjUA_L_KKgUZz';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
