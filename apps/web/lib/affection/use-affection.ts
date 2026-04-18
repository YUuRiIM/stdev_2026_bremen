'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type AffectionLevel =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close'
  | 'lover';

export const AFFECTION_THRESHOLDS: Record<
  Exclude<AffectionLevel, 'stranger'>,
  number
> = {
  acquaintance: 3,
  friend: 8,
  close: 15,
  lover: 25,
};

export const AFFECTION_LEVEL_LABELS: Record<AffectionLevel, string> = {
  stranger: '낯선 사이',
  acquaintance: '아는 사이',
  friend: '친구',
  close: '가까운 사이',
  lover: '연인',
};

export interface AffectionEntry {
  slug: string;
  score: number;
  level: AffectionLevel;
}

export type AffectionBySlug = Record<string, AffectionEntry>;

/** Fetch all affection rows for the current user, keyed by character slug. */
export function useAffection(): {
  data: AffectionBySlug;
  loading: boolean;
  refetch: () => void;
} {
  const [data, setData] = useState<AffectionBySlug>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: rows } = await supabase
          .from('affection_state')
          .select('score, level, characters:character_id(slug)');
        if (cancelled) return;
        const out: AffectionBySlug = {};
        type Row = {
          score: number;
          level: string;
          characters: { slug: string } | { slug: string }[] | null;
        };
        for (const row of (rows ?? []) as unknown as Row[]) {
          const chars = Array.isArray(row.characters)
            ? row.characters[0]
            : row.characters;
          const slug = chars?.slug;
          if (!slug) continue;
          out[slug] = {
            slug,
            score: row.score,
            level: row.level as AffectionLevel,
          };
        }
        setData(out);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { data, loading, refetch: () => setTick((n) => n + 1) };
}
