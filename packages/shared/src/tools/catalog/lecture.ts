import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SharedToolDef, ToolContext } from '../types';
import { loadSubjectForJudge } from '../../db/loaders';
import {
  runJudge,
  applyVerdict,
  computeAffectionDelta,
  type JudgeVerdict,
  type RunJudgeResult,
} from '../../judge';
import {
  LECTURE_STATE_TOPIC,
  LECTURE_VERDICT_APPLIED_TOPIC,
} from '../../protocol/lecture';

export const startLecture: SharedToolDef<
  { topic: z.ZodOptional<z.ZodString> },
  | { ok: true; sessionId: string; subjectId: string; topic: string }
  | { ok: false; reason: string; availableTopics?: string[] }
> = {
  name: 'startLecture',
  description:
    'Begin a lecture session. Pass `topic` as the human-readable subject name (e.g. "페르마 소정리", "Fermat\'s Little Theorem"). If omitted and the character has exactly one subject, that subject is used.',
  parameters: z.object({
    topic: z.string().min(1).optional(),
  }),
  execute: async ({ topic }, ctx) => {
    const { userId, characterId, supabase } = ctx;

    const subjectsQuery = supabase
      .from('subjects')
      .select('id, topic')
      .or(`character_id.eq.${characterId},character_id.is.null`);

    const { data: candidates, error: candErr } = await subjectsQuery;
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

    void logAudit(supabase, ctx, {
      kind: 'tool.call',
      name: 'startLecture',
      payload: { sessionId, subjectId },
    });

    return { ok: true, sessionId, subjectId, topic: pickedTopic };
  },
};

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
    "End the current lecture session and return a verdict on the user's understanding.",
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

    await publish(LECTURE_STATE_TOPIC, {
      phase: 'judging',
      subjectId,
      ts: Date.now(),
    });

    const subject = await loadSubjectForJudge(supabase, subjectId);
    if (!subject) {
      return safeFailReturn(publish, subjectId);
    }

    const transcript = await buildTranscript(ctx, summary);

    const judgeStarted = Date.now();
    const judgeResult: RunJudgeResult = await runJudge({
      subject,
      transcript,
      summary,
    });
    void logAudit(supabase, ctx, {
      kind: 'llm.call',
      name: 'judge',
      model: 'model' in judgeResult ? judgeResult.model : undefined,
      durationMs: judgeResult.durationMs,
      payload: {
        ok: judgeResult.ok,
        detailReason: judgeResult.ok ? null : judgeResult.reason,
      },
    });

    const verdict: JudgeVerdict = judgeResult.ok
      ? judgeResult.verdict
      : {
          overallScore: null,
          passed: [],
          partial: [],
          missed: [],
          reason: 'judge_unavailable',
        };

    const computedDelta = judgeResult.ok
      ? computeAffectionDelta(verdict, subject)
      : 0;

    if (!judgeResult.ok) {
      void logAudit(supabase, ctx, {
        kind: 'error',
        level: 'warn',
        name: 'judge_fail',
        error: judgeResult.reason,
        payload: { detailReason: judgeResult.reason },
      });
    }

    const applyResult = await applyVerdict(supabase, {
      userId,
      characterId,
      lectureSessionId: sessionId,
      verdict,
      computedAffectionDelta: computedDelta,
    });

    if (!applyResult.ok) {
      void logAudit(supabase, ctx, {
        kind: 'error',
        level: 'error',
        name: 'applyVerdict_fail',
        error: applyResult.reason,
        payload: { reason: applyResult.reason },
      });
      return safeFailReturn(publish, subjectId);
    }

    void logAudit(supabase, ctx, {
      kind: 'tool.call',
      name: 'applyVerdict',
      payload: {
        affectionDelta: applyResult.payload.affectionDelta,
        passedCount: verdict.passed.length,
        partialCount: verdict.partial.length,
        missedCount: verdict.missed.length,
        applied: applyResult.applied,
      },
    });

    await publish(LECTURE_VERDICT_APPLIED_TOPIC, applyResult.payload);
    await publish(LECTURE_STATE_TOPIC, {
      phase: 'verdicted',
      subjectId,
      ts: Date.now(),
    });

    return {
      ok: true,
      verdict: {
        overallScore: verdict.overallScore,
        passed: verdict.passed,
        partial: verdict.partial,
        missed: verdict.missed,
        reason: judgeResult.ok ? verdict.reason : 'judge_unavailable',
      },
      affectionDelta: applyResult.payload.affectionDelta,
    };
  },
};

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

async function buildTranscript(
  ctx: ToolContext,
  wrapSummary: string | undefined,
): Promise<string> {
  const parts: string[] = [];
  const { data: memory } = await ctx.supabase
    .from('session_memory')
    .select('summary, turn_count, last_session_at')
    .eq('user_id', ctx.userId)
    .eq('character_id', ctx.characterId)
    .maybeSingle();
  if (memory?.summary) {
    parts.push(`[session_memory rolling summary]\n${memory.summary}`);
  }
  if (wrapSummary) {
    parts.push(`[teacher wrap-up summary]\n${wrapSummary}`);
  }
  if (parts.length === 0) {
    return '(no transcript or summary available)';
  }
  return parts.join('\n\n');
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
  // Always transition lecture.state phase to 'verdicted' even on safe-fail,
  // so FE listeners don't remain stuck on 'judging'.
  await publish(LECTURE_STATE_TOPIC, { phase: 'verdicted', subjectId, ts });
  return {
    ok: false,
    verdict: {
      overallScore: null,
      passed: [],
      partial: [],
      missed: [],
      reason: 'judge_unavailable',
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
