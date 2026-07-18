import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export let supabase: any = null;

if (supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey)) {
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  supabase = createClient(supabaseUrl, key!);
  console.log('Supabase client initialized successfully.');
} else {
  console.warn('Supabase configuration missing in environment variables.');
}
