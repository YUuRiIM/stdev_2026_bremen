import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/demo/reset
 *
 * Wipes the current user's progress (quiz attempts, affection score + flags)
 * so the end-to-end demo flow can be rehearsed from scratch. Intended for
 * live demos only — remove before production launch.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { error: attemptsErr } = await supabase
    .from('quiz_attempts')
    .delete()
    .eq('user_id', userId);
  if (attemptsErr) {
    return NextResponse.json(
      { error: `quiz_attempts_delete_failed: ${attemptsErr.message}` },
      { status: 500 },
    );
  }

  const { error: affectionErr } = await supabase
    .from('affection_state')
    .delete()
    .eq('user_id', userId);
  if (affectionErr) {
    return NextResponse.json(
      { error: `affection_state_delete_failed: ${affectionErr.message}` },
      { status: 500 },
    );
  }

  const { error: understoodErr } = await supabase
    .from('understood_concepts')
    .delete()
    .eq('user_id', userId);
  if (understoodErr) {
    return NextResponse.json(
      { error: `understood_concepts_delete_failed: ${understoodErr.message}` },
      { status: 500 },
    );
  }

  const { error: lectureErr } = await supabase
    .from('lecture_sessions')
    .delete()
    .eq('user_id', userId);
  if (lectureErr) {
    return NextResponse.json(
      { error: `lecture_sessions_delete_failed: ${lectureErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
