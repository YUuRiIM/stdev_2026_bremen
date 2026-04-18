import { z } from 'zod';

/**
 * Agent → Client. Broadcast the current lecture phase + per-objective
 * coverage (no rubric, no score). FE renders progress indicators.
 *
 * `objectivesStatus` items intentionally exclude rubric / feedback to preserve
 * double-blind judge isolation. Only `id` + `coverage` (0–1) is exposed.
 *
 * Topic: "lecture.state"
 */
export const LecturePhaseSchema = z.enum([
  'idle', // no active lecture
  'lecturing', // turns happening
  'judging', // backend running judge LLM
  'verdicted', // verdict applied; state mutations done
]);
export type LecturePhase = z.infer<typeof LecturePhaseSchema>;

export const LectureStateSchema = z.object({
  phase: LecturePhaseSchema,
  subjectId: z.string().uuid().nullable(),
  objectivesStatus: z
    .array(
      z.object({
        id: z.string(),
        statement: z.string(), // public-safe statement, never the rubric
        coverage: z.number().min(0).max(1),
      })
    )
    .optional(),
  ts: z.number().int().positive(),
});
export type LectureState = z.infer<typeof LectureStateSchema>;
export const LECTURE_STATE_TOPIC = 'lecture.state' as const;

/**
 * Agent → Client. Judge LLM call is pending / retrying. Purely advisory so FE
 * can show a "채점 중…" spinner without blocking.
 *
 * Topic: "lecture.judge_pending"
 */
export const LectureJudgePendingSchema = z.object({
  reason: z.enum(['retry', 'timeout', 'rate_limit', 'initial']),
  attempt: z.number().int().positive().default(1),
  ts: z.number().int().positive(),
});
export type LectureJudgePending = z.infer<typeof LectureJudgePendingSchema>;
export const LECTURE_JUDGE_PENDING_TOPIC = 'lecture.judge_pending' as const;

/**
 * Agent → Client. Verdict applied; state mutations (affection, understood,
 * episode unlock) have been persisted. FE updates UI accordingly.
 *
 * `newlyUnderstood` contains `concept_key` strings only — no statements, no
 * rubric, no feedback. This preserves the double-blind boundary on the way out.
 *
 * Topic: "lecture.verdict_applied"
 */
export const LectureVerdictAppliedSchema = z.object({
  affectionDelta: z.number().int(),
  affectionLevel: z.enum([
    'stranger',
    'acquaintance',
    'friend',
    'close',
    'lover',
  ]),
  episodeUnlocked: z.string().nullable(),
  newlyUnderstood: z.array(z.string()).default([]), // concept_key[]
  ts: z.number().int().positive(),
});
export type LectureVerdictApplied = z.infer<typeof LectureVerdictAppliedSchema>;
export const LECTURE_VERDICT_APPLIED_TOPIC = 'lecture.verdict_applied' as const;
