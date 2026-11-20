import { createClient, SupabaseClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile();
} catch {
  // .env file is optional if env vars are passed directly
}

const supabaseUrl =
  process.env.SUPABASE_URL || 'https://ishkzwbedjcwbkctpgjx.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_5SQcYGgFqE8XRU9qeiCiDw_iXZI1HI7';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedClient;
}
