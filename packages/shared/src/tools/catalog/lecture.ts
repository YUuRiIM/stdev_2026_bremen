import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SharedToolDef, ToolContext } from '../types';
import {
  loadSubjectForJudge,
  loadSubjectForStudent,
} from '../../db/loaders';
import {
  runObjectiveJudge,
  computeLevelFromScore,
  type ObjectiveVerdict,
  type RunObjectiveJudgeResult,
} from '../../judge';
import type { AffectionLevel } from '../../db/schema';
import {
  LECTURE_STATE_TOPIC,
  LECTURE_VERDICT_APPLIED_TOPIC,
} from '../../protocol/lecture';

// ═══════════════════════════════════════════════════════════
// startLecture — opens a session + publishes objective checklist
// ═══════════════════════════════════════════════════════════

export const startLecture: SharedToolDef<
  { topic: z.ZodOptional<z.ZodString> },
  | { ok: true; sessionId: string; subjectId: string; topic: string }
  | { ok: false; reason: string; availableTopics?: string[] }
> = {
  name: 'startLecture',
  description:
    'Begin a lecture session. Pass `topic` as the human-readable subject name (e.g. "페르마 소정리", "Fermat\'s Little Theorem"). If omitted and the character has exactly one subject, that subject is used. On success the system publishes the objective checklist to the client.',
  parameters: z.object({
    topic: z.string().min(1).optional(),
  }),
  execute: async ({ topic }, ctx) => {
    const { userId, characterId, supabase, publish } = ctx;

    const { data: candidates, error: candErr } = await supabase
      .from('subjects')
      .select('id, topic')
      .or(`character_id.eq.${characterId},character_id.is.null`);
    if (candErr) {
      return { ok: false, reason: `subjects query failed: ${candErr.message}` };
    }
    if (!candidates || candidates.length === 0) {
      return { ok: false, reason: 'no_subjects_for_character' };
    }

    let picked = candidates[0]!;
    if (topic) {
      const normalized = topic.trim().toLowerCase();
      const match = candidates.find((s) =>
        (s.topic as string).toLowerCase().includes(normalized),
      );
      if (!match) {
        return {
          ok: false,
          reason: 'topic_not_in_catalog',
          availableTopics: candidates.map((s) => s.topic as string),
        };
      }
      picked = match;
    } else if (candidates.length > 1) {
      return {
        ok: false,
        reason: 'topic_required_multiple_subjects',
        availableTopics: candidates.map((s) => s.topic as string),
      };
    }

    const subjectId = picked.id as string;
    const pickedTopic = picked.topic as string;

    const { data: inserted, error } = await supabase
      .from('lecture_sessions')
      .insert({
        user_id: userId,
        character_id: characterId,
        subject_id: subjectId,
      })
      .select('id')
      .single();
    if (error || !inserted) {
      return {
        ok: false,
        reason: `lecture_sessions_insert_failed: ${error?.message ?? 'no row'}`,
      };
    }
    const sessionId = inserted.id as string;

    const { data: existingThread } = await supabase
      .from('conversation_threads')
      .select('id')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .maybeSingle();

    if (existingThread) {
      await supabase
        .from('conversation_threads')
        .update({
          active_lecture_session_id: sessionId,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', existingThread.id);
    } else {
      await supabase.from('conversation_threads').insert({
        user_id: userId,
        character_id: characterId,
        active_lecture_session_id: sessionId,
        last_channel: 'voice',
      });
    }

    // Load the rubric-stripped subject + current coverage, then broadcast
    // the initial objective checklist so the client can render it.
    const subjectPublic = await loadSubjectForStudent(supabase, subjectId);
    if (subjectPublic) {
      const coverageByKey = await loadCoverageMap(
        supabase,
        userId,
        characterId,
        subjectPublic.objectives.map((o) => o.conceptKey),
      );
      await publish(LECTURE_STATE_TOPIC, {
        phase: 'lecturing',
        subjectId,
        objectivesStatus: subjectPublic.objectives.map((o) => ({
          id: o.id,
          statement: o.statement,
          coverage: coverageByKey.get(o.conceptKey) ?? 0,
        })),
        ts: Date.now(),
      });
    }

    void logAudit(supabase, ctx, {
      kind: 'tool.call',
      name: 'startLecture',
      payload: { sessionId, subjectId },
    });

    return { ok: true, sessionId, subjectId, topic: pickedTopic };
  },
};

// ═══════════════════════════════════════════════════════════
// checkObjective — per-objective live judge (confirm trigger)
// ═══════════════════════════════════════════════════════════

type CheckObjectiveResult =
  | {
      ok: true;
      status: ObjectiveVerdict['status'];
      coverage: number;
      newlyPassed: boolean;
      allDone: boolean;
    }
  | { ok: false; reason: string; availableConcepts?: string[] };

export const checkObjective: SharedToolDef<
  { conceptKey: z.ZodString; userExplanation: z.ZodString },
  CheckObjectiveResult
> = {
  name: 'checkObjective',
  description:
    "Confirm that the user just explained ONE of the lecture objectives. Call this reactively after the user finishes a point — not mid-sentence. Pass `conceptKey` of the objective you believe they addressed and `userExplanation` as a brief summary in their own wording (quotes OK). The tool grades silently against a hidden rubric and updates the checklist. Returns `{status, coverage, allDone}`. If `allDone=true`, wrap up naturally and call endLecture.",
  parameters: z.object({
    conceptKey: z.string().min(1),
    userExplanation: z.string().min(4),
  }),
  execute: async ({ conceptKey, userExplanation }, ctx): Promise<CheckObjectiveResult> => {
    const { userId, characterId, supabase, publish } = ctx;

    const resolved = await resolveActiveLecture(ctx);
    if (!resolved) {
      return { ok: false, reason: 'no_active_lecture' };
    }
    const { sessionId, subjectId } = resolved;

    const subject = await loadSubjectForJudge(supabase, subjectId);
    if (!subject) {
      return { ok: false, reason: 'subject_load_failed' };
    }

    const objective = subject.objectives.find(
      (o) => o.conceptKey === conceptKey,
    );
    if (!objective) {
      return {
        ok: false,
        reason: 'unknown_concept',
        availableConcepts: subject.objectives.map((o) => o.conceptKey),
      };
    }

    const { data: existing } = await supabase
      .from('understood_concepts')
      .select('confidence')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .eq('concept', conceptKey)
      .maybeSingle();
    const priorCoverage = Number(existing?.confidence) || 0;

    const judgeResult: RunObjectiveJudgeResult = await runObjectiveJudge({
      objective,
      userExplanation,
      priorCoverage,
    });

    void logAudit(supabase, ctx, {
      kind: 'llm.call',
      name: 'objective_judge',
      model: 'model' in judgeResult ? judgeResult.model : undefined,
      durationMs: judgeResult.durationMs,
      payload: {
        ok: judgeResult.ok,
        conceptKey,
        detailReason: judgeResult.ok ? null : judgeResult.reason,
      },
    });

    if (!judgeResult.ok) {
      // Safe-fail: no state mutation. Let the agent continue the lecture.
      return {
        ok: true,
        status: 'missed',
        coverage: priorCoverage,
        newlyPassed: false,
        allDone: await computeAllDone(supabase, userId, characterId, subject.objectives.map((o) => o.conceptKey)),
      };
    }

    const { status, coverage } = judgeResult.verdict;

    // Map verdict → new confidence (monotonic, minimums by tier).
    let newConfidence = priorCoverage;
    if (status === 'passed') newConfidence = Math.max(priorCoverage, 0.7, coverage);
    else if (status === 'partial') newConfidence = Math.max(priorCoverage, 0.4, coverage);

    const newlyPassed = priorCoverage < 0.7 && newConfidence >= 0.7;
    const passedJustNow = status === 'passed' && priorCoverage < 0.7;
    const partialJustNow =
      status === 'partial' && priorCoverage < 0.4 && newConfidence >= 0.4;

    if (newConfidence > priorCoverage) {
      const { error: upErr } = await supabase
        .from('understood_concepts')
        .upsert(
          {
            user_id: userId,
            character_id: characterId,
            subject_id: subjectId,
            concept: conceptKey,
            confidence: newConfidence,
            last_reviewed_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,character_id,concept' },
        );
      if (upErr) {
        return { ok: false, reason: `understood_concepts upsert: ${upErr.message}` };
      }

      const deltaWeight = passedJustNow
        ? objective.weight
        : partialJustNow
          ? Math.max(1, Math.round(objective.weight * 0.5))
          : 0;

      if (deltaWeight > 0) {
        const { data: aff } = await supabase
          .from('affection_state')
          .select('score')
          .eq('user_id', userId)
          .eq('character_id', characterId)
          .maybeSingle();
        const newScore = (aff?.score ?? 0) + deltaWeight;
        const newLevel = computeLevelFromScore(newScore);
        await supabase.from('affection_state').upsert(
          {
            user_id: userId,
            character_id: characterId,
            score: newScore,
            level: newLevel,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,character_id' },
        );
      }
    }

    // Broadcast refreshed checklist.
    const subjectPublic = await loadSubjectForStudent(supabase, subjectId);
    if (subjectPublic) {
      const coverageByKey = await loadCoverageMap(
        supabase,
        userId,
        characterId,
        subjectPublic.objectives.map((o) => o.conceptKey),
      );
      await publish(LECTURE_STATE_TOPIC, {
        phase: 'lecturing',
        subjectId,
        objectivesStatus: subjectPublic.objectives.map((o) => ({
          id: o.id,
          statement: o.statement,
          coverage: coverageByKey.get(o.conceptKey) ?? 0,
        })),
        ts: Date.now(),
      });
    }

    const allDone = await computeAllDone(
      supabase,
      userId,
      characterId,
      subject.objectives.map((o) => o.conceptKey),
    );

    void logAudit(supabase, ctx, {
      kind: 'tool.call',
      name: 'checkObjective',
      payload: {
        sessionId,
        conceptKey,
        status,
        coverage: newConfidence,
        newlyPassed,
        allDone,
      },
    });

    return {
      ok: true,
      status,
      coverage: newConfidence,
      newlyPassed,
      allDone,
    };
  },
};

// ═══════════════════════════════════════════════════════════
// endLecture — finalize session (no judge; state already incremental)
// ═══════════════════════════════════════════════════════════

type EndLectureVerdictShape = {
  overallScore: number | null;
  passed: string[];
  partial: string[];
  missed: string[];
  reason: string;
};

export const endLecture: SharedToolDef<
  { summary: z.ZodOptional<z.ZodString> },
  {
    ok: boolean;
    verdict: EndLectureVerdictShape;
    affectionDelta: number;
  }
> = {
  name: 'endLecture',
  description:
    'End the current lecture session. Call when the user wraps up or when `checkObjective` returned `allDone=true`. Returns the accumulated checklist state (no new grading happens here — objectives are graded live via checkObjective).',
  parameters: z.object({
    summary: z.string().optional(),
  }),
  execute: async ({ summary }, ctx) => {
    const { userId, characterId, supabase, publish } = ctx;

    const resolved = await resolveActiveLecture(ctx);
    if (!resolved) {
      return safeFailReturn(publish);
    }
    const { sessionId, subjectId } = resolved;

    const subjectPublic = await loadSubjectForStudent(supabase, subjectId);
    if (!subjectPublic) {
      return safeFailReturn(publish, subjectId);
    }

    const conceptKeys = subjectPublic.objectives.map((o) => o.conceptKey);
    const coverageByKey = await loadCoverageMap(
      supabase,
      userId,
      characterId,
      conceptKeys,
    );

    const passed: string[] = [];
    const partial: string[] = [];
    const missed: string[] = [];
    for (const key of conceptKeys) {
      const c = coverageByKey.get(key) ?? 0;
      if (c >= 0.7) passed.push(key);
      else if (c >= 0.4) partial.push(key);
      else missed.push(key);
    }
    const overallScore =
      conceptKeys.length === 0 ? null : passed.length / conceptKeys.length;

    const verdictJson: EndLectureVerdictShape = {
      overallScore,
      passed,
      partial,
      missed,
      reason: summary ?? 'session_ended',
    };

    // Idempotent finalize.
    const { data: updated, error: sessErr } = await supabase
      .from('lecture_sessions')
      .update({
        verdict: verdictJson,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .is('ended_at', null)
      .select('id')
      .maybeSingle();
    if (sessErr) {
      // Non-fatal — still publish current state so FE doesn't hang.
    }

    await supabase
      .from('conversation_threads')
      .update({ active_lecture_session_id: null })
      .eq('user_id', userId)
      .eq('character_id', characterId);

    const { data: aff } = await supabase
      .from('affection_state')
      .select('level')
      .eq('user_id', userId)
      .eq('character_id', characterId)
      .maybeSingle();
    const level = ((aff?.level as AffectionLevel | undefined) ?? 'stranger');

    await publish(LECTURE_VERDICT_APPLIED_TOPIC, {
      // Affection was applied incrementally during checkObjective calls.
      // FE tracks delta via its own session snapshot.
      affectionDelta: 0,
      affectionLevel: level,
      episodeUnlocked: null,
      newlyUnderstood: passed,
      ts: Date.now(),
    });
    await publish(LECTURE_STATE_TOPIC, {
      phase: 'verdicted',
      subjectId,
      objectivesStatus: subjectPublic.objectives.map((o) => ({
        id: o.id,
        statement: o.statement,
        coverage: coverageByKey.get(o.conceptKey) ?? 0,
      })),
      ts: Date.now(),
    });

    void logAudit(supabase, ctx, {
      kind: 'tool.call',
      name: 'endLecture',
      payload: {
        sessionId,
        passedCount: passed.length,
        partialCount: partial.length,
        missedCount: missed.length,
        applied: !!updated,
      },
    });

    return {
      ok: true,
      verdict: verdictJson,
      affectionDelta: 0,
    };
  },
};

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

async function resolveActiveLecture(
  ctx: ToolContext,
): Promise<{ sessionId: string; subjectId: string } | null> {
  if (ctx.activeLectureSessionId && ctx.subjectId) {
    return { sessionId: ctx.activeLectureSessionId, subjectId: ctx.subjectId };
  }

  const { data, error } = await ctx.supabase
    .from('lecture_sessions')
    .select('id, subject_id')
    .eq('user_id', ctx.userId)
    .eq('character_id', ctx.characterId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return { sessionId: data.id as string, subjectId: data.subject_id as string };
}

async function loadCoverageMap(
  supabase: SupabaseClient,
  userId: string,
  characterId: string,
  conceptKeys: string[],
): Promise<Map<string, number>> {
  const byKey = new Map<string, number>();
  if (conceptKeys.length === 0) return byKey;
  const { data } = await supabase
    .from('understood_concepts')
    .select('concept, confidence')
    .eq('user_id', userId)
    .eq('character_id', characterId)
    .in('concept', conceptKeys);
  for (const row of data ?? []) {
    byKey.set(row.concept as string, Number(row.confidence) || 0);
  }
  return byKey;
}

async function computeAllDone(
  supabase: SupabaseClient,
  userId: string,
  characterId: string,
  conceptKeys: string[],
): Promise<boolean> {
  if (conceptKeys.length === 0) return false;
  const byKey = await loadCoverageMap(supabase, userId, characterId, conceptKeys);
  return conceptKeys.every((k) => (byKey.get(k) ?? 0) >= 0.7);
}

async function safeFailReturn(
  publish: ToolContext['publish'],
  subjectId: string | null = null,
): Promise<{
  ok: boolean;
  verdict: EndLectureVerdictShape;
  affectionDelta: number;
}> {
  const ts = Date.now();
  await publish(LECTURE_VERDICT_APPLIED_TOPIC, {
    affectionDelta: 0,
    affectionLevel: 'stranger',
    episodeUnlocked: null,
    newlyUnderstood: [],
    ts,
  });
  await publish(LECTURE_STATE_TOPIC, {
    phase: 'verdicted',
    subjectId,
    ts,
  });
  return {
    ok: false,
    verdict: {
      overallScore: null,
      passed: [],
      partial: [],
      missed: [],
      reason: 'no_active_lecture',
    },
    affectionDelta: 0,
  };
}

export type AuditEntry = {
  kind: 'llm.call' | 'tool.call' | 'error';
  name?: string;
  model?: string;
  durationMs?: number;
  level?: 'debug' | 'info' | 'warn' | 'error';
  error?: string;
  payload?: Record<string, unknown>;
};

export async function logAudit(
  supabase: SupabaseClient,
  ctx: ToolContext,
  entry: AuditEntry,
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      user_id: ctx.userId,
      character_id: ctx.characterId,
      session_id: ctx.sessionId,
      level: entry.level ?? 'info',
      kind: entry.kind,
      name: entry.name ?? null,
      duration_ms: entry.durationMs ?? null,
      payload: entry.payload ?? {},
      error: entry.error ?? null,
      model: entry.model ?? null,
    });
  } catch {
    // audit_log insert 실패는 메인 경로를 차단하지 않음 (safe-fail)
  }
}
