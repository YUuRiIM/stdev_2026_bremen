# stdev_2026_bremen

Next.js 15 (App Router) + React 19 + TypeScript + pnpm. Migrated from CRA in Stack 0 + Stack 1 PRs (see git history).

---

## 요구 사항

- **Node.js** 20.11+ (권장 22 LTS)
- **pnpm** 9+ (package.json `packageManager` 필드에 고정됨)

pnpm 미설치 시:

```bash
corepack enable
corepack prepare pnpm@9 --activate
```

또는 Homebrew: `brew install pnpm`

윈도우:
```
npm install -g pnpm
```
---

## 설치

```bash
git clone git@github.com:YUuRiIM/stdev_2026_bremen.git
cd stdev_2026_bremen
pnpm install
```

---

## 개발 서버 띄우기

```bash
pnpm dev
```

→ http://localhost:3000 에서 열림. 파일 저장 시 HMR 자동 반영.

---

## 주요 라우트

| 경로 | 화면 |
|---|---|
| `/` | 홈 (디버깅 진입 카드) |
| `/select` | 캐릭터 선택 |
| `/confirm` | 선택 확인 (pick button → confirm dialog → `/lobby`) |
| `/lobby` | 메인 로비 (chapter board + stage map) |
| `/detail` | 캐릭터 상세 (사이드바 + 프로필 패널) |
| `/lesson/basic-multiplication` | 레슨 샘플 |
| `/visual-novel/[scriptId]` | 비주얼 노벨 (intro / fermat-1 ~ 4) |

---

## 빌드 & 배포

```bash
pnpm build     # .next/ 생성
pnpm start     # 프로덕션 서버 (포트 3000)
```

`.next/` + `public/` + `node_modules/` 외에는 정적 asset 없음.

---

## 프로젝트 구조

```
app/                    # Next.js App Router pages
  layout.tsx            # 루트 레이아웃 (Inter font)
  page.tsx              # HomeScreen
  select/page.tsx
  confirm/page.tsx
  lobby/page.tsx
  detail/page.tsx
  lesson/basic-multiplication/page.tsx
  visual-novel/[scriptId]/page.tsx
  not-found.tsx
  globals.css           # 통합 스타일 (theme + common + per-screen)
components/
  Character.tsx         # 4-layer composite 캐릭터 렌더러
  visual-novel/         # DialogueBox, NarrativeArea, SkipModal, ChoiceList, BackgroundLayer
data/                   # 스크립트 JSON + dummy characters (TS)
config/                 # gameConfig.js (deprecated after Stack 2)
public/                 # 정적 에셋 (favicon, manifest, /assets/**)
  assets/
    *.png               # 플랫 캐릭터/배경 이미지
    *.webp              # bg-intro, bg-lobby (최적화)
    fermat/             # Character.tsx 레이어 시스템 (manifest.json + layers/)
scripts/                # convert_script.py (authoring 도구, 런타임 외)
```

---

## 작업 브랜치 참고

- `main` — 릴리즈 브랜치
- `my-app-legacy` — CRA 시절 스냅샷 (롤백 레퍼런스; 병합 금지)

---

## 후속 Phase (예정)

- **Stack 2**: Zustand 게임 상태 (호감도 + 진행도 + localStorage persist) + Tailwind/shadcn 셋업
- **Stack 3**: 레슨/퀴즈 시스템 (Figma 기반 신규 화면)

상세 계획은 stdev2026 모노레포의 `.omc/plans/fe-nextjs-migration-phase-1-7-2026-04-18.md` 참고.
