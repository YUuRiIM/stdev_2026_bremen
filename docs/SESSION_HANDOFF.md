# Session Handoff — 2026-04-19

## 현재 상태 요약

### 레포
- `main` latest (PR #5·#6·#7·#8·#9·#10·#11 머지). PR #12 오픈 — agent 배포 + tool 루프 버그 픽스 + 연결 중 UX
- 구조: pnpm workspace monorepo — `apps/web` (FE) + `apps/agent` (voice) + `packages/shared` (judge/db/proto)

### 배포
- **Vercel**: https://stdev-2026-bremen.vercel.app (production)
- **LiveKit Cloud Agent**: `CA_VTikvY3wma2q` (ap-south, India West 리전, Running 1/1/1)
- **Supabase**: `putugflsowteaytsrvib` (Auth · DB · Storage)

### 인프라 리전
- LiveKit Core: Japan (Osaka, `me-igf07rjn.livekit.cloud`)
- LiveKit Agents: **ap-south (Mumbai)** — LiveKit Cloud Agents는 Japan 리전 미지원. Cross-region dispatch로 동작 확인됨

---

## 🎉 E2E 대화 루프 완성 (2026-04-19 03:55 KST 첫 성공)

### 실증된 플로우
1. **로그인** (매직 링크) → `/auth/callback` → **최초 = `/visual-novel/intro`, 재로그인 = `/lobby`**
2. `/lecture` 접속 → 마이크 권한 → LiveKit room 조인
3. 페르마가 ap-south agent에서 dispatch → **"페르마가 연구실로 들어오는 중이에요…" 연결 중 오버레이** 표시
4. Agent audio track attach 완료 → 오버레이 dismiss → **첫 인사 TTS 재생**
5. 유저 발화 (Deepgram STT, confidence 0.99+)
6. 페르마가 `startLecture({topic:"페르마 소정리"})` 호출 → `subject_id` resolve → `lecture.state` publish → FE에 objectivesStatus 체크리스트 표시
7. 유저가 objective 하나씩 설명 → 페르마가 `checkObjective({conceptKey, userExplanation})` 호출 → 숨은 rubric 로드 → `runObjectiveJudge` 스코어링 → `understood_concepts` + `affection_state` 증분 upsert
8. 전 objective 통과 → 페르마 감격 대사 + (속마음 "2026년 봄학기, 교수님의 눈물을 본 날") → 유저 "오늘 강의 여기까지" → `endLecture` 자동 호출 → `lecture_sessions.verdict` 기록

### DB 증거 (실제 세션 `03373d33`)
- `lecture_sessions.verdict` = `{passed:["flt_statement","flt_example"], partial:["flt_applications"], missed:[], overallScore:0.67}`
- `understood_concepts`: flt_statement 1.0, flt_example 1.0, flt_applications 0.5
- `affection_state`: stranger → **acquaintance** (score 4)

---

## 오늘 세션 완료 내역 (2026-04-18/19)

### 신규 PR (주요 변경)
- **#5** Lecture UI monorepo 포팅 (PR #4 재정비)
- **#6** Agent adapter 확장 + `ObjectiveChecklist` UI
- **#7** LiveKit 실 어댑터 + `/api/livekit/token` + `CutsceneOverlay`
- **#8** `user.transcript` 토픽 (STT echo)
- **#9** Supabase magic-link 로그인 + 세션 가드
- **#10** default adapter=real + 최초/재로그인 라우팅 분기
- **#12** Agent 배포 + tool 루프 버그 픽스 + 연결 중 UX (오픈 중)

### Backend (agent/judge)
- `setEmotion` tool 제거 (감정별 sprite 미사용)
- Per-objective live judge + `checkObjective` tool 추가 (reverse-tutoring)
- DB seed: `character_assets` (cutscene 1) + `events` (approved_smile) 배선
- Gemini function-calling 순서 에러 회피 (greeting에 virtual user turn 삽입)
- `ctxRef.characterId` 슬러그 → UUID 전환 (startLecture 무한 루프 해결)
- `publishData` 에 `reliable:true` 추가 (proto 필수 필드)
- tsx runtime 실행 (빌드 스킵) + slug/UUID fallback

### FE (apps/web)
- `/login` + `/auth/callback` (bg-intro.webp 임명장 무드)
- Middleware 전역 가드 (`/login`, `/auth/*`, `/api/livekit/token` 제외 모두 로그인 필수)
- `/lecture` + `/lecture/debug` (`ObjectiveChecklist` 3-state · `CutsceneOverlay` preview)
- `agent-adapter` 3-레이어 (mock · livekit · 공통 인터페이스)
- `onAgentReady` 이벤트 + "연결 중…" 오버레이

### 배포 인프라
- LiveKit Cloud Agent CI 없이 수동 배포 (`pnpm --filter @mys/agent deploy --prod .agent-deploy` → `lk agent deploy`)
- `.agent-deploy/` 는 gitignore (생성물)
- `.env.agent` 로 secrets 주입 (LIVEKIT_*, DEEPGRAM_*, ELEVENLABS_*, GEMINI_*, NEXT_PUBLIC_SUPABASE_*)

---

## 다음 우선순위

### 즉각 (데모 polish)
1. **속마음 표시 UI** — agent가 `(속마음: …)` 형식으로 내면 대사 뱉을 때 FE에 별도 text box (예: 하단 자막 영역) 로 분리 렌더. 현재는 TTS가 그대로 음성으로 읽어버림. 설계 방향:
   - Agent prompt 수정: `(속마음: ...)` 패턴은 **TTS로 발화 금지**, 대신 `inner_monologue` data channel 토픽으로 publish
   - 새 protocol `InnerMonologueSchema { text, ts }` + agent 측 텍스트 필터링
   - FE 하단 `<InnerMonologueCaption>` 컴포넌트 (2–3초 페이드 자막)
2. **세션 중복 dispatch 수정** — 같은 room에 agent job 2개 가는 이슈 (로그에 `AJ_xxx` 두 개). LiveKit Cloud dispatch rule 또는 worker 설정 조정 필요. 영향: greeting 2회 겹쳐 재생됨.
3. **메모리 경고** — 배포 agent memory 500→550MB (경고 임계 500MB). 리소스 plan 확인 또는 세션 종료 시 명시적 cleanup 필요.
4. **Character assets Supabase Storage 마이그레이션** — 현재 Next.js 서버에서 직접 서빙 (`/assets/*`). post-demo에 `characters-public` 버킷으로 옮기려면 service_role key 필요.

### Sprint 5 (데모 이후)
- Recall.ai MeetingTransport 어댑터 (Google Meet 브리지)
- PREP 모드 퀴즈 UI (13문항 seed 이미 DB)
- `apply_lecture_verdict(...)` Postgres RPC (ACID 트랜잭션)
- Judge circuit breaker
- `turns` 테이블 + full transcript 로깅
- Mood state machine, per-turn judge, thinking routing
- bremen GitHub Actions CI (PR build gate)

---

## 참고 URL / 경로

### Live
- Production FE: https://stdev-2026-bremen.vercel.app
- LiveKit Cloud 프로젝트: `me-igf07rjn.livekit.cloud` (Japan core, ap-south agent)

### Dashboards
- Vercel: https://vercel.com/hyeongsoo-kims-projects-3dc1850b/stdev-2026-bremen
- Supabase: https://supabase.com/dashboard/project/putugflsowteaytsrvib
- LiveKit: `lk project list` (CLI)

### Repo 중요 경로
- Agent entry: `apps/agent/src/entrypoint.ts`
- Tools: `packages/shared/src/tools/catalog/{lecture,scene,memory}.ts`
- Judge: `packages/shared/src/judge/{run-judge,apply-verdict,affection-rules}.ts`
- Protocol: `packages/shared/src/protocol/*.ts`
- Login: `apps/web/app/{login,auth/callback}/*`
- Lecture: `apps/web/app/lecture/*`, `apps/web/components/lecture/*`
- Real adapter: `apps/web/services/agent-adapter.livekit.ts`

### 문서
- Plan SSOT: `docs/nextjs-integration-handoff.md`
- Sprint 4 Day 3 plan: `docs/plans/judge-llm-applyverdict-sprint4-2026-04-18.md`

---

## 데모 체크리스트

### Supabase Auth 설정 (대시보드 UI)
- [ ] Authentication → URL Configuration
  - Site URL: `https://stdev-2026-bremen.vercel.app`
  - Redirect URLs:
    - `http://localhost:3000/auth/callback`
    - `https://stdev-2026-bremen.vercel.app/auth/callback`
    - (선택) `https://*.vercel.app/auth/callback` — preview 배포
- [ ] JWT TTL 24h 확인

### 운영 명령
```bash
# 로컬 개발
pnpm dev                         # http://localhost:3000 (FE)
pnpm agent:dev                   # 로컬 agent (Japan 워커 즉시 등록)
pnpm agent:smoke                 # SILERO_SKIP_LOAD=1

# 테스트
pnpm shared:test                 # 12 unit tests (judge/affection)
pnpm -r typecheck                # 전체

# LiveKit agent 배포 (수동)
rm -rf .agent-deploy
pnpm --filter @mys/agent deploy --prod .agent-deploy
cp apps/agent/src/entrypoint.ts .agent-deploy/src/entrypoint.ts  # 최신 반영
# .agent-deploy/package.json 에서 start 를 'tsx src/entrypoint.ts start' 로 확인
# .agent-deploy/packages-shared 준비 + lockfile:
#   pnpm install --lockfile-only --ignore-workspace (in .agent-deploy/)
cd .agent-deploy && lk agent deploy

# 로그 확인
lk agent status
lk agent logs --log-type=deploy
lk agent secrets
```

---

## 메모

- PR #11 은 번호 건너뜀 (참고)
- `.agent-deploy/` 는 항상 재생성 (pnpm deploy → Dockerfile 복원 → lockfile 재생성)
- Gemini API key는 로컬 shell env 에서 읽어서 `.env.agent` 에 주입 (commented in `.env.local`)
- Agent와 FE 양쪽 entrypoint.ts 편집 시 **`.agent-deploy/src/entrypoint.ts` 로 복사 후 redeploy** 필요 — symlink 아님
