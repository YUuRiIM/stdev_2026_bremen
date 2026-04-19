/**
 * Seed data: subjects (강의 주제).
 *
 * Demo MVP: 1개 subject ("페르마 소정리"), 3 objectives 전부 full rubric.
 *
 * ### Double-blind judge 격리
 *
 * - `statement`, `concept_key`, `expected_terms`는 student agent에 노출 OK
 * - `rubric`은 **judge LLM 전용**. student agent 경로 어디서도 읽히면 안 됨.
 * - `loadSubjectForStudent()`는 `SubjectPublic` (rubric strip된 variant) 반환,
 *   `loadSubjectForJudge()`는 `SubjectForJudge` (rubric 포함) 반환.
 */

export interface Rubric {
  must_hit: string[];
  common_misconceptions: string[];
  partial_credit: boolean;
}

export interface Objective {
  id: string;
  statement: string; // student에 노출 가능
  conceptKey: string; // understood_concepts 연결
  weight: number;
  expectedTerms: string[]; // short-circuit term coverage 체크용
  rubric: Rubric; // judge 전용. student에 절대 노출 금지.
}

export interface SubjectSeed {
  characterId: null | 'fermat'; // null = 공용, 특정 캐릭터 귀속 가능
  topic: string;
  keyterms: string[]; // Deepgram keyterm prompting 용
  objectives: Objective[]; // 전체 (student와 judge가 각자 variant로 소비)
  prerequisites: string[];
  difficulty: number;
}

// ─── Subject: 페르마 소정리 ────────────────────────────────

export const FERMAT_LITTLE_THEOREM_SEED: SubjectSeed = {
  characterId: 'fermat',
  topic: '페르마 소정리 (Fermat\'s Little Theorem)',
  keyterms: [
    '소수',
    '나머지',
    '합동',
    'mod',
    '모듈러',
    '페르마',
    '소정리',
    'a의 p-1',
    'a^(p-1)',
    '역원',
    '유리수',
    '정수론',
    '서로소',
    '밀러-라빈',
    'RSA',
    '소수 판정',
  ],
  objectives: [
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
    },
    {
      id: 'obj_flt_example',
      statement:
        '구체 수치 예시로 정리를 검증한다 (예: 2^4 mod 5 = 1, 3^4 mod 5 = 1).',
      conceptKey: 'flt_example',
      weight: 1,
      expectedTerms: ['2^4', '3^4', '5', '7', '16', '1', 'mod', '예시'],
      rubric: {
        must_hit: [
          '소수 p를 선택하고 그보다 작은 a를 사용해야 한다.',
          'a^(p-1)를 실제로 계산해야 한다.',
          '계산 결과가 1 mod p임을 명시적으로 확인해야 한다.',
        ],
        common_misconceptions: [
          'p를 소수가 아닌 값으로 잡은 예시를 들면 감점.',
          '계산 실수 (예: 2^4 = 14로 오답)는 감점.',
          '단일 예시로만 "항상 성립한다" 같은 과도한 일반화는 감점.',
        ],
        partial_credit: true,
      },
    },
    {
      id: 'obj_flt_applications',
      statement:
        '페르마 소정리의 실제 활용처를 하나 이상 제시한다 (소수 판정, 모듈러 역원, RSA 등).',
      conceptKey: 'flt_applications',
      weight: 1,
      expectedTerms: [
        '소수 판정',
        '밀러-라빈',
        '페르마 판정법',
        '모듈러 역원',
        'RSA',
        '암호',
      ],
      rubric: {
        must_hit: [
          '활용처를 구체적으로 1개 이상 언급해야 한다 (이름만이라도).',
          '왜 유용한지 논리적으로 연결해야 한다 (a^(p-1)=1 성질을 어떻게 쓰는지).',
        ],
        common_misconceptions: [
          '카마이클 수(Fermat pseudoprime) 예외를 언급하지 않고 페르마 판정을 완벽한 소수 판정으로 소개하면 부분 감점.',
          'RSA를 단순히 "큰 수 소인수분해"로만 설명하고 페르마 소정리·오일러 정리 연관성을 빠뜨리면 부분 감점.',
        ],
        partial_credit: true,
      },
    },
  ],
  prerequisites: [],
  difficulty: 2,
};

// ─── Subject: Chapter 1 사칙연산 ────────────────────────────
//
// 덧셈·뺄셈·곱셈을 한 강의 안의 세 objective 로 묶은 단일 subject. 교수님
// (유저) 은 차례로 세 연산을 설명해야 하며, 각 objective 는 개념 정의 + 구체
// 예시 + 두 자리 이상/연산 순서 같은 핵심 포인트 를 한꺼번에 요구한다.

export const BASIC_ARITHMETIC_SEED: SubjectSeed = {
  characterId: null,
  topic: '사칙연산',
  keyterms: [
    '더하기', '합', '+', '덧셈',
    '빼기', '차', '-', '뺄셈',
    '곱하기', '곱', '×', '곱셈',
    '개수', '자릿수', '받아올림', '받아내림', '구구단',
  ],
  objectives: [
    {
      id: 'obj_arith_addition',
      statement:
        '덧셈이 "두 묶음의 개수를 합쳐 하나의 전체 개수를 구하는 연산" 임을 설명하고, 한 자리 수 덧셈 예시와 두 자리 이상에서의 받아올림을 보인다.',
      conceptKey: 'arith_addition',
      weight: 1,
      expectedTerms: ['합치다', '모으다', '합', '개수', '+', '받아올림', '자리', '10'],
      rubric: {
        must_hit: [
          '덧셈을 "양을 합치는 연산" 으로 개념 정의한다.',
          '한 자리 수 덧셈 예시를 최소 1개 실제로 계산한다 (예: 3+4=7).',
          '두 자리 이상 예에서 받아올림(자리올림) 원리를 언급한다 (한 자리 합이 10 이상이면 윗자리로 1 올림).',
        ],
        common_misconceptions: [
          '"+ 기호를 쓴다" 로만 끝내고 합치기 개념을 빠뜨리면 감점.',
          '교환법칙 a+b = b+a 를 부정하면 감점.',
          '받아올림을 "그냥 옆에 적는다" 수준으로만 설명하면 부분 감점.',
        ],
        partial_credit: true,
      },
    },
    {
      id: 'obj_arith_subtraction',
      statement:
        '뺄셈이 "한 묶음에서 일부를 덜어냈을 때 남은 개수 또는 두 양의 차이를 구하는 연산" 임을 설명하고, 한 자리 수 뺄셈 예시와 두 자리 이상에서의 받아내림을 보인다.',
      conceptKey: 'arith_subtraction',
      weight: 1,
      expectedTerms: ['빼다', '남다', '차이', '차', '-', '받아내림', '빌려', '자리'],
      rubric: {
        must_hit: [
          '뺄셈을 "덜어내기" 또는 "차 구하기" 개념으로 정의한다.',
          '한 자리 수 뺄셈 예시를 최소 1개 실제로 계산한다 (예: 9-4=5).',
          '두 자리 이상 예에서 받아내림(자리내림) 원리를 언급한다 (현재 자리에서 뺄 수 없으면 윗자리에서 10을 빌려 옴).',
        ],
        common_misconceptions: [
          '"덧셈의 역산" 이라고만 말하고 의미를 설명 안 하면 부분 감점.',
          '교환법칙 a-b = b-a 로 오해하면 감점.',
          '받아내림을 단순 "윗자리 1 빼기" 로만 설명하면 부분 감점.',
        ],
        partial_credit: true,
      },
    },
    {
      id: 'obj_arith_multiplication',
      statement:
        '곱셈이 "같은 수를 여러 번 더하는 것의 단축 표기" 임을 설명하고, 구구단 범위 내 곱셈 예시와 덧셈·뺄셈보다 먼저 계산한다는 연산 순서를 보인다.',
      conceptKey: 'arith_multiplication',
      weight: 1,
      expectedTerms: ['같은 수', '반복', '더하기', '배', '묶음', '×', '구구단', '순서', '먼저', '우선'],
      rubric: {
        must_hit: [
          '곱셈을 "같은 수 반복 덧셈" 또는 "같은 묶음이 여러 개" 개념으로 정의한다 (예: 3×4 = 3+3+3+3).',
          '구구단 범위 곱셈 예시를 최소 1개 실제로 계산한다 (예: 6×7=42).',
          '혼합 식에서 곱셈이 덧셈·뺄셈보다 먼저라는 규칙을 언급한다 (예: 2+3×4=14).',
        ],
        common_misconceptions: [
          '곱셈을 단순 "두 수를 합친 것" 으로 덧셈과 혼동하면 감점.',
          '교환법칙 a×b = b×a 를 부정하면 감점.',
          '혼합 식을 "왼쪽부터 순서대로" 계산한다고 설명하면 감점.',
        ],
        partial_credit: true,
      },
    },
  ],
  prerequisites: [],
  difficulty: 1,
};

export const SUBJECTS_SEED: SubjectSeed[] = [
  BASIC_ARITHMETIC_SEED,
  FERMAT_LITTLE_THEOREM_SEED,
];

// ─── Judge 호환 variant (student에 넘기기 전 strip) ─────────────

/**
 * Student agent가 소비할 수 있는 안전한 variant.
 * `rubric` 필드는 Omit으로 타입 레벨에서 제거된다.
 */
export type SubjectPublic = Omit<SubjectSeed, 'objectives'> & {
  objectives: Array<Omit<Objective, 'rubric'>>;
};

export type SubjectForJudge = SubjectSeed;

/**
 * Student agent용 subject loader helper (타입 레벨 rubric 제거 증명).
 *
 * Runtime에서는 DB adapter가 이 함수를 호출하여 rubric JSON을 strip한 후
 * agent context에 주입한다.
 */
export function stripRubricsForStudent(subject: SubjectSeed): SubjectPublic {
  return {
    ...subject,
    objectives: subject.objectives.map(({ rubric, ...rest }) => rest),
  };
}
