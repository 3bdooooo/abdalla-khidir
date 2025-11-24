
import { createClient } from '@supabase/supabase-js';

// Access environment variables safely
const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || '').trim();

// Determine if Supabase is properly configured
// We relax the check to accept 'sb_publishable' keys
export const isSupabaseConfigured = 
  supabaseUrl && 
  !supabaseUrl.includes('your-project') &&
  supabaseAnonKey && 
  !supabaseAnonKey.includes('your-anon-key');

if (!isSupabaseConfigured) {
  console.log('Supabase Mode: Offline (Using Mock Data). Update .env to connect real DB.');
}

// Initialize Supabase
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
