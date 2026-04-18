# 콘텐츠 작성 가이드 (퀴즈 & 강의 주제)

**대상 독자**: 콘텐츠(퀴즈·강의) 작성 담당자
**작성일**: 2026-04-18
**레포**: `stdev2026`

---

## 0. 한눈에 보기 — 두 종류의 콘텐츠

본 프로젝트에는 **서로 다른 목적의 두 콘텐츠**가 있다. 헷갈리지 말 것.

| 구분 | PREP 퀴즈 | 강의 주제 (Subject) |
|---|---|---|
| 모드 | PREP (선택지 맞추기) | LECTURE (역튜터링 — 유저가 캐릭터에게 설명) |
| 형식 | 객관식 (3지선다) | 오픈 답변 (음성/텍스트로 설명) |
| 채점 | FE가 `answerIdx`로 즉시 판정 | judge LLM이 rubric으로 채점 |
| 소비 주체 | 프론트엔드만 | 캐릭터 에이전트(student) + judge LLM |
| 파일 | `packages/shared/src/seed/quizzes.ts` | `packages/shared/src/seed/subjects.ts` |
| 테이블 | `quizzes` | `subjects` |

> 작성 산출물은 **둘 다 TS seed 파일**로 제출한다 (MD 원고도 함께 주면 검토가 수월).

---

## 1. PREP 퀴즈 (객관식)

### 1.1 형식

```ts
interface QuizSeed {
  sortOrder: number;              // 1부터 시작, 캐릭터 내부에서 노출 순서
  characterSlug: 'fermat';        // 캐릭터 슬러그 (현 데모: 'fermat'만)
  question: string;               // 문제 본문. \n 줄바꿈 허용
  choices: string[];              // 선택지 3개 권장 (최소 2, 최대 4)
  answerIdx: number;              // 정답 인덱스 (0-base)
  flavorOnCorrect: string | null; // 정답 시 캐릭터 대사 (생략 가능)
  flavorOnWrong: string | null;   // 오답 시 캐릭터 대사 (생략 가능)
  conceptKey: string | null;      // 해당 개념 식별자 (아래 1.4 참조)
}
```

### 1.2 작성 규칙

1. **선택지는 3개 기본**. 정답 1개 + 매력적인 오답 2개.
2. `answerIdx`는 **0부터**. 첫 번째 선택지 정답이면 `0`.
3. **정답 위치를 섞을 것**. 항상 0이면 패턴이 드러남. 문제별로 0·1·2를 적절히 분산.
4. `question`에서 수식은 유니코드 우선 사용 (`2⁴`, `a² + b²`, `≡`, `mod`). 복잡하면 plain text fallback OK (`a^(p-1)`).
5. `flavorOnCorrect` / `flavorOnWrong` 은 **캐릭터 말투**로 작성. 없으면 `null`.
6. 한 캐릭터 안에서 `sortOrder`는 유일해야 함 (1, 2, 3… 연속).

### 1.3 퀴즈 성격 믹스

13문항 내외 권장. 이런 유형을 **섞어** 배치:

| 유형 | 목적 | 예시 |
|---|---|---|
| 지식 확인 | 캐릭터의 연구 주제 관련 사실 | "17은 어떤 수?" → 소수 |
| 계산 | 간단한 수식 적용 | "2⁴ mod 5 = ?" |
| 캐릭터성 | 페르소나 깊이 만들기 | "연구실에서 가장 위험한 사람?" |
| 스토리/전기 | 캐릭터 역사·배경 | "페르마의 원래 직업은?" → 판사 |
| 감정 선택 | 유저 취향 반영 | "밤샘 연구 어떻게 생각?" |

**비율 가이드**: 지식/계산 50%, 캐릭터성/스토리 50%.

### 1.4 `conceptKey` 규칙

- `snake_case` 소문자 영문.
- 학술 개념: `flt_statement`, `flt_example`, `prime_basics`, `fermat_numbers` 등.
- 캐릭터성: `character_persistence`, `character_curiosity`, `character_night_work` 등.
- 스토리: `fermat_biography_judge`, `flt_history_wiles` 등.
- 매칭되는 강의 objective가 있으면 **동일한 conceptKey**를 사용 (예: `flt_statement`).
- 적절한 키가 없으면 `null`도 OK.

### 1.5 예시 (참고)

```ts
{
  sortOrder: 6,
  characterSlug: 'fermat',
  question: '2⁴를 5로 나누었을 때 나머지는?',
  choices: ['0', '1', '2'],
  answerIdx: 1,
  flavorOnCorrect: '바로 그거다. 이런 식으로 소수를 확인할 수도 있지.',
  flavorOnWrong: '흥미롭네…. 이건 내 연구 분야와 가까운 문제다.',
  conceptKey: 'flt_example',
}
```

기존 13문항 전체는 `packages/shared/src/seed/quizzes.ts` 참고.

---

## 2. 강의 주제 (Subject)

유저가 캐릭터에게 해당 주제를 **설명(강의)**하면, judge LLM이 rubric으로 점수를 매긴다.

### 2.1 형식

```ts
interface SubjectSeed {
  characterId: null | 'fermat';   // null = 공용, 'fermat' = 해당 캐릭터 전용
  topic: string;                  // 사람이 읽는 주제명 (예: "페르마 소정리")
  keyterms: string[];             // Deepgram 음성인식 보조 용어 (2.3 참조)
  objectives: Objective[];        // 학습 목표 (보통 3개)
  prerequisites: string[];        // 선수 개념 (빈 배열 OK)
  difficulty: number;             // 1~5 (1=쉬움, 5=매우 어려움)
}

interface Objective {
  id: string;                     // 고유 ID, snake_case (예: 'obj_flt_statement')
  statement: string;              // 목표 설명 (학생 에이전트에게도 노출됨)
  conceptKey: string;             // understood_concepts 연결 키 (퀴즈와 공유 가능)
  weight: number;                 // 가중치 (1~3 정도)
  expectedTerms: string[];        // 이 목표 설명 시 등장해야 할 핵심 용어
  rubric: Rubric;                 // ⚠️ judge 전용 — 학생에 절대 노출 금지
}

interface Rubric {
  must_hit: string[];             // 반드시 언급되어야 할 포인트 (완전 점수)
  common_misconceptions: string[];// 흔한 오해 (감점 포인트)
  partial_credit: boolean;        // 부분 점수 허용 여부
}
```

### 2.2 더블블라인드 채점 규칙 ⚠️ **매우 중요**

- **`rubric` 필드는 judge LLM 전용**. 학생 캐릭터 에이전트에게 절대 노출되면 안 된다.
- 코드 레벨에서 `stripRubricsForStudent()`로 제거되지만, **rubric 내용이 `statement`나 `expectedTerms`에 새어나가지 않도록** 작성자도 주의할 것.
  - BAD: `statement: "a^(p-1) ≡ 1 mod p를 언급하며 gcd(a,p)=1 조건을 명시하라"` ← rubric의 must_hit를 그대로 드러냄.
  - GOOD: `statement: "페르마 소정리의 선언문을 정확히 설명한다"`
- `expectedTerms`는 **정답 노출이 아닌 힌트 수준**의 용어여야 한다 (소수, mod, 서로소 등).

### 2.3 `keyterms` (Deepgram 보조)

음성인식이 전문용어를 놓치지 않도록 주는 힌트. 주제에 등장할 만한 고유명사·수식 표현을 15개 내외:
- 학술 용어 (소수, 합동, 모듈러, mod)
- 인명 (페르마, 와일스)
- 수식 표현 (`a^(p-1)`, `2^4`)
- 응용 영역 (RSA, 소수 판정, 밀러-라빈)

### 2.4 Objectives 작성 규칙

- **3개 권장** (너무 많으면 한 세션에 다 다루지 못함).
- 각 objective는 **독립적으로 채점 가능**해야 함 (한 문장만으로 판정 가능한 단위).
- 전형적인 3-세트 구성:
  1. **선언/정의** (Statement) — 정리가 무엇인지 정확히 말할 수 있는가
  2. **예시/적용** (Example) — 구체 수치로 검증할 수 있는가
  3. **의의/활용** (Application) — 실전에서 왜 쓰이는가

### 2.5 Rubric 작성 팁

**`must_hit`** — 반드시 언급되어야 할 것, 체크리스트처럼 작성. 각 항목이 독립적 AND 조건.
- OK: `"p가 소수라는 전제가 명시되어야 한다."`
- Bad: `"전체적으로 설명을 잘해야 한다."` (judge가 판정 불가)

**`common_misconceptions`** — 학생이 틀리기 쉬운 부분을 미리 적어두면 judge가 감점 기준을 잡음.
- OK: `"p가 소수가 아니어도 성립한다고 오해하면 감점."`

**`partial_credit`** — 부분 점수 허용 여부. 보통 `true`.

### 2.6 예시 (페르마 소정리 objective 1개)

```ts
{
  id: 'obj_flt_statement',
  statement:
    '페르마 소정리의 정리 선언문을 정확히 설명한다 (p가 소수이고 gcd(a,p)=1일 때 a^(p-1) ≡ 1 mod p).',
  conceptKey: 'flt_statement',
  weight: 2,
  expectedTerms: ['소수', 'p', 'a^(p-1)', '1', 'mod p', '합동', '서로소'],
  rubric: {
    must_hit: [
      'p가 소수라는 전제가 명시되어야 한다.',
      'a와 p가 서로소(gcd(a,p)=1) 조건을 언급해야 한다.',
      'a^(p-1) ≡ 1 (mod p) 공식을 정확히 진술해야 한다.',
    ],
    common_misconceptions: [
      'p가 소수가 아니어도 성립한다고 오해하면 감점.',
      'a^p ≡ a (mod p) 변형만 말하고 본 정리를 빠뜨리면 부분 감점.',
      '합동(mod) 개념을 등호로만 설명하면 부분 감점.',
    ],
    partial_credit: true,
  },
}
```

전체 페르마 소정리 subject는 `packages/shared/src/seed/subjects.ts` 참고.

---

## 3. 제출 형식

### 3.1 원고 (MD)

작성자는 **MD로 먼저 초안 작성** → 리뷰 → TS seed 변환 순서 권장.

MD 템플릿:

```markdown
## [캐릭터명] 퀴즈 (총 N문항)

### Q1. [문제 본문]
- (A) 선택지1
- (B) 선택지2
- (C) 선택지3
- **정답**: B
- **정답 반응**: "좋아, …"
- **오답 반응**: null
- **conceptKey**: `prime_basics`

### Q2. …

---

## [캐릭터명] 강의 주제: [주제명]

- **difficulty**: 2
- **prerequisites**: 없음 / [개념 리스트]
- **keyterms**: 소수, mod, 페르마, …

### Objective 1: [목표 요약]
- **conceptKey**: `flt_statement`
- **weight**: 2
- **expectedTerms**: 소수, p, a^(p-1), …
- **must_hit**:
  - …
  - …
- **common_misconceptions**:
  - …
- **partial_credit**: true

### Objective 2: …
### Objective 3: …
```

### 3.2 최종 산출물

- 퀴즈: `packages/shared/src/seed/quizzes.ts`의 `QUIZZES_SEED` 배열에 추가
- 강의: `packages/shared/src/seed/subjects.ts`의 `SUBJECTS_SEED` 배열에 추가
- 기존 파일 포맷·주석 스타일 유지

---

## 4. 캐릭터 말투 참고

현재 캐릭터 **페르마**의 톤:
- 1인칭 "나", 상대 호칭 "자네"
- 건조하지만 가끔 "ㅋㅋㅋ" 같은 웃음
- 지적 우월감이 약간 있음, 그러나 학생을 얕보지는 않음
- 연구·수학에 대한 진지함, 사교성은 낮음

말투 참고용 `flavorOnCorrect` 예시:
- "좋아. 적어도 패턴은 읽을 줄 아는군…ㅋㅋㅋ……."
- "바로 그거다. 이런 식으로 소수를 확인할 수도 있지."
- "역시 자네는 나를 잘 아는군."

---

## 5. 체크리스트 (제출 전 확인)

### 퀴즈
- [ ] `sortOrder`가 1부터 연속되고 중복 없음
- [ ] `answerIdx`가 `choices.length` 범위 안
- [ ] 정답 위치가 0·1·2에 고루 분포
- [ ] 지식/캐릭터성 비율이 극단적이지 않음 (예: 전부 계산 문제는 지양)
- [ ] `conceptKey`가 snake_case

### 강의 주제
- [ ] `topic`이 사람이 읽기에 자연스러움
- [ ] `objectives` 3개, 각각 독립 채점 가능
- [ ] `statement`에 rubric의 `must_hit` 내용이 그대로 노출되지 않음
- [ ] `rubric.must_hit`이 체크 가능한 구체 진술 (추상어 금지)
- [ ] `keyterms` 15개 내외, 실제 강의에 등장할 용어
- [ ] `difficulty`가 1~5

---

## 6. 질문·오너십

- 문서·스키마 관련: henry (hsu200301@gmail.com)
- 기존 seed 참고: `packages/shared/src/seed/{quizzes.ts,subjects.ts}`
- 스키마 정의: `packages/shared/src/db/schema.ts`
