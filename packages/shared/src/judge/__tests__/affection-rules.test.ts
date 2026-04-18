import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  THRESHOLDS,
  computeAffectionDelta,
  computeLevelFromScore,
} from '../affection-rules';
import type { JudgeVerdict } from '../run-judge';
import type { SubjectForJudge } from '../../seed/subjects';

test('computeLevelFromScore boundary transitions', () => {
  assert.equal(computeLevelFromScore(-1), 'stranger');
  assert.equal(computeLevelFromScore(0), 'stranger');
  assert.equal(computeLevelFromScore(2), 'stranger');
  assert.equal(computeLevelFromScore(3), 'acquaintance');
  assert.equal(computeLevelFromScore(7), 'acquaintance');
  assert.equal(computeLevelFromScore(8), 'friend');
  assert.equal(computeLevelFromScore(14), 'friend');
  assert.equal(computeLevelFromScore(15), 'close');
  assert.equal(computeLevelFromScore(24), 'close');
  assert.equal(computeLevelFromScore(25), 'lover');
  assert.equal(computeLevelFromScore(999), 'lover');
});

test('THRESHOLDS shape is stable', () => {
  assert.equal(THRESHOLDS.acquaintance, 3);
  assert.equal(THRESHOLDS.friend, 8);
  assert.equal(THRESHOLDS.close, 15);
  assert.equal(THRESHOLDS.lover, 25);
});

const fixtureSubject: SubjectForJudge = {
  characterId: 'fermat',
  topic: 'test',
  keyterms: [],
  prerequisites: [],
  difficulty: 1,
  objectives: [
    { id: 'a', statement: '', conceptKey: 'flt_statement', weight: 2, expectedTerms: [], rubric: { must_hit: [], common_misconceptions: [], partial_credit: true } },
    { id: 'b', statement: '', conceptKey: 'flt_example', weight: 1, expectedTerms: [], rubric: { must_hit: [], common_misconceptions: [], partial_credit: true } },
    { id: 'c', statement: '', conceptKey: 'flt_applications', weight: 1, expectedTerms: [], rubric: { must_hit: [], common_misconceptions: [], partial_credit: true } },
  ],
};

test('computeAffectionDelta weight-aware accumulation', () => {
  const allPassed: JudgeVerdict = {
    overallScore: 1,
    passed: ['flt_statement', 'flt_example', 'flt_applications'],
    partial: [],
    missed: [],
    reason: '',
  };
  assert.equal(computeAffectionDelta(allPassed, fixtureSubject), 4); // 2+1+1

  const partialMix: JudgeVerdict = {
    overallScore: 0.5,
    passed: ['flt_statement'],
    partial: ['flt_example', 'flt_applications'],
    missed: [],
    reason: '',
  };
  assert.equal(computeAffectionDelta(partialMix, fixtureSubject), 3); // 2 + 0.5 + 0.5 = 3

  const empty: JudgeVerdict = {
    overallScore: null,
    passed: [],
    partial: [],
    missed: [],
    reason: 'judge_unavailable',
  };
  assert.equal(computeAffectionDelta(empty, fixtureSubject), 0);

  const unknownKeysIgnored: JudgeVerdict = {
    overallScore: null,
    passed: ['bogus_key'],
    partial: ['flt_example'],
    missed: [],
    reason: '',
  };
  // bogus_key weight=0, flt_example partial = 0.5 → round = 1 (nearest)
  assert.equal(computeAffectionDelta(unknownKeysIgnored, fixtureSubject), 1);
});
