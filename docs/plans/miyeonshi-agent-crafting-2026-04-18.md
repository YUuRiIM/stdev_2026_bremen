# 미연시 에이전트 — 심도 깎기 (Crafting)

**동반 문서**: `miyeonshi-livekit-sts-plan-2026-04-18.md`의 Section 5~7 확장·심화.
이 문서는 "에이전트가 어떻게 사유하고 기억하고 성격을 유지하는가"에 대한 설계.

---

## 1. 문제 정의 — 왜 "깎기"가 필요한가

미연시 캐릭터는 본질적으로 **시간에 걸쳐 사용자와 일관된 세계를 공유해야 하는 long-running agent**다. 단순 프롬프트 주입 방식으로는 다음 세 가지가 무너진다.

1. **일관성 붕괴**: "내 생일 3월 14일이야"라고 했는데 3세션 뒤 캐릭터가 "네 생일 몰라"라고 답함.
2. **성격 표류**: 컨텍스트가 길어질수록 기본 persona가 흐려져 "AI 같은" 답변이 튀어나옴.
3. **관계의 선형성 상실**: 호감도가 올라갔다가 내려갔다가 플롯적 일관성 없이 랜덤 워크.

해결 아키텍처는 세 층을 가진다:
- **Persistent Ontology** (RDB 그래프) — 사실·관계·사건을 구조적으로 저장
- **Tiered Memory** — 워킹/에피소드/의미/절차 메모리 + hot/warm/cold 스토리지
- **Composable Context Pipeline** — 매 턴 토큰 예산 안에서 동적 조립
- **Runtime Crafting Loop** — pre-proc → thinking level routing → tool gating → self-reflection → post-proc

---

## 2. RDB 기반 온톨로지 (Knowledge Graph in Postgres)

### 2.1 왜 RDB인가 (Neo4j/Dgraph 대신)

| 조건 | Postgres | Neo4j/Dgraph |
|---|---|---|
| 인프라 추가 | 없음 (Supabase에 이미 있음) | 별도 서비스 + 인증 + 백업 |
| Supabase RLS 상속 | 그대로 (`auth.uid()` 정책) | 앱 레벨 재구현 필요 |
| Drizzle ORM 호환 | 네이티브 | 별도 클라이언트 |
| 해커톤 비용 | 0 | hosting + 학습곡선 |
| 트랜잭션 | ACID | 제한적 |
| 쿼리 복잡도 | 다단 JOIN으로 대부분 커버 | 그래프 쿼리 간결 (다단 탐색 ≥3) |

**결론**: 탐색 깊이 ≤3 hop이고 저장이 유저별로 작게 파편화되므로 Postgres가 실용적. 필요 시 나중에 Memgraph mirroring 가능.

### 2.2 스키마 — 3개 테이블 (entities / relations / facts) + 1개 벡터 테이블

```sql
-- pgvector (Supabase Pro 기본 제공)
create extension if not exists vector;

-- ── 엔티티 (유저, 캐릭터, NPC, 장소, 사물, 추상 개념) ─────────
create table entities (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid references users(id) on delete cascade, -- null = 월드 공용
  kind          text not null,          -- 'user'|'character'|'npc'|'place'|'item'|'concept'|'event'
  label         text not null,
  attrs         jsonb not null default '{}',
  created_at    timestamptz default now()
);
create index on entities (owner_user_id, kind);

-- ── 관계 (triple: subject-predicate-object) ────────────────
create table relations (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid references users(id) on delete cascade,
  subject_id    uuid references entities(id) on delete cascade,
  predicate     text not null,          -- 'likes'|'visited'|'gave'|'confessed_to'|'met_at'|'remembers'
  object_id     uuid references entities(id) on delete cascade,    -- 엔티티-엔티티 관계
  object_literal text,                  -- 날짜/수치/자유 문자열 (entity가 없을 때)
  confidence    real default 1.0,       -- 0.0~1.0
  source        text,                   -- 'user_said'|'llm_inferred'|'system_event'
  valid_from    timestamptz default now(),
  valid_to      timestamptz,            -- 반박·부인 시 soft-close (tombstoning)
  metadata      jsonb default '{}',
  created_at    timestamptz default now()
);
create index on relations (owner_user_id, subject_id, predicate);
create index on relations (owner_user_id, object_id, predicate);
create index on relations (owner_user_id, predicate) where valid_to is null;

-- ── 원자 사실 (attribute = value, 엔티티별 key 유일) ────────
create table facts (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid references users(id) on delete cascade,
  entity_id     uuid references entities(id) on delete cascade not null,
  key           text not null,          -- 'birthday'|'favorite_food'|'mbti'|'occupation'
  value         text,
  value_jsonb   jsonb,
  confidence    real default 1.0,
  source        text,
  updated_at    timestamptz default now(),
  unique (owner_user_id, entity_id, key)  -- upsert 시 최신값만 유지
);

-- ── 벡터 메모리 (서술형 조각, RAG 대상) ───────────────────
create table memory_chunks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade not null,
  character_id  uuid references characters(id) on delete cascade not null,
  chunk_type    text not null,          -- 'episode'|'reflection'|'world_note'|'user_moment'
  text          text not null,
  embedding     vector(768),            -- text-embedding-005 (Gemini) 또는 OpenAI text-embedding-3-small (1536 → 768 trunc 권장)
  importance    real default 0.5,       -- LLM-scored (0~1)
  recency_weight real,                  -- 조회 시 recency_weight × (1/age)로 재계산 가능
  last_retrieved_at timestamptz,
  tags          text[] default '{}',    -- '#first_meet' 같은 수동 태그
  created_at    timestamptz default now()
);
create index on memory_chunks using hnsw (embedding vector_cosine_ops);
create index on memory_chunks (user_id, character_id, chunk_type);

-- ── RLS ─────────────────────────────────────────────────
alter table entities enable row level security;
alter table relations enable row level security;
alter table facts enable row level security;
alter table memory_chunks enable row level security;

create policy "own entities" on entities
  for all using (owner_user_id is null or (select auth.uid()) = owner_user_id);
create policy "own relations" on relations
  for all using ((select auth.uid()) = owner_user_id);
create policy "own facts" on facts
  for all using ((select auth.uid()) = owner_user_id);
create policy "own memory" on memory_chunks
  for all using ((select auth.uid()) = user_id);
```

### 2.3 사용 예시 — 쿼리 레시피

**"유저 프로필 다이제스트"** (facts를 자연어로):
```sql
select string_agg(key || ': ' || coalesce(value, value_jsonb::text), ', ')
  from facts
  where entity_id = :user_entity_id
    and confidence >= 0.7;
```

**"캐릭터가 유저에 대해 아는 모든 관계"**:
```sql
select r.predicate, e.label, r.object_literal, r.confidence
  from relations r
  left join entities e on r.object_id = e.id
  where r.subject_id = :user_entity_id
    and r.valid_to is null
  order by r.created_at desc
  limit 20;
```

**"3단계 RAG"** — 벡터 + 온톨로지 + 호감도 플래그 조합:
```sql
with v as (
  select id, text, importance, 1 - (embedding <=> :query_embed) as sim
    from memory_chunks
    where user_id = :u and character_id = :c
    order by embedding <=> :query_embed
    limit 20
)
select id, text,
       sim * 0.6 + importance * 0.3 + (1.0 / (1 + extract(epoch from (now() - created_at))/86400)) * 0.1 as score
  from v
  order by score desc
  limit 5;
```

### 2.4 엔티티 라이프사이클 & 충돌 해결

- **새 fact 업서트**: `insert ... on conflict (owner_user_id, entity_id, key) do update set value = excluded.value, confidence = greatest(facts.confidence, excluded.confidence), updated_at = now()`.
- **기존 relation 부인**: `valid_to = now()` (tombstone). 절대 delete 하지 않음 — 대화 흐름 reconstructing 용.
- **모순 fact**: 새로 들어온 값이 기존과 다르면 두 레코드를 모두 남기되 old는 `valid_to` 설정. LLM이 자연스럽게 "어? 지난번엔 A라고 했잖아?" 반응 가능.

---

## 3. Tiered Memory 아키텍처

### 3.1 심리학적 뼈대

| Tier | 대응 인지 | 저장소 | 수명 | 주입 방식 |
|---|---|---|---|---|
| **Working** | 단기/주의 | in-memory (세션 내) | 현 세션 | verbatim last N turns |
| **Episodic** | 자전적 사건 | `memory_chunks (type=episode)` + `relations (source=system_event)` | 영구 | RAG + digest |
| **Semantic** | 개념·사실 | `facts` + `relations` (stable truths) | 영구 | profile digest |
| **Procedural** | 행동 패턴 | `characters.basePersonaPrompt` + affection overlay + learned mood handlers | 영구 | 항상 주입 |

### 3.2 저장 온도대 (Hot/Warm/Cold)

```
Hot  (항상 프롬프트에 포함)
├── Guardrails
├── Character base persona
├── Affection overlay (현재 level)
├── User profile digest (최근 N facts 중 confidence ≥ 0.7)
├── Mood state (지금 캐릭터 감정)
└── Rolling session summary (압축된 지난 대화)

Warm (조건부 검색 후 주입)
├── Top-K RAG hits (memory_chunks 벡터 검색)
├── Recent episodic events (지난 30일 내 valid relations)
└── Event-triggered facts (현 호감도에서 unlock되는 메모)

Cold (요약 대상, 직접 주입 안 함)
├── 전체 대화 로그 (message_log 테이블, optional)
└── Low-importance memory_chunks (importance < 0.3)
```

### 3.3 쓰기 파이프라인 — Reflection

매 N턴마다 또는 세션 종료 시 **백그라운드 reflection 호출**:

```ts
// apps/agent/src/reflection.ts
async function reflect(sessionBuffer: Turn[], ctx: ToolContext) {
  const prompt = `최근 ${sessionBuffer.length}턴을 분석해. 다음 JSON 스키마로만 응답해.
  {
    "facts": [{ "key": "", "value": "", "confidence": 0-1 }],     // 유저에 대한 새 사실
    "relations": [{ "predicate": "", "object": "" }],              // 새 관계 (user-[predicate]->object)
    "episode": { "summary": "", "importance": 0-1, "tags": [] } | null,  // 기억할 만한 사건 있으면
    "affection_delta": -10 to +10,                                 // 호감도 변화량
    "affection_reason": "",
    "mood_shift": "happy|joyful|neutral|annoyed|sad|worried|affectionate"
  }`;

  const result = await geminiJson({
    model: 'gemini-3-flash-preview',
    thinking: 'medium',
    system: prompt,
    input: sessionBuffer.map(t => `${t.role}: ${t.text}`).join('\n'),
    responseSchema: ReflectionSchema,
  });

  await writeReflection(result, ctx);
}
```

**실행 위치**: LiveKit agent 워커 내 비동기 큐. 대화 latency를 막지 않도록.

### 3.4 읽기 파이프라인 — Context 조립 훅

```ts
// packages/shared/src/memory/load.ts
async function loadMemoryForTurn(
  ctx: ToolContext,
  latestUserUtterance: string
): Promise<MemorySnapshot> {
  const userFacts   = await queryFacts(ctx.userId, ctx.userEntityId);
  const recentRels  = await queryRecentRelations(ctx.userId, { since: '30 days', limit: 20 });
  const sessionSum  = await loadRollingSummary(ctx.userId, ctx.characterId);
  const queryEmbed  = await embed(latestUserUtterance);
  const ragHits     = await queryMemoryChunks(ctx.userId, ctx.characterId, queryEmbed, { topK: 5 });
  const mood        = await loadMoodState(ctx.userId, ctx.characterId);
  const affection   = await loadAffection(ctx.userId, ctx.characterId);
  const unlockable  = await queryTriggerableEvents(ctx.userId, ctx.characterId, affection.level);

  return { userFacts, recentRels, sessionSum, ragHits, mood, affection, unlockable };
}
```

이 스냅샷을 `composeFullContext(snapshot)`에 넘겨 최종 시스템 프롬프트 조립.

### 3.5 Importance & Recency 점수

```
score = 0.6 × cosine_similarity(query, chunk.embedding)
      + 0.3 × chunk.importance
      + 0.1 × recency_factor(chunk.created_at)
```

`recency_factor(t) = 1 / (1 + age_in_days(t))` — 지수 감쇠. 1년 된 기억도 0에 가깝지만 0은 아님.

Importance는 reflection 프롬프트에서 LLM이 0-1로 스코어링.

---

## 4. Context Composition — 토큰 예산 관리

### 4.1 토큰 예산 배분 (Gemini 3 Flash Preview, context window 1M)

실사용 예산은 1M 전부가 아닌 **~50K 타겟** (latency와 비용 균형, 그리고 오히려 주의가 분산되는 long-context loss 회피). 블록별 할당:

| 블록 | 하드 캡 (tok) | 비고 |
|---|---|---|
| Guardrails | 500 | 고정 |
| Character base persona | 1500 | characters.base_persona_prompt |
| Affection overlay | 500 | level별 스위치 |
| World notes | 1500 | 캐릭터 공통 세계관 (있을 때만) |
| User profile digest | 1000 | facts 요약 (토큰 넘치면 confidence 내림차순 컷) |
| Episodic events digest | 1500 | recent relations 자연어 렌더링 |
| Retrieved memory chunks | 2500 | top-5 RAG, 각 ≤500 tok |
| Rolling session summary | 2000 | 이전 세션들 누적 요약 |
| Mood & flags | 300 | 현재 내부 상태 |
| Channel hints | 300 | voice vs text 힌트 |
| Few-shot examples | 1500 | 캐릭터 톤 고정용 (선택) |
| **Working window (대화)** | 30,000+ | 현 세션 turns, 가용 나머지 |
| **Tools** | 시스템 수집 | 함수 정의 |
| **Output reserve** | ~8,000 | 캐릭터 응답 여유 |

### 4.2 조립 순서 (역 우선순위 — 중요한 것이 위에)

```ts
function composeFullContext(snap: MemorySnapshot, character: Character): string {
  const sections = [
    // [1] 규칙 (절대 잘리지 않음)
    tag('GUARDRAILS', GUARDRAILS),
    // [2] 정체성
    tag('CHARACTER', character.basePersonaPrompt),
    tag('AFFECTION_TONE', buildAffectionBlock(snap.affection.level)),
    // [3] 세계·상대
    tag('WORLD', character.worldNotes ?? ''),
    tag('USER_PROFILE', renderFacts(snap.userFacts)),
    // [4] 과거
    tag('RECENT_EVENTS', renderRelations(snap.recentRels)),
    tag('PAST_SESSION_SUMMARY', snap.sessionSum ?? '(첫 만남)'),
    tag('RELEVANT_MEMORIES', renderChunks(snap.ragHits)),
    // [5] 현재 내부 상태
    tag('MOOD', snap.mood.current + ': ' + snap.mood.reason),
    tag('FLAGS', JSON.stringify(snap.affection.flags)),
    tag('UNLOCKABLE_EVENTS', snap.unlockable.map(e => e.key).join(', ') || '(none)'),
    // [6] 운영 힌트
    tag('CHANNEL_HINT', VOICE_HINT),
  ];
  return sections.filter(Boolean).join('\n\n');
}
```

### 4.3 Overflow 전략

각 블록에 hard cap을 주고, 터지면 이 순서로 축약:
1. Retrieved memory chunks: top-5 → top-3 → 요약 하나
2. User profile digest: confidence ≥ 0.5 → ≥ 0.7 → top-10 key만
3. Working window: 가장 오래된 turn부터 "요약에 merge" 후 drop
4. Episodic events: 7일 → 3일 → 가장 중요 3건만

Guardrails·Character persona·Affection은 절대 자르지 않음.

---

## 5. Runtime Crafting Loop — 턴 단위 파이프라인

```
[STT] 유저 발화 텍스트
   ↓
[Pre-processor]
   - 정규화: filler('어...', '음...')·자가수정 정리
   - 감정 추론 (neutral sentiment 분류기 or 룰 기반)
   - 특수 의도 감지: 이름/이메일/날짜는 data channel 텍스트 필수 힌트
   ↓
[Memory Load]
   - loadMemoryForTurn() → snapshot
   ↓
[Thinking Level Routing]
   - 경량 classifier: 잡담 / 감정 중요 / 도구 호출 필요 / 컷씬 트리거
   - 대응 thinking level: minimal / low / medium / high
   ↓
[Tool Gating]
   - 현재 affection level + scene state로 tool 필터
   - 예: confessTool은 close 이상만, scheduleDateTool은 friend 이상만
   ↓
[LLM Inference] — Gemini 3 Flash Preview
   - system = composeFullContext(snap)
   - tools = gatedTools
   - messages = workingWindow + new user turn
   ↓
[Tool Execution Loop]
   - playCutscene → data channel로 클라에 cutscene_id 송출 + session.interrupt()
   - setEmotion  → data channel 이벤트
   - bumpAffection → side channel JWT → ctxRef 업데이트 → prompt 리컴포즈
   - recordFact/recordRelation → ontology 즉시 쓰기
   ↓
[Post-processor]
   - 감정 태그 파싱 ([mood:sad] 등) → ElevenLabs 힌트로 변환
   - 불필요한 markdown 제거
   - 문장부호 → 자연스러운 발성 조정
   ↓
[TTS] ElevenLabs Flash v2.5
   ↓
[Async Reflection]
   - 턴 버퍼에 쌓이다가 임계점 도달 시 reflect() 비동기 실행
```

### 5.1 Thinking Level Routing

Gemini 3 Flash Preview의 thinking level은 latency·품질 직결.

```ts
function routeThinking(userText: string, snap: MemorySnapshot): 'minimal'|'low'|'medium'|'high' {
  if (snap.unlockable.length > 0)           return 'high';   // 컷씬 판정 필요
  if (snap.affection.score % 10 === 0)      return 'medium'; // 승격 후보
  if (detectEmotionalCue(userText))         return 'medium'; // 고백·위로·질문
  if (userText.length > 80)                 return 'low';
  return 'minimal';  // "응", "응 그래" 같은 짧은 턴
}
```

### 5.2 Tool Gating

```ts
const TOOL_GATES: Record<string, AffectionLevel> = {
  confessFeeling: 'close',
  scheduleDate: 'friend',
  holdHand: 'close',
  kiss: 'lover',
  recallMemory: 'stranger',    // 항상 가능
  setEmotion: 'stranger',
  bumpAffection: 'stranger',
};

function gate(tool: SharedToolDef, affection: AffectionLevel): boolean {
  const need = TOOL_GATES[tool.name];
  return !need || affectionAtLeast(affection, need);
}
```

Gate-out된 tool 이름은 프롬프트에도 노출시키지 않아 LLM의 환각 호출을 차단.

### 5.3 Mood State Machine (Affection과 독립)

Affection = 관계 깊이 (monotonic-ish). Mood = 지금 기분 (휘발성).

```
moods: happy | joyful | neutral | annoyed | sad | worried | affectionate

state transitions:
  - 사용자가 칭찬/다정 → mood += affectionate/joyful (decay: -0.3/5min)
  - 사용자가 무례/회피 → mood += annoyed/sad (decay: -0.3/5min)
  - 장시간 말 없음 (VAD silence > 30s) → mood += worried
  - 컷씬 이후 → scripted mood set
```

저장:
```sql
create table mood_state (
  user_id uuid references users(id),
  character_id uuid references characters(id),
  current text not null default 'neutral',
  intensity real default 0.5,   -- 0~1
  reason text,
  updated_at timestamptz default now(),
  primary key (user_id, character_id)
);
```

Decay 구현: 읽을 때마다 `intensity *= exp(-λ * age_minutes)`로 즉석 계산 (cron 불필요).

### 5.4 Self-reflection vs Critic

- **Self-reflection** (구현): reflect() 비동기, 사용자 미인지.
- **Critic pre-check** (Out-of-scope for MVP): 응답 전 별도 LLM이 guardrail·사실성 검증. latency +500ms~1s → 해커톤 데모엔 무리.

---

## 6. Guardrails — 미연시 특화

### 6.1 NSFW / 감정 남용 방지

- `GUARDRAILS` 블록에 상세 규칙 명시. 시스템 프롬프트 맨 앞.
- 사용자 자해·위기 signals 감지 시 미리 정의된 crisis response (예: "상담소 번호 안내 + 캐릭터가 걱정하는 대사") 강제 삽입 — LLM 판단에 맡기지 않음.

### 6.2 캐릭터 일관성 체크

```
composeFullContext의 맨 아래에 다음 self-check 힌트 추가:
"응답 전에 스스로 확인: (1) 내 기본 성격과 맞는가? (2) 유저 프로필·이전 대화와 모순되지 않는가?
모순되면 오히려 부드럽게 교정하거나 의문을 표현하라."
```

### 6.3 온톨로지 fact 활용 가드

Hot 블록의 `USER_PROFILE`에 "이 정보는 유저가 직접 말한 사실이다. 틀리게 말하지 마라." 라벨링.
LLM이 새로운 유저 사실을 만들어내려고 할 때 `recordFact({key, value, source: 'user_said'})` 툴을 강제하도록 프롬프트 설계.

---

## 7. 해커톤 축소 버전 — 우선순위 타이어

실제 3~5일 해커톤에서 구현 가능 항목:

### T0 — 반드시 (Day 1~3)
- [ ] facts 테이블 (간단 key-value, 온톨로지 중 최소)
- [ ] memory_chunks + pgvector + top-K RAG
- [ ] Rolling session summary (reflection 프롬프트 기본형)
- [ ] composeFullContext with hard token caps
- [ ] Affection elevation → prompt 재생성 (me의 패턴)
- [ ] Tool gating by affection level

### T1 — 강하게 권장 (Day 3~4)
- [ ] relations 테이블 (triple) — 간단 predicate 3~5개만
- [ ] Mood state machine (neutral + 3 moods)
- [ ] Thinking level routing (룰 기반)
- [ ] Async reflection loop (세션 종료 시만)
- [ ] Post-processor 감정 태그 → TTS SSML 힌트

### T2 — 있으면 좋음 (Day 4~5)
- [ ] entities 테이블 전면 도입
- [ ] Per-turn mid-session reflection
- [ ] Event unlock & cutscene trigger 자동 판정
- [ ] Crisis response 가드 (안전성)
- [ ] Importance scoring LLM call

### T3 — Out of scope
- [ ] Critic pre-check
- [ ] 실시간 ontology fact-verification
- [ ] Multi-character 동시 세션
- [ ] Full message log 저장 (요약만 저장, 원본은 보존 안 함)

---

## 8. 구현 체크리스트

### 8.1 패키지 구조 (`packages/shared` 하위)

```
src/
├── db/
│   └── schema.ts                 # + entities, relations, facts, memory_chunks, mood_state
├── memory/
│   ├── load.ts                   # loadMemoryForTurn()
│   ├── write.ts                  # upsertFact, insertRelation, writeMemoryChunk
│   ├── embed.ts                  # Google text-embedding-005
│   ├── rag.ts                    # queryMemoryChunks with hybrid scoring
│   └── reflect.ts                # reflect(turnBuffer) → structured updates
├── ontology/
│   ├── predicates.ts             # enum of supported predicates
│   └── queries.ts                # 재사용 SQL helpers
├── prompt/
│   ├── compose.ts                # composeFullContext (전체 오케스트레이션)
│   ├── blocks/
│   │   ├── guardrails.ts
│   │   ├── affection.ts          # buildAffectionBlock
│   │   ├── user-profile.ts       # renderFacts
│   │   ├── events.ts             # renderRelations
│   │   ├── rag.ts                # renderChunks
│   │   └── mood.ts               # renderMood
│   └── budget.ts                 # packToBudget(sections, hardCap)
├── mood/
│   ├── state.ts                  # load/save + decay
│   └── transitions.ts            # 룰 기반 전이 계산
└── tools/
    ├── types.ts                  # SharedToolDef
    ├── gating.ts                 # tool 필터
    ├── adapter-aisdk.ts
    ├── adapter-livekit.ts
    └── catalog/
        ├── affection.ts          # bumpAffection
        ├── memory.ts             # recordFact, recordRelation, recallMemory
        ├── scene.ts              # playCutscene, setEmotion
        └── character.ts          # getCharacterProfile, listCharacters
```

### 8.2 측정 지표 (가볍게라도 로깅)

- **Context size per turn** (tokens) — 예산 초과 추적
- **Thinking level distribution** — minimal/low/medium/high 비율
- **Tool call rate** — 턴당 평균 tool 호출
- **Retrieval quality** — RAG hits 중 실제 응답에 활용된 비율 (수동 샘플링)
- **Memory write latency** — reflection 완료까지 시간
- **E2E voice latency** — STT end → TTS start

로깅은 console.log + Supabase의 `logs` 테이블(간단하게) 정도로 충분.

---

## 9. 참고 문헌

- Generative Agents (Park et al., 2023) — 3-tier memory, reflection
- MemGPT (Packer et al., 2023) — hierarchical memory paging
- Anthropic "Contextual Retrieval" (2024) — RAG 품질 개선
- Google Gemini "Thinking" docs — <https://ai.google.dev/gemini-api/docs/thinking>
- pgvector 공식 docs — <https://github.com/pgvector/pgvector>
- Supabase pgvector 가이드 — <https://supabase.com/docs/guides/ai/vector-embeddings>
- LiveKit agents function tools — <https://docs.livekit.io/agents/logic/tools/>
