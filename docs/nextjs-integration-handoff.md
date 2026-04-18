# Next.js 통합 핸드오프 문서

**대상 독자**: 통합 작업을 수행할 에이전트 / 프론트엔드 개발자
**목적**: 기존 CRA 기반 React 프론트엔드(`YUuRiIM/stdev_2026_bremen`)를 Next.js로 이전
**작성일**: 2026-04-18

---

## 1. 소스 레포 파악

**Repo**: https://github.com/YUuRiIM/stdev_2026_bremen
**경로**: `my-app/`

### 1.1 기술 스택

- **프레임워크**: Create React App (`react-scripts 5.0.1`)
- **React**: 19.2.5
- **라우팅**: `react-router-dom` v6 (`BrowserRouter`)
- **UI 라이브러리**: **없음** (Tailwind/MUI/shadcn/styled-components 전부 미사용)
- **스타일링**: 순수 CSS + CSS 변수 기반 디자인 토큰
- **폰트**: Inter
- **테스트**: `@testing-library/*` (현재 실제 테스트는 거의 없음)

### 1.2 프로젝트 성격

연구실 인턴 선발을 소재로 한 **비주얼 노벨 게임 UI**. 등장 캐릭터: 페르마, 노바, 아이리스 등.

### 1.3 디렉토리 구조

```
my-app/
├── package.json
├── public/                     # index.html, favicon, manifest
└── src/
    ├── App.js                  # BrowserRouter + 공통 header/nav + Routes
    ├── App.css                 # 전역 레이아웃 (65줄)
    ├── index.js / index.css
    ├── styles/
    │   └── theme.css           # CSS 변수 (색상/radius/shadow 토큰)
    ├── config/
    │   └── gameConfig.js       # 챕터 클리어 플래그 하드코딩 (현재 유일한 game state)
    ├── screens/                # 6개 스크린
    │   ├── HomeScreen.jsx
    │   ├── CharacterSelectScreen.jsx
    │   ├── CharacterConfirmScreen.jsx
    │   ├── MainLobbyScreen.jsx
    │   ├── CharacterDetailScreen.jsx
    │   └── VisualNovelScreen.jsx
    ├── assets/images/          # PNG 17개, 총 ~35MB
    │   ├── bg-intro.png        # 6.7MB ⚠️
    │   ├── bg-lobby.png        # 8.0MB ⚠️
    │   ├── bg-mem-{1,2,3}.png  # 각 250–300KB
    │   ├── fermat-*.png        # 풀샷/프로필/SD 표정 7종
    │   ├── elon-*.png, hawking-*.png
    │   └── ...
    └── data/
        ├── dummyCharacters.js  # 캐릭터 메타 (id/name/subject 등)
        ├── script-intro.json   # 2.3KB
        ├── script-fermat-1.json    # 40KB, 178 entries
        ├── script-fermat-2.json    # 49KB
        ├── script-fermat-3.json    # 61KB
        ├── script-fermat-4.json    # 0.4KB (짧음)
        └── convert_script.py   # 텍스트 → JSON 변환 스크립트
```

### 1.4 라우팅 맵

| 경로 | 컴포넌트 |
|---|---|
| `/` | `HomeScreen` (디버깅 홈, 모든 화면 진입 카드) |
| `/select` | `CharacterSelectScreen` |
| `/confirm` | `CharacterConfirmScreen` |
| `/lobby` | `MainLobbyScreen` |
| `/detail` | `CharacterDetailScreen` |
| `/visual-novel/:scriptId` | `VisualNovelScreen` (스크립트 재생) |
| `*` | `HomeScreen` (fallback) |

### 1.5 스크립트 데이터 스키마 (현재)

JSON entry 타입:

```ts
type ScriptEntry =
  | { speaker: 'narrative'; name: ''; text: string; backgroundImage: string }
  | { speaker: 'character'; name: string; text: string; backgroundImage: string; characterImage?: string }
  | { speaker: 'choice'; choices: string[] };  // 현재는 string 배열, effect 없음
```

speaker 종류: `narrative` / `character` / `choice`

### 1.6 현재 Game State 인벤토리

이전 시점에 존재하는 게임 상태 관련 코드:

| 항목 | 위치 | 상태 |
|---|---|---|
| 챕터 클리어 플래그 | `src/config/gameConfig.js` | 하드코딩 상수, 런타임 변경 불가 |
| 스토리 잠금 해제 | `CharacterDetailScreen` | `chapterClearStatus`만 참조 |
| 선택지 처리 | `VisualNovelScreen.selectChoice` | **결과 저장 로직 없음** (주석으로 명시) |
| Lv.100 표시 | `MainLobbyScreen` | 하드코딩 문자열 |
| 호감도 / 친밀도 | — | **없음** |
| 캐릭터별 진행도 | — | **없음** |
| 세이브 / 로드 | — | **없음** |
| 전역 상태관리 (Context/Zustand) | — | **없음** |

### 1.7 퀴즈/레슨 흔적 (구현 미완료, UI 더미만 존재)

기획상 존재하지만 코드/데이터는 없는 시스템:

| 단서 | 위치 | 의미 |
|---|---|---|
| "수업 시작" 버튼 | `MainLobbyScreen` → 현재 `/visual-novel`로 임시 연결 | **레슨 진입점**으로 의도된 자리 |
| `chapter-board` + `stage-map` 더미 | `MainLobbyScreen` (4개 stage-node 하드코딩) | 챕터 1개당 **여러 스테이지** 구조. 스테이지 = 레슨 1회분 |
| `stage-node--cleared`, `stage-node--current` 클래스 | `index.css` | 스테이지 진행도 시각화 (현재 미연결) |
| 스크립트 본문에 "수업/문제/풀기" 다수 | 모든 fermat 스크립트 | 게임 컨셉이 **학습 시뮬레이션** (교수 + 인턴이 함께 문제 풀이) |
| 챕터 클리어 플래그 | `gameConfig.js` | 챕터 = 스테이지 그룹 단위로 설계됐을 가능성 |

**디자인은 Figma에 존재** → 통합 시 Figma 기준으로 신규 구현.

---

## 2. 통합 결정사항

### 2.1 프레임워크

- **Next.js 15+ App Router** 사용
- TypeScript 점진 도입 (초기엔 JSX 유지 가능)
- 패키지 매니저: **pnpm** (모노레포 관례상)

### 2.2 디자인

- **기존 디자인 100% 유지**
- 순수 CSS + CSS 변수를 그대로 이전
- UI 라이브러리는 **이번 단계에서 도입 안 함** (별도 Phase로 분리)

### 2.3 에셋 / 데이터 저장

- **Supabase Storage 도입 안 함** (현 시점)
- 에셋은 `public/assets/`에 두고 `next/image`로 최적화
- 스크립트 JSON은 파일 시스템 유지 (필요시 server component에서 읽기)
- DB(Supabase Postgres) 도입은 **유저 저장/진행도 기능 생길 때**

### 2.4 게임 시스템

- **호감도(Affection) 시스템을 통합과 함께 설계**
- **퀴즈/레슨(Stage) 시스템도 같이 설계** — 현재 UI 더미만 있고 로직 없음. Figma 디자인 기준으로 신규 구현
- 1차에서는 **상태 모델 + localStorage 영속화 + UI 일부 노출**까지
- 백엔드(DB) 연동은 유저 계정 도입 시점에 진행

### 2.5 디자인 정책 (이중 트랙)

| 화면 분류 | 디자인 / 스타일링 |
|---|---|
| **기존 6개 화면** (Home, CharacterSelect/Confirm, Lobby, Detail, VisualNovel) | 기존 CSS + CSS 변수 그대로 유지 (픽셀 단위 동일) |
| **신규 화면** (Lesson, Quiz, Result, 호감도 UI 등) | **shadcn/ui + Tailwind CSS**로 신규 구현 |
| 토큰 공유 | 기존 `theme.css` 변수를 shadcn HSL 토큰으로 매핑 → **양쪽 색상 자동 일치** |

이 정책으로 인해 **Phase 7(UI 시스템)이 1차 범위로 일부 당겨집니다** — 신규 화면 구현 시 Tailwind+shadcn이 필요하므로.

### 2.6 단계 분리 (중요)

1차 이전 범위:
- 포팅 + 최적화
- 게임 상태 기반 (호감도 + 진행도 + 스테이지)
- **Tailwind + shadcn 셋업** (신규 화면용)
- **Figma 기반 신규 화면 구현** (Lesson/Quiz)

후속 Phase:
- 풀 백엔드 연동, 레거시 화면 Tailwind 리팩토링, 리팩토링 심화

---

## 3. 이전 매핑 (CRA → Next.js App Router)

| CRA | Next.js |
|---|---|
| `src/App.js` (BrowserRouter) | `app/layout.tsx` (공통 header/nav) + `app/page.tsx` |
| `<Route path="/" element={<HomeScreen/>}>` | `app/page.tsx` |
| `<Route path="/select">` | `app/select/page.tsx` |
| `<Route path="/confirm">` | `app/confirm/page.tsx` |
| `<Route path="/lobby">` | `app/lobby/page.tsx` |
| `<Route path="/detail">` | `app/detail/page.tsx` |
| `<Route path="/visual-novel/:scriptId">` | `app/visual-novel/[scriptId]/page.tsx` |
| `<Route path="*">` fallback | `app/not-found.tsx` |
| `import { Link } from 'react-router-dom'` | `import Link from 'next/link'` |
| `<Link to="/x">` | `<Link href="/x">` |
| `useNavigate()` | `useRouter()` from `next/navigation` |
| `useParams()` | `useParams()` from `next/navigation` |
| `react-scripts start` | `next dev` |
| `public/` | `public/` (그대로) |
| `src/assets/images/*` | `public/assets/*` (이미지) |
| `src/styles/theme.css` | `app/globals.css`에 병합 (또는 별도 import) |
| `src/App.css` | `app/globals.css`에 병합 |
| 상호작용 컴포넌트 (useState/이벤트) | 파일 최상단 `'use client'` 추가 |
| `REACT_APP_*` env | `NEXT_PUBLIC_*` env |

---

## 4. 실행 체크리스트

### Phase 1: 기본 이전

- [ ] `apps/web` (또는 적절한 경로)에 Next.js 앱 생성 (`pnpm create next-app`, App Router, JSX 또는 TS 선택)
- [ ] `my-app/src/styles/theme.css` + `App.css` → `app/globals.css`로 병합
- [ ] `app/layout.tsx`에 기존 `App.js`의 header/nav 이동 (`brand-group`, `app-topnav` 등)
- [ ] 6개 screen → 각 route 폴더의 `page.tsx`로 복사 (확장자 `.jsx` → `.tsx`는 선택)
- [ ] 모든 screen 상단에 `'use client'` 추가 (useState/이벤트 사용하므로 대부분 필요)
- [ ] `react-router-dom` 제거, `next/link` + `next/navigation`으로 교체
  - `Link to=` → `Link href=`
  - `useNavigate()` → `useRouter()`, `navigate('/')` → `router.push('/')`
  - `useParams()` 임포트 경로 변경
- [ ] 동적 라우트 파라미터: `/visual-novel/[scriptId]/page.tsx`에서 `useParams()` 또는 `params` prop 사용
- [ ] `*` fallback → `app/not-found.tsx`로 HomeScreen 노출

### Phase 2: 에셋 최적화

- [ ] `src/assets/images/*` → `public/assets/*`로 이동
- [ ] **배경 이미지 webp 변환 우선 처리** (`bg-intro.png` 6.7MB, `bg-lobby.png` 8MB)
  - `cwebp -q 80` 또는 `sharp` 사용
  - 예상: 80–90% 용량 감소
- [ ] `<img src={...}>` → `next/image`의 `<Image>` 교체
  - `width`/`height` 지정 필수
  - 배경처럼 꽉 채우는 이미지는 `fill` 모드 + `sizes` 속성
- [ ] `VisualNovelScreen`의 하드코딩 `images` 매핑 객체 제거
  - 현재: `import bgIntro from '../assets/images/bg-intro.png'` → 객체 매핑
  - 변경 후: `<Image src={`/assets/${current.backgroundImage.replace('.png', '.webp')}`} />`

### Phase 3: 스크립트 로딩 개선

- [ ] `VisualNovelScreen`이 top-level에서 6개 JSON 전부 import하는 구조 제거
- [ ] **동적 import**로 해당 스크립트만 로드:
  ```ts
  const [script, setScript] = useState(null);
  useEffect(() => {
    import(`@/data/script-${scriptId}.json`).then(m => setScript(m.default));
  }, [scriptId]);
  ```
- [ ] 또는 server component로 페이지를 구성하고 `fs.readFile`로 SSR에서 주입 (권장, 번들 감소)
- [ ] 타입 정의 추가 (선택): `ScriptEntry` discriminated union

### Phase 4: 컴포넌트 분리 (리팩토링)

`VisualNovelScreen`이 스킵 모달 / 대화박스 / 내레이션 / 선택지까지 한 파일에 다 있음. 분리 권장:

- [ ] `components/visual-novel/DialogueBox.tsx` (캐릭터 대사)
- [ ] `components/visual-novel/NarrativeArea.tsx` (내레이션)
- [ ] `components/visual-novel/SkipModal.tsx`
- [ ] `components/visual-novel/ChoiceList.tsx`
- [ ] `components/visual-novel/BackgroundLayer.tsx`

### Phase 5: 게임 상태 시스템 (호감도 + 진행도)

상세 설계는 §5 참고.

- [ ] Zustand 설치 (`pnpm add zustand`)
- [ ] `lib/game-state/types.ts` — `PlayerState`, `Affection`, `ChoiceEffect` 타입 정의
- [ ] `lib/game-state/store.ts` — Zustand store + persist middleware (localStorage)
- [ ] `lib/game-state/selectors.ts` — `useAffection(characterId)`, `useChapterProgress()` 등
- [ ] 스크립트 스키마 v2: choice entry에 `effect` 필드 추가 (호환성 위해 optional)
- [ ] 기존 스크립트 6개에 effect 부여 (점진적 — 우선 fermat-1만 PoC)
- [ ] `selectChoice` 로직 변경: store에 effect 적용 후 next
- [ ] `chapterClearStatus`를 store로 마이그레이션 (`gameConfig.js` deprecate)
- [ ] 챕터 클리어 자동 트리거: 스크립트 마지막 entry 도달 시 `markChapterClear(characterId, chapter)` 호출
- [ ] UI 노출:
  - [ ] `MainLobbyScreen`: 현재 캐릭터의 호감도 게이지
  - [ ] `CharacterDetailScreen`: 캐릭터별 호감도 + 진행 챕터 표시
  - [ ] `VisualNovelScreen`: 호감도 변동 시 토스트 (`+5 페르마 호감도`)
- [ ] DevTools: `?reset` 쿼리스트링 또는 디버그 패널로 상태 초기화 가능하게

### Phase 6: Tailwind + shadcn 셋업 (신규 화면 전용)

기존 화면은 건드리지 않고 신규 화면 작성용 인프라만 깔기.

- [ ] `pnpm add -D tailwindcss postcss autoprefixer`
- [ ] `pnpm dlx tailwindcss init -p`
- [ ] `tailwind.config.ts` 작성:
  - `content`에 `app/**/*.{ts,tsx}`, `components/**/*.{ts,tsx}`만 (기존 jsx 제외해도 무방, 어차피 클래스 없음)
  - `theme.extend.colors`에 기존 CSS 변수 매핑 (`primary: 'hsl(var(--primary))'` 등)
- [ ] `app/globals.css` 상단에 Tailwind 디렉티브 + shadcn 토큰 추가:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  @layer base {
    :root {
      --primary: 40 99% 59%;       /* #FEBC2F */
      --background: 222 47% 11%;   /* #0f172a */
      --card: 220 40% 19%;         /* #14233f */
      --foreground: 210 40% 96%;
      /* shadcn이 요구하는 나머지 토큰도 추가 */
    }
  }
  ```
- [ ] 기존 CSS 변수 (`--accent`, `--surface` 등) **그대로 유지** — 레거시 화면이 계속 사용
- [ ] `pnpm dlx shadcn@latest init` (style: default, baseColor: slate, css var: yes)
- [ ] 자주 쓸 컴포넌트만 우선 추가:
  ```bash
  pnpm dlx shadcn@latest add button card dialog progress radio-group toast
  ```
- [ ] 기존 화면 1개 골라 **Tailwind 클래스 한 줄 추가** 후 디자인 깨지지 않는지 검증 (공존 확인)

### Phase 7: 레슨/퀴즈 시스템 신규 구현 (Figma 기반)

**선결 조건**: Figma 접근 권한 확보, 디자인 시안 확정

- [ ] **Figma 시안 확인 항목**:
  - [ ] 챕터/스테이지 보드 (스테이지 노드 클릭 → 무엇으로 이동?)
  - [ ] 레슨 화면 레이아웃 (강의 형태? 슬라이드? 단계별?)
  - [ ] 퀴즈 화면 (객관식? 주관식? 단답? 풀이 시간 제한?)
  - [ ] 정답/오답 피드백 화면
  - [ ] 결과 요약 화면 (점수, 호감도 변동, 다음 스테이지 잠금 해제)
  - [ ] 힌트 / 재시도 정책
- [ ] 라우팅 추가:
  ```
  app/lesson/[characterId]/[chapterId]/page.tsx       # 챕터 보드 (스테이지 목록)
  app/lesson/[characterId]/[chapterId]/[stageId]/page.tsx  # 레슨 본문
  app/lesson/[characterId]/[chapterId]/[stageId]/quiz/page.tsx  # 퀴즈
  app/lesson/[characterId]/[chapterId]/[stageId]/result/page.tsx  # 결과
  ```
- [ ] 데이터 스키마 정의 (§6 참고)
- [ ] 임시 콘텐츠: 캐릭터당 챕터 1개 + 스테이지 2–3개 + 퀴즈 3–5문항 PoC
- [ ] `MainLobbyScreen`의 "수업 시작" 버튼 → 현재 캐릭터의 다음 스테이지로 연결
- [ ] `MainLobbyScreen`의 `stage-map` 더미 → `useStageProgress(chapterId)`로 실데이터 연결
- [ ] 퀴즈 정답 처리 → `applyChoice` 또는 신규 `submitQuiz()` action으로 호감도 + 스테이지 진행도 업데이트
- [ ] 모든 신규 화면은 **Tailwind + shadcn으로 작성**
- [ ] 기존 디자인 토큰(색상)이 자동 적용되는지 확인

### Phase 8: 검증

- [ ] `pnpm dev`로 로컬 구동
- [ ] 모든 라우트 수동 검증: `/`, `/select`, `/confirm`, `/lobby`, `/detail`, `/visual-novel/*`, `/lesson/*`
- [ ] 스킵 모달 동작, 대사 next 클릭, 배경 전환 확인
- [ ] **신규 레슨/퀴즈 흐름 E2E 검증**: 로비 → 챕터 보드 → 레슨 → 퀴즈 → 결과 → 호감도/스테이지 반영
- [ ] **레거시 화면 픽셀 일치 확인**: Figma 시안과 기존 CRA 비교
- [ ] **신규 화면 Figma 일치 확인**: shadcn 컴포넌트가 시안대로 표현되는지
- [ ] `pnpm build` 성공 + 번들 사이즈 확인 (Lighthouse도 권장)

---

## 5. 게임 상태 시스템 설계 (호감도 + 진행도)

### 5.1 설계 원칙

- **localStorage 우선**: 1차 이전에선 백엔드 없이 로컬 영속화
- **DB 마이그레이션 친화 구조**: 나중에 Supabase Postgres로 옮길 때 동일 스키마 재사용
- **단방향 데이터 흐름**: store → selector → component, 컴포넌트는 직접 mutate 금지
- **스크립트 호환성**: 기존 스크립트가 effect 없이도 정상 재생되어야 함 (optional 필드)
- **결정론적**: 같은 시작 상태 + 같은 선택지 시퀀스 → 같은 결과 (테스트·재현 용이)

### 5.2 데이터 모델

```ts
// lib/game-state/types.ts

export type CharacterId = 'fermat' | 'hawking' | 'elon' | 'nova' | 'iris';

/** 호감도: 0–100 정수, 기본 0. */
export type Affection = Record<CharacterId, number>;

/** 캐릭터별 클리어한 챕터 번호 집합. */
export type ChapterProgress = Record<CharacterId, number[]>;

/** 스테이지 진행도. key: `${chapterId}-${stageId}` (예: 'fermat-1-stage-2') */
export type StageProgress = Record<string, StageResult>;
export interface StageResult {
  cleared: boolean;
  bestScore?: number;       // 0–100, 퀴즈 정답률
  attempts: number;
  lastAttemptAt: number;
}

/** 선택 이력 (분석/디버그/재방문 용). */
export interface ChoiceLog {
  scriptId: string;       // 'fermat-1'
  entryIndex: number;     // 스크립트 내 entry 위치
  choiceIndex: number;    // 선택한 인덱스
  effectApplied: ChoiceEffect;
  at: number;             // Date.now()
}

/** 선택지 1개의 효과. */
export interface ChoiceEffect {
  affection?: Partial<Record<CharacterId, number>>;  // 변동량 (양수/음수)
  flags?: Record<string, boolean>;                   // 임의 플래그
}

/** 시나리오용 임의 플래그 (예: 'met_fermat_at_lab': true). */
export type ScriptFlags = Record<string, boolean>;

export interface PlayerState {
  schemaVersion: 1;
  selectedCharacterId: CharacterId | null;  // 현재 메인 캐릭터 (로비 표시용)
  affection: Affection;
  chapterProgress: ChapterProgress;
  stageProgress: StageProgress;             // 스테이지/레슨 결과
  scriptFlags: ScriptFlags;
  history: ChoiceLog[];
  lastUpdatedAt: number;
}
```

### 5.3 스크립트 스키마 v2 (호환 확장)

```ts
type ScriptEntry =
  | { speaker: 'narrative'; text: string; backgroundImage: string }
  | {
      speaker: 'character';
      name: string;
      text: string;
      backgroundImage: string;
      characterImage?: string;
    }
  | {
      speaker: 'choice';
      choices: ChoiceOption[];
    };

interface ChoiceOption {
  text: string;
  effect?: ChoiceEffect;     // 없으면 진행만
  nextEntryIndex?: number;   // 분기 시 점프 (없으면 다음 entry로)
}
```

**마이그레이션 정책**: 기존 스크립트는 `choices: string[]` 형태. 변환기 작성:
```ts
const normalized = typeof choice === 'string'
  ? { text: choice }
  : choice;
```

### 5.4 Zustand Store

```ts
// lib/game-state/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GameStore extends PlayerState {
  applyChoice: (effect: ChoiceEffect, log: Omit<ChoiceLog, 'effectApplied' | 'at'>) => void;
  markChapterClear: (characterId: CharacterId, chapter: number) => void;
  selectCharacter: (id: CharacterId) => void;
  reset: () => void;
}

const initialState: PlayerState = {
  schemaVersion: 1,
  selectedCharacterId: null,
  affection: { fermat: 0, hawking: 0, elon: 0, nova: 0, iris: 0 },
  chapterProgress: { fermat: [], hawking: [], elon: [], nova: [], iris: [] },
  scriptFlags: {},
  history: [],
  lastUpdatedAt: Date.now(),
};

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      ...initialState,
      applyChoice: (effect, log) => set((s) => {
        const nextAffection = { ...s.affection };
        for (const [k, v] of Object.entries(effect.affection ?? {})) {
          nextAffection[k as CharacterId] = clamp(
            (nextAffection[k as CharacterId] ?? 0) + (v ?? 0), 0, 100,
          );
        }
        return {
          affection: nextAffection,
          scriptFlags: { ...s.scriptFlags, ...(effect.flags ?? {}) },
          history: [...s.history, { ...log, effectApplied: effect, at: Date.now() }],
          lastUpdatedAt: Date.now(),
        };
      }),
      markChapterClear: (cid, chapter) => set((s) => ({
        chapterProgress: {
          ...s.chapterProgress,
          [cid]: Array.from(new Set([...(s.chapterProgress[cid] ?? []), chapter])),
        },
        lastUpdatedAt: Date.now(),
      })),
      selectCharacter: (id) => set({ selectedCharacterId: id, lastUpdatedAt: Date.now() }),
      reset: () => set(initialState),
    }),
    {
      name: 'game-state-v1',
      version: 1,
      // migrate: (persisted, fromVersion) => { ... }  // 스키마 변경 시
    },
  ),
);

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
```

### 5.5 통합 지점

| 화면 / 로직 | 변경 사항 |
|---|---|
| `VisualNovelScreen.selectChoice` | `applyChoice(option.effect, { scriptId, entryIndex, choiceIndex })` 호출 |
| `VisualNovelScreen` 마지막 entry 도달 | scriptId에서 캐릭터/챕터 추론 → `markChapterClear()` |
| `CharacterDetailScreen` 스토리 잠금 | `chapterProgress[characterId].includes(story.chapter)` 로 판정 (기존 `chapterClearStatus` 대체) |
| `MainLobbyScreen` | `selectedCharacterId` 기반으로 캐릭터 + 호감도 게이지 표시 |
| `CharacterConfirmScreen` 선택 확정 | `selectCharacter(id)` 호출 |
| 새 컴포넌트 `<AffectionGauge characterId={...} />` | 호감도 시각화 |
| 새 컴포넌트 `<AffectionToast delta={...} />` | 변동 시 일시 표시 (3초) |

### 5.6 호감도 단계 (UX 디자인)

| 범위 | 라벨 | UI 힌트 |
|---|---|---|
| 0–19 | 낯섦 | 회색 게이지 |
| 20–39 | 인지 | 옅은 노란 |
| 40–59 | 호의 | 노란 (`--accent`) |
| 60–79 | 신뢰 | 진한 노란 + 글로우 |
| 80–100 | 인연 | 핑크 + 하트 아이콘 |

### 5.7 DB 마이그레이션 (Phase 8 시점)

스키마를 그대로 옮기기 쉽게 설계됨. Supabase Postgres 예시:

```sql
create table player_state (
  user_id uuid primary key references auth.users(id),
  schema_version smallint not null default 1,
  selected_character_id text,
  affection jsonb not null default '{}'::jsonb,
  chapter_progress jsonb not null default '{}'::jsonb,
  script_flags jsonb not null default '{}'::jsonb,
  last_updated_at timestamptz not null default now()
);

create table choice_history (
  id bigserial primary key,
  user_id uuid not null references auth.users(id),
  script_id text not null,
  entry_index int not null,
  choice_index int not null,
  effect_applied jsonb not null,
  at timestamptz not null default now()
);
```

마이그레이션 절차: localStorage → 첫 로그인 시 서버에 동기화 → 이후 서버 우선.

### 5.8 작가/기획 가이드 (스크립트 작성 시)

선택지에 effect 부여 가이드:

- **+5 ~ +10**: 호감도 자연스러운 증가 (배려/공감)
- **-3 ~ -5**: 부정적 선택 (무례/거절)
- **+15 이상**: 결정적 순간 (고백, 위기 극복) — 챕터당 1회 권장
- **flag 사용**: 후속 챕터에서 분기 조건으로 활용 (`saved_fermat_in_lab`, `chose_research_over_party`)

---

## 6. 레슨 / 퀴즈 시스템 설계 (신규)

### 6.1 설계 원칙

- **Figma 시안이 단일 소스 오브 트루스** — 시안 없는 화면 임의 설계 금지
- **데이터 주도**: 레슨/퀴즈 콘텐츠는 JSON으로 분리, 코드와 결합 X
- **호감도 시스템과 결합**: 퀴즈 정답률 → 호감도 변동
- **재시도 가능**: 스테이지 클리어 후에도 재플레이 (베스트 스코어 유지)
- **선형 잠금**: 챕터 N의 모든 스테이지 클리어 → 챕터 N+1 해제

### 6.2 도메인 모델

```
Character (페르마, 호킹, 일론, ...)
  └─ Chapter (챕터 1, 2, 3, 4)
       └─ Stage (스테이지 1, 2, 3, 4)
            ├─ Lesson (강의/스토리 부분)
            └─ Quiz (문제 풀이 부분)
                 └─ Question (개별 문항)
```

### 6.3 데이터 스키마

```ts
// lib/lesson/types.ts

export interface Chapter {
  id: string;                    // 'fermat-chapter-1'
  characterId: CharacterId;
  number: number;                // 1, 2, 3, 4
  title: string;                 // '천재 교수와 아마추어 공주님'
  description?: string;
  stages: Stage[];
  unlockRequires?: { chapterId: string; }[];  // 의존성 (없으면 무조건 해제)
}

export interface Stage {
  id: string;                    // 'fermat-1-stage-2'
  chapterId: string;
  number: number;
  title: string;
  lesson: Lesson;
  quiz: Quiz;
  rewardOnClear: ChoiceEffect;   // 클리어 시 호감도 등 (§5.2 ChoiceEffect 재사용)
}

export interface Lesson {
  /** 슬라이드/단계 형태. Figma 시안에 따라 타입 추가 가능 */
  slides: LessonSlide[];
}

export type LessonSlide =
  | { type: 'text'; title?: string; body: string; image?: string }
  | { type: 'image'; src: string; caption?: string }
  | { type: 'dialogue'; speaker: string; text: string; characterImage?: string }
  | { type: 'video'; src: string; poster?: string };

export interface Quiz {
  passingScore: number;          // 통과 기준 (예: 60)
  questions: Question[];
  timeLimitSec?: number;         // 전체 시간 제한 (없으면 무제한)
}

export type Question =
  | MultipleChoiceQuestion
  | ShortAnswerQuestion
  | OrderingQuestion;            // 순서 맞추기 (필요 시)

export interface MultipleChoiceQuestion {
  id: string;
  type: 'mcq';
  prompt: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation?: string;          // 정답 후 표시
  points: number;                // 가중치
  hint?: string;
}

export interface ShortAnswerQuestion {
  id: string;
  type: 'short';
  prompt: string;
  acceptedAnswers: string[];     // 정답 배열 (대소문자/공백 정규화)
  caseSensitive?: boolean;
  explanation?: string;
  points: number;
  hint?: string;
}
```

### 6.4 콘텐츠 저장 위치

```
content/lessons/
├── fermat/
│   ├── chapter-1.json          # Chapter 메타 + Stage[] 포함
│   ├── chapter-2.json
│   └── ...
├── hawking/
│   └── chapter-1.json
└── elon/
    └── chapter-1.json
```

런타임 로딩: server component에서 `fs.readFile`로 SSR (스크립트 JSON과 동일 패턴).

### 6.5 라우팅 설계

| 경로 | 화면 | 비고 |
|---|---|---|
| `/lobby` | 메인 로비 (기존) | "수업 시작" 버튼 → `/lesson/{currentCharacter}/{nextChapter}` |
| `/lesson/[characterId]/[chapterId]` | 챕터 보드 (스테이지 목록) | 기존 `MainLobbyScreen.stage-map`을 풀스크린 화면으로 |
| `/lesson/[characterId]/[chapterId]/[stageId]` | 레슨 본문 (슬라이드) | 끝나면 자동으로 quiz로 |
| `/lesson/[characterId]/[chapterId]/[stageId]/quiz` | 퀴즈 |  |
| `/lesson/[characterId]/[chapterId]/[stageId]/result` | 결과 (점수, 호감도 변동, 다음 스테이지 잠금 해제) |  |

### 6.6 진행 흐름

```
[로비] "수업 시작"
  ↓
[챕터 보드] 다음 미클리어 스테이지 자동 강조 / 클릭
  ↓
[레슨 슬라이드] 다음 → ... → 마지막 슬라이드에서 "퀴즈 풀기"
  ↓
[퀴즈] 문항 풀기 → 제출
  ↓
[결과] 점수 표시 / passingScore 통과 시
  ├─ stageProgress 업데이트 (cleared: true, bestScore)
  ├─ rewardOnClear 적용 (호감도 + flags)
  ├─ 모든 스테이지 클리어 시 chapterProgress 업데이트
  └─ "다음 스테이지" 버튼
```

### 6.7 Store 확장 (§5.4 useGameStore에 추가)

```ts
interface GameStore extends PlayerState {
  // ... 기존 메서드
  startStage: (stageId: string) => void;
  submitQuiz: (stageId: string, answers: QuizSubmission) => StageResult;
}

interface QuizSubmission {
  questionId: string;
  selected: string;               // mcq: optionId, short: 입력 텍스트
}[]

submitQuiz: (stageId, answers) => {
  const stage = getStageById(stageId);
  const score = computeScore(stage.quiz, answers);
  const cleared = score >= stage.quiz.passingScore;
  const result: StageResult = {
    cleared,
    bestScore: Math.max(score, prev?.bestScore ?? 0),
    attempts: (prev?.attempts ?? 0) + 1,
    lastAttemptAt: Date.now(),
  };
  set((s) => ({
    stageProgress: { ...s.stageProgress, [stageId]: result },
  }));
  if (cleared) {
    applyChoice(stage.rewardOnClear, { scriptId: stageId, /* ... */ });
    if (allStagesCleared(stage.chapterId)) {
      markChapterClear(stage.characterId, stage.chapter.number);
    }
  }
  return result;
}
```

### 6.8 UI 컴포넌트 (모두 신규, shadcn + Tailwind)

| 컴포넌트 | 역할 | 사용 shadcn |
|---|---|---|
| `<ChapterBoard>` | 스테이지 노드 그리드 | `Card` |
| `<StageNode>` | 잠금/완료/현재 상태 표시 | `Button` + `Badge` |
| `<LessonViewer>` | 슬라이드 네비 + 진행도 바 | `Progress` |
| `<QuizContainer>` | 문항 진행 + 타이머 | `Progress` |
| `<MCQQuestion>` | 객관식 | `RadioGroup`, `Label` |
| `<ShortAnswerQuestion>` | 주관식 | `Input` |
| `<QuestionExplanation>` | 정답 후 해설 | `Card`, `Alert` |
| `<QuizResultDialog>` | 결과 모달 | `Dialog`, `Progress` |
| `<AffectionDelta>` | 호감도 변동 애니메이션 | (custom) |

### 6.9 채점 로직 (참고)

```ts
function computeScore(quiz: Quiz, answers: QuizSubmission[]): number {
  const totalPoints = quiz.questions.reduce((s, q) => s + q.points, 0);
  let earned = 0;
  for (const q of quiz.questions) {
    const ans = answers.find(a => a.questionId === q.id);
    if (!ans) continue;
    if (q.type === 'mcq' && ans.selected === q.correctOptionId) earned += q.points;
    if (q.type === 'short') {
      const normalize = (s: string) => q.caseSensitive ? s.trim() : s.trim().toLowerCase();
      if (q.acceptedAnswers.map(normalize).includes(normalize(ans.selected))) {
        earned += q.points;
      }
    }
  }
  return Math.round((earned / totalPoints) * 100);
}
```

### 6.10 호감도 ↔ 퀴즈 통합 (예시)

| 결과 | 호감도 변동 |
|---|---|
| 1회만에 90점+ 통과 | +10 |
| 통과 (60–89점) | +5 |
| 통과 (재시도 후) | +3 |
| 미통과 | 0 (변동 없음, 재시도 가능) |
| 힌트 사용 | -1 (선택 정책) |

이 매핑은 `rewardOnClear`로 표현하기 어려운 "조건부 보상"이므로 store에서 처리.

### 6.11 작가/기획 가이드

- 챕터 1개당 스테이지 3–4개 권장
- 스테이지 1개당 슬라이드 5–10개, 퀴즈 3–5문항
- 스테이지 클리어 보상은 +5 ~ +10 호감도 (점수 보너스 별도)
- 챕터 마지막 스테이지에 "결정적 순간" 선택지 또는 +15 보상 배치

---

## 7. 하지 말 것 (이번 Phase에서 제외)

- ❌ 레거시 화면 Tailwind 리팩토링 — 동작/디자인 동일하게 유지
- ❌ Supabase 백엔드 연동 — 유저 계정 도입 시점에 진행 (Phase 9)
- ❌ CSS-in-JS (styled-components, emotion) — 현재 구조가 더 가벼움
- ❌ 스크립트/레슨 콘텐츠를 DB로 이전 — 현재는 정적 콘텐츠로 충분
- ❌ 전체 스크립트에 effect 일괄 부여 — 우선 1개 PoC, 작가 합의 후 확장
- ❌ 전체 챕터/스테이지 콘텐츠 일괄 작성 — 캐릭터당 챕터 1개로 PoC, 검증 후 확장
- ❌ Figma 시안 없는 화면 임의 디자인 — 디자이너와 합의 먼저

---

## 8. 후속 Phase 제안 (참고)

### Phase 9: 레거시 화면 Tailwind 리팩토링 (선택)

신규 화면이 Tailwind+shadcn으로 작성된 후, 일관성을 위해 레거시 6개 화면도 점진적 마이그레이션 가능. 기존 디자인이 잘 잡혀있어 **필수는 아님**.

- 화면 단위로 1개씩 마이그레이션
- 픽셀 비교 테스트로 회귀 방지
- 기존 CSS 클래스 → Tailwind 유틸리티 + 필요시 `@apply`

### Phase 10: 백엔드 (유저 계정 도입 시)

- Supabase Auth → 유저 계정
- Supabase Postgres → §5.7 스키마로 세이브 / 진행도 / 선택 로그 + 레슨 결과
- localStorage → 첫 로그인 시 서버 동기화
- 운영자가 스크립트/레슨 편집 요구 생기면 → Supabase Storage + 어드민 CMS
- 퀴즈 결과 분석 (오답률 높은 문항 식별 등)

### Phase 11: 콘텐츠 확장

- 모든 캐릭터의 챕터 4개씩 완성
- 각 챕터 스테이지 3–4개 작성
- 호감도 분기 엔딩
- 다국어 지원 (i18n)

---

## 9. 알려진 이슈 / 주의사항

1. **`confirmSkip` 버그**: `VisualNovelScreen.jsx`에서 `scriptData.length - 1`을 참조하는데, 실제로는 `script` 변수여야 함 (script가 동적으로 바뀌는데 `scriptData`는 기본 스크립트). 이전 중 수정 권장.
2. **`react-scripts 5`는 webpack 기반**: Next.js는 Turbopack/webpack 혼용. 일부 import 경로나 JSON import 방식이 다를 수 있음 (Next.js는 JSON import를 ES module로 처리).
3. **React 19 사용 중**: Next.js 15+ 필요 (React 19 호환).
4. **절대 경로 import**: CRA는 미설정. Next.js는 `tsconfig.json`의 `paths`로 `@/` 별칭 설정 권장.
5. **이미지 `alt` 속성**: 현재 `alt="배경"`, `alt="캐릭터"`로 의미 없음. 접근성을 위해 의미 있는 설명으로 교체 (Phase 2–4 진행 중 같이).

---

## 10. 성공 기준

### 이전 (Phase 1–4)
- ✅ 모든 라우트가 기존 CRA와 동일하게 동작
- ✅ 디자인 픽셀 단위 동일 (주요 화면 비교)
- ✅ `bg-intro`, `bg-lobby` 최소 70% 용량 감소
- ✅ `visual-novel/fermat-1` 진입 시 fermat-2/3/4 JSON이 네트워크 탭에 로드되지 않음 (동적 import 성공)
- ✅ `pnpm build` 에러 없음
- ✅ Lighthouse Performance 80+ (기존 CRA 대비 개선)

### 게임 상태 (Phase 5)
- ✅ 선택지 클릭 시 호감도 변동이 store에 반영되고 즉시 UI에 표시
- ✅ 페이지 새로고침 후에도 호감도/진행도 유지 (localStorage 동작)
- ✅ 챕터 클리어 시 `CharacterDetailScreen`의 다음 스토리가 잠금 해제
- ✅ `gameConfig.js`의 `chapterClearStatus` 더 이상 참조되지 않음 (deprecate 완료)
- ✅ `?reset` 또는 디버그 패널로 상태 초기화 가능
- ✅ effect 없는 기존 스크립트도 에러 없이 재생됨 (호환성 확인)

### Tailwind + shadcn 셋업 (Phase 6)
- ✅ Tailwind 클래스가 새 컴포넌트에서 작동
- ✅ shadcn 컴포넌트가 기존 디자인 토큰(노란 accent, 다크 배경)을 자동 사용
- ✅ 기존 6개 화면 디자인이 깨지지 않음 (Tailwind 셋업 후에도 픽셀 동일)

### 레슨/퀴즈 (Phase 7)
- ✅ "수업 시작" 버튼이 실제 챕터 보드로 이동
- ✅ `MainLobbyScreen`의 stage-map이 더미가 아닌 실제 진행도 반영
- ✅ 캐릭터당 챕터 1개 + 스테이지 2–3개 + 퀴즈 3–5문항 PoC 동작
- ✅ 퀴즈 통과 시 호감도 + 스테이지 진행도 업데이트
- ✅ 모든 스테이지 클리어 시 챕터 자동 클리어 + 다음 챕터 해제
- ✅ 신규 화면이 Figma 시안과 일치

---

## 11. 참고 링크

- Next.js 공식 CRA 마이그레이션 가이드: https://nextjs.org/docs/app/building-your-application/upgrading/from-create-react-app
- Next.js App Router: https://nextjs.org/docs/app
- `next/image`: https://nextjs.org/docs/app/api-reference/components/image
- Zustand: https://github.com/pmndrs/zustand
- Zustand persist middleware: https://docs.pmnd.rs/zustand/integrations/persisting-store-data
- shadcn/ui: https://ui.shadcn.com/
- shadcn 설치 가이드 (Next.js): https://ui.shadcn.com/docs/installation/next
- Tailwind CSS: https://tailwindcss.com/docs/installation
