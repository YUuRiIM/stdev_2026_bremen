import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/lesson/complete
 *
 * Called by a lesson page (e.g. /lesson/basic-multiplication) when the user
 * finishes the final slide. Awards a small fixed affection bump once per
 * lesson, gated by a per-lesson flag on `affection_state`.
 *
 * Body: { lessonSlug: string }
 * Returns: { ok, awardedDelta, alreadyAwarded, newScore, newLevel }
 */

interface LessonCompleteRequest {
  lessonSlug: string;
}

type AffectionLevel =
  | 'stranger'
  | 'acquaintance'
  | 'friend'
  | 'close'
  | 'lover';

const THRESHOLDS = {
  acquaintance: 3,
  friend: 8,
  close: 15,
  lover: 25,
} as const;

function computeLevel(score: number): AffectionLevel {
  if (score >= THRESHOLDS.lover) return 'lover';
  if (score >= THRESHOLDS.close) return 'close';
  if (score >= THRESHOLDS.friend) return 'friend';
  if (score >= THRESHOLDS.acquaintance) return 'acquaintance';
  return 'stranger';
}

// Whitelist of known lessons + their fixed delta. Prevents a client from
// minting arbitrary flagKeys or deltas.
const LESSON_REGISTRY: Record<string, { delta: number; flagKey: string }> = {
  'basic-multiplication': {
    delta: 1,
    flagKey: 'lesson_basic_multiplication_awarded',
  },
  'basic-fractions': {
    delta: 1,
    flagKey: 'lesson_basic_fractions_awarded',
  },
};

export async function POST(req: Request) {
  let body: LessonCompleteRequest;
  try {
    body = (await req.json()) as LessonCompleteRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const entry = LESSON_REGISTRY[body.lessonSlug];
  if (!entry) {
    return NextResponse.json({ error: 'unknown_lesson' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { data: character } = await supabase
    .from('characters')
    .select('id')
    .eq('slug', 'fermat')
    .maybeSingle();
  if (!character?.id) {
    return NextResponse.json(
      { error: 'character_not_found' },
      { status: 500 },
    );
  }
  const characterId = character.id as string;

  const { data: existing } = await supabase
    .from('affection_state')
    .select('score, flags')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .maybeSingle();

  const existingFlags =
    (existing?.flags as Record<string, unknown> | null) ?? {};
  if (existingFlags[entry.flagKey] === true) {
    return NextResponse.json({
      ok: true,
      awardedDelta: 0,
      alreadyAwarded: true,
      newScore: existing?.score ?? 0,
      newLevel: computeLevel(existing?.score ?? 0),
    });
  }

  const newScore = (existing?.score ?? 0) + entry.delta;
  const newLevel = computeLevel(newScore);
  const nextFlags = { ...existingFlags, [entry.flagKey]: true };

  const { error: upsertErr } = await supabase.from('affection_state').upsert(
    {
      user_id: userId,
      character_id: characterId,
      score: newScore,
      level: newLevel,
      flags: nextFlags,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,character_id' },
  );
  if (upsertErr) {
    return NextResponse.json(
      { error: `upsert_failed: ${upsertErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    awardedDelta: entry.delta,
    alreadyAwarded: false,
    newScore,
    newLevel,
  });
}
