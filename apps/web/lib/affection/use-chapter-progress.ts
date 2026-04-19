'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export interface ChapterProgress {
  /** Chapter number → whether the voice lecture for that chapter was cleared. */
  lectureCompleted: Record<number, boolean>;
}

const EMPTY: ChapterProgress = { lectureCompleted: {} };

/**
 * Read chapter unlock flags from `affection_state.flags` for the current user
 * and the demo's single character (fermat). Falls back to empty progress for
 * unauthenticated users — callers should treat that as "nothing unlocked".
 *
 * Re-fetches on window focus so returning from /lecture propagates without a
 * hard reload.
 */
export function useChapterProgress(): {
  progress: ChapterProgress;
  loading: boolean;
} {
  const [progress, setProgress] = useState<ChapterProgress>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) {
          if (!cancelled) setProgress(EMPTY);
          return;
        }
        const { data: character } = await supabase
          .from('characters')
          .select('id')
          .eq('slug', 'fermat')
          .maybeSingle();
        if (!character?.id) {
          if (!cancelled) setProgress(EMPTY);
          return;
        }
        const { data: row } = await supabase
          .from('affection_state')
          .select('flags')
          .eq('user_id', uid)
          .eq('character_id', character.id as string)
          .maybeSingle();
        const flags =
          (row?.flags as Record<string, unknown> | null) ?? {};
        const lectureCompleted: Record<number, boolean> = {};
        for (const [key, value] of Object.entries(flags)) {
          const match = key.match(/^chapter_(\d+)_lecture_completed$/);
          if (match && value === true) {
            lectureCompleted[Number(match[1])] = true;
          }
        }
        if (!cancelled) setProgress({ lectureCompleted });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void read();
    const onFocus = () => {
      setLoading(true);
      void read();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return { progress, loading };
}
