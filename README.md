# stdev_2026_bremen (monorepo)

pnpm workspace 기반 모노레포. FE (Next.js) + voice agent (LiveKit) + 공용 패키지.

```
apps/
  web/        @bremen/web     — Next.js 15 App Router (비주얼 노벨 게임 FE)
  agent/      @mys/agent      — LiveKit voice worker (Gemini judge 포함)
packages/
  shared/     @mys/shared     — drizzle 스키마, 프롬프트, 프로토콜, tools, judge
docs/
  nextjs-integration-handoff.md
  demo-script.md
  content-authoring-guide.md
  plans/      ← sprint 플랜 문서
```

---

## 요구 사항

- **Node.js** 20.11+ (권장 22 LTS)
- **pnpm** 9+ — 루트 `package.json` `packageManager` 필드로 고정
- **Chrome** 또는 Chromium (웹 앱 테스트)

pnpm 미설치 시:
```bash
corepack enable && corepack prepare pnpm@9 --activate
```

또는 Homebrew: `brew install pnpm`

윈도우:
```
npm install -g pnpm
```
---

## 설치 (최초 1회)

```bash
git clone git@github.com:YUuRiIM/stdev_2026_bremen.git
cd stdev_2026_bremen
pnpm install
```

node_modules 는 루트에서 중앙 관리 (hoisted). 각 패키지의 의존성은 자동 링크.

---

## 자주 쓰는 명령 (루트에서 실행)

```bash
pnpm dev              # Next.js FE — http://localhost:3000
pnpm build            # FE 프로덕션 빌드
pnpm lint             # FE lint
pnpm typecheck        # 전체 패키지 typecheck (-r)

pnpm agent:dev        # LiveKit voice agent (env 필요)
pnpm agent:smoke      # agent plugin 스모크 (SILERO_SKIP_LOAD=1)
pnpm shared:test      # judge/affection unit tests (12개)
pnpm shared:typecheck # shared 단독 typecheck
```

개별 패키지 안에서도 가능:
```bash
pnpm --filter @bremen/web dev
pnpm --filter @mys/agent dev
pnpm --filter @mys/shared test
```

---

## FE 페이지 수정 위치

| 목적 | 경로 |
|---|---|
| 홈 | `apps/web/app/page.tsx` |
| 캐릭터 선택 | `apps/web/app/select/page.tsx` |
| 선택 확인 | `apps/web/app/confirm/page.tsx` |
| 메인 로비 | `apps/web/app/lobby/page.tsx` |
| 캐릭터 상세 | `apps/web/app/detail/page.tsx` |
| 레슨 | `apps/web/app/lesson/basic-multiplication/page.tsx` |
| 비주얼 노벨 | `apps/web/app/visual-novel/[scriptId]/page.tsx` |
| 공통 레이아웃 | `apps/web/app/layout.tsx` |
| 전역 CSS | `apps/web/app/globals.css` |
| 컴포넌트 | `apps/web/components/` |
| 스크립트 JSON | `apps/web/data/script-*.json` |
| 캐릭터 더미 | `apps/web/data/dummyCharacters.ts` |
| 에셋 (이미지) | `apps/web/public/assets/` |

---

## 개발 워크플로

1. `main` 에서 feature 브랜치 생성 (`feat/...` 또는 `fix/...`)
2. `apps/web/` 안에서 작업
3. `pnpm dev` 로 로컬 확인 → `pnpm build` 통과 확인
4. 커밋 → push → PR (base: `main`)
5. 리뷰 승인 후 squash merge (권장)

---

## 환경 변수

- `apps/web/.env.local` — Supabase + LiveKit + Deepgram + ElevenLabs (Voice 연동 시)
- `apps/web/.env.example` — 참고용 키 목록

Voice agent (`apps/agent`) 는 별도 env 가 없으면 `apps/web/.env.local` 을 자동 탐색 (`apps/agent/src/env-path.ts` 참조).

---

## 이전 배경

- 원래 CRA (`my-app/`) 기반 React 앱
- Stack 0: pnpm + Next.js 15 로 이전 (PR #1 → feat/next-port 에 흡수)
- Stack 1: 7 screens App Router 포팅 (PR #2)
- Stack 2+: Zustand 게임 상태 + Tailwind/shadcn (예정)
- Stack 3+: 레슨/퀴즈 시스템 (Figma 기반, 예정)

롤백 레퍼런스: `my-app-legacy` 브랜치 (CRA 스냅샷, 머지 금지).

상세 계획: `docs/nextjs-integration-handoff.md` + `docs/plans/`.
