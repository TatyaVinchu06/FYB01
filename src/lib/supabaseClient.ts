// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wyrtszihluajwpnqymfr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_L99RXV12szdWfHrKxbYjUA_L_KKgUZz';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is incomplete. Please check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create Supabase client with conditional initialization to avoid build issues
let supabase: any = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    // Dynamically import during runtime to avoid build issues
    const initializeSupabase = async () => {
      const { createClient } = await import('@supabase/supabase-js');
      return createClient(supabaseUrl!, supabaseAnonKey!);
    };
    
    // Initialize client
    initializeSupabase().then(client => {
      supabase = client;
    }).catch(error => {
      console.error('Error initializing Supabase client:', error);
    });
  } catch (error) {
    console.error('Error setting up Supabase client:', error);
  }
}

export { supabase };
