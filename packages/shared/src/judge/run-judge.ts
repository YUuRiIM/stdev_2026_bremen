import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import type { SubjectForJudge } from '../seed/subjects';

export const JudgeVerdictSchema = z.object({
  overallScore: z.number().min(0).max(1).nullable(),
  passed: z.array(z.string()),
  partial: z.array(z.string()),
  missed: z.array(z.string()),
  reason: z.string(),
});
export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;

export interface RunJudgeInput {
  subject: SubjectForJudge;
  transcript: string;
  summary?: string | null;
}

export interface RunJudgeOptions {
  model?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export type RunJudgeResult =
  | { ok: true; verdict: JudgeVerdict; model: string; durationMs: number }
  | {
      ok: false;
      reason: 'timeout' | 'parse_error' | 'api_error' | 'no_api_key';
      model?: string;
      durationMs: number;
    };

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const FALLBACK_MODEL = 'gemini-2.5-flash';
const DEFAULT_TIMEOUT_MS = 12_000;

function resolveApiKey(opt?: string): string | null {
  return (
    opt ??
    process.env.JUDGE_GEMINI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    null
  );
}

function resolveModel(opt?: string): string {
  return opt ?? process.env.JUDGE_MODEL ?? DEFAULT_MODEL;
}

function buildSystemPrompt(): string {
  return [
    'You are an isolated grading judge for a 1:1 reverse-tutoring lecture.',
    'Score how well the TEACHER (user) covered each OBJECTIVE against its RUBRIC.',
    'Return JSON only matching the schema. Never echo rubric text in free-form fields.',
    "`passed` / `partial` / `missed` arrays MUST contain objective.conceptKey values only.",
    'Do not invent new conceptKey values. Unknown coverage → omit from arrays.',
    '`reason` is a short English grading note (<=200 chars). Omit rubric quotes.',
  ].join('\n');
}

function buildUserPrompt(input: RunJudgeInput): string {
  const { subject, transcript, summary } = input;
  const objectivesBlock = subject.objectives
    .map((obj) => {
      const rubricLines = [
        `- conceptKey: ${obj.conceptKey}`,
        `  weight: ${obj.weight}`,
        `  statement: ${obj.statement}`,
        `  expectedTerms: ${obj.expectedTerms.join(', ')}`,
        `  must_hit:\n${obj.rubric.must_hit.map((m) => `    - ${m}`).join('\n')}`,
        `  common_misconceptions:\n${obj.rubric.common_misconceptions.map((m) => `    - ${m}`).join('\n')}`,
        `  partial_credit: ${obj.rubric.partial_credit}`,
      ];
      return rubricLines.join('\n');
    })
    .join('\n\n');

  return [
    `SUBJECT: ${subject.topic}`,
    '',
    'OBJECTIVES + RUBRIC (judge-only, never expose in output):',
    objectivesBlock,
    '',
    'LECTURE SUMMARY (session_memory + teacher wrap-up):',
    summary ?? '(no summary provided)',
    '',
    'LECTURE TRANSCRIPT (teacher-led explanation):',
    transcript,
    '',
    'Grade each objective. Populate passed/partial/missed with conceptKey strings.',
    "overallScore is optional (0..1 or null). Don't force a number if coverage is ambiguous.",
  ].join('\n');
}

function filterKnownConcepts(
  verdict: JudgeVerdict,
  subject: SubjectForJudge,
): JudgeVerdict {
  const known = new Set(subject.objectives.map((o) => o.conceptKey));
  return {
    ...verdict,
    passed: verdict.passed.filter((k) => known.has(k)),
    partial: verdict.partial.filter((k) => known.has(k)),
    missed: verdict.missed.filter((k) => known.has(k)),
  };
}

async function callOnce(
  model: string,
  apiKey: string,
  input: RunJudgeInput,
  signal: AbortSignal,
): Promise<JudgeVerdict> {
  const google = createGoogleGenerativeAI({ apiKey });
  const result = await generateObject({
    model: google(model),
    schema: JudgeVerdictSchema,
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(input),
    abortSignal: signal,
  });
  return result.object;
}

export async function runJudge(
  input: RunJudgeInput,
  opts: RunJudgeOptions = {},
): Promise<RunJudgeResult> {
  const started = Date.now();
  const apiKey = resolveApiKey(opts.apiKey);
  if (!apiKey) {
    return { ok: false, reason: 'no_api_key', durationMs: Date.now() - started };
  }

  const primaryModel = resolveModel(opts.model);
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let verdict: JudgeVerdict;
    let modelUsed = primaryModel;
    try {
      verdict = await callOnce(primaryModel, apiKey, input, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) {
        return { ok: false, reason: 'timeout', model: primaryModel, durationMs: Date.now() - started };
      }
      if (primaryModel !== FALLBACK_MODEL) {
        modelUsed = FALLBACK_MODEL;
        try {
          verdict = await callOnce(FALLBACK_MODEL, apiKey, input, controller.signal);
        } catch (fallbackErr) {
          if (controller.signal.aborted) {
            return { ok: false, reason: 'timeout', model: modelUsed, durationMs: Date.now() - started };
          }
          if (isSchemaError(fallbackErr)) {
            return { ok: false, reason: 'parse_error', model: modelUsed, durationMs: Date.now() - started };
          }
          return { ok: false, reason: 'api_error', model: modelUsed, durationMs: Date.now() - started };
        }
      } else {
        if (isSchemaError(err)) {
          return { ok: false, reason: 'parse_error', model: primaryModel, durationMs: Date.now() - started };
        }
        return { ok: false, reason: 'api_error', model: primaryModel, durationMs: Date.now() - started };
      }
    }

    const filtered = filterKnownConcepts(verdict, input.subject);
    return {
      ok: true,
      verdict: filtered,
      model: modelUsed,
      durationMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

function isSchemaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name ?? '';
  const msg = (err as { message?: string }).message ?? '';
  return (
    name.includes('NoObjectGenerated') ||
    name.includes('InvalidArgument') ||
    name.includes('TypeValidation') ||
    /schema|validat|parse|invalid/i.test(msg)
  );
}
