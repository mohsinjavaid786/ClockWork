import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser-only Supabase client, used solely for the password set/reset flow:
// Supabase recovery/invite action links redirect here with tokens in the URL
// hash, which this client picks up (detectSessionInUrl) so we can call
// auth.updateUser({ password }). The anon key is public and RLS-protected.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { detectSessionInUrl: true, persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
