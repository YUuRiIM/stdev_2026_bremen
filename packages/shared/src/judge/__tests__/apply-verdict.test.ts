import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { applyVerdict } from '../apply-verdict';
import type { JudgeVerdict } from '../run-judge';
import { createFakeSupabase } from './fakes/fake-supabase';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const CHAR_ID = '22222222-2222-2222-2222-222222222222';
const SESSION_ID = '33333333-3333-3333-3333-333333333333';

const happyVerdict: JudgeVerdict = {
  overallScore: 0.8,
  passed: ['flt_statement', 'flt_example'],
  partial: ['flt_applications'],
  missed: [],
  reason: 'good coverage',
};

test('applyVerdict happy path — 4-path mutation', async () => {
  const fake = createFakeSupabase();
  fake.seedLectureSession({
    id: SESSION_ID,
    user_id: USER_ID,
    character_id: CHAR_ID,
    ended_at: null,
  });
  fake.seedConversationThread({
    id: 'thr-1',
    user_id: USER_ID,
    character_id: CHAR_ID,
    active_lecture_session_id: SESSION_ID,
  });

  const result = await applyVerdict(fake.client as any, {
    userId: USER_ID,
    characterId: CHAR_ID,
    lectureSessionId: SESSION_ID,
    verdict: happyVerdict,
    computedAffectionDelta: 3, // 2 (flt_statement) + 1 (flt_example) = 3
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error();
  assert.equal(result.applied, true);
  assert.equal(result.payload.affectionDelta, 3);
  assert.equal(result.payload.affectionLevel, 'acquaintance'); // 0+3=3 crosses threshold
  assert.equal(result.payload.episodeUnlocked, null);
  assert.deepEqual(result.payload.newlyUnderstood, [
    'flt_statement',
    'flt_example',
  ]);

  // DB assertions (1) lecture_sessions
  const session = fake.tables.lecture_sessions[0];
  assert.ok(session!.ended_at, 'ended_at populated');
  assert.deepEqual(session!.verdict, happyVerdict);
  assert.equal(session!.affection_delta, 3);

  // DB assertions (2) affection_state
  const aff = fake.findAffection(USER_ID, CHAR_ID);
  assert.equal(aff!.score, 3);
  assert.equal(aff!.level, 'acquaintance');

  // DB assertions (3) understood_concepts
  const concepts = fake.findConcepts(USER_ID, CHAR_ID);
  const byKey = Object.fromEntries(concepts.map((c) => [c.concept, c.confidence]));
  assert.equal(byKey.flt_statement, 0.7);
  assert.equal(byKey.flt_example, 0.7);
  assert.equal(byKey.flt_applications, 0.4);
  assert.equal(byKey.missed_key, undefined);

  // DB assertions (4) conversation_threads reset
  const thread = fake.tables.conversation_threads[0];
  assert.equal(thread!.active_lecture_session_id, null);
});

test('applyVerdict safe-fail variant — delta=0, no state change', async () => {
  const fake = createFakeSupabase();
  fake.seedLectureSession({
    id: SESSION_ID,
    user_id: USER_ID,
    character_id: CHAR_ID,
    ended_at: null,
  });
  fake.seedAffection({
    user_id: USER_ID,
    character_id: CHAR_ID,
    score: 5,
    level: 'acquaintance',
  });
  fake.seedConversationThread({
    id: 'thr-1',
    user_id: USER_ID,
    character_id: CHAR_ID,
    active_lecture_session_id: SESSION_ID,
  });

  const emptyVerdict: JudgeVerdict = {
    overallScore: null,
    passed: [],
    partial: [],
    missed: [],
    reason: 'judge_unavailable',
  };

  const result = await applyVerdict(fake.client as any, {
    userId: USER_ID,
    characterId: CHAR_ID,
    lectureSessionId: SESSION_ID,
    verdict: emptyVerdict,
    computedAffectionDelta: 0,
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error();
  assert.equal(result.applied, true);
  assert.equal(result.payload.affectionDelta, 0);
  assert.equal(result.payload.affectionLevel, 'acquaintance');
  assert.deepEqual(result.payload.newlyUnderstood, []);

  const aff = fake.findAffection(USER_ID, CHAR_ID);
  assert.equal(aff!.score, 5, 'score unchanged after safe-fail');
  assert.equal(aff!.level, 'acquaintance');

  const concepts = fake.findConcepts(USER_ID, CHAR_ID);
  assert.equal(concepts.length, 0, 'no understood_concepts inserted for empty verdict');

  const session = fake.tables.lecture_sessions[0];
  assert.ok(session!.ended_at, 'session ended even in safe-fail');
  assert.equal(session!.affection_delta, 0);
});

test('applyVerdict idempotent guard — second call is no-op', async () => {
  const fake = createFakeSupabase();
  fake.seedLectureSession({
    id: SESSION_ID,
    user_id: USER_ID,
    character_id: CHAR_ID,
    ended_at: new Date().toISOString(), // already ended
  });
  fake.seedAffection({
    user_id: USER_ID,
    character_id: CHAR_ID,
    score: 10,
    level: 'friend',
  });

  const result = await applyVerdict(fake.client as any, {
    userId: USER_ID,
    characterId: CHAR_ID,
    lectureSessionId: SESSION_ID,
    verdict: happyVerdict,
    computedAffectionDelta: 3,
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error();
  assert.equal(result.applied, false);
  assert.equal(result.payload.affectionDelta, 0);
  assert.equal(result.payload.affectionLevel, 'friend');

  const aff = fake.findAffection(USER_ID, CHAR_ID);
  assert.equal(aff!.score, 10, 'second applyVerdict must not double-credit');
});

test('applyVerdict missed keys never reach understood_concepts', async () => {
  const fake = createFakeSupabase();
  fake.seedLectureSession({
    id: SESSION_ID,
    user_id: USER_ID,
    character_id: CHAR_ID,
    ended_at: null,
  });

  const missedOnly: JudgeVerdict = {
    overallScore: 0,
    passed: [],
    partial: [],
    missed: ['flt_statement', 'flt_example'],
    reason: 'unsatisfactory',
  };

  const result = await applyVerdict(fake.client as any, {
    userId: USER_ID,
    characterId: CHAR_ID,
    lectureSessionId: SESSION_ID,
    verdict: missedOnly,
    computedAffectionDelta: 0,
  });

  assert.equal(result.ok, true);
  const concepts = fake.findConcepts(USER_ID, CHAR_ID);
  assert.equal(
    concepts.length,
    0,
    'missed concepts must not create/update rows (negative update banned)',
  );
});

test('applyVerdict partial+existing preserves max confidence', async () => {
  const fake = createFakeSupabase();
  fake.seedLectureSession({
    id: SESSION_ID,
    user_id: USER_ID,
    character_id: CHAR_ID,
    ended_at: null,
  });
  fake.seedConcept({
    user_id: USER_ID,
    character_id: CHAR_ID,
    concept: 'flt_statement',
    confidence: 0.9,
  });

  const partialReduce: JudgeVerdict = {
    overallScore: 0.3,
    passed: [],
    partial: ['flt_statement'],
    missed: [],
    reason: 'regressed',
  };

  await applyVerdict(fake.client as any, {
    userId: USER_ID,
    characterId: CHAR_ID,
    lectureSessionId: SESSION_ID,
    verdict: partialReduce,
    computedAffectionDelta: 1,
  });

  const concepts = fake.findConcepts(USER_ID, CHAR_ID);
  const byKey = Object.fromEntries(concepts.map((c) => [c.concept, c.confidence]));
  assert.equal(byKey.flt_statement, 0.9, 'max(existing 0.9, partial 0.4) = 0.9');
});
