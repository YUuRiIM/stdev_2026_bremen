import { redirect } from 'next/navigation';

/**
 * Root entry. Authenticated users always land on /lobby; unauthenticated
 * users never reach this because middleware (`lib/supabase/middleware.ts`)
 * intercepts and redirects to /login?next=/lobby first. The earlier debug
 * home (hand-curated quick-nav grid) was removed — individual screens are
 * still reachable by typing their path directly.
 */
export default function RootPage() {
  redirect('/lobby');
}
