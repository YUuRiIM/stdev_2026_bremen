export type SubjectDifficulty = 1 | 2 | 3 | 4 | 5;

export interface LectureObjective {
  id: string;
  statement: string;
  conceptKey: string;
  weight: number;
  expectedTerms: string[];
}

export interface LectureSubject {
  slug: string;
  topic: string;
  difficulty: SubjectDifficulty;
  keyterms: string[];
  prerequisites: string[];
  objectives: LectureObjective[];
}

export const LECTURE_SUBJECTS: LectureSubject[] = [
  {
    slug: 'fermat-little-theorem',
    topic: '페르마 소정리',
    difficulty: 3,
    keyterms: [
      '소수',
      '합동',
      '모듈러',
      'mod',
      '페르마',
      '와일스',
      'a^(p-1)',
      '서로소',
      'gcd',
      'RSA',
      '소수 판정',
      '오일러',
      '정리',
      '증명',
    ],
    prerequisites: ['정수 나눗셈', '모듈러 산술 기초'],
    objectives: [
      {
        id: 'obj_flt_statement',
        statement:
          '페르마 소정리의 선언문을 정확히 설명한다.',
        conceptKey: 'flt_statement',
        weight: 2,
        expectedTerms: ['소수', 'p', 'a^(p-1)', '1', 'mod p', '합동', '서로소'],
      },
      {
        id: 'obj_flt_example',
        statement: '구체적인 수치로 정리를 검증하는 예시를 든다.',
        conceptKey: 'flt_example',
        weight: 1,
        expectedTerms: ['2^4', '5', 'mod', '나머지', '1'],
      },
      {
        id: 'obj_flt_application',
        statement: '페르마 소정리가 실전에서 어떻게 쓰이는지 설명한다.',
        conceptKey: 'flt_application',
        weight: 2,
        expectedTerms: ['RSA', '소수 판정', '밀러-라빈', '암호'],
      },
    ],
  },
  // Chapter 1: 사칙연산 — 단일 subject, 3 objectives (덧셈/뺄셈/곱셈). DB seed
  // row id = c05079ce-c704-4900-9462-f9f3f025f3b6 (topic="사칙연산"). This FE
  // mirror re-uses the same ids/statements so the ObjectiveChecklist renders
  // consistently before `startLecture` publishes the authoritative state.
  {
    slug: 'basic-arithmetic',
    topic: '사칙연산',
    difficulty: 1,
    keyterms: [
      '더하기', '합', '+', '덧셈',
      '빼기', '차', '-', '뺄셈',
      '곱하기', '곱', '×', '곱셈',
      '받아올림', '받아내림', '구구단',
    ],
    prerequisites: [],
    objectives: [
      {
        id: 'obj_arith_addition',
        statement:
          '덧셈이 "두 묶음의 개수를 합쳐 하나의 전체 개수를 구하는 연산" 임을 설명하고, 한 자리 수 덧셈 예시와 두 자리 이상에서의 받아올림을 보인다.',
        conceptKey: 'arith_addition',
        weight: 1,
        expectedTerms: ['합치다', '모으다', '합', '개수', '+', '받아올림', '자리', '10'],
      },
      {
        id: 'obj_arith_subtraction',
        statement:
          '뺄셈이 "한 묶음에서 일부를 덜어냈을 때 남은 개수 또는 두 양의 차이를 구하는 연산" 임을 설명하고, 한 자리 수 뺄셈 예시와 두 자리 이상에서의 받아내림을 보인다.',
        conceptKey: 'arith_subtraction',
        weight: 1,
        expectedTerms: ['빼다', '남다', '차이', '차', '-', '받아내림', '빌려'],
      },
      {
        id: 'obj_arith_multiplication',
        statement:
          '곱셈이 "같은 수를 여러 번 더하는 것의 단축 표기" 임을 설명하고, 구구단 범위 내 곱셈 예시와 덧셈·뺄셈보다 먼저 계산한다는 연산 순서를 보인다.',
        conceptKey: 'arith_multiplication',
        weight: 1,
        expectedTerms: ['같은 수', '반복', '더하기', '×', '구구단', '순서', '먼저'],
      },
    ],
  },
  // Chapter 2: 분수 기초 — 단일 subject, 3 objectives (개념/등가/사칙).
  // DB seed row should mirror this slug/topic (topic="분수"). Difficulty 2.
  {
    slug: 'basic-fractions',
    topic: '분수',
    difficulty: 2,
    keyterms: [
      '분수', '분자', '분모', '등가분수', '약분', '통분',
      '공통분모', '분수 덧셈', '분수 뺄셈', '기약분수',
    ],
    prerequisites: ['사칙연산'],
    objectives: [
      {
        id: 'obj_frac_concept',
        statement:
          '분수가 "전체를 똑같은 개수로 나눈 뒤 그 중 몇 부분을 가리키는 표기" 임을 설명하고, 분자·분모의 의미를 한 가지 시각적 예로 보인다.',
        conceptKey: 'frac_concept',
        weight: 1,
        expectedTerms: ['분수', '분자', '분모', '나누다', '전체', '부분'],
      },
      {
        id: 'obj_frac_equivalent',
        statement:
          '서로 다른 분자·분모로 같은 크기를 나타내는 "등가분수" 개념을 설명하고, 약분 또는 통분 과정을 실제 예로 보인다 (예: 2/4 = 1/2).',
        conceptKey: 'frac_equivalent',
        weight: 1,
        expectedTerms: ['등가', '약분', '통분', '공통분모', '기약분수', '같은 크기'],
      },
      {
        id: 'obj_frac_addsub',
        statement:
          '분모가 같은 분수의 덧셈·뺄셈 규칙(분자끼리만 더하고/빼기, 분모 유지)을 설명하고, 간단한 예제를 풀어 보인다.',
        conceptKey: 'frac_addsub',
        weight: 1,
        expectedTerms: ['분모', '분자', '더하기', '빼기', '그대로', '유지'],
      },
    ],
  },
  // Chapter 3: 소수 기본 — 단일 subject, 3 objectives. DB seed 에 있는 "소수"
  // subject 와 매핑.
  {
    slug: 'basic-primes',
    topic: '소수',
    difficulty: 3,
    keyterms: ['소수', '합성수', '약수', '나누어떨어진다', '소인수분해'],
    prerequisites: ['사칙연산'],
    objectives: [
      {
        id: 'obj_prime_def',
        statement:
          '소수의 정의(1과 자기 자신 외엔 약수가 없는 1보다 큰 자연수)를 설명한다.',
        conceptKey: 'prime_def',
        weight: 1,
        expectedTerms: ['소수', '약수', '1', '자기 자신', '자연수'],
      },
      {
        id: 'obj_prime_check',
        statement:
          '자연수가 소수인지 판정하는 기본 방법(약수 유무)을 설명한다.',
        conceptKey: 'prime_check',
        weight: 1,
        expectedTerms: ['나누어떨어진다', '약수', '판정'],
      },
      {
        id: 'obj_prime_factor',
        statement: '소인수분해의 개념을 설명한다 (합성수 → 소수의 곱).',
        conceptKey: 'prime_factor',
        weight: 1,
        expectedTerms: ['소인수', '분해', '곱', '유일'],
      },
    ],
  },
];

export function getSubject(slug: string): LectureSubject {
  const hit = LECTURE_SUBJECTS.find((s) => s.slug === slug);
  if (!hit) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[lecture] subject slug "${slug}" 없음. fallback=${LECTURE_SUBJECTS[0]!.slug}`,
      );
    }
    return LECTURE_SUBJECTS[0]!;
  }
  return hit;
}
