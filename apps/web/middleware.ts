import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// Match everything except static assets and Next internals.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/|logo|.*\\.png$|.*\\.webp$|.*\\.ico$).*)',
  ],
};
