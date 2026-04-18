import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { runJudge, JudgeVerdictSchema } from '../run-judge';
import type { SubjectForJudge } from '../../seed/subjects';

const subject: SubjectForJudge = {
  characterId: 'fermat',
  topic: 'test',
  keyterms: [],
  prerequisites: [],
  difficulty: 1,
  objectives: [
    {
      id: 'a',
      statement: 's',
      conceptKey: 'concept_a',
      weight: 1,
      expectedTerms: [],
      rubric: { must_hit: [], common_misconceptions: [], partial_credit: true },
    },
  ],
};

test('runJudge returns no_api_key when no keys set', async (t) => {
  const prev = {
    JUDGE_GEMINI_API_KEY: process.env.JUDGE_GEMINI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  };
  delete process.env.JUDGE_GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  t.after(() => {
    if (prev.JUDGE_GEMINI_API_KEY) process.env.JUDGE_GEMINI_API_KEY = prev.JUDGE_GEMINI_API_KEY;
    if (prev.GEMINI_API_KEY) process.env.GEMINI_API_KEY = prev.GEMINI_API_KEY;
    if (prev.GOOGLE_GENERATIVE_AI_API_KEY) process.env.GOOGLE_GENERATIVE_AI_API_KEY = prev.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  const result = await runJudge(
    { subject, transcript: 'hello' },
    { apiKey: undefined },
  );
  assert.equal(result.ok, false);
  if (result.ok) throw new Error();
  assert.equal(result.reason, 'no_api_key');
  assert.ok(typeof result.durationMs === 'number');
});

test('JudgeVerdictSchema parses well-formed verdict', () => {
  const parsed = JudgeVerdictSchema.safeParse({
    overallScore: 0.5,
    passed: ['a'],
    partial: [],
    missed: [],
    reason: 'ok',
  });
  assert.equal(parsed.success, true);
});

test('JudgeVerdictSchema rejects malformed verdict', () => {
  const parsed = JudgeVerdictSchema.safeParse({
    overallScore: 'not-a-number',
    passed: [],
    partial: [],
    missed: [],
    reason: 'x',
  });
  assert.equal(parsed.success, false);
});

test('JudgeVerdictSchema clamps overallScore bounds', () => {
  assert.equal(
    JudgeVerdictSchema.safeParse({
      overallScore: 1.5,
      passed: [],
      partial: [],
      missed: [],
      reason: '',
    }).success,
    false,
  );
  assert.equal(
    JudgeVerdictSchema.safeParse({
      overallScore: null,
      passed: [],
      partial: [],
      missed: [],
      reason: '',
    }).success,
    true,
  );
});
