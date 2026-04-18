import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** Treat any login whose last_sign_in_at is within this window of created_at
 *  as a first-time sign-in. Magic-link flows write last_sign_in_at near the
 *  signup moment so this ~10s tolerance reliably distinguishes signup from
 *  re-login. */
const FIRST_LOGIN_TOLERANCE_MS = 10_000;

const FIRST_LOGIN_DEST = '/visual-novel/intro';
const RETURNING_USER_DEST = '/lobby';

/**
 * Magic-link → code exchange. Supabase redirects here with `?code=...` after
 * the user clicks the email link. We exchange the code for a session cookie
 * then route:
 *   - `?next=` explicit → honor it (deep-link intent preserved)
 *   - first-time sign-in → /visual-novel/intro (story onboarding)
 *   - returning user → /lobby
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const explicitNext = url.searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(new URL('/login', url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const errUrl = new URL('/login', url.origin);
    errUrl.searchParams.set('error', error.message);
    return NextResponse.redirect(errUrl);
  }

  // Honor explicit next (e.g. middleware-preserved deep link).
  if (explicitNext) {
    return NextResponse.redirect(new URL(explicitNext, url.origin));
  }

  const user = data.session?.user ?? null;
  const isFirstLogin = (() => {
    if (!user) return false;
    const created = new Date(user.created_at).getTime();
    const lastSignIn = user.last_sign_in_at
      ? new Date(user.last_sign_in_at).getTime()
      : created;
    return Math.abs(lastSignIn - created) < FIRST_LOGIN_TOLERANCE_MS;
  })();

  const target = isFirstLogin ? FIRST_LOGIN_DEST : RETURNING_USER_DEST;
  return NextResponse.redirect(new URL(target, url.origin));
}
