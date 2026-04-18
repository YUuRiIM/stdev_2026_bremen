# Session Handoff — 2026-04-19

## 현재 상태 요약

### 레포
- `main` at `6bcacbc` → 이후 PR #3 (모노레포 리스트럭처) 머지되어 `5cc2c1d` 포함
- 구조: pnpm workspace monorepo — `apps/web` (FE) + `apps/agent` (voice) + `packages/shared` (judge/db/proto)

### 배포
- **Vercel**: https://stdev-2026-bremen.vercel.app (production)
- Vercel project: `hyeongsoo-kims-projects-3dc1850b/stdev-2026-bremen`
- Vercel CLI account: `hyeongsoo-5414`
- Env 14개 production 에 push 완료 (Supabase NEXT_PUBLIC + LIVEKIT + DEEPGRAM + ELEVENLABS + Gemini + Recall + DATABASE_URL)

### Supabase
- 프로젝트: `putugflsowteaytsrvib` (stdev2026 재사용)
- 15 tables + RLS + Storage buckets 배선됨
- Seed: 4 characters, 1 subject (페르마 소정리 + 3 objectives + rubric), 13 quizzes, 2 RLS test users
- JWT TTL: 24h

### 환경
- `OMC_SKIP_HOOKS=persistent-mode` 설정 (stop hook 좀비 루프 차단)
- OMC plugin 4.11.5 (단일 버전)
- Vercel plugin 설치됨

---

## 완료된 것 (오늘 세션)

### stdev2026 (voice agent)
- Sprint 4 Day 3: Judge LLM + applyVerdict end-to-end 완성
  - `packages/shared/src/judge/{run-judge,apply-verdict,affection-rules}.ts`
  - 12/12 unit tests pass
  - Double-blind rubric 격리 유지
  - Safe-fail policy (`judge_unavailable`, delta=0)
- Tool 재설계: affection gating + stub 제거 + topic-string startLecture
- Voice loop live 검증됨 (STT → LLM → tool → DB → TTS)

### bremen FE
- CRA → Next.js 15 App Router 완전 이전 (PR #1 + #2)
- 7 screens + Character component + VN 5-subcomponent 분리
- react-router-dom 제거, webp 최적화, `confirmSkip` 버그 fix
- upstream 2 커밋 포팅 (CharacterConfirmScreen v2 + MainLobbyScreen v2 board)
- UX: fullscreen VN/detail, dialogue click advance, Game UI Lab 제거
- 모노레포 리스트럭처 (PR #3)
- Vercel 배포 성공

---

## 다음 우선순위 (Sprint 4 Day 4-5 + Stack 2+)

### 즉각 (demo 전)
1. **PREP 모드 퀴즈 UI** — `apps/web/app/study/[characterId]/page.tsx`. DB quizzes (13문항) 이미 있음. Supabase client 로 조회 + 정오답 UI. quiz_attempts 테이블 insert.
2. **Character assets 업로드** — Supabase Storage `characters-public` 버킷에 sprite/cutscene PNG 업로드. `character_assets` 테이블 seed (현재 0 row). Scene 4 `approved_smile` 이벤트 + cutscene asset 연결.
3. **Recall.ai MeetingTransport 어댑터** — `apps/agent/src/transport/meeting.ts`. Google Meet bot 브리지.
4. **Voice agent ↔ FE 연동** — 모노레포로 합쳤으니 `apps/web` 에서:
   - `/api/livekit/token` route (아직 없음)
   - `/play/[characterId]` 또는 기존 `/lesson` 에 LiveKit voice panel 추가
   - Data channel 리스너 (`lecture.verdict_applied`, `emotion.change`, `cutscene.play`)
5. **데모 시나리오 3회 리허설**

### Stack 2 (게임 상태)
- Zustand + localStorage persist (`PlayerState`, affection, chapterProgress, stageProgress, scriptFlags)
- `ChoiceEffect` 타입 + script schema v2 normalizer + unit test
- Tailwind/shadcn 셋업 (`@layer legacy` Preflight 방어)
- AffectionGauge / AffectionToast 컴포넌트

계획: `docs/plans/fe-nextjs-migration-phase-1-7-2026-04-18.md` §Phase 5-6

### Stack 3 (레슨/퀴즈 신규 화면)
- **선결**: Figma 시안 확정
- `app/lesson/[characterId]/[chapterId]/[stageId]/{page,quiz/page,result/page}.tsx`
- shadcn 컴포넌트 (ChapterBoard, StageNode, LessonViewer, QuizContainer, ...)
- Lesson content JSON (`content/lessons/fermat/chapter-1.json`)

### T1 TODO (데모 이후)
- `apply_lecture_verdict(...)` Postgres RPC (ACID 트랜잭션)
- Judge circuit breaker
- JWT refresh guard
- `@ai-sdk/google` 분리 (homomorphic core)
- `turns` 테이블 + full transcript
- Mood state machine, per-turn judge, thinking routing
- bremen GitHub Actions CI (PR build gate)
- Character.tsx layer system `fill` refactor

---

## 참고 URL / 경로

- Repo: https://github.com/YUuRiIM/stdev_2026_bremen
- Production: https://stdev-2026-bremen.vercel.app
- Vercel dashboard: https://vercel.com/hyeongsoo-kims-projects-3dc1850b/stdev-2026-bremen
- Supabase dashboard: https://supabase.com/dashboard/project/putugflsowteaytsrvib
- Plan SSOT: `docs/nextjs-integration-handoff.md`
- Sprint 4 Day 3 plan: `docs/plans/judge-llm-applyverdict-sprint4-2026-04-18.md`
- CRA snapshot: branch `my-app-legacy` (롤백 레퍼런스, 머지 금지)

---

## 셋업 명령 요약

```bash
# 신규 팀원
git clone git@github.com:YUuRiIM/stdev_2026_bremen.git
cd stdev_2026_bremen
pnpm install

# FE 개발
pnpm dev                         # http://localhost:3000

# Voice agent (env 필요 — apps/web/.env.local 자동 탐색)
pnpm agent:dev
pnpm agent:smoke                 # SILERO_SKIP_LOAD=1

# 테스트
pnpm shared:test                 # 12 unit tests (judge/affection)
pnpm typecheck                   # 전체 (-r)

# 배포
vercel --prod                    # from apps/web/ — 자동 env 주입
```

---

## 메모

- stdev2026 폴더는 git init 안 돼있음. bremen 모노레포가 superset.
- bremen `.omc/` 는 .gitignore 됨 — 플랜 문서는 `docs/plans/` 로 옮겨져 commit 됨
- `my-app-legacy` 브랜치는 CRA 시점 snapshot (롤백 레퍼런스)
