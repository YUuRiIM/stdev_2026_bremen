import type { AffectionLevel } from '../db/schema';
import type { SubjectForJudge } from '../seed/subjects';
import type { JudgeVerdict } from './run-judge';

export const THRESHOLDS = {
  acquaintance: 3,
  friend: 8,
  close: 15,
  lover: 25,
} as const;

export function computeLevelFromScore(score: number): AffectionLevel {
  if (score >= THRESHOLDS.lover) return 'lover';
  if (score >= THRESHOLDS.close) return 'close';
  if (score >= THRESHOLDS.friend) return 'friend';
  if (score >= THRESHOLDS.acquaintance) return 'acquaintance';
  return 'stranger';
}

export function computeAffectionDelta(
  verdict: JudgeVerdict,
  subject: SubjectForJudge,
): number {
  const weightByKey = new Map(
    subject.objectives.map((o) => [o.conceptKey, o.weight]),
  );
  let raw = 0;
  for (const key of verdict.passed) {
    raw += weightByKey.get(key) ?? 0;
  }
  for (const key of verdict.partial) {
    raw += (weightByKey.get(key) ?? 0) * 0.5;
  }
  return Math.round(raw);
}
