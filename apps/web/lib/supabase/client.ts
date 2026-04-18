import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. Uses the publishable (anon) key — RLS
 * enforces access. Never import this from server code; it reads cookies
 * from document.cookie which is undefined during SSR.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anon) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required',
    );
  }
  return createBrowserClient(url, anon);
}
