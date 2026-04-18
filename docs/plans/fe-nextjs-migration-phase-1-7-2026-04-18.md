# Next.js Integration Work Plan: CRA Visual Novel Migration (Phase 1-7)

**Date**: 2026-04-18 | **Status**: DRAFT | **Source**: `docs/nextjs-integration-handoff.md` (S1-S11)
**Target**: **bremen repo** (`https://github.com/YUuRiIM/stdev_2026_bremen`) -- in-place CRA-to-Next.js migration
**NOT**: `stdev2026/apps/web` (voice agent demo -- reference only, do not touch)

All file paths below are relative to the **bremen repo root**. The original CRA source lives under `my-app/`.

---

## RALPLAN-DR Summary

**Principles**: (1) Pixel fidelity -- 6 legacy screens visually identical post-port. (2) In-place migration -- bremen repo itself becomes a Next.js app; no second repo. (3) Data-driven -- lesson/quiz content in JSON, Figma as UI truth. (4) Progressive enhancement -- localStorage first, Postgres-ready schema. (5) Backward compatibility -- scripts without `effect` fields play without error.

**Decision Drivers**: PR review velocity (2000+ LOC risk) > CRA directory restructuring risk (`my-app/` to repo root) > Figma dependency blocking Phase 7.

### Migration Strategy (Axis 1: In-place vs Separate Repo)

| Option | Pros | Cons |
|--------|------|------|
| **A: In-place on feature branch** (rec.) | Single repo, single history; team already owns it; PR review in familiar context | Must restructure `my-app/` -> root; brief deployment gap during merge |
| **B: New repo, copy sources** | Clean slate; no CRA artifacts | Loses git history; duplicate repo management; team confusion on canonical source |

**Rec**: Option A. Option B invalidated because: (a) the team's existing CI/CD, issue tracker, and permissions are on bremen; (b) git history loss complicates blame/bisect for a codebase already in production; (c) a feature branch achieves the same isolation without repo proliferation.

### PR Strategy (Axis 2)

| Option | Pros | Cons |
|--------|------|------|
| **A: Single PR** | Atomic deploy | 2000+ LOC review bottleneck; hard to bisect |
| **B: 3 Stacked PRs** (rec.) | ~700 LOC each; Stack 1 merges independently | Branch management overhead |
| **C: 7 Phase PRs** | Max granularity | Phases 2-3 too small standalone |

**Rec**: Option B.

---

## PR Strategy Detail

| Stack | Branch | Phases | Base | ~LOC | Dependency |
|-------|--------|--------|------|------|------------|
| **0 (optional)** | `feat/repo-restructure` | Repo layout: `my-app/` contents promoted to root | `main` | ~200 | None. If skipped, Stack 1 does restructure inline. |
| **1** | `feat/next-port` | 1-4: CRA->Next basic migration + assets + script loading + component split | `main` (or Stack 0) | 1500-2000 | Stack 0 if used |
| **2** | `feat/game-state` | 5-6: Zustand + affection/progress + Tailwind/shadcn init | `feat/next-port` | ~800 | Stack 1 merged |
| **3** | `feat/lesson-quiz` | 7: Figma-based lesson/quiz UI | `feat/game-state` | ~1000 | Stack 2 merged + Figma designs confirmed |

---

## Implementation Steps

### Phase 0: Repo Restructure [Stack PR 0 -- `chore/my-app-promote` -- REQUIRED]

Promoted from optional to required per Architect review. Isolates layout churn from code changes so Stack PR 1 diff contains only logic.

1. `git mv my-app/* .` (CRA root → bremen repo root). `my-app-legacy/` snapshot commit kept for rollback reference (not merged to main).
2. Migrate CRA `public/` artifacts: `index.html` template → `app/layout.tsx` (head metadata, font preload); `manifest.json` / `robots.txt` / `favicon.ico` → `public/`; remove `%PUBLIC_URL%` placeholders; `process.env.PUBLIC_URL` references in JS → remove (Next.js uses `/` base).
3. Remove CRA-only: `react-scripts` dep, `.eslintrc` (CRA preset), `setupProxy.js` if present, `setupTests.js` — replaced by `eslint-config-next` (`pnpm dlx next lint`).
4. `data/convert_script.py` → move to `scripts/convert_script.py` (authoring tool, not shipped at runtime).
5. `REACT_APP_*` env vars: `grep -r "REACT_APP_"` → rename to `NEXT_PUBLIC_*` in `.env.example` + all usages.
6. `package.json` scripts: `start/build/test` → `dev/build/start` (Next.js) + remove CRA test runner if unused.

**AC**: `git log --oneline` of Stack 0 shows only file moves + config changes (zero logic diff). `pnpm install` at new root with `next@15` + `react@19.2.5` resolves cleanly. `pnpm dev` fails gracefully (no app pages yet — expected until Stack 1).

### Phase 1: Basic Port [Stack PR 1 -- `feat/next-port`]

Restructure `my-app/` to Next.js App Router at repo root. Run `pnpm create next-app` (App Router, TS) at root or manually init `package.json` + `next.config.ts`. Migrate 6 screens (`my-app/src/screens/*.jsx`) to App Router routes. Add `'use client'`. Replace `react-router-dom` (`Link to=` -> `Link href=`, `useNavigate` -> `useRouter`, `useParams` import path). Merge `my-app/src/styles/theme.css` + `my-app/src/App.css` into `app/globals.css`. Copy per-screen CSS as CSS Modules. Move `my-app/src/data/*.json` + `my-app/src/config/gameConfig.js` into `data/` and `config/` at repo root. Add `not-found.tsx`.

**File mapping** (bremen repo root):
- `my-app/src/App.js` → split: shared header/nav (`brand-group`, `app-topnav`) → `app/layout.tsx`; routing logic deleted (Next file-based routing); body `Outlet` area → `{children}`.
- `my-app/src/index.js` + `index.css` → deleted; Next manages bootstrap. Global `<html>`/`<body>` styles go into `app/layout.tsx` + `app/globals.css`.
- `my-app/src/screens/HomeScreen.jsx` → `app/page.tsx`
- `my-app/src/screens/CharacterSelectScreen.jsx` → `app/select/page.tsx`
- `my-app/src/screens/CharacterConfirmScreen.jsx` → `app/confirm/page.tsx`
- `my-app/src/screens/MainLobbyScreen.jsx` → `app/lobby/page.tsx`
- `my-app/src/screens/CharacterDetailScreen.jsx` → `app/detail/page.tsx`
- `my-app/src/screens/VisualNovelScreen.jsx` → `app/visual-novel/[scriptId]/page.tsx`
- `my-app/src/styles/theme.css` + `my-app/src/App.css` → `app/globals.css` (single merged file; scope isolation per §Phase 6).
- `my-app/src/data/*.json` → `data/` (kept for `fs.readFile` server-side + dynamic import compat).
- `my-app/src/config/gameConfig.js` → `config/gameConfig.js` (deprecated after Phase 5; import removed when `chapterClearStatus` migrates to store).
- `my-app/src/data/dummyCharacters.js` → `data/dummyCharacters.ts` (typed).

**AC**:
- All 6 routes render (manual check list in Verification §).
- `app/layout.tsx` renders header/nav identical pixels to CRA `App.js` top bar (Percy/Playwright screenshot diff).
- `pnpm build` exit 0.
- `grep -r "react-router-dom" app/ components/ lib/` → 0 hits.
- `grep -r "REACT_APP_\|process.env.PUBLIC_URL" .` → 0 hits.
- `my-app-legacy/` archive branch preserved (not deleted in Stack 1 — see Rollback).

### Phase 2: Asset Optimization [Stack PR 1]

Move `my-app/src/assets/images/` (17 PNGs, ~35MB) to `public/assets/`. Convert `bg-intro.png` (6.7MB) and `bg-lobby.png` (8MB) to webp (`cwebp -q 80`). Replace `<img>` with `next/image` `<Image>` (fill + sizes for backgrounds). Remove hardcoded import-map in VisualNovelScreen. Add meaningful `alt` text.

**AC**: `ls -lh public/assets/bg-*.webp` < 2MB each. No `<img>` tags remain.

### Phase 3: Script Loading [Stack PR 1]

Remove top-level 6-JSON static imports from VisualNovelScreen. Dynamic import: `import(\`@/data/script-\${scriptId}.json\`)` in useEffect. Add loading skeleton.

**AC**: `/visual-novel/fermat-1` network tab shows only `script-fermat-1.json`. Others absent.

### Phase 4: Component Split [Stack PR 1]

Extract from VisualNovelScreen: `DialogueBox`, `NarrativeArea`, `SkipModal` (fix `confirmSkip` bug -- handoff S9.1: `scriptData.length` -> `script.length`), `ChoiceList`, `BackgroundLayer`. All under `components/visual-novel/`.

**AC**: `fermat-1` end-to-end playthrough identical to pre-split. Skip modal references correct array.

### Phase 5: Game State System [Stack PR 2 -- `feat/game-state`]

Install Zustand. Define types per handoff S5.2 (`PlayerState`, `Affection`, `ChoiceEffect`, `ChoiceLog`) in `lib/game-state/types.ts`. Implement store with persist middleware (S5.4) in `lib/game-state/store.ts` (localStorage key `game-state-v1`, `schemaVersion: 1`). Script schema v2 (S5.3): `ChoiceOption` with optional `effect`; normalizer for `string[]` backward compat. Add effects to `script-fermat-1.json` only (PoC). Wire `selectChoice` -> `applyChoice`. Auto `markChapterClear` on script end. Migrate `chapterClearStatus` off `gameConfig.js`. UI: `AffectionGauge` on lobby, per-char progress on detail, `AffectionToast` on change. DevTools: `?reset` clears store.

**AC**:
- Choices update affection in store + UI.
- Refresh preserves state (`game-state-v1` localStorage entry present post-reload).
- `?reset` clears store.
- Effect-less scripts play normally — **unit test**: `normalizer.test.ts` feeds all 6 raw scripts (`script-intro.json`, `script-fermat-1..4.json`) through normalizer and asserts `ChoiceOption[]` shape, zero runtime errors.
- `initialState` includes `stageProgress: {}` (fills handoff §5.4 gap).

### Phase 6: Tailwind + shadcn Setup [Stack PR 2]

CRA has no UI library -- fresh install. `pnpm add -D tailwindcss postcss autoprefixer` + `pnpm dlx shadcn@latest init`. Add game HSL tokens to `:root`: `--primary: 40 99% 59%` (#FEBC2F), `--background: 222 47% 11%`, `--card: 220 40% 19%`. Extend `tailwind.config.ts` colors. Keep existing CSS variables (`--accent`, `--surface`) for legacy screens.

**Preflight defense (Architect must-fix)**: Tailwind's `@tailwind base` resets `* { border-width: 0; border-style: solid; margin: 0 }` which can break CRA CSS that assumes browser defaults. Strategy:
1. Scope legacy CSS by wrapping `app/globals.css` legacy section in `@layer legacy { ... }`.
2. Apply Tailwind `@layer base` → `@layer legacy` → `@layer components` cascade order via `tailwind.config.ts` `corePlugins.preflight: false` IF the default reset conflicts, then restore needed resets explicitly.
3. New shadcn components use normal Tailwind classes; legacy 6 screens retain original CSS through isolated selectors.
4. Configure `tailwind.config.ts` `content:` to **include only** `app/**/*.tsx` and `components/**/*.tsx` — not legacy `.jsx` pass-throughs — so Tailwind doesn't generate utilities for legacy class names.

Install shadcn components: `button card dialog progress radio-group toast`. Smoke-test **all 6 legacy screens** (not one) with screenshot diff vs pre-Tailwind baseline.

**AC**:
- `pnpm build` exit 0.
- `className="bg-primary"` in a new component renders HSL `#FEBC2F`.
- Legacy 6 screens: Playwright screenshot diff vs pre-Tailwind baseline → 0 pixel changes on key elements (header, dialogue box, stage nodes, buttons).
- `grep -r "@layer legacy" app/globals.css` → 1 hit.

### Phase 7: Lesson/Quiz System [Stack PR 3 -- `feat/lesson-quiz`]

**Prereq**: Figma designs confirmed. Define types per handoff S6.3 (`Chapter`, `Stage`, `Lesson`, `Quiz`, `Question`) in `lib/lesson/types.ts`. Routes: `app/lesson/[characterId]/[chapterId]/page.tsx`, `.../[stageId]/page.tsx`, `.../quiz/page.tsx`, `.../result/page.tsx`. PoC content: fermat chapter-1, 2-3 stages, 3-5 quiz questions in `content/lessons/fermat/chapter-1.json`. Build shadcn components: `ChapterBoard`, `StageNode`, `LessonViewer`, `QuizContainer`, `MCQQuestion`, `ShortAnswerQuestion`, `QuizResultDialog`. Extend store: `submitQuiz()` action (S6.7). Wire lobby "Start lesson" button + `stage-map` to live data.

**AC**: Full flow: lobby -> board -> slides -> quiz -> result -> affection + stage updated. All stages clear -> chapter auto-complete.

---

## Risks & Mitigations

| # | Risk | Sev | Mitigation |
|---|------|-----|------------|
| 1 | `my-app/` directory restructuring: `package.json`, `public/`, `src/` all move to repo root. Merge conflicts if parallel work on `main`. | H | Feature branch isolation. Optional Stack PR 0 for restructure only. Coordinate with team to freeze `my-app/` during migration window. |
| 2 | `react-scripts 5` (CRA, webpack) -> Next.js 15+ (Turbopack). JSON import semantics differ. | M | Test in Phase 1; fallback to dynamic `import()`. |
| 3 | React 19.2.5 already in CRA `package.json`. Next.js 15 supports React 19. Verify no peer dep conflicts. | L | Pin React 19.2.5. Run `pnpm install` early to surface issues. |
| 4 | `confirmSkip` bug (S9.1): `scriptData.length` should be `script.length`. | H | Fix in Phase 4 component split. Unit test skip-to-end. |
| 5 | CRA has no path aliases. Next.js uses `@/*` via `tsconfig.json` paths. | L | Rewrite all imports in Phase 1. |
| 6 | webp conversion quality vs size for gradient-heavy backgrounds. | M | Generate q80 + q90; visual compare; keep PNG source in repo. |
| 7 | `@tailwind base` reset breaks legacy class-scoped CSS. | H | Verify `@layer base` cascade; wrap legacy CSS in `@layer legacy` if needed. Test in Phase 6 smoke-test. |
| 8 | shadcn HSL tokens (`40 99% 59%`) vs CRA hex (`#FEBC2F`) equivalence. | M | Dual tokens: HSL for shadcn, keep hex `--accent` for legacy. Verify visual parity. |
| 9 | Large PR review bottleneck (Stack 1 alone ~1500-2000 LOC). | H | 3 stacked PRs. Stack 1 is mechanical port -- reviewable by diff structure not logic. |
| 10 | Figma designs not finalized blocks Phase 7. | H | Stack 3 waits independently. Stacks 1-2 ship without Figma. |
| 11 | Script effect authoring needs writer consensus. | M | Only fermat-1 PoC in Phase 5. Full pass is separate workstream. |
| 12 | Existing 6 scripts have `choices: string[]` (no `effect`). Runtime break if normalizer missing. | M | Normalizer: `typeof c === 'string' ? { text: c } : c`. Test all 6 scripts. |
| 13 | localStorage -> Postgres migration (deferred to Phase 10). Schema drift risk. | L | `schemaVersion: 1` + Zustand `migrate` function. Document schema contract. |
| 14 | If bremen is serving CRA in production, deployment gap during Next.js merge. | H | Feature flag or team announcement before merge. Verify CI/CD pipeline supports Next.js build before merging Stack 1. |

---

## Verification

```bash
# In bremen repo root (post-migration)
pnpm install && pnpm dev          # All routes at localhost:3000
pnpm build                        # Next.js 15, zero errors
```

**Route QA** (6 legacy + lesson routes):
- `/` (HomeScreen), `/select`, `/confirm`, `/lobby`, `/detail`
- `/visual-novel/fermat-1`, `/visual-novel/fermat-2`, `/visual-novel/fermat-3`, `/visual-novel/fermat-4`, `/visual-novel/intro`
- `/lesson/fermat/chapter-1/*` (Phase 7 only)

**Quantitative checks**:
- `ls -lh public/assets/bg-*.webp` -- each < 2MB
- Lighthouse: `npx lighthouse http://localhost:3000/lobby` -- Performance >= 80 (compare vs CRA baseline)
- Network tab: `/visual-novel/fermat-1` loads only `script-fermat-1.json`; fermat-2/3/4 absent

**Pixel regression**: CRA screenshots (captured before migration) vs Next.js screenshots for all 6 legacy screens.

**State persistence**: Play fermat-1 -> make choices -> refresh browser -> verify `game-state-v1` in localStorage intact, UI reflects saved state.

**Script integrity**: All 6 scripts play without error. Effect-less scripts advance normally (normalizer working).

---

## Success Criteria (from handoff S10)

### Phase 1-4 (Port)
- All routes function identically to CRA
- Design pixel-identical (6 legacy screens compared)
- `bg-intro`, `bg-lobby` at least 70% size reduction
- `/visual-novel/fermat-1` entry does NOT load fermat-2/3/4 JSON (dynamic import confirmed)
- `pnpm build` error-free
- Lighthouse Performance >= 80

### Phase 5 (Game State)
- Choice click -> affection change reflected in store + UI immediately
- Page refresh preserves affection/progress (localStorage)
- Chapter clear -> next story unlocked in CharacterDetailScreen
- `gameConfig.js` `chapterClearStatus` no longer referenced
- `?reset` clears store
- Effect-less scripts play without error

### Phase 6 (Tailwind + shadcn)
- Tailwind classes work in new components
- shadcn components use game design tokens (yellow accent, dark background)
- Legacy 6 screens pixel-identical after Tailwind setup

### Phase 7 (Lesson/Quiz)
- "Start lesson" button navigates to real chapter board
- `MainLobbyScreen` stage-map reflects real progress (not dummy)
- PoC: fermat chapter-1, 2-3 stages, 3-5 quiz questions functional
- Quiz pass -> affection + stage progress updated
- All stages clear -> chapter auto-complete + next chapter unlocked
- New screens match Figma designs

---

## Guardrails

**Must Have**: Pixel-identical legacy screens | `pnpm build` per stack | Zero `react-router-dom` | Zustand + localStorage persist | Effect-less backward compat | All work on bremen repo feature branches

**Must NOT**: Touch `stdev2026/apps/web` | Supabase backend (Phase 10) | Legacy screen Tailwind refactor (Phase 9) | CSS-in-JS | Full script effect pass | Figma-less UI for Phase 7 | Force-push to `main`

---

## Open Questions

Resolved via user decision (2026-04-18):
- ~~Target repo~~ → **bremen (YUuRiIM/stdev_2026_bremen) in-place**. `stdev2026/apps/web` untouched.
- ~~Stack PR 0~~ → **REQUIRED** (promoted per Architect review).

Still open (execution-time):
1. **Route namespace**: CRA uses `/select`, `/lobby` etc. at root. Keep as-is (default) unless collision shows up during Phase 1.
2. **Figma timeline**: Who has access? When are lesson/quiz designs signed off? (Stack 3 blocker.)
3. **Next.js version**: Handoff says "15+". Confirm 15 stable (not 16 canary).
4. **CI/CD**: Does bremen have existing CI? Needs Next.js build step added. Audit in Phase 0.
5. **Production deployment**: Is CRA currently deployed? If so, coordinate migration window. Feeds Rollback plan §.

---

## Rollback Plan (Critic must-fix)

**Principle**: In-place migration of a live CRA app requires reversible merges. Each Stack PR must be independently revert-able via `git revert <merge-commit>`.

| Stack | Rollback mechanism | Preserved artifact |
|-------|--------------------|---------------------|
| Stack 0 | `git revert` restores `my-app/` layout intact. | `my-app-legacy/` branch — snapshot before any moves, never merged. |
| Stack 1 | `git revert` restores CRA screens + router. `my-app-legacy/` still available as reference. | CRA build config kept in `my-app-legacy/`. CI workflow retains parallel CRA build job until Stack 2 merges successfully. |
| Stack 2 | `git revert` drops Zustand + Tailwind; CRA `gameConfig.js` import path already removed in Stack 1 so requires manual re-add (documented in PR body). | n/a — logic-only PR. |
| Stack 3 | `git revert` drops lesson/quiz routes + components. Stack 2 state survives. | Lesson content JSONs stay in `content/lessons/` if needed (orphan data harmless). |

**Deploy gating**: CRA deployment target (Vercel/Netlify/gh-pages — TBD per Open Question #5) keeps its existing build job through Stack 1 merge. Stack 2 merge switches default. Stack 3 never touches deployment defaults. **Nuke procedure** if all stacks must be reverted: `git revert` Stack 3 → Stack 2 → Stack 1 in reverse order (Stack 0 revert is `git mv` reversal, safe last step).

---

## Per-Stack Go/No-Go Gates (Critic must-fix)

Merge gate for each Stack PR. Must be **all green** in PR description before reviewer approval.

### Stack 0 Gate
- [ ] `git log --oneline HEAD~N..HEAD` shows only file moves + config (zero logic diff).
- [ ] `pnpm install` exit 0 with `next@15 + react@19.2.5`.
- [ ] `my-app-legacy/` snapshot branch pushed to remote.
- [ ] `grep -r "REACT_APP_" .` → 0 hits (or: all renamed to `NEXT_PUBLIC_*` with `.env.example` updated).
- [ ] CI pipeline has Next.js build step added OR old CRA build step preserved alongside.

### Stack 1 Gate
- [ ] `pnpm build` exit 0 (Stack 1 branch).
- [ ] `grep -r "react-router-dom" app/ components/ lib/` → 0 hits.
- [ ] All 6 routes manually verified (see QA Checklist below).
- [ ] Playwright/Percy screenshot diff of 6 legacy screens vs CRA baseline → <5% pixel difference.
- [ ] Lighthouse Performance on `/lobby` ≥ 80 (match or beat CRA baseline).
- [ ] `ls -lh public/assets/bg-intro.webp` < 2MB AND `bg-lobby.webp` < 2MB.
- [ ] Network tab: `/visual-novel/fermat-1` loads only `script-fermat-1.json`; zero requests for `fermat-2/3/4`.
- [ ] `confirmSkip` bug fixed (unit test: skip at `/visual-novel/fermat-1` goes to last entry).

### Stack 2 Gate
- [ ] Stack 1 merged to `main`.
- [ ] `pnpm --filter ... test` / `node --test` — normalizer test suite passes on all 6 scripts.
- [ ] localStorage `game-state-v1` round-trip: play fermat-1 → refresh → state intact.
- [ ] `?reset` clears localStorage and resets UI.
- [ ] All 6 legacy screens: Playwright diff post-Tailwind == 0 pixel diff vs Stack 1 merged state.
- [ ] `grep -r "chapterClearStatus" app/ components/` → 0 hits (fully migrated to store).

### Stack 3 Gate
- [ ] Stack 2 merged to `main`.
- [ ] Figma sign-off captured in PR body (link + date).
- [ ] Full PoC flow: lobby → board → slides → quiz → result → store state mutation verified.
- [ ] All PoC stages clear → fermat chapter-1 auto-complete → chapter-2 unlocked.
- [ ] shadcn components in new screens match Figma screenshots (side-by-side in PR).

---

## Route QA Checklist (Stack 1 gate detail)

For each route, verify: loads (HTTP 200) + renders expected DOM + key interaction works.

| Route | Load | Key interaction | Expected |
|-------|------|-----------------|----------|
| `/` | 200 | click character card | navigate to `/select` |
| `/select` | 200 | click fermat tile | navigate to `/confirm` with fermat context |
| `/confirm` | 200 | "시작" button | navigate to `/lobby` |
| `/lobby` | 200 | "수업 시작" button | navigate to `/visual-novel/fermat-1` (Stack 1) or lesson board (Stack 3) |
| `/detail` | 200 | click unlocked story | navigate to visual-novel route |
| `/visual-novel/fermat-1` | 200 | click "next" 5 times | advance 5 entries + correct transitions |
| `/visual-novel/fermat-1` | - | skip button → confirm | jump to last entry + no `scriptData.length` error |
| `/visual-novel/fermat-2..4`, `/visual-novel/intro` | 200 | render first entry | script loaded lazily |
| `/404` (or unknown path) | 200 | fallback renders | `app/not-found.tsx` displays HomeScreen content |

---

## ADR — Architecture Decision Record

**Decision**: Migrate bremen (CRA) to Next.js 15+ App Router **in-place** as 3 stacked PRs (Stack 0 restructure → Stack 1 port → Stack 2 state+tokens → Stack 3 lesson/quiz), with Stack 0 promoted from optional to required per Architect review.

**Drivers**:
1. **PR review velocity** — single monolithic PR (~3000+ LOC) would bottleneck review. Stacked strategy keeps each PR <2000 LOC.
2. **Pixel fidelity** — legacy 6 screens must render identically pre/post migration, which requires CSS coexistence guardrails (Tailwind `@layer legacy`).
3. **External dependencies** — Figma (Stack 3) and writer consensus (Stack 2 effect annotation) should not block voice-only ports.

**Alternatives considered**:
- *Single PR* — atomic deploy, but review bottleneck + bisect difficulty + rollback impossible. Rejected: risk too high for production CRA.
- *7 Phase PRs* — maximum granularity, but Phases 2/3 alone are trivially small (image moves, dynamic imports) → churn. Rejected.
- *Separate new repo* — cleanest from "voice demo vs game FE" separation perspective. Rejected: user-confirmed bremen in-place is the explicit deliverable.
- *Monorepo consolidation into stdev2026* — would share shadcn/Tailwind/Supabase infra with `apps/web`, but breaks bremen's FE-team workflow + mixes concerns. Rejected per user decision.

**Why chosen**: 3-stacked PR balances reviewability, deploy safety, and dependency isolation. Stack 0 promotion is Architect-driven: separates file-move noise from logic diff, making Stack 1 review 10× easier.

**Consequences**:
- (+) Each Stack is independently deployable and revertable.
- (+) Stack 3 delay (Figma block) does not hold up Stack 1-2 release.
- (+) Rollback is well-defined per stack.
- (-) Stack management overhead (rebase coordination).
- (-) CI workflow needs to retain both CRA and Next.js build jobs through Stack 1 window.
- (-) Writer-dependent script effect rollout stays as `script-fermat-1.json` PoC only — others remain string arrays.

**Follow-ups** (post-Phase-7):
- Phase 8 (verification pass): Lighthouse regression tracking, Playwright visual suite formalized.
- Phase 9 (optional): Tailwind refactor of 6 legacy screens for consistency.
- Phase 10: Supabase backend (auth + server-side player state) — localStorage → Postgres migration.
- Phase 11: content expansion (remaining characters × chapters).

---

## Changelog

**2026-04-18 revision 1** — consensus feedback merged (Architect + Critic).

- [Scope fix] Target confirmed as **bremen repo in-place**. Planner's initial stdev2026/apps/web interpretation discarded. File mapping rewritten to bremen root.
- [Architect BLOCKER] resolved by user decision.
- [Architect SHOULD-FIX 1] Phase 6 Preflight defense expanded: `@layer legacy` wrap + 6-screen smoke test + `content:` include scope.
- [Architect SHOULD-FIX 2] Phase 5 AC adds `normalizer.test.ts` unit test on all 6 scripts.
- [Architect SHOULD-FIX 3] Phase 0 (new) covers CRA `public/` artifacts (`index.html`, `manifest.json`, `robots.txt`, `favicon`, `%PUBLIC_URL%`).
- [Architect SHOULD-FIX 4] Stack 0 promoted from optional to required.
- [Architect SHOULD-FIX 5] React 19.2.5 pin noted in Stack 0 gate.
- [Architect NICE-TO-HAVE] ESLint transition documented in Phase 0 (`eslint-config-next` replaces CRA preset). Other nice-to-haves tracked in Open Questions / Phase refinements.
- [Critic MAJOR 1] Rollback Plan § added (per-Stack revert procedure + `my-app-legacy/` snapshot strategy + CI job gating).
- [Critic MAJOR 2] Per-Stack Go/No-Go Gates § added (explicit merge gate checklists).
- [Critic minor] Route QA converted from URL list to interaction checklist.
- [Critic minor] `initialState.stageProgress: {}` explicitly called out (fills handoff §5.4 gap).
- [Critic minor] `REACT_APP_*` → `NEXT_PUBLIC_*` migration step added to Phase 0.
- [Critic minor] `convert_script.py` disposition: `scripts/convert_script.py` (authoring tool).
- [Critic minor] `app/layout.tsx` creation from CRA `App.js` header/nav explicitly documented in Phase 1.
- [Critic missing] `App.js` shared layout split (header/nav → layout.tsx, routing → file-based, body → `{children}`) in Phase 1 file mapping.
- [Added] ADR section (Decision / Drivers / Alternatives / Why chosen / Consequences / Follow-ups).

**Verdict status**: Architect Conditional Go (blocker resolved) + Critic REVISE with 2 MAJOR → both addressed via Rollback + Per-Stack Gates + expanded phases → **plan ready for execution on user approval**.
