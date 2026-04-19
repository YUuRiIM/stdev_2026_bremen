import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/quiz/complete
 *
 * Called by the client when a user finishes the Chapter 1 quiz with a passing
 * score. Idempotent: the `quiz_chapter_1_awarded` flag on `affection_state`
 * gates repeated awards so replays (or page refresh-races) do not stack.
 *
 * Body: { chapter: 1, correctCount: number, total: number }
 * Returns: { ok, awardedDelta, alreadyAwarded, newScore, newLevel }
 */

interface QuizCompleteRequest {
  chapter: number;
  correctCount: number;
  total: number;
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

export async function POST(req: Request) {
  let body: QuizCompleteRequest;
  try {
    body = (await req.json()) as QuizCompleteRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { chapter, correctCount, total } = body;
  if (
    chapter !== 1 ||
    typeof correctCount !== 'number' ||
    typeof total !== 'number' ||
    correctCount < 0 ||
    total <= 0 ||
    correctCount > total
  ) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  // Pass gate: ≥70% correct. Below that, record nothing.
  if (correctCount / total < 0.7) {
    return NextResponse.json({
      ok: true,
      awardedDelta: 0,
      alreadyAwarded: false,
      skipped: 'below_threshold',
    });
  }

  // Resolve fermat character id (current demo is single-character).
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

  const flagKey = `quiz_chapter_${chapter}_awarded`;

  const { data: existing } = await supabase
    .from('affection_state')
    .select('score, flags')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .maybeSingle();

  const existingFlags =
    (existing?.flags as Record<string, unknown> | null) ?? {};
  if (existingFlags[flagKey] === true) {
    return NextResponse.json({
      ok: true,
      awardedDelta: 0,
      alreadyAwarded: true,
      newScore: existing?.score ?? 0,
      newLevel: computeLevel(existing?.score ?? 0),
    });
  }

  // +1 per correct answer. Chapter 1 max = 4 correct → +4.
  const delta = correctCount;
  const newScore = (existing?.score ?? 0) + delta;
  const newLevel = computeLevel(newScore);
  const nextFlags = { ...existingFlags, [flagKey]: true };

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
    awardedDelta: delta,
    alreadyAwarded: false,
    newScore,
    newLevel,
  });
}
