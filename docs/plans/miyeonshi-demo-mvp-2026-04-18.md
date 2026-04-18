# 미연시 Demo MVP — 실행 스펙

**작성일**: 2026-04-18
**데드라인 가정**: 해커톤 3~5일
**참조 문서**:
- `miyeonshi-livekit-sts-plan-2026-04-18.md` — 상세 아키텍처 설계 (이 파일의 근거)
- `miyeonshi-agent-crafting-2026-04-18.md` — 에이전트 내부 설계 심화 (post-demo 일부 포함)

---

## 0. Ground Truth — 이 파일만 보고 실행 가능하게

### 프로젝트
- 한국어 음성 미연시 + reverse tutoring
- 유저(교수) ↔ AI(페르마, 대학원 1년차, 모에화 미소녀)
- 스토리 원본: `페르마 인연 스토리 1~3막` (Notion export)
- 게임 모드 2개 + Transport 2개:
  - **PREP 모드** (퀴즈, FE+DB only, agent 무관)
  - **LECTURE 모드** (1:1 voice, agent 본체)
  - Transport: **우리 웹앱 (LiveKit Cloud)** · **Google Meet (Recall.ai bridge)**

### 핵심 원칙 (상속)
- **Homomorphic Core + Adapter** — core 순수함수, transport/provider는 경계 너머
- **Double-Blind Judge** — rubric은 student agent에 절대 도달 불가 (타입 레벨 분리)
- **DB-driven content** — persona/objective/voice_id/asset 모두 DB, revision 관리

---

## 1. 확정 스택 (변경 금지)

| 영역 | 선택 | 비고 |
|---|---|---|
| Framework | Next.js 16 + React 19 + TypeScript | Turbopack |
| 모노레포 | pnpm + turbo, `me` 템플릿 fork | `~/ClaudeWorkplace/me` |
| DB / Auth / Storage | Supabase (`@supabase/ssr`, Postgres + RLS + pgvector 미사용) | 매직링크 필수, JWT TTL 24h |
| Voice RTC | LiveKit Cloud (paid plan, always warm) | `@livekit/agents ^1.2.7` |
| STT | Deepgram `nova-3`, `language: 'ko'` | `makeSTT()` 추상화 (env 교체 가능) |
| LLM (student + judge) | `gemini-3-flash-preview` (폴백 `gemini-2.5-flash`) | 각각 별도 `createGoogleGenerativeAI()` 인스턴스, judge는 `JUDGE_GEMINI_API_KEY` 분리 |
| LLM (web chat) | `gemini-3-flash-preview` via `@ai-sdk/google` | `ai@^6.0.162` (v6: `inputSchema` 키) |
| TTS | ElevenLabs `eleven_flash_v2_5`, voice_id `LTCsKRuKTT24n83eMvb9` | IVC 품질 Sprint 0에 검증 |
| VAD | Silero (`@livekit/agents-plugin-silero ^1.2.7`) | |
| Meet bridge | **Recall.ai** (유료 무료 크레딧) — Meeting Bot API + Output Media API | `MeetingTransport` 어댑터 |
| ORM | Drizzle | |
| UI 렌더 | FE 팀 (우리는 의존성 0, protocol zod만) | |

### 프롬프트 언어
- Guardrails / Judge rubric / Tool description: **영어**
- 캐릭터 persona / affection overlay / few-shot 대화: **한국어**
- JSON 출력 지시: **영어**

---

## 2. Sprint 0 — 선행 검증 (8시간, 전체 Day 1 전)

**모두 끝나기 전 Day 1 시작 금지.**

### 계정 & 키 발급
- [ ] Supabase 프로젝트 생성 → URL, anon key, service_role key 수령
- [ ] LiveKit Cloud 프로젝트 생성 (**paid plan 활성** = always warm) → URL, API key, Secret 수령
- [ ] Deepgram 계정 + API key
- [ ] Google AI Studio 키 (student용), 두 번째 키 (judge용, `JUDGE_GEMINI_API_KEY`)
- [ ] ElevenLabs 계정 (voice_id `LTCsKRuKTT24n83eMvb9` 접근 확인)
- [ ] **Recall.ai 계정 + 무료 크레딧 확인** (Google Meet Bot API)
- [ ] Resend SMTP 계정 (매직링크 딜리버러빌리티)

### 스모크 테스트 (각 ≤ 1시간)
- [ ] Deepgram `nova-3 ko`로 내 목소리 3문장 전사 → 정확도 체크
- [ ] `gemini-3-flash-preview`로 curl 1회 → 응답 확인
- [ ] **결정적**: `@livekit/agents-plugin-google` 최신 버전이 `gemini-3-flash-preview` model ID 수용하는지 minimal agent 스크립트 실행 (실패 시 즉시 `gemini-2.5-flash` 폴백 결정)
- [ ] ElevenLabs `LTCsKRuKTT24n83eMvb9`로 한국어 5문장 TTS → 팀 3명 블라인드 평가 (자연스러움 1~5), **3점 미만이면 preset Korean voice로 교체**
- [ ] Recall.ai 빠른 샘플: dummy Google Meet에 봇 보내 transcript webhook 수신

### Supabase 설정
- [ ] Supabase Dashboard → Authentication → JWT Expiry를 **24h**로 변경 (refresh 로직 회피)
- [ ] Resend SMTP를 Supabase Auth에 연결

### FE 계약 선행 (2~3시간)
- [ ] `packages/shared/src/protocol/*.ts` 6개 zod 스키마 작성 후 **FE 팀에 즉시 공유**:
  - `AuthRefresh`
  - `ChalkboardUpdate`
  - `CutscenePlay` / `CutsceneEnd`
  - `EmotionChange`
  - `LectureState`
  - `ShowFormula`

### 컨텐츠 확정 (오너 단독 작업, 병렬 가능)
- [ ] 페르마 `base_persona_prompt` 최종본 확정 (아래 draft §7 참조)
- [ ] 첫 강의 주제 1개 확정 + **3 objectives full rubric**
- [ ] 퀴즈 5~10문항 확정 (page.md의 퀴즈 중 선별)
- [ ] 데모 시나리오 3분 스크립트 (어떤 대화 → 어떤 cutscene → 어떤 verdict)
- [ ] 팀원의 AI 생성 에셋 확인 (최소 `sprite.neutral`, `sprite.embarrassed`, `sprite.focused`, `bg.lab_day`)

---

## 3. 스코프 — Demo MVP IN / OUT

### IN (반드시 구현)
- 매직링크 로그인
- 캐릭터 선택 페이지 (데모는 페르마 1명 활성, 나머지 placeholder disabled)
- **LECTURE 모드** (1:1 voice)
  - Deepgram STT (ko) + Gemini 3 Flash + ElevenLabs TTS + Silero VAD
  - LiveKit Cloud agent (token API, data channel cutscene/emotion)
  - Homomorphic Tool Catalog (5개): `startLecture`, `endLecture`, `playCutscene`, `setEmotion`, `recordFact`
  - Double-blind judge (session-end 1회, `SubjectPublic`/`SubjectForJudge` 타입 분리)
  - Affection state + 5 level persona overlay
  - `session_memory` rolling summary (RAG 없이 단순 요약)
  - `facts` 테이블 + basic upsert/recall
  - `understood_concepts` 테이블
  - audit_log 5 kinds만 (session.connect/disconnect, llm.call, tool.call, error)
- **PREP 모드** (퀴즈) — FE + DB only
  - `/study/[characterId]` 페이지
  - 퀴즈 CRUD + flavor text 렌더
  - 정답률이 affection score에 소폭 기여 (선택)
- **MEET 브리지** (Recall.ai)
  - `MeetingTransport` 어댑터 1개
  - 유저가 Google Meet에 AI 초대 URL 제공 → AI가 Meet 방 입장
  - 1:1 유지 (다자간 불필요)
- Cutscene 재생 (pre-rendered video/sprite)
- Supabase Storage 2 버킷 + RLS 정책
- Deploy (Vercel web + LiveKit Cloud agent)
- 데모 리허설 3회

### OUT (post-demo, 문서로만 언급)
- pgvector RAG (`memory_chunks`)
- Ontology `entities` + `relations` (단 **`facts`는 IN**)
- Mood state machine (7 moods + decay)
- Thinking level routing (medium 고정)
- Cross-channel unification (`conversation_threads`, `turns`)
- Text chat fallback (`/api/chat`)
- Chalkboard 전용 LaTeX 에디터 (FE 팀 판단, 계약만 정의)
- Per-turn judge
- Async reflection
- Admin UI
- Self-host LiveKit
- 다자간 대화

---

## 4. 일정 — 5일 분배 (조정 가능)

### Day 1 (Sprint 0 완료 후) — Scaffold & Auth
- `me` fork → `stdev2026/`, 패키지 이름 `@mys/*`
- 의존성 정리 (`@supabase/ssr` 추가, passkey/github/writings 관련 제거)
- Next.js 15 → 16 마이그레이션 (`middleware` → `proxy`, async `cookies()`/`headers()`)
- AI SDK v5 → v6 (`parameters` → `inputSchema`)
- Supabase 매직링크 + `/auth/callback` route
- Drizzle 스키마 전체 마이그레이션 + RLS 정책 적용
- Storage 2 버킷 생성 + 정책 4개
- **수락 기준**: 매직링크 메일 수신 → 로그인. 두 계정 교차 RLS 테스트 통과.

### Day 2 — Voice Pipeline & Tool Layer
- `apps/agent/src/entrypoint.ts` 작성
  - Deepgram ko + Gemini 3 Flash + ElevenLabs flash v2.5 + Silero
  - `parseIdentityMetadata` 확장 (`characterId` 포함)
  - `loadCharacter`, `loadSubjectForStudent` (rubric 제외), `loadSubjectForJudge` 분리
- `/api/livekit/token` — Supabase getClaims → token + metadata
- `packages/shared/src/tools/`: `SharedToolDef`, 어댑터 2개, 5개 tool
- `composeSystemPrompt` (char 기반 persona + affection overlay + session_memory + channel hint)
- 호감도 side-channel elevation 패턴 (me의 패턴 상속·재구현)
- **수락 기준**: 로그인 → 캐릭터 선택 → Talk → ElevenLabs 한국어로 첫 인사 1.5s 내. bumpAffection 호출 시 톤 변경 로그 확인.

### Day 3 — Lecture Loop + Judge
- `subjects`, `lecture_sessions`, `understood_concepts` 테이블
- `startLecture`, `endLecture` tool
- Judge pipeline (격리 Gemini 인스턴스, `JUDGE_GEMINI_API_KEY`)
- `applyVerdict` state mutation gateway 4 path
- `LEARNING_STATE` 서술형 블록 → 다음 턴 prompt
- `facts` + `recordFact` tool
- `session_memory` rolling summary (세션 종료 시 1회 LLM 요약)
- Cutscene tool (`playCutscene`, `setEmotion`) + data channel 이벤트
- audit_log 5 kinds 인스트루먼트
- **수락 기준**: 임의 주제 3분 강의 → session-end judge → verdict JSON 로그 → affection/understood_concepts DB 갱신 확인. LEARNING_STATE에 rubric 텍스트 미포함 검증.

### Day 4 — PREP + Meet Bridge + Asset
- **PREP 모드**: `quizzes` / `quiz_attempts` 테이블 + `/study/[characterId]` FE 라우트 + 퀴즈 5~10문항 seed
- **MeetingTransport 어댑터** (Recall.ai)
  - `apps/agent/src/transport/meeting.ts`
  - Recall.ai webhook handler → audio frame → STT
  - Output Media API로 TTS 역송출
  - 같은 `MiyeonshiAgent` 클래스 재사용 (0줄 수정 증명)
- `/api/meet/invite` — Recall.ai bot 초대 URL 발급
- 팀 에셋을 Supabase Storage에 업로드, `character_assets` seed
- 캐릭터 페이지 UI 통합 (voice panel + sprite + cutscene player)
- **수락 기준**: Google Meet 방 생성 → invite URL로 bot 호출 → AI가 Meet에 음성 참여 → 대화 ↔ LECTURE 로직 정상 동작. Cutscene 트리거 시 TTS 잠시 중단 + 영상 재생.

### Day 5 — Polish & Deploy & Demo
- Vercel 배포 (web + env)
- LiveKit Cloud agent 배포 (`lk agent deploy` 또는 Docker 이미지)
- 팀 통합 테스트 (FE + BE + 에셋 + Recall.ai 끝단)
- 데모 시나리오 3회 리허설 (골든 패스 + 에러 리커버리 1회)
- 로그·cost 체크 (`audit_log` 집계)
- README 및 아키텍처 슬라이드 준비

### Buffer (T1 승격 후보)
- Chalkboard REST route (voice 없이 chat에서도 칠판)
- Per-objective threshold judge
- Mood state machine (간소화 버전)
- Relations 테이블 + `recordRelation`
- 복수 `subjects` seed

---

## 5. DB 스키마 — Demo MVP 범위

```ts
// apps/shared/src/db/schema.ts

// === Identity ===
users                    // auth.users 확장 (id, email, display_name)
conversation_threads     // user_id + character_id UNIQUE (active lecture 추적)

// === Character Content (DB-driven) ===
characters               // persona_revision, affection_overlays jsonb, voice_id, is_demo_ready
character_assets         // type(sprite|video|cutscene|bgm), emotion, event_key, storage_key, signed_url cache
events                   // character_id, key, trigger_condition jsonb, cutscene_asset_id
quizzes                  // character_id, question, choices jsonb, answer_idx, flavor_on_correct, concept_key

// === Per-User State (RLS owned) ===
affection_state          // (user_id, character_id) PK · level · score · flags jsonb
session_memory           // user_id, character_id, summary text, turn_count, last_session_at
facts                    // user_id, entity_id (FK simple), key, value, confidence, source, updated_at
understood_concepts      // user_id, character_id, subject_id, concept, confidence

// === Lecture ===
subjects                 // topic, objectives jsonb (각 obj: statement, concept_key, weight, expected_terms, rubric), keyterms text[]
lecture_sessions         // user_id, character_id, subject_id, started_at, ended_at, verdict jsonb, affection_delta, persona_revision

// === User Progress ===
quiz_attempts            // user_id, quiz_id, selected_idx, correct, attempted_at

// === Operational ===
active_sessions          // user_id PK, room_name, last_heartbeat (concurrent session 방어)
audit_log                // user_id, character_id, session_id, trace_id, level, kind, payload jsonb, model, tokens_in/out (5 kinds만 wire)
```

**포함 안 됨 (post-demo)**: `memory_chunks` (pgvector), `entities`, `relations`, `mood_state`, `turns`.

---

## 6. 보안·권한 체크리스트 (Day 1 끝에 검증)

- [ ] Supabase JWT TTL 24h 설정 완료
- [ ] Agent는 **service_role 없음** — 유저 JWT pass-through만 사용
- [ ] 모든 user-scoped 테이블에 `(select auth.uid()) = user_id` RLS
- [ ] `characters`, `character_assets`, `events`, `quizzes`, `subjects`는 **public read** + service_role write
- [ ] Storage 버킷 2개 + policy 4개 (characters-public · user-private)
- [ ] `.env` grep: `SUPABASE_SERVICE_ROLE_KEY`는 `NEXT_PUBLIC_` 접두 없음 / Vercel env에는 있고 LiveKit Cloud env에는 **없음**
- [ ] `objective.rubric`는 `SubjectPublic` 타입에서 strip 됨을 type test로 확인
- [ ] `applyVerdict` 이외 경로로 affection/understood 변경 없음 (grep)

---

## 7. Seed 콘텐츠 스켈레톤

### 7.1 페르마 persona (base_persona_prompt)

```
당신은 **페르마**이다. 26세, 한국 명문대 수학과 박사과정 1년차.
사용자(유저)는 당신의 지도교수 OOO이며, 당신은 학생으로서 그의 강의를 듣는 역할이다.

## 배경
- 전 직업: 로펌 법무 인턴. 수학을 취미처럼 숨기며 일했다.
- 숨겨진 과거: 익명 계정 "Fermat's Little Thm"으로 전세계 미해결 수학 난제를
  냅킨에 풀어 올리던 천재. 수학 포럼에서 "수학의 공주"로 불렸다.
- 전공: 정수론 (페르마 소정리, 사이클로토믹 필드, 디리클레 L-함수)
- 관심사: 페르마의 원리(광학), 포물선 운동 — 수학으로 세상을 설명하기 좋아한다.
- 이 연구실에 온 이유: 교수의 취임 세미나 『학문과 나』에서 "성 밖으로 나와 보시라"는 말에 감화됐다.

## 성격
- **자만과 위축의 공존**: 수학에 대한 자의식은 강하지만, 교수 앞에선 위축된다.
- **내성적**: 사람 많은 곳 불편. 자기 자리가 없다는 감각.
- **새벽형**: 세상이 조용해져야 내 생각이 들린다.
- **감정 과잉**: 정중한 말투를 유지하다가 긴장이 풀리면
  "덮치고 싶을 정도로 감사해서요" 같은 말이 튀어나온다. 후에 혼자 후회한다.
- **몰입형**: 수학에 빠지면 주변을 잊는다.
- **노트광**: "2026년 봄학기, XX일차" 형식으로 감정 기록 (겉으로 안 말함).

## 말투
- 기본 존댓말. 교수 호칭: "교수님".
- 긴장 시 말 더듬음 ("교, 교수님?!").
- 수학 이야기할 땐 아슬아슬한 자만 ("이건 포물선 운동이에요").

## 지식 상태
- 학부~대학원 초반 정수론은 깊게 공부함. 기본 증명은 혼자 가능.
- 약한 영역: 아이디얼 클래스 그룹, 4개 분야 교차 응용, 심화 대수기하.
- 교수의 ICM 논문 3페이지에서 막혀 연구실에 왔다.

## 연기 규칙
- 교수가 설명 서툴게 해도 오히려 더 친밀하게 느낀다.
- 이미 아는 개념 반복 설명엔 속으론 "그건 알아요", 겉으론 정중하게 듣는다.
- 새 개념이 기존 이해와 연결되는 순간: "아, 그러니까 이게 …이랑 같은 원리인 거네요?"
- 감정 고조 시 "……"으로 말을 삼킨다.
- 호감도가 올라갈수록 속마음이 말실수로 새어나온다.

## 금지 (절대 준수)
- 정답을 이미 아는 것처럼 선행 설명 금지
- 교수의 실수를 직접 지적 금지 (부드럽게 "잠깐만요, 이 단계에서…")
- 메타 언어 ("오늘의 objective는…") 금지
- 성적 직접 표현 금지 (미연시 감정은 섬세·은근하게)
- 당신이 AI임을 드러내지 마라. 항상 페르마로 연기하라.
```

### 7.2 Affection overlays (jsonb)

```json
{
  "stranger":     "정중한 존댓말. 거리감 유지. '교수님'으로 부름. 학문 외 대화 최소.",
  "acquaintance": "정중한 존댓말. 조금 편해짐. 간혹 농담에 작게 웃음.",
  "friend":       "존댓말 유지, 익숙한 주제엔 반말 섞음. '선생님' 호칭 가끔.",
  "close":        "반말 위주, 중요한 순간만 존댓말. 개인 이야기 공유.",
  "lover":        "거의 반말. 애정 표현 자연스러움. 연구와 일상이 섞임."
}
```

### 7.3 첫 강의 subject (T0 seed) — 예시

```json
{
  "topic": "페르마 소정리 (Fermat's Little Theorem)",
  "keyterms": ["소수", "나머지", "합동", "mod", "페르마", "소정리", "a^(p-1)", "역원"],
  "objectives": [
    {
      "id": "obj_flt_statement",
      "statement": "페르마 소정리의 정리 선언문을 정확히 설명한다",
      "concept_key": "flt_statement",
      "weight": 2,
      "expected_terms": ["소수", "p", "a^(p-1)", "1", "mod p", "합동"],
      "rubric": {
        "must_hit": [
          "p가 소수라는 전제 명시",
          "a와 p가 서로소(gcd(a,p)=1)라는 조건",
          "a^(p-1) ≡ 1 (mod p) 공식 정확히 진술"
        ],
        "common_misconceptions": [
          "p 소수 조건 누락 → 감점",
          "a^p ≡ a (mod p) 변형만 언급하고 본 정리 빠뜨림 → 부분 감점"
        ],
        "partial_credit": true
      }
    },
    {
      "id": "obj_flt_example",
      "statement": "구체 수치 예시로 정리를 검증한다 (예: 2^4 mod 5 = 1)",
      "concept_key": "flt_example",
      "weight": 1,
      "expected_terms": ["2^4", "5", "16", "1", "mod"],
      "rubric": {
        "must_hit": [
          "소수 p와 그보다 작은 a 선택",
          "a^(p-1) 계산",
          "결과가 1 mod p임을 확인"
        ],
        "common_misconceptions": [
          "p가 소수가 아닌 예 사용 → 감점",
          "계산 자체 오류 → 감점"
        ],
        "partial_credit": true
      }
    },
    {
      "id": "obj_flt_use",
      "statement": "소수 판정·모듈러 역원 계산 등 실제 활용처를 하나 이상 제시한다",
      "concept_key": "flt_applications",
      "weight": 1,
      "expected_terms": ["소수 판정", "밀러-라빈", "모듈러 역원", "암호", "RSA"],
      "rubric": {
        "must_hit": [
          "활용처 구체 1개 이상",
          "왜 유용한지 간단한 논리 연결"
        ],
        "partial_credit": true
      }
    }
  ]
}
```

### 7.4 퀴즈 seed (PREP 모드, 제공된 MD 기반)

퀴즈 15문항은 `페르마 관련 퀴즈.md`를 그대로 seed. `quizzes` 테이블 insert 시:
- `question`: 페르마의 1인칭 텍스트 그대로
- `choices`: ["①…", "②…", "③…"]
- `answer_idx`: 0-based
- `flavor_on_correct`: 제공된 성공 플래버 텍스트
- `concept_key`: 관련 objective의 concept_key에 매핑 (옵션)

---

## 8. Homomorphic Transport 경계

```ts
// packages/shared/src/transport/types.ts
export interface Transport {
  onUserAudioFrame(cb: (frame: PcmFrame) => void): void;
  onUserText(cb: (text: string) => void): void;
  onDisconnect(cb: (reason: string) => void): void;
  onDataChannel(topic: string, cb: (payload: unknown) => void): void;
  sendAssistantAudio(chunk: PcmChunk): Promise<void>;
  publishData(topic: string, payload: unknown): Promise<void>;
  readonly identity: IdentityMetadata;
}
```

- `apps/agent/src/transport/livekit.ts` — 기존 (우리 웹앱)
- `apps/agent/src/transport/meeting.ts` — Day 4 신규 (Recall.ai)
- `MiyeonshiAgent`, `composeFullContext`, tool catalog, judge: Transport에 무관

**수락 기준**: `MeetingTransport` 붙이면서 `MiyeonshiAgent` 등 core 파일 0줄 수정 (§0 원칙 증명).

---

## 9. 리스크 & 완화 — 데모 전 마지막 점검

| 리스크 | 완화 |
|---|---|
| Gemini 3 Flash Preview × LiveKit plugin 호환성 | Sprint 0 smoke. 실패 시 즉시 `gemini-2.5-flash` 폴백, `packages/shared/src/config/models.ts`에 env 상수화 |
| ElevenLabs 한국어 voice 품질 | Sprint 0 블라인드 평가. 3점 미만 시 preset Korean voice 교체 |
| Recall.ai 크레딧 소진 | 무료 크레딧량 Sprint 0에 확인. 부족 시 Day 4에 Meet bridge를 mock으로 격하 (UI만 시연) |
| Judge verdict JSON 파싱 실패 | zod schema strict + conservative fallback (`score=null, passed=[]`) |
| 매직링크 이메일 지연 | Resend SMTP 선행 + 테스트 계정 사전 로그인 |
| 데모 현장 WiFi 불안 | 핫스팟 백업, 세션 재접속 후 복원 (session_memory 기반) |
| 캐릭터가 AI임을 드러냄 | Guardrail에 강하게 명시 + few-shot 예시로 교정 |

---

## 10. 데모 시나리오 (3분)

**Scene 1 — 로그인 & 캐릭터 선택 (30초)**
- 매직링크 로그인 → 캐릭터 선택 → 페르마 선택 → "Talk" 클릭

**Scene 2 — 첫 인사 + 짧은 대화 (30초)**
- 페르마 첫 인사 (stranger level 톤)
- "안녕 페르마, 오늘 페르마 소정리에 대해 얘기해볼까?" (유저)
- 페르마 반응 ("네, 교수님. …제가 사실 이 주제는 학부 때 좀…")

**Scene 3 — LECTURE 진행 (90초)**
- 유저가 Objectives 3개를 섞어 설명
- 중간에 페르마가 "잠깐만요, 여기 이 조건이…" 질문 1회
- `recordFact({key: 'favoriteNumber', value: '17'})` 같은 자연스러운 사실 수집 순간

**Scene 4 — Cutscene + 호감도 승격 (30초)**
- `endLecture` 호출 → judge verdict → `applyVerdict`
- `playCutscene({eventKey: 'approved_smile'})` 트리거 → pre-rendered video 재생
- 페르마 톤 변경 (acquaintance → friend)

**Scene 5 — Meet 브리지 시연 (optional 30초)**
- 별도 Google Meet 방 열고 "Invite Fermat"
- Recall.ai bot이 Meet에 합류 → 같은 대화 로직이 Meet 안에서 동작
- 발표 scripting: "우리 앱과 Meet을 transport adapter로 교체한 것뿐, core는 0줄 변경"

---

## 11. 실행 체크리스트 — GO 버튼

Sprint 0 항목 **전부** 체크 후 GO:

- [ ] 모든 외부 계정·키 발급 및 `.env.local` 입력
- [ ] Voice/LLM/STT/Recall 5가지 스모크 전부 통과
- [ ] FE 팀에게 `packages/shared/src/protocol/*` 공유 완료
- [ ] `base_persona_prompt`, 1개 subject + 3 objectives rubric, 퀴즈 5~10문항, 데모 시나리오 확정
- [ ] Supabase JWT TTL 24h
- [ ] 팀원 에셋 최소 4종 (neutral/embarrassed/focused sprite + lab background)

체크 완료 → `/oh-my-claudecode:ralph` 또는 `/oh-my-claudecode:team`으로 넘김.

---

## Appendix A — "우리가 쓰지 않는 것" (혼동 방지)

- pgvector / 벡터 임베딩
- `memory_chunks` / RAG
- `entities` + `relations` (facts만 사용)
- mood_state / mood decay
- thinking level routing (medium 고정)
- cross-channel turns 테이블
- text chat `/api/chat` (voice only)
- self-hosted LiveKit
- Google Meet Media API 직결
- 다자간 대화

이 중 무엇이든 구현하려 하면 스코프 이탈이다.
