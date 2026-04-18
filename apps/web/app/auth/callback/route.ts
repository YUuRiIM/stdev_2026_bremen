import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Magic-link → code exchange. Supabase redirects here with `?code=...` after
 * the user clicks the email link. We exchange the code for a session cookie
 * and then continue to `?next=` (defaults to `/lecture`).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/lecture';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    // fallthrough to error view
    const errUrl = new URL('/login', url.origin);
    errUrl.searchParams.set('error', error.message);
    return NextResponse.redirect(errUrl);
  }

  // No code → probably opened directly or token_hash flow.
  return NextResponse.redirect(new URL('/login', url.origin));
}
