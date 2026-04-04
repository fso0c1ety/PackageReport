import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://gxzvlsukjodbarlcjyys.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rU2ecIwaUTFj5hckh96xRw_h9OmumL4';

const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredSupabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = configuredSupabaseUrl || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = configuredSupabaseKey || FALLBACK_SUPABASE_PUBLISHABLE_KEY;

if (!configuredSupabaseUrl || !configuredSupabaseKey) {
  console.warn(
    '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase public key env var (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY). ' +
      'Falling back to the public project defaults so Realtime and calls still work in packaged builds.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
