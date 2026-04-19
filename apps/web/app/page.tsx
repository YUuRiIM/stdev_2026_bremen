'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root entry. While login is disabled we can't rely on the auth callback's
 * first-login check, so the landing decision happens client-side:
 *
 *   - `demo_visited` in localStorage set → /lobby (returning user)
 *   - missing                            → /visual-novel/intro (onboarding)
 *
 * The flag is written once /lobby mounts, so anyone who makes it to the hub
 * (whether through the intro chain or by typing /lobby directly) is marked
 * visited. The 🧪 데모 리셋 menu clears this flag too.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    let visited = false;
    try {
      visited = localStorage.getItem('demo_visited') === 'true';
    } catch {
      /* storage blocked — treat as returning so we don't trap demos in intro */
      visited = true;
    }
    router.replace(visited ? '/lobby' : '/visual-novel/intro');
  }, [router]);

  return null;
}
