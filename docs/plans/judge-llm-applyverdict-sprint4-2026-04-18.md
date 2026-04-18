# Judge LLM + applyVerdict — Sprint 4 Day 3

**작성일**: 2026-04-18
**리뷰**: Architect + Critic consensus (Conditional Go → Revised). 2026-04-18
**상위 문서**: `.omc/plans/miyeonshi-demo-mvp-2026-04-18.md` §4 Day 3 (162-172)
**스코프**: LECTURE judge(Gemini) + `applyVerdict` 3-path mutation + `lecture.verdict_applied` 프로토콜 브로드캐스트
**Fail 정책**: safe-fail verdict (`affectionDelta=0`, `verdict.reason='judge_unavailable'`) 로 degrade. 데모 중단 없음.

> **Reason naming unification**: `runJudge` 내부는 구체 reason 코드 (`timeout | parse_error | api_error | no_api_key`) 반환 → `endLecture.execute` 의 safe-fail 핸들러에서 `verdict.reason = 'judge_unavailable'` 로 일괄 통일. 구체 코드는 `audit_log.payload.detailReason` 으로만 남는다.

---

## 0. Ground Truth — 지금 코드베이스 상태

- `packages/shared/src/tools/catalog/lecture.ts:40-52` — `endLecture.execute` 가 `reason: 'judge_not_yet_implemented'` stub 반환. affectionDelta=1 하드코딩.
- `packages/shared/src/tools/catalog/lecture.ts:4-6` — `startLecture` 는 `{ sessionId: 'pending' }` 로 Supabase 인서트 미수행 (별도 이슈; 본 플랜은 기존 agent 쪽 lecture_session row 를 그대로 사용).
- `packages/shared/src/db/loaders.ts:151-165` — `loadSubjectForJudge()` 는 이미 rubric 포함 variant 를 로드 가능.
- `packages/shared/src/db/loaders.ts:132-147` — `loadSubjectForStudent()` 는 rubric strip. student 경로는 절대 rubric 접근 불가 (타입 레벨 증명).
- `packages/shared/src/seed/subjects.ts:14-27` — `Rubric`, `Objective` 타입 완성. `must_hit / common_misconceptions / partial_credit` 구조.
- `packages/shared/src/protocol/lecture.ts:12-17` — `LecturePhaseSchema` = `idle | lecturing | judging | verdicted`.
- `packages/shared/src/protocol/lecture.ts:43-49` — `LectureJudgePendingSchema` 정의 완료 (아직 publish 코드 없음).
- `packages/shared/src/protocol/lecture.ts:60-74` — `LectureVerdictAppliedSchema` = `{ affectionDelta, affectionLevel, episodeUnlocked, newlyUnderstood, ts }`.
- `packages/shared/src/db/schema.ts:335-367` — `lectureSessions` 에 `verdict: jsonb`, `affectionDelta: integer`, `episodeTriggered: text` 컬럼 준비됨.
- `packages/shared/src/db/schema.ts:226-245` — `affectionState` 는 `(userId, characterId)` 복합 PK, `level` + `score` + `flags`.
- `packages/shared/src/db/schema.ts:307-330` — `understoodConcepts` 는 `(userId, characterId, concept)` 복합 PK.
- `packages/shared/src/tools/types.ts:7-14` — `SharedToolDef.execute(args, ctx: ToolContext)` 서명. 현재 ctx 에는 supabase 없음.
- `packages/shared/src/types.ts:5-13` — `ToolContext = { userId, characterId, sessionId, affectionLevel, identityMode, subjectId? }`. DB/publish 핸들 없음.
- `apps/agent/src/tool-adapter.ts:22-30` — 어댑터가 `def.execute(args, ctxRef.current)` 호출. ctxRef 확장하면 모든 tool 에서 접근 가능.
- `apps/agent/src/entrypoint.ts:75-84` — `ctxRef.current` 초기화 지점. 여기에 `supabase` / `publish` 주입.
- `apps/agent/src/entrypoint.ts:62-64` — `supabase` 는 JWT pass-through, service_role 아님 (보안 불변식 유지).
- `apps/agent/package.json:18` — `@livekit/agents-plugin-google` 만 있고 **`@google/generative-ai` / `@ai-sdk/google` 의존성 없음**. Judge 용 Gemini SDK 추가 필요.
- `apps/web/.env.example:23-29` — `GEMINI_API_KEY`, `JUDGE_GEMINI_API_KEY` (optional), `JUDGE_MODEL=gemini-3-flash-preview` 정의됨.

---

## 1. 확정 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| Judge LLM SDK | `@google/generative-ai` (공식 Node SDK) | LiveKit plugin 과 충돌 없음, response_mime_type `application/json` + `responseSchema` 지원 |
| Judge 모델 | `process.env.JUDGE_MODEL ?? 'gemini-3-flash-preview'` (폴백 `gemini-2.5-flash`) | 상위 plan §1 과 동일. 폴백 로직은 agent voice LLM (`apps/agent/src/entrypoint.ts:92-102`) 과 동일 패턴 |
| Judge API key | `process.env.JUDGE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY` | 분리 키 있으면 격리. 없으면 student 키 재사용 (데모에서 허용; 프로덕션 시 분리 강제) |
| Verdict 스키마 | `zod` strict, `response_mime_type='application/json'` | parse 실패 = safe-fail |
| DB mutation | Supabase JS client, JWT pass-through | service_role 금지 (`§0 보안 불변식`) |
| Broadcast | LiveKit data channel `LECTURE_VERDICT_APPLIED_TOPIC` | `ctx.room.localParticipant.publishData` |

---

## 2. 아키텍처 결정

### 2.1 Judge/applyVerdict 는 shared 에 두고 의존성 주입한다

**결정**: `packages/shared/src/judge/{run-judge.ts, apply-verdict.ts}` 에 순수 함수로 작성. `supabase` / `publish` 는 인자로 주입. Tool 은 agent 쪽에서 주입받은 `ctx.supabase` + `ctx.publish` 를 사용해 이 함수들을 호출.

**이유**: Homomorphic Core 원칙 (demo-mvp §0) — transport/provider 는 경계 너머, core 는 순수. `MeetingTransport` 어댑터에서도 동일 judge 로직을 재사용하려면 shared 에 있어야 한다.

**대안 기각**:
- *judge 를 apps/agent 로 이동*: MeetingTransport 에서 재구현 필요 → core 원칙 위반.
- *Tool execute 안에서 직접 fetch*: 테스트 불가·격리 불가.

### 2.2 ToolContext 확장 — agent 의존성 주입 포트

기존:
```ts
// packages/shared/src/types.ts
export interface ToolContext {
  userId; characterId; sessionId; affectionLevel; identityMode;
  subjectId?: string | null;
}
```

확장:
```ts
import type { SupabaseClient } from '@supabase/supabase-js';
export type PublishFn = (topic: string, payload: unknown) => Promise<void>;

export interface ToolContext {
  userId; characterId; sessionId; affectionLevel; identityMode;
  subjectId?: string | null;
  supabase: SupabaseClient;         // JWT pass-through only; NEVER service_role
  publish: PublishFn;               // data-channel broadcast
  activeLectureSessionId?: string | null;  // Day 3 추가
}
```

**이유**: `recordFact` 주석 (`packages/shared/src/tools/catalog/memory.ts:13`) 이 이미 "Persistence into the facts table happens in the agent-side wrapper (Sprint 4+)" 로 예고한 방향. Day 3 에서 첫 구현.

**보안 주석 추가**: `types.ts` 상단에 "supabase MUST be the JWT-scoped client from `createAgentSupabase()`; passing a service_role client is a security defect" 명시.

### 2.3 verdict_applied publish 타이밍

`endLecture.execute` 가 (1) phase='judging' publish → (2) `runJudge()` → (3) `applyVerdict()` (DB mutation) → (4) phase='verdicted' + `verdict_applied` publish → (5) tool return 의 순서로 직렬 진행. 실패 시 (2)-(3) 에서 safe-fail verdict 로 degrade 후 (4)-(5) 동일 publish.

**이유**: verdict_applied 는 state mutation 이후에만 발행되어야 FE 가 DB 와 일관된 UI 를 그릴 수 있다. 데모 Scene 4 (demo-mvp §10 441-445) 에서 cutscene 트리거도 이 메시지에 hang.

---

## 3. 구현 단계

### Step 0 — RLS 선결 확인 (Architect should-fix)

**전제 불변식**: JWT pass-through supabase 가 `affection_state`, `understood_concepts`, `lecture_sessions`, `conversation_threads`, `audit_log` 에 `INSERT`/`UPDATE` 가능하려면 각 테이블에 `auth.uid() = user_id` RLS 정책이 있어야 한다. Step 1 진입 **전에** 다음 쿼리로 확인:

```sql
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('affection_state', 'understood_concepts', 'lecture_sessions', 'conversation_threads', 'audit_log')
order by tablename, cmd;
```

기대: 각 테이블에 `INSERT`/`UPDATE` 에 대해 `(select auth.uid()) = user_id` (또는 `auth.uid() = user_id`) 정책 존재. 누락 시 Supabase MCP 로 마이그레이션 추가:
```sql
alter table affection_state enable row level security;
create policy "user_writes_own_affection" on affection_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- (나머지 4개 테이블 동일 패턴)
```

**완료 기준**: 위 SELECT 가 5 테이블 각각 최소 1개 INSERT/UPDATE 정책 반환.

### Step 1 — ToolContext 확장 + 어댑터 전파

**파일**:
- `packages/shared/src/types.ts` — `ToolContext` 에 `supabase`, `publish`, `activeLectureSessionId` 필드 추가 (위 §2.2 형태). 보안 주석 포함.
- `apps/agent/src/entrypoint.ts:75-84` — `ctxRef.current` 초기화에서 `supabase`, `publish: async (topic, payload) => ctx.room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(payload)), { topic })` 주입.
- `apps/agent/src/tool-adapter.ts` — 변경 없음 (ctxRef 전파만 하므로 자동 반영).

**완료 기준**:
- `pnpm typecheck` 통과
- 기존 `recordFact` 등 tool 은 ctx 확장으로 깨지지 않음 (필드를 아직 참조 안 하므로)

### Step 2 — Judge 런타임 (순수 함수)

**파일 (신규)**: `packages/shared/src/judge/run-judge.ts`

**의존성**: `pnpm --filter @mys/shared add @google/generative-ai`

**서명**:
```ts
import { z } from 'zod';
import type { SubjectForJudge } from '../seed/subjects';

export const JudgeVerdictSchema = z.object({
  overallScore: z.number().min(0).max(1).nullable(),
  passed: z.array(z.string()),      // objective.conceptKey
  partial: z.array(z.string()),
  missed: z.array(z.string()),
  reason: z.string(),               // 자연어 코멘트 (FE 미노출, audit only)
});
export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;

export interface RunJudgeInput {
  subject: SubjectForJudge;
  transcript: string;               // lecture turns concatenated (teacher + student)
  summary?: string | null;          // endLecture 가 받은 optional summary
}

export interface RunJudgeOptions {
  model?: string;                   // default from env
  apiKey?: string;                  // default from env
  timeoutMs?: number;               // default 12_000
}

export async function runJudge(
  input: RunJudgeInput,
  opts?: RunJudgeOptions,
): Promise<{ ok: true; verdict: JudgeVerdict } | { ok: false; reason: 'timeout' | 'parse_error' | 'api_error' | 'no_api_key' }>;
```

**동작**:
1. api key 해석 우선순위: `opts.apiKey` → `process.env.JUDGE_GEMINI_API_KEY` → `process.env.GEMINI_API_KEY`. 없으면 `{ ok:false, reason:'no_api_key' }`.
2. 모델 해석: `opts.model` → `process.env.JUDGE_MODEL` → `'gemini-3-flash-preview'`. 500/4xx 발생 시 1회 fallback 으로 `'gemini-2.5-flash'` 재시도 (이건 safe-fail 정책 상 재시도 **1회만**). **문서화: "해당 재시도는 fail policy 상 필요 조건이 아니고, 상위 plan 의 모델 폴백 패턴을 맞추기 위한 것"**.
3. `AbortController` + `opts.timeoutMs` (default 12s).
4. System prompt (영어, guardrail 패턴 상 judge 는 영어): "You are an isolated grading judge. Score the lecture transcript against the rubric. Return JSON only. Never echo rubric back in free text."
5. User prompt: subject.topic, objectives (with rubric), transcript, summary.
6. `response_mime_type: 'application/json'` + `responseSchema` (JudgeVerdictSchema to JSON schema).
7. 응답을 `JudgeVerdictSchema.safeParse` → 실패 시 `{ ok:false, reason:'parse_error' }`.
8. passed/partial/missed 의 concept_key 가 subject objectives 에 실제 존재하는지 검증. 존재하지 않는 키 자동 제거 (관대 파싱).

**주의**: 이 파일은 `@mys/shared` 내부이므로 `@google/generative-ai` 의존성이 shared 번들에 들어간다. FE 가 shared 를 import 할 때 이 모듈은 **import 되지 않도록** `packages/shared/src/index.ts` 에서 re-export 하지 않는다. 오직 `@mys/shared/judge` sub-path 로만 접근 (package.json `exports` 에 추가).

### Step 3 — applyVerdict 게이트웨이 (3-path mutation)

**파일 (신규)**: `packages/shared/src/judge/apply-verdict.ts`

**서명**:
```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ToolContext } from '../types';
import type { JudgeVerdict } from './run-judge';
import type { LectureVerdictApplied } from '../protocol/lecture';

export interface ApplyVerdictInput {
  ctx: ToolContext;                 // userId, characterId, subjectId, activeLectureSessionId
  subjectId: string;
  lectureSessionId: string;
  verdict: JudgeVerdict;
  computedAffectionDelta: number;   // 외부에서 결정 (규칙 §3.1)
}

export interface ApplyVerdictResult {
  ok: true;
  payload: LectureVerdictApplied;   // publish 에 그대로 사용
}

export async function applyVerdict(
  supabase: SupabaseClient,
  input: ApplyVerdictInput,
): Promise<ApplyVerdictResult>;
```

**동작 (4 mutation, 단일 SQL transaction 은 Supabase JS 에서 어려우므로 "best-effort 순차 + idempotent guard" 정책)**:

1. **lecture_sessions update (concurrent guard)**: `update ... set verdict=$1, affection_delta=$2, ended_at=now() where id=$3 and ended_at is null returning id, user_id` — `returning` 이 0 row 면 이미 다른 호출이 종료했다는 뜻이므로 applyVerdict 전체 no-op (idempotent). Architect 지적한 동시 endLecture race 방지.
2. **affection_state upsert**: `(userId, characterId)` PK, `score = score + computedAffectionDelta`, `level = computeLevelFromScore(score)`.
   - 임계값 (초안, §3.2 참조): stranger=0, acquaintance=3, friend=8, close=15, lover=25.
3. **understood_concepts upsert**: `verdict.passed` 각 concept 에 대해 `(userId, characterId, concept)` upsert, `confidence = max(existing, 0.7)`. `partial` 은 `confidence = max(existing, 0.4)`. `missed` 는 **건드리지 않음** (negative update 금지).
4. **conversation_threads reset**: `activeLectureSessionId = null` (ctx.userId, ctx.characterId). 다음 startLecture 가 새 세션 열 수 있게. **Retry**: 실패 시 최대 2회 재시도 (50ms/150ms backoff), 최종 실패 시 `audit_log.error` 기록하고 메인 경로는 성공 반환. 다음 startLecture 가 `active_lecture_session_id` 가 여전히 살아있는 경우 UPSERT 대체 로직으로 stale 덮어쓰기 (요점: affection/understood 는 이미 반영됨이 더 중요).

> **Atomicity 주석 (Architect feedback)**: 4-path 순차 write 는 partial state 가 이론적으로 가능. Day 3 scope 에서는 concurrent guard + retry 로 허용 가능한 수준으로 낮추고, **T1 승격 TODO**: Postgres RPC `apply_lecture_verdict(session_id, verdict_jsonb, delta)` 로 ACID 트랜잭션화. 이 TODO 는 `§7 스코프 밖` 에 명시.

**Return payload**:
```ts
{
  affectionDelta: computedAffectionDelta,
  affectionLevel: newLevel,         // post-mutation
  episodeUnlocked: null,            // Day 3 스코프 외 (events 연결은 T1 버퍼)
  newlyUnderstood: verdict.passed,  // concept_key[] only
  ts: Date.now(),
}
```

### 3.1 affectionDelta 계산 규칙

`packages/shared/src/judge/affection-rules.ts` (신규) 에 순수 함수:

```ts
export function computeAffectionDelta(
  verdict: JudgeVerdict,
  subject: SubjectForJudge,
): number {
  // weight-aware: passed += objective.weight, partial += objective.weight*0.5, missed += 0
  // 결과 정수 반올림. 범위 [0, sum(weights)].
}
```

safe-fail verdict 는 passed/partial/missed 가 모두 빈 배열이므로 delta=0 자동 반환.

### 3.2 affection level 승격 함수

`packages/shared/src/judge/affection-rules.ts` 에 함께:

```ts
export function computeLevelFromScore(score: number): AffectionLevel {
  if (score >= 25) return 'lover';
  if (score >= 15) return 'close';
  if (score >= 8) return 'friend';
  if (score >= 3) return 'acquaintance';
  return 'stranger';
}
```

임계값은 데모 리허설 후 튜닝 가능 (Day 5 buffer).

### Step 4 — endLecture tool 실제 배선

**파일**: `packages/shared/src/tools/catalog/lecture.ts`

**선결 (Architect blocker 해결)**:
`activeLectureSessionId` 가 ctx 에 주입되는 경로 확보. Day 3 T0 구현으로는 `startLecture.execute` 도 Supabase row 를 생성하도록 함께 배선한다.

- `startLecture.execute(args, ctx)`:
  1. 기존 conversation_threads 조회 (`user_id, character_id` UNIQUE).
  2. `lecture_sessions` row insert (`user_id, character_id, subject_id, persona_revision, thread_id, started_at=now()`, `ended_at=null`) → returned id = `sessionId`.
  3. `conversation_threads.active_lecture_session_id = sessionId` update.
  4. `ctxRef.current.activeLectureSessionId = sessionId`, `ctxRef.current.subjectId = subjectId` 를 mutate 할 수 있도록 `ToolContext` 가 agent-side ref 로 유지되는 점 활용 (`apps/agent/src/tool-adapter.ts:22-30` 가 `ctxRef.current` 참조). 즉 tool 이 ctx 필드를 직접 덮어쓰는 게 아니라 agent 어댑터가 startLecture 반환값을 보고 ctxRef 를 갱신.
  5. Return `{ sessionId, subjectId }`.

- `apps/agent/src/tool-adapter.ts` 보강: `def.execute` 결과가 `{ sessionId, subjectId }` 형태일 때 ctxRef.current 를 갱신하는 post-execute hook 을 `startLecture` 전용으로 wire. (모든 tool 범용 hook 은 결합도 올라가므로 이름 기반 분기.)

**Fallback (double-protection)**: endLecture 가 ctx.activeLectureSessionId 가 null 일 때, `supabase.from('lecture_sessions').select('id, subject_id').eq('user_id', ctx.userId).eq('character_id', ctx.characterId).is('ended_at', null).order('started_at', { ascending: false }).limit(1).maybeSingle()` 로 DB 재조회. 여전히 없으면 safe-fail.

**변경**:
1. `execute` 에서 `ctx.supabase`, `ctx.publish`, `ctx.activeLectureSessionId`, `ctx.subjectId` 를 사용.
2. `subjectId` 또는 `activeLectureSessionId` 가 없고 DB fallback 도 실패하면 safe-fail verdict 반환.
3. 순서:
   - `ctx.publish(LECTURE_STATE_TOPIC, { phase: 'judging', subjectId, ts })`
   - `loadSubjectForJudge(supabase, subjectId)` → 없으면 safe-fail.
   - 현재 turn transcript 수집: **Day 3 T0 타협 — `session_memory.summary` + `args.summary` 를 재료로 사용**. 풀 transcript 버퍼는 `turns` 테이블 부재로 불가 (demo-mvp §3 OUT §5 comment). 이는 리스크 §5.3 으로 명시.
   - `runJudge({subject, transcript: summaryOnly, summary: args.summary})`
   - 실패 시 safe-fail verdict 로 degrade 하되 `applyVerdict` 는 여전히 호출 (delta=0 로).
   - `computeAffectionDelta(verdict, subject)` → `computedAffectionDelta`.
   - `applyVerdict(supabase, {...})` → payload.
   - `ctx.publish(LECTURE_VERDICT_APPLIED_TOPIC, payload)`
   - `ctx.publish(LECTURE_STATE_TOPIC, { phase: 'verdicted', subjectId, ts })`
4. Return shape 는 기존과 **호환** 유지 (tool consumer 깨지지 않게):
   ```ts
   { ok: true, verdict: { overallScore, passed, partial, missed, reason }, affectionDelta }
   ```

### Step 5 — audit_log 인스트루먼트

Judge 호출 / 실패 / verdict_applied 를 `audit_log` 에 기록 (demo-mvp §4 Day 3 171):
- `kind='llm.call'`, `name='judge'`, `model`, `tokensIn/Out` (SDK 응답에서 추출 가능하면), `durationMs`, `payload: { ok, reason? }`.
- `kind='tool.call'`, `name='applyVerdict'`, `payload: { affectionDelta, passedCount, missedCount }`.
- 실패 시 `kind='error'`, `level='warn'`, `name='judge_fail'`, `error: reason`.

모두 JWT pass-through supabase 로 insert (`audit_log` RLS: authenticated insert own).

### Step 6 — package.json exports 조정

`packages/shared/package.json` 의 `exports` 에 추가:
```json
"./judge": { "import": "./dist/judge/index.ts", "types": "./dist/judge/index.d.ts" }
```

`packages/shared/src/judge/index.ts` (신규) 에서 `runJudge`, `JudgeVerdictSchema`, `applyVerdict`, `computeAffectionDelta`, `computeLevelFromScore` re-export.

`packages/shared/src/index.ts` 에서는 **re-export 금지** (FE 번들 오염 방지).

---

## 4. Acceptance Criteria (testable)

### A1. 타입 & 빌드
- [ ] `pnpm typecheck` 전체 통과
- [ ] `pnpm --filter @mys/web build` 성공 (shared judge 모듈이 FE 번들에 들어가지 않는지 `pnpm --filter @mys/web build` 빌드 로그에 `@google/generative-ai` 0회 등장으로 확인)
- [ ] `pnpm --filter @mys/agent build` 성공

### A2. Judge 단독 동작 (unit)
- [ ] `runJudge` 가 `JUDGE_GEMINI_API_KEY` 없고 `GEMINI_API_KEY` 도 없을 때 `{ ok:false, reason:'no_api_key' }` 반환
- [ ] 정상 응답 → `JudgeVerdictSchema.safeParse` 성공 → `{ ok:true, verdict }` 반환
- [ ] Malformed JSON → `{ ok:false, reason:'parse_error' }`
- [ ] Timeout (12s 초과, mock) → `{ ok:false, reason:'timeout' }`
- [ ] passed/partial/missed 의 concept_key 중 subject 에 없는 키는 verdict 에서 제거됨

### A3. applyVerdict 동작 (integration, Supabase 실제 DB)
- [ ] passed=[`flt_statement`, `flt_example`] 투입 시 `understood_concepts` 에 해당 concept 2 row 가 upsert (confidence ≥ 0.7)
- [ ] partial=[`flt_applications`] 투입 시 `understood_concepts` row 추가 (confidence ≥ 0.4)
- [ ] missed=[`xxx`] 투입해도 해당 row 는 생성되지 않음 (negative update 금지)
- [ ] `affection_state.score` 가 delta 만큼 증가, `level` 이 임계값에 따라 승격
- [ ] `lecture_sessions.verdict` / `affection_delta` / `ended_at` 기록됨
- [ ] `conversation_threads.active_lecture_session_id` 가 null 로 리셋
- [ ] safe-fail verdict (passed=[], delta=0) → `understood_concepts` 변경 0, `affection_state.score` 불변

### A4. End-to-end (programmatic — Critic 피드백 반영)

**A4.1 Automatable integration test** (CI-runnable):
- [ ] `apps/agent/src/__tests__/endLecture.integration.test.ts` (신규) 작성:
  - `node --test` 기반 또는 `tsx` 스크립트
  - Mock `publish` 함수 (Vitest/Node test 스파이) — topic 과 payload 캡처
  - Mock `runJudge` — `{ ok:true, verdict: fixture }` 반환
  - Real Supabase (로컬 test project 또는 test schema, `TEST_SUPABASE_URL` env)
  - 시나리오:
    1. 테스트 유저로 `startLecture({subjectId:FERMAT})` 호출 → `lecture_sessions` row 생성, `ctxRef.activeLectureSessionId` 세팅
    2. `endLecture({})` 호출
    3. Assert: `publish.calls[0].topic === 'lecture.state'` (phase: 'judging')
    4. Assert: `publish.calls[1].topic === 'lecture.verdict_applied'`, payload shape = `LectureVerdictAppliedSchema.parse`
    5. Assert: DB 쿼리로 `lecture_sessions.ended_at` not null, `verdict` jsonb 채워짐, `affection_state.score` 증가
  - 자동 pass/fail 판정, CI 에서 실행 가능.

**A4.2 Safe-fail 경로 테스트**:
- [ ] 위 같은 테스트 파일에, mock `runJudge` 를 `{ ok:false, reason:'timeout' }` 로 설정한 variant 시나리오
- [ ] Assert: `verdict.reason === 'judge_unavailable'`, `affectionDelta === 0`, `affection_state.score` 변화 없음, `publish` 가 여전히 `lecture.verdict_applied` 호출

**A4.3 Manual smoke (보조, 자동화 어려운 부분만)**:
- [ ] 로컬 1:1 voice 레시피 (프로젝트 README 패턴) 실행 → 콘솔에 `[judge]` + `[applyVerdict]` 로그 등장 → DB §6.2 쿼리 일치.

### A5. 보안 불변식 (demo-mvp §6 240-249 유지)
- [ ] `applyVerdict` 이외 경로로 `affection_state` / `understood_concepts` 를 변경하는 코드 0 개. **Drizzle ORM 패턴도 포함**:
      ```
      grep -rnE "from\('affection_state'\)|from\('understood_concepts'\)|db\.(insert|update|delete)\(\s*(affectionState|understoodConcepts)\s*\)" apps packages
        | grep -vE "apply-verdict|loaders|migrations|\.test\.|\.select\("
      ```
      → 결과 = 빈 라인
- [ ] judge 모듈이 **service_role** supabase 를 요구하지 않음 (JWT pass-through 만). `grep -rn "SUPABASE_SERVICE_ROLE_KEY\|service_role" packages/shared/src/judge apps/agent/src` → 0 hit
- [ ] `SubjectPublic` 타입이 rubric 을 포함하지 않음 (기존 증명 유지)
- [ ] `packages/shared/src/index.ts` 에 `judge/*` re-export 없음 (`grep -n "judge" packages/shared/src/index.ts` → 0 hit)
- [ ] rubric 텍스트가 agent 로그 / audit_log payload 에 leak 되지 않음 (`audit_log.kind='llm.call' name='judge'` 의 payload 에 rubric 문자열 없음 — test 로 검증)

### A6. Fail policy (결정된 정책 반영)

`runJudge` 구체 reason 코드 → `endLecture` 에서 `verdict.reason='judge_unavailable'` 로 통일 (§Reason naming unification).
- [ ] Gemini 호출 timeout → 최종 `verdict.reason === 'judge_unavailable'`, `audit_log.payload.detailReason === 'timeout'`, affectionDelta=0
- [ ] API key 부재 → `verdict.reason === 'judge_unavailable'`, `detailReason === 'no_api_key'`
- [ ] JSON parse 실패 → `verdict.reason === 'judge_unavailable'`, `detailReason === 'parse_error'`
- [ ] API 오류 (4xx/5xx) → `verdict.reason === 'judge_unavailable'`, `detailReason === 'api_error'`
- [ ] 위 4 케이스 모두 `verdict_applied` 메시지 발행 (FE 가 `judging` 상태 영구 고착 안 됨)

---

## 5. 리스크 & 완화

### 5.1 Transcript 부재 (Day 3 T0 타협)
**리스크**: `turns` 테이블이 demo-mvp OUT (§3 128). `session_memory.summary` + endLecture `args.summary` 로만 judge 가 채점 → 판정 정확도 한계.
**완화**: persona prompt 에 "강의 종료 직전에 핵심 요약을 말로 정리해 달라" 를 추가하여 자연스러운 summary 를 유도. Day 5 buffer 로 `apps/agent/src/entrypoint.ts` 에 session 내 turn log 버퍼 메모리 holder 를 추가하는 옵션 문서화 (후속).

### 5.2 Gemini 응답 스키마 미준수
**리스크**: `response_mime_type=application/json` 로도 가끔 마크다운 fence 또는 trailing text.
**완화**: `runJudge` 에서 `String.match(/\{[\s\S]*\}$/)` 로 JSON 후보 추출 후 parse. 실패 시 parse_error → safe-fail.

### 5.3 affection level 승격 임계값이 데모 현장에 안 맞음
**리스크**: 3분 데모에 lecture 1회 뿐이라 delta=3~4 정도가 기대치인데 임계값 과다/과소.
**완화**: 임계값은 `packages/shared/src/judge/affection-rules.ts` 상단 `THRESHOLDS` 상수 객체로 분리 (`{ acquaintance:3, friend:8, close:15, lover:25 }`). 각 경계에 대한 unit test (`computeLevelFromScore(2)==='stranger'`, `computeLevelFromScore(3)==='acquaintance'`, ...) 작성. 튜닝은 상수 값 변경만으로 가능하며 로직 수정 불필요.

### 5.4 `@google/generative-ai` 가 shared 를 FE 에서 import 시 오염
**리스크**: FE (`apps/web`) 가 `@mys/shared` 의 루트 import 로 judge 모듈을 끌어오면 번들에 Gemini SDK 포함.
**완화**: (a) `packages/shared/src/index.ts` 에서 judge re-export 금지, (b) package.json `exports` 에 `./judge` sub-path 전용, (c) A1 acceptance 로 빌드 검증.

### 5.5 audit_log insert 실패가 verdict 흐름 차단
**리스크**: RLS/네트워크 오류로 audit insert 가 throw 하면 endLecture 가 전체 실패.
**완화**: audit insert 는 `Promise.allSettled` 로 격리 + `console.warn` fallback. 메인 verdict 경로와 분리.

### 5.6 동시 endLecture 호출 (race)
**리스크**: 유저가 endLecture 를 2회 빠르게 호출.
**완화**: `applyVerdict` 의 lecture_sessions update 에 `ended_at is null` WHERE 절을 추가하여 idempotent 하게. 이미 ended 된 세션이면 no-op + safe-fail return.

---

## 6. 검증 절차 (Verification Steps)

### 6.1 로컬 재현
```bash
cd /Users/henry/ClaudeWorkplace/stdev2026

# 1. 의존성 추가 (Step 2)
pnpm --filter @mys/shared add @google/generative-ai

# 2. 타입 체크
pnpm typecheck

# 3. Smoke (SDK import 만, 실호출 skip)
cd apps/agent && SILERO_SKIP_LOAD=1 SKIP_JUDGE_CALL=1 pnpm exec tsx src/smoke.ts

# 4. 웹 빌드 (shared judge 누수 없음 증명)
cd ../.. && rm -rf apps/web/.next && pnpm --filter @mys/web build
# → 빌드 로그에서 '@google/generative-ai' 언급 0회 확인

# 5. 1:1 voice 스모크 (실제 Gemini 호출)
# Terminal 1
pnpm --filter @mys/web dev
# Terminal 2
cd apps/agent && pnpm dev
# Browser → http://localhost:3000 → magic link → /characters → 페르마 타일 → /play/fermat → Talk
# startLecture → 30초 설명 → endLecture
# Server 로그에 [judge] 와 [applyVerdict] 각 1회 확인.
```

### 6.1a activeLectureSessionId 주입 경로 검증 (Critic should-fix)

Smoke 테스트에서 happy path 와 safe-fail 을 구분하기 위해 반드시:

```bash
# 방법 A: Agent 프로세스 stderr 를 tail 하며 '[startLecture] sessionId=<uuid>' 와
#         '[endLecture] activeLectureSessionId=<uuid>' 두 줄이 같은 uuid 인지 확인.
# 방법 B (권장, 자동화): A4.1 integration test 가 assertion 으로 검증.
```

→ `[endLecture] activeLectureSessionId=null` 인 경우 smoke pass 로 보이더라도 실제로는 safe-fail 경로로 빠진 것이므로 **happy path 실패로 간주**.

### 6.2 DB 단언
- Supabase Studio / SQL editor 로:
  ```sql
  select user_id, character_id, score, level from affection_state order by updated_at desc limit 1;
  -- delta 만큼 증가, 임계 넘으면 level 승격 확인

  select user_id, concept, confidence, last_reviewed_at from understood_concepts order by last_reviewed_at desc limit 5;
  -- passed concept 가 row 로 존재, confidence ≥ 0.7

  select id, verdict, affection_delta, ended_at from lecture_sessions order by started_at desc limit 1;
  -- verdict jsonb 채워짐, affection_delta 정수, ended_at not null

  select active_lecture_session_id from conversation_threads where user_id = :uid;
  -- null 로 리셋
  ```

### 6.3 격리 증명 (security)
```bash
# rubric 이 student 경로에서 텍스트로 새지 않는지
grep -r "rubric" apps/agent/src apps/web/src | grep -v "loadSubjectForJudge\|apply-verdict\|run-judge\|test"
# → 결과 0줄이어야 함 (judge 전용 이외 경로 없음)

# affection/understood 쓰기가 applyVerdict 외부에 없는지
grep -rn "from('affection_state')\|from('understood_concepts')" apps packages | grep -v "apply-verdict\|loaders\|test\|\.select"
# → 결과 0줄
```

### 6.4 데모 Scene 4 리허설
demo-mvp §10 441-445 시나리오 그대로 3회 수행:
- 3분 안에 verdict_applied 까지 도달
- FE 가 `lecture.verdict_applied` 수신 후 cutscene/emotion 갱신 (FE 팀 확인)
- Safe-fail 유도 (네트워크 끊고 endLecture) → 데모 중단 없이 stranger 레벨 유지 + 토스트 없음 (FE 는 judging→verdicted 전이로만 인지)

---

## 7. 스코프 밖 (명시적 OUT) + T1 승격 TODO

- **PREP 퀴즈 → applyVerdict 통합**: 별도 PR. `quiz_attempts` → affection 반영 룰은 본 플랜에 없음.
- **Per-turn judge**: 세션-엔드 1회 판정만 (demo-mvp §3 131).
- **`turns` 테이블 기반 full transcript 재료**: Day 5 buffer (T1 승격 후보).
- **`events.triggerCondition` 기반 episodeUnlocked**: payload 는 항상 null. cutscene 연결은 T1.
- **Mood state machine / thinking routing**: Sprint 5+.
- **Recall.ai MeetingTransport 재사용 검증**: Day 4 작업. 본 플랜은 core 가 transport-agnostic 하게 작성되었다는 것만 증명 (§2.1).

### T1 승격 필수 TODO (Architect should-fix)

- [ ] `apply_lecture_verdict(...)` Postgres RPC 작성 → 4-path mutation 을 ACID 트랜잭션 안에 감싼다. 현재 JS 순차 write 는 partial state 위험이 이론적으로 존재.
- [ ] Safe-fail circuit breaker: `audit_log` 에서 최근 N분 `kind='error' name='judge_fail'` 카운트가 임계치 초과 시 경고.
- [ ] JWT refresh guard: `applyVerdict` 진입 전 `supabase.auth.getSession()` refresh 호출 (long session 대비).
- [ ] `@google/generative-ai` 를 `packages/shared` 에서 분리해 `packages/judge` 독립 패키지로 이동 고려 (homomorphic core 순수성 강화).

---

## 8. ADR — Architecture Decision Record

**Decision**: Judge LLM 호출 + verdict application 을 `packages/shared/src/judge/` 순수 함수로 구현하고, `ToolContext` 에 `supabase`/`publish` 를 주입해 `endLecture` tool 에서 호출한다. 4-path mutation 은 JS 순차 + idempotent guard + retry 로 처리 (RPC 전환은 T1).

**Drivers**:
1. 데모 Scene 4 (cutscene 트리거 지점) 가 `lecture.verdict_applied` 프로토콜에 hang 되어 있어 Day 3 종료 시까지 end-to-end 배선 필수.
2. MeetingTransport (Day 4) 에서 동일 judge/applyVerdict 를 재사용해야 함 → transport-agnostic 배치 요구.
3. Double-blind rubric 격리는 타입 레벨에서 이미 증명되어 있음 → 이를 훼손하지 않는 배치가 필수.

**Alternatives considered**:
- *Judge 를 apps/agent 로 이동*: 기각. MeetingTransport 에서 재구현 필요 → homomorphic core 원칙 위반.
- *applyVerdict 를 Postgres RPC 로 일원화*: Day 3 scope 내 구현 시간 초과. T1 승격.
- *`@ai-sdk/google` (Vercel AI SDK) 사용*: shared 에 이미 `@ai-sdk/google` 의존성이 있어 번들 추가 부담이 없다는 장점. 다만 `generateObject` 의 structured output 이 `responseSchema` 를 직접 지원하지 않고 zod schema 를 받는 래핑이 필요해 동작 검증 부담이 크다. `@google/generative-ai` 가 직접 `responseSchema` 지원으로 단순. 둘 다 Node-side 의존성이므로 번들 오염 리스크는 동등.
- *endLecture 전체를 apps/agent 로 이동*: 기각. tool 정의가 shared 에 있어야 web (text fallback) 에서도 재사용 가능 (post-demo).

**Why chosen**:
- 시간 압박 속 "정확성 90% + demo-safe 100%" 조합. RPC/트랜잭션은 T1 으로 미루되, idempotent guard 와 retry 로 현실적 race 위험을 제거.
- Homomorphic core 원칙의 실용적 타협: I/O SDK 를 shared 에 두되 sub-path export + FE 번들 단언 으로 경계 보호.

**Consequences**:
- (+) 데모 Scene 4 동작. Day 4 MeetingTransport 0줄 수정 재사용 가능.
- (+) safe-fail 로 데모 중단 없음.
- (-) partial state 가 이론적으로 가능 (T1 에 RPC 로 제거 예정).
- (-) shared 에 Gemini SDK 의존성 추가 — 정적 분석으로만 번들 오염 방지 (A1 빌드 검증).
- (-) `JUDGE_GEMINI_API_KEY` 미분리 시 student 와 key 공유 → 로그 상 rubric 노출 가능성 (A5 로 mitigation 은 불완전).

**Follow-ups**:
- T1: RPC 전환, circuit breaker, JWT refresh guard, judge 패키지 분리 (위 §7).
- Sprint 5+: `turns` 테이블 + full transcript judge 재료, per-turn judge 검토.

---

## 9. Rollback Plan

**PR 단위 revert 로 단일 단계 복원**:
1. `git revert <Sprint4 Day3 merge commit>` → `endLecture` 가 `reason: 'judge_not_yet_implemented'` stub 로 돌아감, `affectionDelta=1` 하드코딩 복귀.
2. DB 마이그레이션 rollback **불필요**: 본 플랜은 스키마 변경 없음 (기존 `lecture_sessions.verdict`, `affection_state`, `understood_concepts` 컬럼 사용). Step 0 에서 추가한 RLS 정책은 더 strict 한 제약이므로 revert 해도 무해.
3. `pnpm install` 로 `@google/generative-ai` 의존성 원복.
4. 이미 mutation 된 DB row (affection_state score 증가분 등) 는 그대로 남음 — 디버그 필요 시 수동 SQL 로 특정 user 만 reset.

**revert 후 데모 상태**: Sprint 4 이전 상태. 강의 종료는 동작하나 verdict 는 mock. 데모 Scene 4 의 cutscene 트리거는 발동 안 됨.

---

---

## 10. 작업 체크리스트 (실행용)

- [ ] **Step 0**: RLS 정책 확인 (5 테이블 `INSERT`/`UPDATE` 정책 존재) — 누락 시 마이그레이션 추가
- [ ] **Step 1**: ToolContext 확장 + entrypoint 주입 (supabase/publish/activeLectureSessionId)
- [ ] **Step 2**: `@google/generative-ai` 설치 + `run-judge.ts` 작성
- [ ] **Step 3**: `apply-verdict.ts` (idempotent guard + retry) + `affection-rules.ts` (THRESHOLDS 상수 + unit test)
- [ ] **Step 4**: `startLecture` DB row 생성 + `endLecture` 실제 배선 + ctxRef 갱신 hook
- [ ] **Step 5**: audit_log insert 3종 (`llm.call`, `tool.call`, `error`) — rubric leak 없음 단언 포함
- [ ] **Step 6**: package.json `exports` 조정, shared index re-export 정리
- [ ] **A1-A6** acceptance 전수 확인 (특히 A4.1 integration test CI pass)
- [ ] **§6.1-§6.4** verification 완주 (§6.1a happy-path 증명 포함)
- [ ] **§6.3** 보안 불변식 단언 (Drizzle ORM 패턴 포함)

완료 후: `/oh-my-claudecode:verify` 로 독립 검증 패스 실행 → 성공 시 Day 4 진입.

---

## Changelog (consensus review 반영)

**2026-04-18 revision 1** — Architect + Critic 피드백 머지:

- [Architect/Blocker] Step 4 에 `startLecture` DB row 생성 로직 + `endLecture` DB fallback 추가. `activeLectureSessionId` 주입 경로 확보.
- [Architect/Should-fix] Step 0 (RLS 선결 확인) 추가. `apply-verdict.ts` 1번 mutation 에 `ended_at is null` + `RETURNING` 기반 concurrent guard 추가. conversation_threads reset 에 2회 retry 명시. T1 RPC TODO 를 §7 에 추가.
- [Critic/MAJOR] A4 를 `A4.1 integration test (automatable)` + `A4.2 safe-fail variant` + `A4.3 manual smoke (보조)` 로 분해하여 CI-runnable 로 전환.
- [Critic/MAJOR] §6.1a activeLectureSessionId 주입 경로 검증 단계 추가.
- [Critic/MAJOR] §5.3 완화책을 "constants + unit test" 로 재기술, "10분 내 튜닝" hand-waving 제거.
- [Critic/MINOR] A5 grep 을 Drizzle ORM 패턴 (`db.update(affectionState)` 등) 포함하도록 확장.
- [Critic/MINOR] A6 reason 통일 규칙 명시 (`runJudge` detail code → `endLecture` safe-fail handler → `verdict.reason='judge_unavailable'`). `audit_log.payload.detailReason` 으로 구체 코드 보존.
- [Critic/Missing] §8 ADR 섹션 추가 (Decision / Drivers / Alternatives / Why chosen / Consequences / Follow-ups).
- [Critic/Missing] §9 Rollback plan 추가 (PR revert 단일 단계 + DB 마이그레이션 불필요 명시).

**Verdict status**: Architect Conditional Go (blocker 해소 후) + Critic REVISE → **양쪽 이슈 모두 머지됨 → 실행 가능**.
