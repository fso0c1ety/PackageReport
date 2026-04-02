import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'placeholder';

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
) {
  console.warn(
    'Supabase environment variables are not set (NEXT_PUBLIC_SUPABASE_URL, ' +
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY). All Supabase features (real-time calls, ' +
    'file uploads) will be unavailable.'
  );
}

// createClient is always called with valid strings so the module never throws at import time.
// Supabase requests will fail gracefully at runtime when placeholder credentials are used.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
