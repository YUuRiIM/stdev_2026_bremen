# 미연시 LiveKit STS 에이전트 — 실행 계획

**작성일**: 2026-04-18
**참고 템플릿**: `~/ClaudeWorkplace/me` (Digital Twin 모노레포)
**데드라인 가정**: 해커톤 3~5일 데모 (조정 가능)
**동반 문서**: `miyeonshi-agent-crafting-2026-04-18.md` — 에이전트 내부 설계 심화 (온톨로지 / 메모리 계층 / 컨텍스트 조립 / thinking-mood-reflection 루프). 본 plan의 Section 5~7을 그 문서에서 확장한다.

---

## 0. Architecture Principle — Homomorphic Core + Adapters

**모든 설계 결정의 뿌리.** 이후 나오는 모든 구조는 이 원칙의 귀결이다.

### 원칙
1. **Core는 순수함수**. in/out 명확, side effect 격리, transport·provider·UI 무지.
2. **세상은 어댑터 너머에 있다**. LiveKit room, Google Meet, 전화, REST, CLI, Next.js route, LLM provider, DB — 전부 **경계에만** 존재.
3. **도메인 타입만 공유**. `ToolContext`, `MemorySnapshot`, `Verdict`, `SharedToolDef<T>` 등은 core와 adapter 양쪽이 동일하게 참조하는 중립 언어.
4. **새 채널·provider 추가는 extension**, core 수정 아님.

### 핵심 pure 함수 후보
`composeFullContext` · `routeThinking` · `buildAffectionBlock` · `buildWorkingWindow` · `judgeLecture` · `applyVerdict` · `computeAffectionDelta` · `computeTermCoverage` · `reflect` · `upsertFact` / `insertRelation` (쓰기 쿼리도 DB 클라이언트는 주입받아서 순수 wrapper)

### Adapter 경계 목록
- **Transport**: `LiveKitTransport`(현재) / `MeetingTransport`(Recall.ai, future §2.D) / `PhoneTransport`(SIP, future)
- **Tool catalog**: `AISdkToolAdapter` (inputSchema) / `LiveKitToolAdapter` (parameters + ctx)
- **LLM provider**: Student용 `createGoogleGenerativeAI({apiKey})` / Judge용 **별도 인스턴스** (§2.B.4)
- **STT provider**: `makeSTT()` (§2.A) — 환경변수로 Deepgram/Scribe/OpenAI/Cohere 교체
- **TTS provider**: `@livekit/agents-plugin-elevenlabs` · model ID 환경변수 교체
- **DB auth**: `SupabaseSsrClient`(web) / `SupabaseJwtPassthroughClient`(agent) / `SupabaseServiceRoleClient`(admin) — §7.5
- **Chalkboard**: LiveKit data channel / REST `/api/chalkboard/*` / (future) FE 팀 구현 에디터

### 이 원칙이 가져오는 속성
- **채널 symmetry**: voice/text/chalkboard/meeting이 `turns`로 수렴, judge/memory 불변 (§2.C)
- **Double-blind 격리가 타입·스코프로 보장**: `objective.rubric`을 core에 안 넘기면 누출 경로 구조적 차단 (§2.B.4)
- **Provider swap이 한 줄 교체**: STT·LLM·TTS·transport 모두 (§2.A, §2.B.4.6)
- **Unit test가 가벼움**: core 함수는 transport·DB·LiveKit mock 없이 검증
- **Replay/디버그**: audit trace_id로 core 함수 재호출 → 동일 결과 재현 (§7.6)
- **도메인 확장 = extension**: reverse tutoring(§2.B)이 base 미연시에 **더 얹힐 뿐** core 수정 없음
- **Cross-runtime**: 같은 `packages/shared`를 CLI / Next.js / LiveKit worker / (future) React Native에 재사용

### PR 판단 기준 (체크리스트)
- [ ] 이 변경이 **core pure function**인가, **adapter**인가? 경계 분명한가?
- [ ] core가 transport/provider/UI 특정 문자열·import를 포함하진 않는가?
- [ ] `objective.rubric`같은 보안-민감 필드가 adapter를 넘어 core 결과에 섞이진 않는가?
- [ ] 새 채널 추가라면 `SharedToolDef`·`composeFullContext`·`turns` 스키마와 양립하는가?
- [ ] 테스트가 core만 호출하는 unit test + adapter를 포함한 integration test로 갈라지는가?

---

## 1. Requirements Summary

한국어 미연시(비주얼 노벨/데이팅 심) 스타일 웹 게임. 유저가 도메인 접속 → 캐릭터 선택 → LiveKit 지속 통화형 음성 대화. 캐릭터는 호감도·기억 상태에 따라 대사/음성 응답이 변화. Vercel AI SDK의 tool/prompt 정의를 LiveKit agent가 그대로 재사용하는 **homomorphic 구조**가 핵심 설계 제약.

### 확정 결정사항

| 영역 | 결정 |
|---|---|
| 디자인 패턴 | Agent-as-Function (Pipeable) — `SharedTool<T>` 스펙을 AI SDK와 LiveKit 양쪽 어댑터가 흡수 |
| 인터랙션 모델 | 지속 통화형 (Always-on LiveKit 세션, interruption/barge-in 활용) |
| 모바일 | 순수 웹 (도메인 접속, 앱 래퍼 없음) |
| 캐릭터 스케일 | 2~4명 라인업, 스토리 구현은 1명만(`is_demo_ready=true`), 나머지는 선택창에 disabled로 노출 (확장 가능 DB 기반) |
| 기억/호감도 | 구조화된 호감도 + 롤링 요약 memory. **호감도 level = me의 role elevation 패턴 재사용** |
| 언어 | 한국어 단일 |
| 인증 | Supabase 매직링크 (passkey/github 제거). 유저별 데이터는 RLS로 격리 |
| Agent 런타임 | LiveKit Cloud Agents (GA, $0.01/session·min, Docker, `lk agent deploy`) |
| 비주얼 에셋 | 영상/표정 컷/스페셜 컷씬을 `character_assets` 테이블 + Supabase Storage로 추상화. LLM이 `playCutscene`/`setEmotion` tool 호출 |

### 기각된 대안과 이유

- **Gemini Live API (end-to-end STS)**: (a) `agents-js` 플러그인에 `gemini-3.1-flash-live-preview` 호환성 버그 이력(PR #1229 머지, stable 반영 확인 필요), (b) ElevenLabs 클론 음성을 native audio 출력으로 대체 불가 — 캐릭터 고유 목소리 요구와 충돌, (c) mid-session `update_instructions/chat_ctx` 제약 → 호감도 승격 시 프롬프트 리로드 어려움, (d) 오디오 세션 15분 하드 제한.
- **Gemini를 STT로 분리 사용**: `@livekit/agents-plugin-google` Node 버전은 LLM+TTS 전용으로 **STT 클래스 없음**. Google Cloud STT 플러그인은 Python만. Gemini multimodal audio 이해는 batch 방식으로 streaming 아님. → Node 스택에서 Gemini STT는 구조적으로 불가. **향후 재평가 조건**: Live API가 (i) cloned voice 출력 지원 (ii) 세션 제한 완화 (iii) mid-session context update 허용되면 전면 STS로 스위치 검토.
- **ElevenLabs Scribe STT / AssemblyAI / Whisper**: LiveKit Node.js 공식 플러그인 없거나 한국어 실시간 streaming 품질 미검증.
- **순수 PWA만**: 수익화 전환 옵션 필요해지면 Capacitor 래퍼 덧씌움(후순위).

---

## 2. Voice Pipeline — 최종 스택 (2026-04 docs 검증)

| 컴포넌트 | 패키지 / 모델 | 환경변수 | 근거 URL |
|---|---|---|---|
| STT | `@livekit/agents-plugin-deepgram ^1.2.7` · `nova-3` · `language: 'ko'` (미래 스위치 옵션 §2.A) | `DEEPGRAM_API_KEY` | https://docs.livekit.io/agents/models/stt/inference/deepgram/ |
| LLM (voice) | `@livekit/agents-plugin-google ^1.2.7` · `gemini-3-flash-preview` (fallback: `gemini-2.5-flash`) | `GOOGLE_API_KEY` | https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview · https://docs.livekit.io/agents/integrations/llm/gemini/ |
| TTS | `@livekit/agents-plugin-elevenlabs ^1.2.7` · `eleven_flash_v2_5` (≈75ms latency) | `ELEVENLABS_API_KEY` | https://elevenlabs.io/docs/overview/models |
| VAD | `@livekit/agents-plugin-silero ^1.2.7` | — | — |
| Agents SDK | `@livekit/agents ^1.2.7` | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | https://docs.livekit.io/reference/agents-js/ |
| 호스팅 | LiveKit Cloud Agents (paid plan = always warm) | 위와 동일 | https://docs.livekit.io/deploy/agents/ |

**주의**: ElevenLabs Voice Cloning — Instant Voice Cloning은 한국어 OK, Professional Voice Cloning은 사전 한국어 지원 확인 필수 (https://help.elevenlabs.io/hc/en-us/articles/19569659818129).

### 2.A STT 후보 스캔 (2026-04) — Deepgram 유지 근거 + 향후 스위치 조건

2026년 4월 기준 "한국어 + LiveKit Node + 검증 품질" 교집합을 만족하는 후보:

| 후보 | 한국어 공식 명시 | LiveKit Node 경로 | Blocker |
|---|---|---|---|
| **Deepgram nova-3** ✅ 채택 | ✅ `language:'ko'` | Node 공식 plugin | — |
| OpenAI `gpt-4o-transcribe` | 다국어 내장 | Node 공식 plugin | 한국어 WER 벤치 비공개, Deepgram 대비 latency 불리 |
| ElevenLabs Scribe v2 Realtime | ⚠️ 공식 언어 리스트에 한국어 명시 부재 | LiveKit Inference (`"elevenlabs/scribe_v2_realtime:..."`) | GitHub Issue #4255 transcription 미수신 버그 open |
| Soniox | "multiple languages" | Python plugin 있음, Node 포트 상태 재확인 필요 | 한국어 벤치 부재 |
| Speechmatics | 한국어 포함 | Python 우선 | Node 지원 상태 재확인 필요 |
| CohereLabs `cohere-transcribe-03-2026` | Open ASR Leaderboard #1, 14 언어 한국어 포함 | **LiveKit 플러그인 없음** | custom `STT` abstract 구현 필요 — 해커톤 스코프 외 |
| NVIDIA Parakeet RNNT | 영어 SOTA | LiveKit 플러그인 없음 | 한국어 미지원 |
| AssemblyAI Universal-3-Pro | 6 core 언어 (EN/ES/PT/FR/DE/IT) | plugin 있음 | 한국어 core 아님, Universal fallback만 |

### LiveKit Inference 경로 (미래 활용)

LiveKit Cloud는 plugin을 직접 묶지 않고 **문자열 디스크립터로 provider를 연결하는 Inference 레이어**를 제공. 향후 스위치 시 1줄 교체로 provider 변경 가능:

```ts
// 현재
import * as deepgram from '@livekit/agents-plugin-deepgram'
const stt = new deepgram.STT({ model: 'nova-3', language: 'ko' })

// 스위치 경로 (inference module)
import { inference } from '@livekit/agents'
const stt = new inference.STT('elevenlabs/scribe_v2_realtime:ko')
// 또는 'openai/gpt-4o-transcribe', 'soniox/...', 'cartesia/...'
```

### 스위치 트리거 조건

다음 중 하나라도 충족되면 Deepgram에서 이동 재평가:
1. **ElevenLabs Scribe v2 Realtime**: GitHub Issue #4255 closed + 공식 언어 리스트에 한국어 명시 + 한국어 sample 스모크 통과 → 단일 벤더(ElevenLabs) 스택 단순화 이득
2. **Cohere transcribe-03-2026**: LiveKit 공식 플러그인 추가 → Leaderboard #1 성능 확보
3. **Soniox/Speechmatics**: Node agents-js plugin publish + 한국어 WER 공개 벤치
4. **Gemini Live**: (i) cloned voice 출력 (ii) 세션 제한 완화 (iii) mid-session context update — 이 경우 전면 STS로 전환

### 추상화 포인트

`apps/agent/src/entrypoint.ts`에서 STT 초기화를 **한 함수**로 분리해 스위치 비용 최소화:

```ts
// packages/shared/src/config/stt.ts
export function makeSTT() {
  const provider = process.env.STT_PROVIDER ?? 'deepgram';
  switch (provider) {
    case 'deepgram':        return new deepgram.STT({ model: 'nova-3', language: 'ko' });
    case 'elevenlabs-v2rt': return new inference.STT('elevenlabs/scribe_v2_realtime:ko');
    case 'openai-4o':       return new inference.STT('openai/gpt-4o-transcribe');
    default: throw new Error(`unknown STT_PROVIDER: ${provider}`);
  }
}
```

환경변수 한 줄 교체로 교체 가능. 수락 기준: provider 교체 시 entrypoint 코드 변경 금지.

---

## 2.B 게임플레이 — Reverse Tutoring 미연시 (교수×대학원생)

### 2.B.1 게임 루프

```
유저(교수) → 주제 선택 → [Lecture 세션 시작]
   → 캐릭터(미연시 대학원 신입생)에게 강의
   → 캐릭터는 학생처럼 반응: 이해 / 혼란 / 질문 / 심화 요청
   → LLM-as-judge가 매 턴 또는 세션 종료 시 objectives 달성도 평가
   → 결과에 따라 affection 변화 + understood_concepts 누적 + episode unlock
```

이 loop는 기존 호감도 승격 패턴과 **동형(homomorphic)**: 판정 side-channel → state 변화 → system prompt 재합성.

### 2.B.2 추가 DB 스키마 (schema.ts에 병합)

```ts
// 강의 주제 (공용 컨텐츠)
export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').references(() => characters.id), // null = 공용
  topic: text('topic').notNull(),                   // "라플라스 변환"
  objectives: jsonb('objectives').notNull(),        // [{ id, statement, weight }]
  prerequisites: uuid('prerequisites').array(),
  keyterms: text('keyterms').array().default([]),   // STT boosting 용
  difficulty: integer('difficulty').default(1),
  sortOrder: integer('sort_order').default(0),
});

// 강의 세션 (유저별)
export const lectureSessions = pgTable('lecture_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  characterId: uuid('character_id').references(() => characters.id).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id).notNull(),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
  verdict: jsonb('verdict'),                 // { perObjective: {...}, overallScore, comments }
  affectionDelta: integer('affection_delta'),
  episodeTriggered: text('episode_triggered'),
});

// 캐릭터가 학습한 개념 (semantic memory, 캐릭터×유저 기준)
export const understoodConcepts = pgTable('understood_concepts', {
  userId: uuid('user_id').references(() => users.id).notNull(),
  characterId: uuid('character_id').references(() => characters.id).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id),
  concept: text('concept').notNull(),
  confidence: real('confidence').default(0.5),
  lastReviewedAt: timestamp('last_reviewed_at').defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.characterId, t.concept] }) }));
```

RLS: lecture_sessions / understood_concepts는 `(select auth.uid()) = user_id`. subjects는 public read.

### 2.B.3 Tool Catalog — 강의 전용

| Tool | 호출 주체 | 동작 |
|---|---|---|
| `listSubjects()` | 서버/UI | 사용 가능한 주제 목록 (캐릭터 difficulty 범위) |
| `startLecture({ subjectId })` | 서버/UI | `lecture_sessions` 로우 생성, session prompt에 objectives + keyterms 주입. STT keyterm 동적 재설정 |
| `judgeExplanation({ objectiveId, userStatement })` | LLM (캐릭터) | **LLM-as-judge** 경량 호출 — "이 발언이 objective를 충족하나? 0-1 점수 + 근거". per-turn or on-demand |
| `askClarifying({ concept, confusion })` | LLM | 캐릭터가 학생답게 질문 던짐. prompt engineering 대상 |
| `recordUnderstood({ concept, confidence })` | LLM | `understood_concepts` upsert. 이후 prompt에 "이건 이미 이해함" 블록 삽입 |
| `endLecture({ summary })` | LLM/서버 | verdict aggregate, affection delta 계산, episode unlock 판정 |
| `showFormula({ latex, speakAs })` | LLM | UI: KaTeX 렌더, TTS: `speakAs`만 낭독 |
| `suggestTypeInput({ reason })` | LLM | STT가 수식/복잡 용어에서 실패 의심 시 "타이핑해 달라" UI hint |

이 tool들도 **같은 `SharedToolDef`**에 정의해서 AI SDK와 LiveKit agent에서 공유(Section 6).

### 2.B.4 Judge 아키텍처 — Double-Blind 2-LLM 구조

**`me/packages/shared/src/matching/judge.ts`의 5가지 보안 계약 상속·확장**:

1. **Rubric 격리**: `objective.rubric` 필드는 **student agent**의 그 어떤 prompt/tool/context 에도 포함되지 않는다. `composeSystemPrompt`가 subject 블록을 렌더할 때 `objectives`에서 `statement`만 뽑고 `rubric`은 strip.
2. **근거 비노출**: judge LLM이 반환한 `hit_points` / `missing` / `feedback` raw는 student agent prompt에 주입되지 않는다. Agent는 **state mutation(understood_concepts 변동)**으로만 간접 인지.
3. **Short-circuit**: judge 전에 **term-coverage 경량 체크** (objective.expected_terms와 transcript 매칭) → 명백히 touch 안 된 objective는 LLM 호출 생략.
4. **격리된 provider instance**: student agent용 `createGoogleGenerativeAI()`와 judge용 `createGoogleGenerativeAI()`를 **별도 인스턴스**로 생성. `JUDGE_GEMINI_API_KEY` 분리 환경변수 허용 → 감사·비용 추적 용이.
5. **Tool 직접 호출 금지**: student agent tool catalog에 `judgeExplanation`을 **노출하지 않는다**. 학생이 자기 답을 judge에 "부치는" 건 roleplay 깨고 누출 경로. **Orchestrator가 trigger** (§2.B.4.3).

### 2.B.4.1 Objective / Rubric 데이터 구조

```jsonb
{
  "id": "obj_laplace_def",
  "statement": "라플라스 변환의 정의와 수렴 조건을 설명한다",   // student에 노출 OK
  "concept_key": "laplace_definition",                     // understood_concepts 연결 키
  "weight": 2,
  "expected_terms": ["라플라스", "적분", "수렴", "ROC", "s-domain"], // short-circuit용
  "rubric": {                                              // judge 전용
    "must_hit": [
      "적분 정의 ∫₀^∞ e^(-st)f(t)dt 언급",
      "s가 복소수라는 점",
      "수렴 영역(ROC) 개념"
    ],
    "common_misconceptions": [
      "s를 실수로만 취급 → 감점",
      "초기조건 0 가정 누락 → 감점"
    ],
    "partial_credit": true
  }
}
```

### 2.B.4.2 Judge LLM 함수 (격리)

```ts
// packages/shared/src/judge/lecture-judge.ts
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// 독립 provider 인스턴스 — student용과 절대 공유 금지
const judgeGoogle = createGoogleGenerativeAI({
  apiKey: process.env.JUDGE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY,
});

export async function judgeLecture(input: {
  subject: Subject;
  transcript: Turn[];       // voice + chalkboard 혼합 text (§2.B.ch 프로토콜 산출물)
}): Promise<LectureVerdict> {
  // 1) Short-circuit
  const coverage = computeTermCoverage(input.transcript, input.subject.objectives);
  const touched = input.subject.objectives.filter(o => coverage[o.id] >= 0.2);
  if (touched.length === 0) {
    return emptyVerdict(input.subject); // agent는 아무 것도 학습 못함
  }

  // 2) LLM judge — strict JSON, thinking medium
  const { text } = await generateText({
    model: judgeGoogle(process.env.JUDGE_MODEL ?? 'gemini-3-flash-preview'),
    providerOptions: { google: { thinkingConfig: { thinkingLevel: 'medium' } } },
    system: JUDGE_SYSTEM_PROMPT,
    prompt: buildJudgePrompt(input.subject, touched, input.transcript),
    maxOutputTokens: 1500,
  });
  return VerdictSchema.parse(JSON.parse(text));  // zod
}

const JUDGE_SYSTEM_PROMPT = `You are a STRICT academic judge evaluating a professor's explanation against learning objectives.

CRITICAL RULES:
- Evaluate ONLY what is present in the transcript.
- Apply must_hit checklist rigorously; partial credit per partial_credit flag.
- Flag common_misconceptions when applicable.
- Output STRICT JSON matching the provided schema. No prose.
- NEVER include rubric text verbatim in the output — use generic concept labels only.`;
```

### 2.B.4.3 Judge Trigger — Orchestrator 소유

Student agent에 노출되는 **학생 내면 표현 tool**만 (판정 아님):

| Tool (agent 노출) | 의미 |
|---|---|
| `flagConfusion({ topic })` | "이 부분 이해 안 됐어요" — UI/상태 기록 |
| `expressUnderstanding({ topic, confidence })` | "이해한 것 같아요" — 주관적 자기보고 |
| `requestClarification({ topic })` | "다시 설명해주세요" |
| `noteOnChalkboard({ content })` | (선택) 학생이 칠판에 자기 메모 추가 — 교수에게 보이는 UI 변경만 |

**Judge는 오케스트레이터가 3가지 조건 중 하나에서 trigger**:
- (a) **Per-turn light**: term-coverage만 갱신 (LLM 호출 없음)
- (b) **Threshold heavy**: 특정 objective의 coverage ≥ 0.6 도달 시 해당 objective만 judge
- (c) **Session-end full**: `endLecture` 시 모든 objective 종합 judge

MVP는 **(a) + (c)**만. (b)는 T1.

### 2.B.4.4 Verdict → State Mutation Gateway

Judge 결과는 raw 어떤 LLM에도 주입 금지. `applyVerdict()`가 4가지 mutation만 수행:

```ts
async function applyVerdict(verdict: LectureVerdict, ctx: LectureContext) {
  // 1) understood_concepts upsert (concept_key별)
  for (const passed of verdict.passed) {
    await upsertUnderstood({
      userId: ctx.userId, characterId: ctx.characterId,
      subjectId: ctx.subjectId, concept: passed.concept_key,
      confidence: passed.score,
    });
  }
  // 2) affection delta — 가중 평균 (직접 bump, side-channel 아님)
  const delta = computeAffectionDelta(verdict);
  await writeAffectionDelta(ctx, delta, 'lecture_verdict');
  // 3) episode unlock
  if (verdict.overallScore >= 0.8 && ctx.subject.episodeKey) {
    await unlockEpisode(ctx.userId, ctx.characterId, ctx.subject.episodeKey);
  }
  // 4) verdict persist (감사·디버그 전용, prompt엔 안 감)
  await persistVerdict(ctx.sessionId, verdict);
}
```

### 2.B.4.5 Student Agent가 "배웠다"는 걸 인지하는 방식

다음 턴 prompt의 `LEARNING_STATE` 블록은 **서술형 사실 리스트**만 (점수·rubric 언급 없음):

```
## 당신(학생)의 현재 이해 상태
- 편미분의 정의: 확실히 이해함
- 체인 룰 적용: 이해하기 시작 (아직 손에 안 익음)
- 라플라스 변환: 아직 배우지 않음
```

→ 진짜 학생이 자기 내면에서 느끼는 것처럼. verdict 0.72나 "rubric X 충족" 같은 메타 언어 절대 노출 금지. 이게 **roleplay 몰입의 핵심 단절점**.

### 2.B.4.6 Verdict 스키마 (zod)

```ts
const VerdictSchema = z.object({
  overallScore: z.number().min(0).max(1),
  passed: z.array(z.object({
    objectiveId: z.string(), concept_key: z.string(), score: z.number().min(0).max(1),
  })),
  partial: z.array(z.object({
    objectiveId: z.string(), concept_key: z.string(), score: z.number().min(0).max(1),
  })),
  missed: z.array(z.string()),                  // objectiveId만
  flaggedMisconceptions: z.array(z.string()),    // 공개 메시지 없이 flag만
});
```

### 2.B.4.7 실패 모드

- Judge JSON schema 위반 → fallback verdict `{ overallScore: null, passed: [], ... reason: 'judge_error' }`. Affection delta 0. 에피소드 unlock 없음. `audit.kind='judge.error'`.
- 네트워크 실패 → local queue 보존, 재시도. 세션 종료 시점이면 "잠시 후 결과 전달" UI 안내 (data channel `lecture.judge_pending`).

### 2.B.4.8 데이터/코드 격리 체크리스트

- [ ] `objective.rubric` 필드를 serialize할 때 **student에게 가는 모든 경로**에서 strip (compose.ts, tool schema, audit payload redact)
- [ ] `JUDGE_GEMINI_API_KEY`를 별도 env로 분리 (선택이지만 권장)
- [ ] Judge 모듈은 `packages/shared/src/judge/` 아래에 격리, student agent 코드에서 import 금지 (린트 규칙)
- [ ] Verdict 구조에서 prompt-echo 여지 있는 필드 제거 (`feedback` 같은 자연어 설명 필드는 저장만, prompt엔 안 감)
- [ ] `applyVerdict` 만이 상태 변경 진입점. 개별 테스트 케이스로 invariants 검증

---

## 2.B.ch Chalkboard — 데이터 채널 계약 (프론트 독립)

> 프론트는 별도 팀이 구현하므로 이 섹션은 **라이브러리 강제 없이 React 웹 환경에 붙는 데이터 채널 프로토콜·Tool·schema**만 정의. 렌더 컴포넌트는 FE 팀 선택.

### 2.B.ch.1 데이터 채널 메시지

LiveKit data channel의 `publishData` + `topic` 기반. 모든 payload는 JSON.

**클라 → agent (교수가 칠판 씀)**:
```ts
publish('chalkboard.update', {
  revision: number,       // monotonic counter
  markdown: string,       // $$...$$ 블록 포함 markdown (또는 plain text + latex)
  latexBlocks?: Array<{ position: number; src: string }>, // 선택: 블록 위치 메타
  ts: number
})

publish('chalkboard.clear', { revision, ts })
```

**Agent → 클라 (학생이 특정 부분 질문)**:
```ts
publish('agent.chalkboard_question', {
  targetRevision: number,       // 기준 리비전
  highlight?: [start, end],     // 텍스트 오프셋
  question: string,             // TTS로도 나가지만 UI hint 병행
  ts: number
})
```

**Agent → 클라 (강의 상태 변경)**:
```ts
publish('lecture.state', {
  phase: 'idle'|'lecturing'|'judging'|'verdicted',
  subjectId: string|null,
  objectivesStatus?: Array<{ id: string; coverage: number }>, // rubric 빠진 요약만
  ts: number
})

publish('lecture.judge_pending', { reason: 'retry'|'timeout', ts })
publish('lecture.verdict_applied', {
  affectionDelta: number,
  episodeUnlocked?: string,
  newlyUnderstood?: string[],   // concept_key 배열 (statement 아님)
  ts: number
})
```

### 2.B.ch.2 Agent 측 칠판 인식

`apps/agent/src/entrypoint.ts`의 `ctx.room.on('dataReceived', ...)` 핸들러:
1. `chalkboard.update` 수신 → `ctx.userData.chalkboard = { revision, markdown, ts }`
2. 시스템 prompt 조립 시 `## 현재 칠판 상태 (rev {revision})\n{markdown}` 블록을 **working window와 병렬**로 주입
3. 이 상태를 transcript에도 합쳐 judge에 넘김 — voice transcript + chalkboard 최종 상태가 evidence

### 2.B.ch.3 Tool Contract (FE와 공유되는 RPC)

Server-side tool이 FE에 선언적으로 UI 요청하는 패턴:

| Tool | 효과 (data channel로 FE에 전달) |
|---|---|
| `showFormula({ latex, speakAs })` | FE가 formula를 notification pane에 렌더. TTS는 speakAs만 읽음 |
| `suggestTypeInput({ reason, fieldKind: 'formula'|'text' })` | FE가 모달/팝업 input을 보여줌. 응답은 `chalkboard.update` 또는 `user_text` topic으로 복귀 |
| `highlightChalkboard({ range, note })` | FE가 칠판의 특정 범위 하이라이트 + 주석 |
| `clearChalkboard()` | FE가 칠판을 초기화 |

모두 **계약은 서버가 소유**, 렌더 방식은 FE 자유. 명세는 `packages/shared/src/protocol/chalkboard.ts`에 zod 스키마로 정의하고 FE에 공유 (런타임 검증 포함).

### 2.B.ch.4 FE 라이브러리 — 참고 권장 (강제 아님)

FE 팀이 참고할 수 있는 선택지 (우리 쪽에서 의존성 안 박음):
- **Tiptap + `@tiptap/extension-mathematics`** (공식) — 한글 + LaTeX 자유 혼재, 권장
- **MathLive** `<math-field>` — 단일 수식 입력 위젯(`suggestTypeInput` UX)
- **KaTeX** — 단순 렌더
- 우리가 넣는 npm 의존은: **없음** (packages/shared는 zod 스키마만 export). FE 팀이 고른 라이브러리와 무관하게 프로토콜만 맞추면 붙음.

### 2.B.ch.5 Agent가 "의존성 없이" 동작하는 원칙

- Agent는 칠판의 markdown **문자열만** 소비. KaTeX 렌더 불필요.
- 수식을 TTS로 말해야 할 때는 `showFormula.speakAs`를 LLM이 채우거나, LLM 출력 텍스트에 `[SPEAK]/[SHOW]` 태그를 쓰게 prompt 지시. post-processor가 분리.
- KaTeX 패키지를 agent/shared에 포함할 필요 없음 (FE 전용).

### 2.B.ch.6 MVP Scope

- Agent 측: data channel `chalkboard.update` 수신 + system prompt block 조립 + transcript merge
- Shared 측: zod 스키마 정의 (FE 팀과 공유 계약)
- FE 팀: 어떤 에디터를 쓰든 위 프로토콜만 구현하면 됨
- 통합 테스트: FE가 "편미분 정의" 타이핑 → agent가 "칠판에 쓰신 편미분은..." 식으로 자연스럽게 언급되는지 smoke

### 2.B.5 STT 주제별 동적 Keyterm

```ts
// startLecture tool 내부
async function startLecture(args, ctx) {
  const subject = await loadSubject(args.subjectId);

  // 주제의 keyterms가 비어있거나 적으면 LLM으로 보강 (캐시)
  const keyterms = subject.keyterms.length >= 30
    ? subject.keyterms
    : await enrichKeyterms(subject.topic);  // Gemini 호출로 50~100개 생성 후 DB 저장

  // STT 세션 재설정 — LiveKit agent 런타임에서 STT 노드 교체
  await ctx.session.swapSTT(new deepgram.STT({
    model: 'nova-3', language: 'ko', keyterm: keyterms.slice(0, 100)
  }));

  // session prompt에 목표 블록 주입
  ctx.session.chatCtx.addMessage({
    role: 'system',
    content: renderLectureContext(subject, ctx.understoodSoFar),
  });

  return { subjectId: args.subjectId, objectives: subject.objectives, keytermCount: keyterms.length };
}
```

### 2.B.6 Persona Overlay — 이해 수준별

호감도 overlay와 별도로 **캐릭터의 학문적 이해 상태** overlay를 prompt에 합침:
- `understood_concepts`에서 이미 학습한 개념을 요약해서 주입 ("너는 이미 편미분과 경사하강법 개념을 이해했다")
- 아직 못 배운 prerequisite 있으면 "그건 아직 이해 못했어" 태도
- 심화 주제로 갈수록 "깊이 있는 질문" 성향 증가

이건 `crafting doc §4.2`의 block 구성에 `LEARNING_STATE` 블록을 추가하는 형태로 자연스럽게 편입.

### 2.B.7 UI — 강의 모드

`play/[characterId]/page.tsx`를 두 모드로:
- **대화 모드** (기본 미연시): voice panel + 캐릭터 sprite
- **강의 모드** (startLecture 이후): 위 영역에 **화이트보드 컴포넌트** (KaTeX 수식·`showFormula` 출력 히스토리 + `suggestTypeInput` 시 표시되는 키보드 input 패널)

### 2.B.8 Reflection 확장

세션 종료 reflection 프롬프트에 domain-specific 필드 추가:
```json
{
  "facts": [...],
  "relations": [...],
  "episode": {...},
  "affection_delta": -10 to +10,
  "mood_shift": "...",
  "understood_concepts": [{ "concept": "편미분", "confidence": 0.8 }],
  "lecture_verdict": { "perObjective": {...}, "overallScore": 0.72, "missed": [...] }
}
```

### 2.B.9 메모리 계층과의 상호작용

| 메모리 tier | 강의 맥락에서의 역할 |
|---|---|
| Working | 현 강의 세션 턴들 |
| Episodic (`memory_chunks`) | "지난주 가우시안 유도 설명해준 순간" 같은 narrative |
| Semantic (`facts`) | 유저가 교수라는 사실, 유저의 전공, 선호 설명 스타일 |
| Semantic (`understood_concepts`) | **캐릭터가 배운 것** — 학습 트리 구성 |
| Ontology (`relations`) | `(user)-[taught]->(concept)`, `(concept)-[prerequisite_of]->(concept)` |
| Procedural | base_persona + 이해 수준별 overlay |

### 2.B.10 수락 기준 (Phase 4 수준 연장)

- 유저가 임의 주제로 5분 강의 → judge가 objectives 중 충족/미충족 분리 출력 → affection delta 기록
- 유저가 공식(예: `∫₀^∞ e^(-st)f(t)dt`) 설명 시 캐릭터 응답에 `showFormula({ latex, speakAs })` 호출, UI에 KaTeX 렌더 + TTS 한글 낭독 동기
- 2회차 세션에서 캐릭터가 "지난번에 배운 ~~" 언급 (understood_concepts RAG 히트)
- 목표 완수율 80% 이상 시 episode_triggered 채워짐 + 컷씬 재생

### 2.B.11 해커톤 축소 T0 플로우

MVP 핵심 loop만:
1. 1개 주제 seed (예: "편미분 기초"), 3개 objectives
2. startLecture + endLecture tool만 (per-turn judge 생략)
3. `judgeExplanation`은 endLecture 내부에서 전체 대화 로그 대상 1회
4. `showFormula` tool + KaTeX 렌더러
5. Keyterm은 수동 seed 100개

이후 타이어(T1+)에서 `askClarifying` / `recordUnderstood` / 자동 keyterm 보강 / 화이트보드 UI 추가.

---

## 2.C Cross-Channel Unification — Text ↔ Voice ↔ Chalkboard 동치성

### 2.C.1 문제 진단 (현 상태)

공유 ✅: facts/relations/memory_chunks/affection_state/understood_concepts/mood_state 테이블 (PK = user×character). SharedToolDef·composeSystemPrompt·guardrail block.

빈틈 ⚠️:
1. **session_id 불일치**: `/api/chat`은 매 request마다 `crypto.randomUUID()`, voice agent는 `ctx.room.name`. lecture_session이 한 채널에만 귀속.
2. **Working window 불연속**: chat은 client messages 배열, voice는 server `session.chatCtx`. 채널 스위치 시 최근 턴 증발.
3. **Transcript 분산**: voice는 session_memory.summary로 압축되고, chat은 persistent 저장 없음. Judge가 voice+chat 통합 evidence 못 봄.
4. **Chalkboard LiveKit 전용**: data channel 기반 → chat 사용자는 칠판 접근 불가.
5. **Concurrent race**: 동시 채널 활성 시 affection/understood mutation 경쟁.

### 2.C.2 해법 — Unified Conversation Thread

```ts
// 유저×캐릭터당 live thread 하나
export const conversationThreads = pgTable('conversation_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  characterId: uuid('character_id').references(() => characters.id).notNull(),
  activeLectureSessionId: uuid('active_lecture_session_id'),
  voiceRoomName: text('voice_room_name'),        // LiveKit room이 열려있으면 세팅
  lastChannel: text('last_channel'),             // 'voice'|'text'|'chalkboard'
  lastActivityAt: timestamp('last_activity_at').defaultNow(),
}, (t) => ({
  uq: unique().on(t.userId, t.characterId),      // 유저×캐릭터당 1개
}));

// 모든 채널의 발화/이벤트가 여기로 수렴
export const turns = pgTable('turns', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id').references(() => conversationThreads.id).notNull(),
  lectureSessionId: uuid('lecture_session_id'),  // 강의 세션에 속하면 연결
  channel: text('channel').notNull(),            // 'voice'|'text'|'chalkboard'
  role: text('role').notNull(),                  // 'user'|'assistant'|'tool'
  content: text('content'),                      // 본문 (voice=STT 전사, text=원문, chalkboard=markdown)
  contentExtra: jsonb('content_extra'),          // 예: { latexBlocks, audioRef, toolCall }
  createdAt: timestamp('created_at').defaultNow(),
});
create index on turns (thread_id, created_at desc);
```

RLS: 둘 다 `(select auth.uid()) = user_id` (thread는 직접, turn은 thread join으로).

### 2.C.3 채널 스위치 플로우

**Voice → Text (예: 유저가 탭 전환)**:
1. Voice session disconnect hook이 마지막 미반영 턴을 `turns`에 flush (현 구현에서도 session_memory 쓰기 전에 이것부터)
2. Chat POST 요청 시 server가 thread_id 조회 → **`turns` 테이블에서 최근 K=20 턴**을 channel 무관하게 시간순 로드 → AI SDK `messages`로 prepend
3. Client의 기존 messages와 merge (중복 제거 by id)

**Text → Voice**:
1. 유저가 LiveKit 접속
2. Agent entrypoint가 thread_id로 최근 K턴 로드 → `session.chatCtx.addMessage()` N회 prepend
3. voice 세션 시작 전에 context 이미 워밍업 완료

**Chalkboard from Text path**:
```
POST /api/chalkboard/update  { threadId, markdown, revision }
  → turns insert (channel='chalkboard')
  → 활성 voice room 있으면 data channel로 relay (없으면 다음 voice 접속 시 복원)
```
→ chalkboard는 transport 독립. REST 경로로도, data channel로도 동일한 turn 생성.

### 2.C.4 Context Composition 통합

`composeFullContext`의 **Working Window** 블록 생성 규칙 (§4 of crafting doc):
```ts
async function buildWorkingWindow(thread: ConversationThread, budgetTokens: number) {
  const rows = await db.select().from(turns)
    .where(eq(turns.threadId, thread.id))
    .orderBy(desc(turns.createdAt))
    .limit(40);
  return rows.reverse()
    .map(renderTurn)           // channel에 따라 "유저 (음성): ..." / "유저 (칠판 ref #12): ..."
    .pipe(packToBudget(budgetTokens));
}
```

Judge도 같은 `turns` 테이블에서 해당 lecture_session의 턴 전체를 읽어 evidence로 사용 — voice + chalkboard + text 모두 포함.

### 2.C.5 Concurrency 제어

**간단·안전**: `conversation_threads.voiceRoomName`을 lock sentinel로.
- `/api/livekit/token` 호출 시 `voiceRoomName` 이미 있고 heartbeat 내 → 기존 방 재사용 (§7.5.7 active_sessions와 통합)
- Chat POST는 항상 허용하되 voice room 활성이면 response에 `{ voice_active: true }` 힌트 포함 → FE가 "현재 음성 중" UX 처리
- **State mutation은 DB 레벨 단일 UPDATE로 묶음** (affection_state는 row lock으로 atomicity 확보):
  ```sql
  update affection_state
    set score = score + $1,
        level = case when score + $1 >= thresholds[level+1] then next_level else level end
    where user_id = $u and character_id = $c
    returning *;
  ```
  두 채널 동시 +3 → 두 번 적용, 순서 무관하게 결과 동일 (commutative).

### 2.C.6 Chalkboard를 Text Path에서도

REST 라우트 `apps/web/app/api/chalkboard/*`:
- `POST /update` — `{ threadId, markdown, revision, latexBlocks }` → turn insert + active voice room에 relay
- `POST /clear` — 동일 패턴
- `GET /?threadId=` — 가장 최근 칠판 상태 반환 (채널 스위치 후 복원용)

FE가 LiveKit 없이도 REST로 칠판 접근 가능 → chat-only 유저도 동일 기능.

### 2.C.7 수락 기준

- 유저가 voice로 "내 이름은 헨리야" 말함 → 즉시 chat 탭 열어 질문 → 캐릭터가 이름 언급 (turns + facts 모두 반영)
- Chat에서 칠판 LaTeX 입력 → voice 재접속 → 캐릭터가 "방금 칠판에 쓴 편미분은…" 자연스럽게 언급
- 두 탭(voice + chat) 동시 사용 중 양쪽에서 `bumpAffection(+5)` 트리거 → 최종 delta = +10 (race 없음)
- Judge는 lecture_session 전체 turns(channel 무관)를 evidence로 verdict 생성

---

## 2.D.pre Video 스트리밍 — Pre-rendered만 필요 (해커톤 현 스코프)

### 결정
캐릭터 **pre-rendered 비디오 재생**만 요구됨 (컷씬·표정 클립). 따라서:
- LiveKit은 **voice + data channel 전용**. video track publish/subscribe 사용 안 함
- 비디오 파일은 **Supabase Storage `characters-public` bucket + CDN**
- FE가 `<video>` 태그로 **직접 재생**

→ **서버 대여 불필요**. LiveKit Cloud + Supabase Storage로 끝. 새 인프라 0.

### Cutscene 트리거 프로토콜

| 단계 | 주체 | 동작 |
|---|---|---|
| 1 | LLM | `playCutscene({ eventKey })` tool 호출 |
| 2 | agent(server) | `character_assets`에서 public URL 조회 |
| 3 | agent | `publishData('cutscene.play', { url, duration, muteTTS: true })` |
| 4 | FE | `<video src={url} autoPlay />` 재생 |
| 5 | agent | `session.interrupt()`로 TTS 잠시 중단 |
| 6 | FE | `video.onended` → `publishData('cutscene.end')` |
| 7 | agent | 대화 재개 |

§2.B.ch의 tool RPC 패턴이 이걸 그대로 수용. 의존성 없음 (순수 HTML `<video>`).

### Storage 비용
Supabase Pro 기본 250 GB/월 egress 포함, 초과 $0.09/GB. 해커톤·베타 수준 여유.

---

## 2.D.host LiveKit Self-host — 현재 Unnecessary, Future Option

### 현 시점 권장: **Cloud 유지**
- Video(pre-rendered)는 Supabase Storage로 CDN 서빙 (§2.D.pre) → LiveKit에 video 트래픽 없음
- Audio 전용 트래픽은 Cloud 비용 부담 낮음 ($0.01/agent-minute)
- Ops 부담 0

### Self-host 전환 트리거
| 조건 | 조치 |
|---|---|
| 실시간 video up/down 추가 (webcam, talking head, 다자간) | LiveKit OSS self-host 검토 |
| Supabase Storage 대역폭 월 1 TB+ | Cloudflare R2 또는 self-host storage |
| Audio-minute 사용량 Cloud 요금이 단일 VM보다 비싸질 때 | self-host 이관 |

### Self-host 전환 시 작업 (참고)
1. Hetzner CX22 ($4.35/월, 20 TB bandwidth 포함) 또는 동급 VPS 준비
2. 도메인 2개 (`livekit.*`, `livekit-turn.*`) A 레코드 설정
3. `docker run --rm -it -v$PWD:/output livekit/generate` → docker-compose.yaml + Caddy + coturn 자동 생성
4. `.env`의 `LIVEKIT_URL`·`LIVEKIT_API_KEY`·`LIVEKIT_API_SECRET` 3줄 교체
5. Agent worker를 LiveKit Cloud Agents → 같은 VM의 Docker 컨테이너로 이관 (Dockerfile 재활용)
6. 아키텍처 코드 변경: **0줄** (§0 원칙 증명)

### Homomorphic 원칙 효과
LIVEKIT_URL adapter 경계 너머 값만 바뀜. `packages/shared`·`apps/agent/src/miyeonshi-agent.ts`·`tool-adapter.ts`·judge/memory/composeFullContext 모두 전혀 모름. core 재배포 불필요 (같은 컨테이너 이미지, env만 교체).

---

## 2.D Meeting Bridge — Google Meet/Zoom 등 외부 화상 세션 (Future, Optional)

### 2.D.1 가능성 진단 (2026-04 docs)

| 경로 | 상태 |
|---|---|
| **LiveKit 네이티브 Google Meet bridge** | ❌ 없음. LiveKit의 Google 통합은 Gemini/TTS/STT 등 AI 서비스. Meet 방 참여 기능 아님 |
| **LiveKit SIP telephony** | ✅ 전화/SIP 참여 지원. Zoom은 SIP dialing 가능 (DTMF 번거로움), **Google Meet은 SIP 제한적** (Workspace enterprise 필요) |
| **Recall.ai Meeting Bot API** | ✅ Google Meet/Zoom/Teams/Webex bot 정식 지원, 모든 Workspace tier. 실시간 diarized transcript webhook + 2025~2026 "Output Media API"로 **봇이 미팅에서 말하기 가능** |
| **Self-hosted headless Chromium** | ⚠️ 기술적 가능 (Playwright로 Meet 자동 참여 → WebRTC capture) but 구현·유지 복잡, 브라우저 detection 이슈. 해커톤 외 |

### 2.D.2 권장 Bridge — Recall.ai + LiveKit Agent (Homomorphic Extension)

```
       Google Meet Room (교수 + 여러 대학원생 + 우리 AI 캐릭터)
              ↕  (audio in/out)
       Recall.ai Bot
              ↕  (webhook transcript + Output Media API로 역송출)
       Meeting Transport Adapter (신규, apps/agent 내부)
              ↕  (STT-like event stream → LLM → TTS output)
       기존 AgentSession / MiyeonshiAgent (0줄 변경)
              ↕
       Supabase (동일 스키마, 동일 tools)
```

### 2.D.3 Homomorphic 적용

`MeetingTransport` adapter는 LiveKit room과 동치의 인터페이스:
```ts
interface Transport {
  onUserAudio(handler: (frame) => void): void;
  onUserText(handler: (text) => void): void;
  sendAssistantAudio(pcmOrMp3): Promise<void>;
  sendAssistantText(msg): Promise<void>;
  readonly participantMetadata: IdentityMetadata;
}
```

- LiveKitTransport (기존 구현 — LiveKit room)
- MeetingTransport (신규 — Recall.ai webhook + Output Media)
- (장래) PhoneTransport (기존 LiveKit SIP)

`MiyeonshiAgent` / tool catalog / `composeFullContext` / judge 파이프라인 **모두 transport-agnostic**이므로 이 한 파일만 작성.

### 2.D.4 멀티 참여자 awareness

Meet에는 여러 명 있음. 처리 포인트:
- **Diarization**: Recall.ai webhook이 speaker id 제공 → 우리 쪽 `turn.contentExtra.speaker` 저장
- **대응 정책**: AI는 직접 호명(예: 이름 호출, "학생" 호칭, chalkboard 변화)되거나 특정 keyword 매칭 시만 응답 — 항상 말하지 않음. 이건 `shouldRespond(turn, context)` 정책 함수로 주입
- **Mood/affection 업데이트**: 주 대상 유저(교수)의 발화에만 반응. 다른 참가자 발화는 context로만 흡수하고 state 미변경

### 2.D.5 제약 / 비용

- **Recall.ai 유료** — 가격 현재 조사 필요, 해커톤 예산 외일 가능성
- **Meet 호스트가 봇 허용** 해야 — Workspace 정책
- **Latency**: ~수백 ms 추가 (native WebRTC 대비)
- **Compliance**: 회의 녹음·기록에 참가자 동의 필요

### 2.D.6 해커톤 스코프 판정

**Out of scope** (Section 11 추가). 단 **아키텍처는 이 확장을 이미 수용**. Plan의 Transport 추상화는 Phase 3 Voice Pipeline 구현 시 미리 반영 — 현재 LiveKit 전용 코드를 interface 뒤로 숨기기만 하면 됨 (비용 거의 0).

### 2.D.7 데모 서사

해커톤 데모용으로 Meet 확장은 포기하더라도, **발표 스크립트에 "이 구조는 Google Meet 랩미팅에서 같이 연구할 수 있게 확장된다"고 언급 + 아키텍처 슬라이드에 transport layer를 보여주면 임팩트**. 실제 demo 대신 설계 증거로.

---

## 3. Infra Stack — 최종 결정 (2026-04 docs 검증)

| 항목 | 결정 | 근거 URL |
|---|---|---|
| Next.js | `^16.x` (Turbopack 기본, React 19.2, Node ≥20.9) | https://nextjs.org/blog/next-16 |
| Vercel AI SDK | `ai@^6.0.162`, `@ai-sdk/google@latest` | https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0 |
| Gemini (text) | `google('gemini-3-flash-preview')` — SWE-bench 78%, near-Pro reasoning + tool use, Flash latency. fallback: `gemini-2.5-flash` | https://blog.google/products-and-platforms/products/gemini/gemini-3-flash/ · https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai |
| Supabase Auth | `@supabase/ssr` + `createServerClient` (레거시 `auth-helpers-nextjs` 금지) | https://supabase.com/docs/guides/auth/server-side/nextjs |
| Supabase 서버 사용자 조회 | `supabase.auth.getClaims()` (getSession 금지) | 위와 동일 |
| LiveKit client | `@livekit/components-react ^2.8.0` | https://docs.livekit.io/reference/components/react/hook/usevoiceassistant/ |
| Route Handler runtime | Node.js (livekit-server-sdk 의존성으로 Edge 불가) | — |
| Storage | Private bucket + 캐시된 Signed URL (DB에 `signed_url`, `signed_url_expires_at` 저장) | https://supabase.com/docs/guides/storage/cdn/smart-cdn |
| ORM | Drizzle (RLS는 Postgres 레벨이라 투명 통과) | https://supabase.com/docs/guides/database/postgres/row-level-security |

### AI SDK v6 브레이킹 포인트 (반드시 준수)

- `tool({ parameters })` → `tool({ inputSchema })`
- tool result `result` → `output`
- `me/packages/shared/src/tools/*`에서 v3→v6 전환 여부 확인 후 필요 시 코드 수정.

---

## 4. Monorepo Structure (`me`에서 fork/prune)

```
stdev2026/
├── apps/
│   ├── web/                 # Next.js 16 (Vercel)
│   │   ├── app/
│   │   │   ├── page.tsx                 # 랜딩 + 매직링크 로그인
│   │   │   ├── characters/page.tsx      # 캐릭터 선택창 (4명, 미구현은 disabled)
│   │   │   ├── play/[characterId]/page.tsx  # 대화 씬 (voice-panel + 스프라이트/컷씬)
│   │   │   ├── auth/callback/route.ts   # 매직링크 콜백 (exchangeCodeForSession)
│   │   │   └── api/
│   │   │       ├── chat/route.ts        # streamText + tools (텍스트 채팅 fallback)
│   │   │       ├── livekit/token/route.ts  # AccessToken + characterId metadata
│   │   │       └── assets/[assetId]/signed-url/route.ts  # 캐시된 Signed URL 서빙
│   │   └── components/
│   │       ├── voice-panel.tsx          # me의 것 거의 그대로
│   │       ├── character-sprite.tsx     # emotion 상태 sprite 교체 + 영상 재생
│   │       ├── cutscene-player.tsx      # playCutscene 트리거 시 풀스크린 재생
│   │       └── affection-indicator.tsx  # 선택적 UI
│   └── agent/               # LiveKit Cloud Agent 워커
│       ├── src/entrypoint.ts            # me의 entrypoint 적응
│       ├── src/miyeonshi-agent.ts       # TwinAgent → MiyeonshiAgent
│       ├── src/tool-adapter.ts          # buildLiveKitToolCatalog (v6 반영)
│       └── Dockerfile                   # lk agent deploy용
└── packages/
    └── shared/
        ├── src/db/schema.ts             # characters, character_assets, affection_state, session_memory, events
        ├── src/prompt/compose.ts        # composeSystemPrompt({ character, affection, memoryDigest, channel })
        ├── src/prompt/affection.ts      # buildAffectionPersonaBlock (stranger→lover)
        ├── src/tools/types.ts           # SharedTool<T> 인터페이스
        ├── src/tools/adapter-aisdk.ts   # inputSchema 키로 래핑
        ├── src/tools/adapter-livekit.ts # parameters 키로 래핑
        ├── src/tools/catalog/           # getCharacterProfile, getAffectionState, bumpAffection, recallMemory, recordMemory, playCutscene, setEmotion, listCharacters
        └── src/identity/session.ts      # Supabase 매직링크 세션 → ToolContext
```

**`me`에서 제거**: `auth/`(passkey), `admin/*`, `writings/*`, `identity/enrollment.ts`(knowledge challenge), `tools/elevation.ts`(OTP), `tools/writings.ts`, `tools/profile.ts`(본인 정보용). `permissions/middleware.ts`는 **호감도 게이팅용으로 재활용** (role→affectionLevel 매핑).

---

## 5. Database Schema (Drizzle on Supabase Postgres)

> **중요**: 여기 있는 테이블은 **앱 상태 + 정적 컨텐츠**만 다룬다. 에이전트의 **지식 그래프 (entities/relations/facts)**, **메모리 청크 (memory_chunks, pgvector)**, **mood_state** 테이블은 동반 문서 `miyeonshi-agent-crafting-2026-04-18.md` Section 2.2에서 정의한다. 구현 시 두 스키마 파일을 같은 `packages/shared/src/db/schema.ts`에 합친다.

```ts
// packages/shared/src/db/schema.ts (요지)

export const users = pgTable('users', {
  id: uuid('id').primaryKey().references(() => sql`auth.users(id)`),
  email: text('email'),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),            // e.g. 'yuna'
  displayName: text('display_name').notNull(),
  tagline: text('tagline'),
  basePersonaPrompt: text('base_persona_prompt').notNull(),  // soul prompt
  personaRevision: integer('persona_revision').default(1).notNull(), // 감사 trail용, 관리자 수정 시 +1
  affectionOverlays: jsonb('affection_overlays').default({}), // { stranger: "...", acquaintance: "...", ..., lover: "..." }
  fewShotExamples: jsonb('few_shot_examples').default([]),    // [{ user, assistant }] — 선택적
  guardrailAdditions: text('guardrail_additions'),   // 캐릭터별 추가 가드 (공용 가드는 코드)
  voiceId: text('voice_id').notNull(),              // ElevenLabs voice ID
  ttsModel: text('tts_model').default('eleven_flash_v2_5'),
  language: text('language').default('ko'),         // STT language
  isDemoReady: boolean('is_demo_ready').default(false).notNull(),
  sortOrder: integer('sort_order').default(0),
});

export const lectureSessions = pgTable('lecture_sessions', {
  // ... 기존 필드
  personaRevision: integer('persona_revision'),     // 이 세션이 어떤 persona 버전으로 시작됐는지
});

export const characterAssets = pgTable('character_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').references(() => characters.id),
  type: text('type').notNull(),                     // 'sprite'|'video'|'cutscene'|'bgm'
  emotion: text('emotion'),                         // 'happy'|'sad'|'neutral'|'special'|null
  eventKey: text('event_key'),                      // 컷씬 연결용 (e.g. 'first_meet')
  storageKey: text('storage_key').notNull(),
  signedUrl: text('signed_url'),
  signedUrlExpiresAt: timestamp('signed_url_expires_at'),
});

export const affectionState = pgTable('affection_state', {
  userId: uuid('user_id').references(() => users.id).notNull(),
  characterId: uuid('character_id').references(() => characters.id).notNull(),
  level: text('level').notNull().default('stranger'), // stranger|acquaintance|friend|close|lover
  score: integer('score').default(0),
  flags: jsonb('flags').default({}),                 // { firstMeetDone: true, ... }
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.characterId] }) }));

export const sessionMemory = pgTable('session_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  characterId: uuid('character_id').references(() => characters.id).notNull(),
  summary: text('summary').notNull(),              // Gemini-요약된 롤링 요약
  turnCount: integer('turn_count').default(0),
  lastSessionAt: timestamp('last_session_at').defaultNow(),
});

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').references(() => characters.id),
  key: text('key').notNull(),                       // 'first_meet', 'confession_scene'
  triggerCondition: jsonb('trigger_condition'),     // { minLevel: 'friend', flags: {...} }
  cutsceneAssetId: uuid('cutscene_asset_id').references(() => characterAssets.id),
});
```

### RLS 정책 (핵심)

```sql
-- characters, character_assets, events는 모두에게 read-only
alter table characters enable row level security;
create policy "public read" on characters for select using (true);
-- 쓰기는 service_role만 (API route에서 serviceKey로 seed)

alter table affection_state enable row level security;
create policy "own affection" on affection_state
  for all using ((select auth.uid()) = user_id);

alter table session_memory enable row level security;
create policy "own memory" on session_memory
  for all using ((select auth.uid()) = user_id);
```

- `(select auth.uid())` 래핑 성능 최적화 (~95% 향상, 공식 docs).
- **매직링크 로그인 필수** (확정). 비로그인 상태에서는 랜딩·로그인 페이지만 접근 가능. 캐릭터 선택·voice·chat·chalkboard 전부 로그인 후 활성. 게스트 세션 없음. 데모 현장에선 이메일 준비된 테스트 계정 2~3개 미리 로그인 상태로 준비.

---

## 5.A Seed Data & DB-driven Content Strategy

### 5.A.1 원칙: "변동 → DB, 불변 → 코드"

| 내용 | 위치 | 왜 |
|---|---|---|
| Soul prompt (base_persona) | **DB** `characters.base_persona_prompt` | 캐릭터별, 자주 튜닝 |
| Voice ID | **DB** `characters.voice_id` | 캐릭터별 |
| 강의 주제·objectives·rubric·keyterms | **DB** `subjects.*` | 도메인 전문가 편집 대상 |
| Affection overlay (레벨별 톤) | **DB** `characters.affection_overlays jsonb` | 캐릭터 말투 차별화 여지 |
| Few-shot 예시 | **DB** `characters.few_shot_examples jsonb` | 톤 보정 실험 편리 |
| Character별 추가 guardrail | **DB** `characters.guardrail_additions` | 캐릭터마다 민감 소재 다름 |
| 이벤트·컷씬 트리거 조건 | **DB** `events.trigger_condition jsonb` | 콘텐츠성, 쉽게 추가 |
| 에셋 포인터·태그 | **DB** `character_assets.*` + Supabase Storage | 팀 작업물 계속 추가 |
| 공용 guardrails (NSFW·안전·일관성) | 코드 상수 | 보안, 실수 방지 |
| Mood 전이 규칙 (7가지) | 코드 | 메커니즘, 거의 안 바뀜 |
| Channel hints (voice/text) | 코드 | 2개 고정 |
| LEARNING_STATE 블록 **템플릿** | 코드 | 템플릿, 데이터는 DB |

### 5.A.2 Hot Reload / Versioning

- `characters.persona_revision`: 관리자가 soul prompt 수정 시 +1
- **세션 시작 시 1회 load**만, 세션 중 refetch 금지 (몰입 보호)
- `lecture_sessions.persona_revision` FK 컬럼에 기록 → 감사 가능 ("이 verdict는 revision 3의 persona로 산출됨")
- 다음 세션부터 새 버전 자동 반영

### 5.A.3 Seed 스크립트 — Day 1 Ready

```ts
// packages/shared/scripts/seed.ts
import { db, characters, subjects, events, characterAssets } from '../src/db';

await db.insert(characters).values([
  {
    slug: 'yuna',                                // 실제 이름은 팀 협의
    displayName: '유나',
    tagline: '대학원 신입생',
    basePersonaPrompt: `
(TODO Sprint 0: 팀과 협의하여 확정)
너는 OO 전공 대학원 1년차 신입생 "유나"이다. 교수인 사용자에게 배움을 얻는 학생 역할을 연기한다.
- 말투: 정중하지만 부담 없이 편안한 반말~존댓말 혼합 (호감도에 따라 변화)
- 성격: 호기심 많고 성실하지만, 개념을 처음 접할 때 자주 헷갈려 한다
- 지식 수준: 학부 4학년 수준 기본기는 있으나 심화는 배워가는 중
- 언제 질문하나: 교수 설명 중 막히는 부분이 생기면 즉시. "잠깐만요, 여기서…" 식으로 정중하게 끊음
- 언제 이해 표현: 새 개념이 기존 이해와 연결되는 순간 "아, 그러니까 이게 …이랑 같은 원리인 거네요?" 식으로
- 금지: 정답을 아는 것처럼 말하기, 교수보다 앞서 설명하기, 메타적 언어("이게 objective인가요?") 사용
`.trim(),
    personaRevision: 1,
    affectionOverlays: {
      stranger:     '존댓말 유지, 거리감 있음. "교수님"으로 부름.',
      acquaintance: '존댓말 유지, 조금 편해짐. 간간이 농담에 웃음.',
      friend:       '존댓말 기본이지만 익숙한 이야기엔 반말 섞음. "선생님" 호칭 가능.',
      close:        '반말 위주, 존댓말은 중요한 순간. 개인적 이야기 공유.',
      lover:        '거의 반말. 애정 표현 자연스러움. 연구와 일상이 섞여 있음.',
    },
    fewShotExamples: [],                         // Sprint 3에 대화 샘플 채움
    guardrailAdditions: null,
    voiceId: 'LTCsKRuKTT24n83eMvb9',             // ✅ 확정
    ttsModel: 'eleven_flash_v2_5',
    language: 'ko',
    isDemoReady: true,
    sortOrder: 1,
  },
  // 나머지 캐릭터 3명은 placeholder (isDemoReady: false)
  ...Array.from({ length: 3 }, (_, i) => ({
    slug: `placeholder-${i+2}`,
    displayName: `(Coming soon #${i+2})`,
    basePersonaPrompt: '',
    voiceId: 'LTCsKRuKTT24n83eMvb9',  // 데모 전 아무 값이나
    isDemoReady: false,
    sortOrder: i + 2,
  })),
]);

await db.insert(subjects).values([
  {
    characterId: null,                            // 공용 주제 (캐릭터 무관)
    topic: '편미분 기초',                         // Sprint 0 — 팀과 협의
    objectives: [
      {
        id: 'obj_pd_def',
        statement: '편미분의 정의를 설명한다',
        concept_key: 'partial_derivative_definition',
        weight: 2,
        expected_terms: ['편미분', '일반 미분', '고정', '변수', '극한'],
        rubric: {
          must_hit: [
            '다변수 함수에서 한 변수만 변하게 하고 나머지는 고정한다는 점',
            '극한 형태 ∂f/∂x = lim_{h→0} (f(x+h,y) - f(x,y))/h',
            '다른 변수를 상수 취급한다는 연산적 해석',
          ],
          common_misconceptions: [
            '∂를 d처럼 다루며 일반 미분과 혼동',
            '다변수 함수의 의미 없이 공식만 나열',
          ],
          partial_credit: true,
        },
      },
      // 2개 더 — 예: 체인 룰, 그래디언트
    ],
    prerequisites: [],
    keyterms: ['편미분', '그래디언트', '체인 룰', '극한', '다변수', '연속', '전미분'], // Sprint 3 자동 보강
    difficulty: 1,
  },
]);
```

### 5.A.4 관리자 편집 경로 (Future Tier)

해커톤 스코프 외지만 아키텍처 수용:
- `/admin/characters/[id]` — persona prompt textarea + `persona_revision` 자동 +1
- `/admin/subjects/[id]` — rubric JSON 편집기 (JSON schema validation)
- service_role client로 RLS bypass하여 CRUD (§7.5.6)
- 변경 시 audit_log에 `admin.edit` 이벤트 기록

### 5.A.5 DB 로드 훅 (Agent Entrypoint)

```ts
// apps/agent/src/entrypoint.ts entry 내부
const [character, subject] = await Promise.all([
  loadCharacter(meta.characterId),               // characters + affection_overlays + few_shot
  meta.subjectId ? loadSubject(meta.subjectId) : null,
]);

const tts = new elevenlabs.TTS({
  voiceId: character.voiceId,                    // DB에서
  model: character.ttsModel,
  apiKey: process.env.ELEVENLABS_API_KEY,
});

const stt = makeSTT({                            // §2.A
  language: character.language,
  keyterm: subject?.keyterms ?? [],
});

// composeFullContext는 character + subject + snapshot을 받아 조립
```

---

## 6. Homomorphic Tool Layer

### `packages/shared/src/tools/types.ts`

```ts
import { z, ZodObject } from 'zod';

export interface ToolContext {
  userId: string;
  characterId: string;
  affectionLevel: AffectionLevel;
  sessionId: string;
  channel: 'voice' | 'text';
}

export interface SharedToolDef<TSchema extends ZodObject<any>, TResult> {
  name: string;
  description: string;
  parameters: TSchema;
  execute: (args: z.infer<TSchema>, ctx: ToolContext) => Promise<TResult>;
  minAffection?: AffectionLevel;  // permission gating
}
```

### AI SDK 어댑터 (v6: `inputSchema`)

```ts
// packages/shared/src/tools/adapter-aisdk.ts
import { tool } from 'ai';

export function toAiSdkCatalog(defs: SharedToolDef<any, any>[], ctx: ToolContext) {
  return Object.fromEntries(
    defs.map((d) => [d.name, tool({
      description: d.description,
      inputSchema: d.parameters,           // ← v6 브레이킹
      execute: async (args) => d.execute(args, ctx),
    })])
  );
}
```

### LiveKit 어댑터 (여전히 `parameters`)

```ts
// packages/shared/src/tools/adapter-livekit.ts
import { llm } from '@livekit/agents';

export function toLiveKitCatalog(
  defs: SharedToolDef<any, any>[],
  ctxRef: { current: ToolContext },
  session: llm.AgentSession,
): llm.ToolContext {
  const catalog: llm.ToolContext = {};
  for (const d of defs) {
    catalog[d.name] = llm.tool({
      description: d.description,
      parameters: d.parameters,
      execute: async (args) => {
        const res = await d.execute(args, ctxRef.current);
        // bumpAffection 결과가 level 승격을 유발하면 system prompt 갱신
        if (d.name === 'bumpAffection' && res && typeof res === 'object' && 'newLevel' in res) {
          ctxRef.current = { ...ctxRef.current, affectionLevel: (res as any).newLevel };
          const refreshed = composeSystemPrompt({ ...ctxRef.current, channel: 'voice' });
          session.chatCtx.addMessage({ role: 'system', content: refreshed });
        }
        return res;
      },
    });
  }
  return catalog;
}
```

이 구조는 **`me/apps/agent/src/tool-adapter.ts:33~107`과 동형** — elevation(role 승격) 로직을 affection 승격으로 치환한 것.

### Tool Catalog (MVP)

| Tool | 호출 주체 | 동작 |
|---|---|---|
| `getCharacterProfile` | LLM | characters 테이블 조회 |
| `getAffectionState` | LLM | 현재 호감도·플래그 반환 |
| `bumpAffection` | LLM (특정 이벤트 완료 시) | score 증가, level 자동 승격 → side channel로 prompt 재생성 |
| `recallMemory` | LLM (세션 시작 직후) | 이전 session_memory.summary 반환 |
| `recordMemory` | 서버 (세션 종료 훅 또는 N턴마다) | Gemini로 새 요약 생성 · 기존 요약과 머지 |
| `playCutscene` | LLM | events 키 → cutscene asset url 반환, 클라이언트에 data channel로 전송 |
| `setEmotion` | LLM | 현재 sprite emotion 변경, data channel로 전송 |
| `listCharacters` | 서버 (UI용, LLM 미노출) | demo_ready 플래그로 필터 가능한 전체 목록 |

---

## 7. System Prompt Composition (축약)

아래는 **최소형 베이스라인**. 실제 구현은 동반 문서 `miyeonshi-agent-crafting-2026-04-18.md` Section 4 (Context Composition)의 block-priority + token-budget 버전을 쓴다.

```ts
// packages/shared/src/prompt/compose.ts (최소형)
export function composeSystemPrompt(opts: {
  character: Character;
  affectionLevel: AffectionLevel;
  memoryDigest: string | null;
  channel: 'voice' | 'text';
}): string {
  return [
    BASE_MIYEONSHI_GUARDRAILS,
    `## 너의 설정\n${opts.character.basePersonaPrompt}`,
    buildAffectionPersonaBlock(opts.affectionLevel),
    opts.memoryDigest ? `## 이전 대화 요약\n${opts.memoryDigest}` : '## 첫 만남',
    CHANNEL_HINTS[opts.channel],
  ].join('\n\n');
}
```

실제 사용 버전 (`composeFullContext`)은 다음을 블록 순서대로 주입하고 token 예산 내에서 overflow 시 우선순위 낮은 블록부터 축약한다:

1. Guardrails (고정) · 2. Character base persona · 3. Affection overlay · 4. World notes · 5. User profile digest (from `facts`) · 6. Recent events (from `relations`) · 7. Rolling session summary · 8. RAG top-K (from `memory_chunks`) · 9. Mood state · 10. Channel hint · 11. Working window (last N turns)

상세는 crafting 문서 Section 4.2 참조.

---

## 7.5 Security & Auth Boundaries

데이터 권한·인증·키 격리를 세 층으로 나눠 관리한다. 각 구성요소가 어떤 Supabase "역할"로 DB에 접근하는지가 핵심.

### 7.5.1 Auth 체인 — 클라이언트 → Agent → DB

```
[1] 브라우저
    - 매직링크 로그인 완료 → @supabase/ssr 쿠키에 access_token 저장
    - 모든 클라이언트 supabase 호출은 이 JWT로 서명 → RLS에 auth.uid() 주입됨

[2] /api/livekit/token (Next.js Route Handler, Node runtime)
    - supabase.auth.getClaims()로 user 검증 (getSession 금지)
    - LiveKit AccessToken 발급 시 metadata에 다음 넣음:
        {
          userId,
          characterId,
          supabaseJwt: <access_token>,      // agent가 DB 접근용으로 사용
          supabaseJwtExp: <exp timestamp>,  // refresh 타이밍 판단용
          ipHash
        }
    - LiveKit JWT는 LIVEKIT_API_SECRET으로 서명 → metadata 위조 불가

[3] 브라우저 → LiveKit Room 참여
    - 서버 SDK 서명된 token 제출 → LiveKit Cloud가 검증

[4] LiveKit Agent 워커 (워커는 LiveKit Cloud 안에서 돈다)
    - participant.metadata 파싱 → supabaseJwt 추출
    - supabase client 초기화:
        createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${supabaseJwt}` } }
        })
    - 이 client로 모든 tool execute → RLS가 해당 user.id로 스코프
    - agent 환경에는 SERVICE_ROLE_KEY 주입 안 함
```

**원칙**: Agent는 service_role을 쥐지 않는다. 유저 JWT를 pass-through해서 RLS 아래서 쓴다. 이러면 tool 구현 버그로 엉뚱한 user_id를 쓰려 해도 RLS가 차단.

### 7.5.2 JWT 만료 대응 (장기 세션)

Supabase access_token 기본 수명 1h. 30분 이상 통화가 일상일 수 있는 미연시에 대응.

전략:
1. 클라이언트가 `expires_at - 5min` 시점에 `supabase.auth.refreshSession()` 호출
2. 새 JWT를 LiveKit data channel로 agent에 송출: `{ topic: 'auth_refresh', jwt: <new>, exp: <ts> }`
3. Agent는 수신 즉시 **새 supabase client로 교체** (기존 client 참조 갱신)
4. 실패 시 agent는 `session.say("연결이 불안정해서 끊겠어... 다시 들어와 줘")` 후 disconnect

### 7.5.3 대안: service_role + withScope 패턴 (me 방식, 비채택 이유)

`me` 레포는 agent에 service_role을 주고 `withScope({ role, userId })`로 `SET LOCAL role authenticated; SET LOCAL request.jwt.claim.sub TO <user_id>` 실행해 RLS를 임시 적용. 장점: JWT 만료 무관. 단점: **키 유출 시 전수 노출** + SET LOCAL 누락된 쿼리가 RLS bypass됨.

→ 해커톤·개인 프로젝트라도 JWT pass-through 쪽을 권장. me의 withScope는 백업 옵션으로 유지.

### 7.5.4 Supabase Storage 구조

두 버킷으로 분리:

| Bucket | 공개성 | 내용 | Signed URL? |
|---|---|---|---|
| `characters-public` | Public (CDN) | 캐릭터 스프라이트, 컷씬 영상, BGM (누구에게나 같은 공용 에셋) | ❌ (직접 URL) |
| `user-private` | Private | 유저 세션 녹취·메모 (해커톤 MVP에서는 비어있어도 됨, 확장 대비) | ✅ (1h 유효) |

**`characters-public` 설계 근거**: 모든 유저가 공유하는 정적 에셋이라 Signed URL마다 새로 생성하면 CDN cache miss → 느려짐. Smart CDN docs 권장 패턴.

### 7.5.5 Storage RLS Policy

```sql
-- characters-public: 읽기 전체 공개, 쓰기는 service_role만
create policy "characters-public read"
  on storage.objects for select
  to public
  using (bucket_id = 'characters-public');

-- 쓰기 policy는 만들지 않음 → anon/authenticated 쓰기 불가, service_role만 통과

-- user-private: 자기 user_id 폴더만 read/write
create policy "user-private own folder read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'user-private'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "user-private own folder write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-private'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "user-private own folder delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-private'
    and (auth.uid())::text = (storage.foldername(name))[1]
  );
```

파일 경로 컨벤션: `user-private/<user_uuid>/<session_id>/...`.

### 7.5.6 Service Role Key 격리 원칙

| 환경 | service_role 접근 가능? |
|---|---|
| 브라우저 번들 | ❌ (절대 `NEXT_PUBLIC_` 접두 금지) |
| Next.js Route Handler (Vercel) | ✅ 관리 작업용 — seed, 캐릭터 등록, Storage 업로드 API (admin 전용 path) |
| LiveKit Agent 워커 | ❌ — pass-through JWT만 사용 |
| seed 스크립트 (`pnpm db:seed`) | ✅ 로컬 실행만 |

Vercel env에는 있고, LiveKit Cloud env에는 **없음**. 노출 리스크 최소화.

### 7.5.7 Concurrent Session / Abuse 방어

```sql
create table active_sessions (
  user_id uuid primary key references users(id) on delete cascade,
  room_name text not null,
  agent_started_at timestamptz default now(),
  last_heartbeat timestamptz default now()
);
alter table active_sessions enable row level security;
create policy "own session" on active_sessions
  for all using ((select auth.uid()) = user_id);
```

- `/api/livekit/token`이 호출될 때 active_sessions에 upsert, 이미 5분 내 heartbeat가 있으면 기존 room_name 반환 (중복 생성 방지)
- Agent entrypoint는 참여 시 heartbeat 갱신
- 유령 세션: 10분 이상 heartbeat 없으면 cron 또는 다음 요청 시 cleanup
- LiveKit token 발급은 user당 1 session/min rate limit (Vercel middleware or upstash rate limit)

### 7.5.8 매직링크 Rate Limit

Supabase 기본: 이메일당 **시간당 3회**, 봉인된 설정이라 따로 추가 방어는 사치. 단 데모 현장에서 걸리면 곤란 — 테스트 시 별도 계정 사용 안내.

### 7.5.9 pgvector × RLS 성능

`memory_chunks`의 HNSW 인덱스 스캔 결과에도 RLS filter가 적용된다 (Postgres는 인덱스 후 filter). 유저당 수천 청크 규모면 병목 없음. 수백만 규모 도달 시 `partition by user_id`로 분할 고려 — 해커톤 외.

### 7.5.10 Cascade Delete & 삭제 요청

- 유저 테이블 관계: `on delete cascade` 전체 적용 (Section 5 스키마에 반영됨)
- Supabase Auth dashboard에서 `auth.users` row 삭제 시 앱 데이터 자동 cascade
- **Storage는 cascade 없음** — 유저 삭제 hook 함수 (`trigger after delete on auth.users`) 또는 데모 이후 별도 `purgeUserStorage(userId)` admin 함수 작성

### 7.5.11 체크리스트

- [ ] `apps/web/lib/supabase/{client,server,service}.ts` 세 파일 분리 — `service.ts`만 service_role
- [ ] `apps/agent/src/supabase.ts` — JWT pass-through 전용, service_role 참조 금지
- [ ] Supabase Dashboard에서 두 bucket (`characters-public` public / `user-private` private) 생성
- [ ] Storage policy SQL 4개 (위 §7.5.5) migration에 포함
- [ ] RLS 교차 테스트 — 두 계정으로 상호 간섭 불가 확인 (Phase 2 수락 기준)
- [ ] Storage 교차 테스트 — user A가 user B의 private 파일 접근 불가
- [ ] JWT refresh flow 로컬 smoke — 5분 수명으로 축소해 force-refresh 트리거 (개발용 config)
- [ ] `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY`가 있는지 확인, `.env.example`에서는 `NEXT_PUBLIC_` 접두가 없는지 grep
- [ ] LiveKit Cloud env에 service_role이 **없는지** 배포 전 확인

---

## 7.6 Observability & Audit Log

에이전트가 실제로 왜 그런 결정을 내렸는지, 어떤 tool이 실패했는지, 토큰 비용이 얼마나 나왔는지 — 전부 한 테이블로 **single source of truth**. 해커톤에서도 필수, 프로덕션에서도 그대로 쓸 수 있는 설계.

### 7.6.1 audit_log 테이블

```sql
create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  ts            timestamptz default now(),
  user_id       uuid references users(id) on delete set null,
  character_id  uuid references characters(id) on delete set null,
  session_id    text,                   -- LiveKit room name
  trace_id      uuid,                   -- 한 턴(user utterance → agent reply)을 묶는 ID
  level         text not null,          -- 'debug'|'info'|'warn'|'error'
  kind          text not null,          -- 아래 표 참조
  name          text,                   -- tool 이름·이벤트 키 등
  duration_ms   integer,
  payload       jsonb not null default '{}',
  error         text,                   -- kind='error'일 때 stack/message
  model         text,                   -- LLM 관련 이벤트에 한해
  tokens_in     integer,
  tokens_out    integer
);
create index on audit_log (user_id, ts desc);
create index on audit_log (session_id, trace_id, ts);
create index on audit_log (kind, ts desc);
create index on audit_log (ts desc);
```

### 7.6.2 kind 분류

| kind | 언제 | payload 핵심 필드 |
|---|---|---|
| `session.connect` | LiveKit room 참가 | `{ ipHash, mode }` |
| `session.disconnect` | 종료 | `{ reason, turnCount, durationMs }` |
| `auth.token_issue` | /api/livekit/token 응답 | `{ characterId, jwtExp }` |
| `auth.refresh` | data channel `auth_refresh` 수신 | `{ oldExp, newExp }` |
| `auth.denied` | RLS/policy reject | `{ resource, reason }` |
| `stt.segment` | STT 결과 수신 | `{ text, confidence, providerMs }` |
| `context.compose` | composeFullContext 호출 | `{ totalTokens, blocks: {guardrails:500,...}, truncated:['rag'] }` |
| `thinking.route` | level routing | `{ chosen, reason, classifierConfidence }` |
| `llm.call` | Gemini 호출 완료 | `{ thinking, ttftMs, totalMs }` + tokens_in/out/model |
| `tool.call` | Tool execute | `{ args (redacted), ok, resultPreview }` |
| `tool.gated` | 호감도 부족으로 hidden | `{ requiredLevel, actualLevel }` |
| `affection.change` | bumpAffection 결과 | `{ from, to, delta, reason, byTool }` |
| `memory.fact_upsert` | recordFact | `{ entityId, key, confidence, source }` |
| `memory.relation_insert` | recordRelation | `{ subject, predicate, object }` |
| `memory.chunk_insert` | RAG chunk 저장 | `{ chunkType, importance, embedDims }` |
| `memory.rag_hit` | RAG 검색 | `{ query, topK, chunkIds, scores }` |
| `mood.transition` | mood_state 변경 | `{ from, to, intensity, reason }` |
| `cutscene.trigger` | playCutscene | `{ eventKey, assetId }` |
| `tts.segment` | ElevenLabs 청크 수신 | `{ chars, ms, voiceId }` |
| `reflection.run` | async reflect 완료 | `{ facts:N, relations:N, episodes:N }` |
| `error` | catch-all | `{ where, args }` + error |

### 7.6.3 Helper — `packages/shared/src/audit/log.ts`

```ts
export class Audit {
  constructor(
    private supabase: SupabaseClient,  // pass-through JWT client (agent) or ssr server client (web)
    private base: { userId: string | null; characterId: string | null; sessionId: string | null }
  ) {}

  private currentTrace: string | null = null;
  newTrace() { return (this.currentTrace = crypto.randomUUID()); }

  log(e: {
    kind: string; name?: string; level?: 'debug'|'info'|'warn'|'error';
    durationMs?: number; payload?: Record<string, unknown>;
    error?: unknown; model?: string; tokensIn?: number; tokensOut?: number;
  }) {
    // fire-and-forget — hot path에서 await 금지
    void this.supabase.from('audit_log').insert({
      ...this.base,
      trace_id: this.currentTrace,
      level: e.level ?? 'info',
      kind: e.kind,
      name: e.name,
      duration_ms: e.durationMs,
      payload: redact(e.payload ?? {}),
      error: e.error ? String((e.error as Error)?.stack ?? e.error) : null,
      model: e.model,
      tokens_in: e.tokensIn,
      tokens_out: e.tokensOut,
    });
  }

  async wrapTool<T>(name: string, args: unknown, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      this.log({ kind: 'tool.call', name, durationMs: performance.now() - start,
        payload: { args: redact(args), ok: true, resultPreview: preview(result) } });
      return result;
    } catch (err) {
      this.log({ kind: 'tool.call', name, level: 'error',
        durationMs: performance.now() - start,
        payload: { args: redact(args), ok: false }, error: err });
      throw err;
    }
  }
}
```

`redact(obj)`는 `email`, `phone`, `ssn`, `address`, `raw_utterance` 같은 키에 대해 해시/마스킹. 기본 룰은 PII 키 화이트리스트.

### 7.6.4 RLS

```sql
alter table audit_log enable row level security;

-- authenticated: 자기 row만 insert 가능 (agent/app 코드가 JWT pass-through로 쓸 때)
create policy "own audit insert" on audit_log
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- authenticated: 자기 로그 읽기 허용 (유저용 "세션 리플레이" 기능 확장 대비)
create policy "own audit read" on audit_log
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- system 이벤트(user_id null)는 service_role만 insert (auth.denied 등)
```

`auth.denied` 같은 system 이벤트는 Next.js Route Handler (service_role client)에서 쓰도록 한다.

### 7.6.5 Trace 상관

한 턴의 흐름을 엮는 패턴:

```
Agent 턴 시작
 → audit.newTrace()   // trace_id 생성
 → stt.segment
 → context.compose
 → thinking.route
 → llm.call
 → tool.call × N
 → affection.change  (있으면)
 → memory.* (있으면)
 → tts.segment × N
 → (turn end)
```

디버깅 쿼리:
```sql
-- 어제 오후 7시경 user A의 세션에서 tool 에러 트레이스
select ts, kind, name, duration_ms, payload, error
  from audit_log
  where user_id = :user_a
    and ts > now() - interval '1 day'
    and trace_id in (
      select trace_id from audit_log
        where kind = 'tool.call' and level = 'error'
    )
  order by ts;
```

### 7.6.6 비용 추적 뷰

```sql
create view v_daily_cost as
select
  date_trunc('day', ts) as day,
  user_id,
  model,
  sum(tokens_in)  as in_tok,
  sum(tokens_out) as out_tok,
  -- Gemini 3 Flash Preview 단가 기준 (재검증 필요)
  sum(tokens_in)  * 0.0000003 + sum(tokens_out) * 0.0000025 as cost_usd_est
from audit_log
where kind = 'llm.call' and tokens_in is not null
group by 1,2,3;
```

### 7.6.7 Retention 정책

해커톤은 무시. 프로덕션은 `pg_cron`으로 30일 이상 로그 cold storage(Supabase Storage parquet)로 이동 — out of scope.

### 7.6.8 Wiring 지점

| 위치 | 이벤트 |
|---|---|
| `apps/web/app/api/livekit/token/route.ts` | `auth.token_issue` |
| `apps/web/middleware.ts` (또는 `proxy.ts`) | `auth.denied` (service_role 사용, system event) |
| `apps/agent/src/entrypoint.ts` connect/disconnect | `session.*` |
| `apps/agent/src/entrypoint.ts` dataReceived(auth_refresh) | `auth.refresh` |
| STT plugin hook (or voice event) | `stt.segment` |
| `prompt/compose.ts` 말미 | `context.compose` |
| `crafting/routeThinking` | `thinking.route` |
| `llm.tool` execute wrapper | `tool.call` (Audit.wrapTool) |
| Tool gating filter | `tool.gated` |
| `bumpAffection` tool 내부 | `affection.change` |
| `recordFact`/`recordRelation` | `memory.fact_upsert` / `memory.relation_insert` |
| RAG query 함수 | `memory.rag_hit` |
| `updateMood` tool | `mood.transition` |
| `playCutscene` tool | `cutscene.trigger` |
| TTS chunk callback | `tts.segment` |
| `reflect()` 말미 | `reflection.run` |
| LLM provider hook | `llm.call` |
| 전역 try/catch | `error` |

### 7.6.9 로컬 디버그 편의

개발 중에는 `DEBUG_AUDIT=true`일 때 `console.log`로도 같은 이벤트 emit. 프로덕션에서는 DB만.

```ts
if (process.env.DEBUG_AUDIT === 'true') {
  console.log(`[audit] ${kind} ${name} ${JSON.stringify(payload)}`);
}
```

### 7.6.10 체크리스트

- [ ] `audit_log` 테이블 + 인덱스 4개 + RLS policy 3개 (Phase 2에 포함)
- [ ] `packages/shared/src/audit/{log.ts, redact.ts}` 구현 (Phase 4.5에 포함)
- [ ] Agent entrypoint에 Audit 인스턴스 주입 (`base.sessionId = ctx.room.name`)
- [ ] 모든 tool을 `audit.wrapTool(...)`로 래핑 (adapter-livekit 내부)
- [ ] LLM 호출 wrapper에 model/tokens 로깅
- [ ] `DEBUG_AUDIT=true` 로컬 개발 기본 설정
- [ ] 데모 전 `select count(*) from audit_log where level='error'` 체크 (0 목표)

---

## 8. 실행 단계 (Implementation Steps)

### Phase 1 — Scaffold & Prune (0.5일)

1. `me` 레포를 `stdev2026/`으로 복제 후 git init 새로 시작.
2. 패키지 이름 rename: `@hs/*` → `@mys/*` (`mys` = 미연시).
3. 제거: `apps/web/app/admin/**`, `apps/web/app/api/auth/[...nextauth]/`, `apps/web/app/api/auth/passkey/**`, `apps/web/app/api/auth/elevation/**`, `apps/web/components/passkey/**`, `apps/web/lib/passkey.ts`, `packages/shared/src/identity/enrollment.ts`, `packages/shared/src/tools/{writings,elevation,profile,recognition,actions}.ts`.
4. 의존성 정리 — `@simplewebauthn/*`, `next-auth`, `nodemailer` 제거. `@supabase/ssr` 추가.
5. Next.js 15 → 16 마이그레이션 (`middleware.ts` → `proxy.ts`, async cookies/headers).
6. `ai` v6 브레이킹 반영 — tool 정의의 `parameters` → `inputSchema`.

**수락 기준**: `pnpm typecheck`, `pnpm build` 통과. 홈 페이지 렌더링.

### Phase 2 — Auth & Schema (0.5일)

1. Supabase 프로젝트 생성, `@supabase/ssr` 세팅 (`lib/supabase/{server,client,middleware}.ts`).
2. `/auth/callback/route.ts`에서 `exchangeCodeForSession()`.
3. 매직링크 로그인 UI (`app/page.tsx` 랜딩).
4. 새 Drizzle 스키마 작성 후 `pnpm db:push`.
5. RLS 정책 마이그레이션 SQL 작성 후 적용.
6. seed 스크립트: 4명 캐릭터 (1명 `is_demo_ready=true`, 나머지 false) + 임시 voice_id.

**수락 기준**:
- 매직링크 메일 수신 → 클릭 → `@supabase/ssr` 쿠키 확인.
- 두 계정으로 서로의 `affection_state`, `facts`, `memory_chunks` 접근 불가 확인 (RLS 교차 테스트).
- 두 bucket(`characters-public`, `user-private`) 생성 + Storage policy 4개 적용 (§7.5.5).
- user A가 user B의 `user-private/<B_uid>/*` 파일을 signed URL 없이 접근 시 403 반환.
- `characters-public/<slug>/*.webp`는 비로그인 상태에서도 CDN 캐시로 로드 가능.
- `.env` grep으로 `SUPABASE_SERVICE_ROLE_KEY`가 `NEXT_PUBLIC_` 접두 없음 확인.

### Phase 3 — Voice Pipeline (1일)

1. `apps/agent/src/entrypoint.ts` 작성 — Deepgram ko + Gemini 3 Flash Preview + ElevenLabs `eleven_flash_v2_5`. LiveKit `plugin-google` 최신 버전에서 `gemini-3-flash-preview` model ID를 받는지 Phase 3 초기에 스모크 테스트 (호환 이슈 시 `gemini-2.5-flash`로 즉시 폴백).
2. `MiyeonshiAgent` 클래스 — `composeSystemPrompt` 주입, `tool-adapter`로 tool catalog 주입.
3. `/api/livekit/token` — Supabase 세션에서 user.id 읽고, 요청 body에서 `characterId` 받아 metadata에 포함.
4. LiveKit Cloud 프로젝트 연결, 로컬 `pnpm dev:agent`로 dev 모드 실행.

**수락 기준**: 로그인한 유저가 캐릭터 페이지에서 "Talk" 클릭 → LiveKit 연결 → ElevenLabs 음성으로 캐릭터 첫 인사 들림. 응답 latency 사용자 발화 종료~TTS 시작 ≤ 1.5s.

### Phase 4 — Tool Catalog & Affection Loop (1일)

1. `SharedToolDef` + 두 어댑터 구현.
2. 8개 tool 구현 (Section 6 표). `bumpAffection` side channel + system prompt 재생성 로직.
3. `composeSystemPrompt`에 호감도 level별 persona block 끼워넣기.
4. 세션 종료 시 `recordMemory` 호출 (agent의 `ctx.room.on('disconnected')` 또는 클라이언트 종료 버튼).

**수락 기준**:
- LLM이 상황에 따라 `bumpAffection` 호출 → DB level 변경 → 다음 답변부터 톤/호칭 바뀜 (수동 로그 확인).
- 세션 2회차 시 `recallMemory`가 이전 요약을 프롬프트에 주입해 캐릭터가 과거 대화를 언급.

### Phase 4.5 — Agent Crafting 핵심 (1~1.5일, T0·T1 타이어)

동반 문서 Section 7의 T0/T1 체크리스트를 따라 구현:
1. `entities`/`relations`/`facts`/`memory_chunks` 테이블 마이그레이션 (pgvector 확장 포함).
2. `packages/shared/src/memory/` 디렉토리 — `load.ts`, `write.ts`, `embed.ts`(text-embedding-005), `rag.ts`, `reflect.ts`.
3. `composeFullContext` — token-budget + block-priority 조립 (crafting Section 4.2).
4. `recordFact` / `recordRelation` / `recordEpisode` tool — LLM이 대화 중 호출해 온톨로지 쓰기.
5. Mood state machine (`mood_state` 테이블 + decay read 연산 + `updateMood` tool).
6. Tool gating (`gating.ts`) — affection level에 따른 tool 필터.
7. Thinking level routing 룰 함수 (`routeThinking(userText, snap)`).
8. 세션 종료 시 async `reflect()` 호출.

**수락 기준**:
- 유저가 "내 생일 3월 14일이야" → 이후 세션에서 캐릭터가 해당 날짜를 기억해 언급 (facts 테이블 확인 + 응답 확인).
- 유사 주제 발화 시 RAG로 과거 `memory_chunks`가 상위에 잡혀 자연스럽게 언급됨 (로그에 retrieved chunks 기록).
- 무례한 발화 → 다음 턴에 `mood=annoyed` → 캐릭터 어투가 짧아짐 (수동 검증).
- `kiss` 같은 고-호감도 tool은 `friend` 레벨에서 tool 목록에 노출되지 않음 (tool list 스냅샷 확인).

### Phase 5 — Asset Integration & UI (0.5~1일)

1. 팀원이 생성한 영상/표정 컷/컷씬을 Supabase Storage에 업로드, `character_assets` 테이블에 등록.
2. `character-sprite.tsx` — 기본 sprite + `setEmotion` 이벤트 구독 → 컷 교체.
3. `cutscene-player.tsx` — `playCutscene` 이벤트 수신 시 풀스크린 비디오 재생, **LiveKit 마이크 mute + TTS 잠시 중단** (data channel로 "pause TTS" 신호) 후 재생 종료 시 재개.
4. 캐릭터 선택창 — demo_ready가 아닌 캐릭터는 grayscale + "coming soon" 배지.

**수락 기준**: 컷씬 재생 도중 음성 충돌 없음. 표정 전환이 자연스럽게 반영.

### Phase 6 — Deploy & Demo Prep (0.5일)

1. Vercel에 `apps/web` 배포 (env 주입).
2. `lk agent deploy` → LiveKit Cloud 에이전트 배포.
3. 프로덕션 URL에서 e2e flow 3회 재현.
4. README 및 데모 시나리오 준비.

**수락 기준**: 새 브라우저 (incognito) → 매직링크 → 캐릭터 선택 → 3분 이상 안정적 음성 대화 + 1회 컷씬 + 호감도 level up 발생.

---

## 9. Risks & Mitigations

| 위험 | 영향 | 완화 |
|---|---|---|
| ElevenLabs 한국어 voice cloning 품질 | 캐릭터 몰입도 저하 | Phase 0에 샘플 3개로 사전 테스트. 부족 시 preset Korean voice fallback. |
| AI SDK v6 브레이킹 놓침 (`parameters`) | typecheck fail, 프로덕션 런타임 에러 | Phase 1에서 `rg "parameters:" packages/shared/src/tools` 전수 검사. |
| Gemini 3 Flash Preview `preview` 딱지 | 모델 갑자기 deprecate / 이름 변경 | `packages/shared/src/config/models.ts`에 model ID 상수화. LiveKit `plugin-google` latest에서 model ID 수용 여부 Phase 3 시작 시 스모크. 이슈 시 `gemini-2.5-flash`로 환경변수 한 줄 교체. |
| Gemini 한국어 tool-call 정확도 | 엉뚱한 tool 호출 / 호감도 오승격 | few-shot 예시를 prompt에 포함. `stepCountIs(5)`로 폭주 방지. Gemini 3 Flash의 thinking level을 `medium`으로 기본 설정. |
| 컷씬 재생 도중 LiveKit 오디오 충돌 | 데모 중 TTS와 BGM 겹침 | data channel signal로 agent `session.interrupt()` 호출, 컷씬 끝나면 재개. |
| LiveKit Cloud free tier cold start | 첫 연결 지연 | paid plan ("always warm") 사용. 해커톤 예산 확인. |
| Supabase Storage 첫 접속 CDN cold | sprite/영상 로드 느림 | 캐릭터 페이지 진입 시 `<link rel="preload">` 로 assets 사전 요청. |
| RLS 설정 누락 | 유저 간 데이터 누출 | Phase 2 말에 두 계정 교차 테스트 필수. Storage `objects` 정책도 동시에 (§7.5.5). |
| Agent에 service_role 누출 | 단일 워커 유출 = 전체 테넌트 데이터 노출 | Agent는 **JWT pass-through만** 사용 (§7.5.1). LiveKit Cloud env에 service_role 주입 금지. 배포 전 env grep. |
| Supabase JWT 1h 만료로 장기 통화 끊김 | 감성 씬 중 연결 끊김 = 데모 재앙 | 클라이언트 refresh + data channel `auth_refresh` topic으로 agent에 재주입 (§7.5.2). 로컬 5분 TTL 스모크. |
| Storage bucket 설정 실수로 private 파일 public 노출 | 유저 녹취·메모 유출 | Supabase dashboard에서 bucket visibility를 배포 체크리스트에 포함. 해커톤에서는 `user-private` 비워두면 위험 최소. |
| 매직링크 이메일 딜리버러빌리티 | 데모 현장에서 이메일 지연 | Supabase Dashboard에서 커스텀 SMTP (Resend) 구성. 백업용 OTP 플로우도 한 번 검토. |

---

## 10. Verification Steps

### Level 1 — 빌드/타입

```bash
pnpm install
pnpm typecheck              # 전 패키지 통과
pnpm build                  # web + agent 빌드 성공
```

### Level 2 — 인증/DB

```bash
# 1) 매직링크 플로우
curl -X POST $SUPABASE_URL/auth/v1/otp \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d '{"email":"test@example.com"}'
# → 이메일 도착 확인

# 2) RLS 격리
#    사용자 A 로그인 → affection_state insert
#    사용자 B 로그인 → affection_state select → A 데이터 안 보임
```

### Level 3 — Voice loop 수동 스모크

- 로그인 → 캐릭터 선택 → Talk → "안녕"
- 캐릭터가 ElevenLabs 한국어 음성으로 1.5초 내 응답
- "내 이름은 헨리야"로 알림 → `recordMemory` 발동
- 세션 종료 → 재접속 → 캐릭터가 "헨리" 언급하는지 확인

### Level 4 — 도구/호감도

- 수동 프롬프트 주입 또는 대화로 `bumpAffection` 유도
- DB `affection_state.level` 변경 확인
- 다음 턴 음성 톤/호칭 변화 확인

### Level 5 — 부하/안정성 (선택)

- 3분 연속 대화 (interruption 5회 포함) 중 끊김 없음
- 메모리 누수 없음 (agent 프로세스 메모리 flat)

---

## 11. Out of Scope (해커톤 이후)

- 다국어 (일본어/영어)
- 스토리 구현 확장 (나머지 3명)
- UGC/커스텀 캐릭터
- 결제/구독 (IAP)
- 모바일 앱 래퍼 (Capacitor)
- 풀 다이얼로그 로그 저장 (현재는 요약만)
- 실시간 그룹 대화 (멀티 캐릭터 동시 세션)

---

## 12. Final Checklist

- [ ] 해커톤 실 데드라인 확정 (3~5일 가정 검증)
- [ ] ElevenLabs 한국어 voice sample 3개 미리 녹음·검증
- [ ] Supabase 프로젝트 + LiveKit Cloud 프로젝트 + ElevenLabs/Deepgram/Google AI 크레딧 확보
- [ ] 팀원의 AI 에셋 전달 포맷·네이밍 컨벤션 합의 (type, emotion, eventKey)
- [ ] 커스텀 SMTP (Resend) 준비 — 매직링크 안정성
- [ ] `me` 라이선스/저작권 확인 (개인 프로젝트에서 파생)

---

## Appendix A — `me`에서 직접 재사용 가능한 파일

| `me` 파일 | 재사용 방식 | 변경 포인트 |
|---|---|---|
| `apps/web/components/voice-panel.tsx` | 거의 그대로 | `characterId`를 token API에 전달하도록 fetch body 추가 |
| `apps/web/app/api/livekit/token/route.ts` | 구조 재사용 | identity 체인을 `@supabase/ssr getClaims()`로 교체, metadata에 `characterId` 추가 |
| `apps/agent/src/entrypoint.ts` | 구조 재사용 | VAD/STT/LLM/TTS 설정 그대로, `parseIdentityMetadata`에 `characterId` 추가 |
| `apps/agent/src/tool-adapter.ts` | elevation → affection 치환 | `__internal_jwt` → `__bump_affection` 사이드채널로 이름만 변경 |
| `packages/shared/src/prompt/compose.ts` | 골격 재사용 | role 기반 분기 → affectionLevel 기반 분기 |
| `packages/shared/src/prompt/person.ts` | buildPersonBlock 패턴 재사용 | 호감도 단계별 persona block (5 단계) |
| `packages/shared/src/db/client.ts` | 그대로 | 스키마만 교체 |
| `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` | 그대로 | — |

---

## Appendix B — 환경변수 목록

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# LiveKit
LIVEKIT_URL=wss://xxx.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# Voice pipeline
DEEPGRAM_API_KEY=
GOOGLE_API_KEY=
ELEVENLABS_API_KEY=
CHAR_DEFAULT_VOICE_ID=   # 데모 캐릭터 ElevenLabs voice id

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```
