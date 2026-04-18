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
