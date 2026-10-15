import { createClient } from '@supabase/supabase-js';

const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredSupabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const disabledChannel = {
  on() { return this; },
  subscribe(callback?: (status: string) => void) {
    callback?.('CHANNEL_ERROR');
    return this;
  },
};

const disabledClient = {
  channel() { return disabledChannel; },
  removeChannel() { return Promise.resolve('ok'); },
};

if (!configuredSupabaseUrl || !configuredSupabaseKey) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[Supabase] Explicit NEXT_PUBLIC_SUPABASE_URL and publishable key are required; Realtime is disabled.');
  }
}

export const supabase = (configuredSupabaseUrl && configuredSupabaseKey
  ? createClient(configuredSupabaseUrl, configuredSupabaseKey)
  : disabledClient) as ReturnType<typeof createClient>;
