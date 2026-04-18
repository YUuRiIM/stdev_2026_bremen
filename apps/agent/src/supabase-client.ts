import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// JWT pass-through: the agent never holds a service_role key. Without a JWT
// the client runs as anon and can only SELECT public-read tables.
export function createAgentSupabase(jwt: string | null): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anon) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required',
    );
  }
  const headers: Record<string, string> = {};
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  return createClient(url, anon, {
    global: { headers },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
