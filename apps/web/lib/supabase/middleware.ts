import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresh the Supabase session cookie on every navigation so server clients
 * always have a fresh JWT. Gate protected routes here too.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: CookieOptions;
        }>,
      ) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refresh the session cookie even though we're not gating any routes — so
  // if the user DOES happen to have a valid session (e.g. from a previous
  // login), server-side API handlers can still read it and persist their
  // writes against RLS.
  await supabase.auth.getUser();

  // Auth enforcement is currently OFF for the demo. Re-enable the block
  // below when login is restored.
  //
  // const path = request.nextUrl.pathname;
  // const isPublic =
  //   path.startsWith('/login') ||
  //   path.startsWith('/auth/') ||
  //   path.startsWith('/api/livekit/token');
  // if (!user && !isPublic) {
  //   const redirect = request.nextUrl.clone();
  //   redirect.pathname = '/login';
  //   redirect.searchParams.set('next', path === '/' ? '/lobby' : path);
  //   return NextResponse.redirect(redirect);
  // }

  return response;
}
