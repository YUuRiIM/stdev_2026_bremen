import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/lecture/complete
 *
 * Called by the /lecture page after a successful verdict is applied. Marks
 * a per-chapter flag on `affection_state.flags` so subsequent visits to the
 * gallery / detail / lobby can surface the newly unlocked episode cards.
 *
 * Affection delta itself is computed agent-side (apply-verdict.ts) — this
 * endpoint only records the unlock flag.
 *
 * Body: { chapterNumber: 1 | 2 | 3 | 4 }
 */

interface LectureCompleteRequest {
  chapterNumber: number;
}

export async function POST(req: Request) {
  let body: LectureCompleteRequest;
  try {
    body = (await req.json()) as LectureCompleteRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const chapter = body.chapterNumber;
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 4) {
    return NextResponse.json({ error: 'invalid_chapter' }, { status: 400 });
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

  const flagKey = `chapter_${chapter}_lecture_completed`;

  const { data: existing } = await supabase
    .from('affection_state')
    .select('score, level, flags')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .maybeSingle();

  const existingFlags =
    (existing?.flags as Record<string, unknown> | null) ?? {};
  if (existingFlags[flagKey] === true) {
    return NextResponse.json({ ok: true, alreadyUnlocked: true });
  }

  const nextFlags = { ...existingFlags, [flagKey]: true };
  const { error: upsertErr } = await supabase.from('affection_state').upsert(
    {
      user_id: userId,
      character_id: characterId,
      // Preserve existing score/level; do NOT bump — agent path handles that.
      score: existing?.score ?? 0,
      level: existing?.level ?? 'stranger',
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

  return NextResponse.json({ ok: true, alreadyUnlocked: false });
}
