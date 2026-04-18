import type { SupabaseClient } from '@supabase/supabase-js';
import type { AffectionLevel } from '../db/schema';
import type { JudgeVerdict } from './run-judge';
import { computeLevelFromScore } from './affection-rules';

export interface ApplyVerdictInput {
  userId: string;
  characterId: string;
  lectureSessionId: string;
  verdict: JudgeVerdict;
  computedAffectionDelta: number;
}

export interface ApplyVerdictPayload {
  affectionDelta: number;
  affectionLevel: AffectionLevel;
  episodeUnlocked: string | null;
  newlyUnderstood: string[];
  ts: number;
}

export type ApplyVerdictResult =
  | { ok: true; payload: ApplyVerdictPayload; applied: true }
  | { ok: true; payload: ApplyVerdictPayload; applied: false; reason: 'already_ended' }
  | { ok: false; reason: string };

const RETRY_BACKOFFS_MS = [50, 150];

async function withRetry(
  op: () => Promise<{ error: { message: string } | null }>,
  label: string,
): Promise<{ ok: boolean; lastError?: string }> {
  const attempts: number[] = [0, ...RETRY_BACKOFFS_MS];
  let lastError: string | undefined;
  for (const delay of attempts) {
    if (delay > 0) await sleep(delay);
    const { error } = await op();
    if (!error) return { ok: true };
    lastError = `${label}: ${error.message}`;
  }
  return { ok: false, lastError };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function applyVerdict(
  supabase: SupabaseClient,
  input: ApplyVerdictInput,
): Promise<ApplyVerdictResult> {
  const {
    userId,
    characterId,
    lectureSessionId,
    verdict,
    computedAffectionDelta,
  } = input;

  // 1. lecture_sessions UPDATE with idempotent guard (ended_at IS NULL).
  const { data: updatedSession, error: sessionErr } = await supabase
    .from('lecture_sessions')
    .update({
      verdict,
      affection_delta: computedAffectionDelta,
      ended_at: new Date().toISOString(),
    })
    .eq('id', lectureSessionId)
    .is('ended_at', null)
    .select('id')
    .maybeSingle();

  if (sessionErr) {
    return { ok: false, reason: `lecture_sessions update: ${sessionErr.message}` };
  }
  if (!updatedSession) {
    // Already ended (concurrent endLecture race). Return current affection state
    // so publish stays consistent with DB, but do not re-apply mutations.
    const { data: existing } = await supabase
      .from('affection_state')
      .select('score, level')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .maybeSingle();
    const level = (existing?.level as AffectionLevel | undefined) ?? 'stranger';
    return {
      ok: true,
      applied: false,
      reason: 'already_ended',
      payload: {
        affectionDelta: 0,
        affectionLevel: level,
        episodeUnlocked: null,
        newlyUnderstood: [],
        ts: Date.now(),
      },
    };
  }

  // 2. affection_state upsert — read current score, compute new, write back.
  const { data: currentState } = await supabase
    .from('affection_state')
    .select('score')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .maybeSingle();
  const currentScore = currentState?.score ?? 0;
  const newScore = currentScore + computedAffectionDelta;
  const newLevel = computeLevelFromScore(newScore);
  const { error: affErr } = await supabase.from('affection_state').upsert(
    {
      user_id: userId,
      character_id: characterId,
      score: newScore,
      level: newLevel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,character_id' },
  );
  if (affErr) {
    return { ok: false, reason: `affection_state upsert: ${affErr.message}` };
  }

  // 3. understood_concepts upsert — passed >= 0.7, partial >= 0.4.
  // Read existing confidences first to apply max(existing, new).
  const allKeys = Array.from(
    new Set([...verdict.passed, ...verdict.partial]),
  );
  const existingByKey = new Map<string, number>();
  if (allKeys.length > 0) {
    const { data: existingRows } = await supabase
      .from('understood_concepts')
      .select('concept, confidence')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .in('concept', allKeys);
    for (const row of existingRows ?? []) {
      existingByKey.set(row.concept, Number(row.confidence) || 0);
    }
  }

  const now = new Date().toISOString();
  const conceptPayload = [
    ...verdict.passed.map((concept) => ({
      user_id: userId,
      character_id: characterId,
      concept,
      confidence: Math.max(existingByKey.get(concept) ?? 0, 0.7),
      last_reviewed_at: now,
    })),
    ...verdict.partial.map((concept) => ({
      user_id: userId,
      character_id: characterId,
      concept,
      confidence: Math.max(existingByKey.get(concept) ?? 0, 0.4),
      last_reviewed_at: now,
    })),
  ];
  if (conceptPayload.length > 0) {
    const { error: uErr } = await supabase
      .from('understood_concepts')
      .upsert(conceptPayload, { onConflict: 'user_id,character_id,concept' });
    if (uErr) {
      return { ok: false, reason: `understood_concepts upsert: ${uErr.message}` };
    }
  }

  // 4. conversation_threads reset (with retry). Non-fatal: affection + concepts
  // are already persisted; stale active_lecture_session_id is recoverable via
  // next startLecture UPSERT.
  await withRetry(async () => {
    const { error } = await supabase
      .from('conversation_threads')
      .update({ active_lecture_session_id: null })
      .eq('user_id', userId)
      .eq('character_id', characterId);
    return { error };
  }, 'conversation_threads reset');

  return {
    ok: true,
    applied: true,
    payload: {
      affectionDelta: computedAffectionDelta,
      affectionLevel: newLevel,
      episodeUnlocked: null,
      newlyUnderstood: verdict.passed,
      ts: Date.now(),
    },
  };
}
