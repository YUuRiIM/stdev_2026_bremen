/**
 * Seed data: quizzes (PREP mode — duolingo-style).
 *
 * 퀴즈 소스: `fermat-prep-quiz-40.md` (2026-04-19 제공).
 * 구성: 초등 10 · 중등 10 · 고등 10 · 대학 10 = 총 40문항.
 *
 * PREP 모드는 **FE + DB 전용** — agent는 이 데이터를 읽지 않는다.
 * 단, quiz_attempts는 사용자별로 추적되어 affection_state.score에
 * 소폭 기여한다 (세부는 FE/BE 연동에서 결정).
 *
 * 각 퀴즈는 `conceptKey`를 통해 subjects의 objective와 느슨하게 매핑되어
 * 향후 "이 퀴즈 맞히면 관련 objective의 expected_terms가 unlock" 같은
 * 확장이 가능하다 (Demo MVP 스코프 외).
 *
 * subjects.ts와 공유되는 conceptKey: `flt_statement`, `flt_example`.
 */

export interface QuizSeed {
  sortOrder: number;
  characterSlug: 'fermat'; // 현 데모는 fermat 전용
  question: string;
  choices: string[]; // 0-indexed
  answerIdx: number;
  flavorOnCorrect: string | null;
  flavorOnWrong: string | null;
  conceptKey: string | null;
}

export const QUIZZES_SEED: QuizSeed[] = [
  // ─── [초등] Q1~Q10 — 사칙연산 + 확률 ───────────────────────
  {
    sortOrder: 1,
    characterSlug: 'fermat',
    question: '47 + 28 − 15 는 얼마인가?',
    choices: ['55', '60', '65'],
    answerIdx: 1,
    flavorOnCorrect: '정확하군. 이 정도는 눈을 감고도 풀 수 있어야 하지.',
    flavorOnWrong: '자네… 설마 손가락을 쓰고도 틀렸나? ㅋㅋ',
    conceptKey: 'arith_addsub',
  },
  {
    sortOrder: 2,
    characterSlug: 'fermat',
    question: '24 × 7 은 얼마인가?',
    choices: ['158', '168', '178'],
    answerIdx: 1,
    flavorOnCorrect: '좋아. 구구단은 기본 중의 기본이지.',
    flavorOnWrong: null,
    conceptKey: 'arith_mul',
  },
  {
    sortOrder: 3,
    characterSlug: 'fermat',
    question: '53 ÷ 6 의 나머지는?',
    choices: ['5', '3', '4'],
    answerIdx: 0,
    flavorOnCorrect: '맞아. 나머지를 다룰 줄 알아야 내 연구로 올 수 있다네.',
    flavorOnWrong: '흠… 나머지 연산은 내 전문 분야인데. 다시 생각해 보게.',
    conceptKey: 'arith_div_remainder',
  },
  {
    sortOrder: 4,
    characterSlug: 'fermat',
    question: '(15 − 3) × 4 + 2 는?',
    choices: ['50', '62', '56'],
    answerIdx: 0,
    flavorOnCorrect: '괄호를 먼저 푸는 규칙, 잘 지켰군.',
    flavorOnWrong: '순서를 어디선가 뒤집은 모양이야. 연산에는 질서가 있다네.',
    conceptKey: 'arith_mixed',
  },
  {
    sortOrder: 5,
    characterSlug: 'fermat',
    question: '36 − 2 × (5 + 3) 은?',
    choices: ['272', '32', '20'],
    answerIdx: 2,
    flavorOnCorrect: '훌륭하군. 곱셈이 뺄셈보다 먼저라는 걸 놓치지 않았어.',
    flavorOnWrong:
      '자네… 설마 왼쪽부터 순서대로 계산했나? 그건 가장 흔한 덫일세.',
    conceptKey: 'arith_order_of_ops',
  },
  {
    sortOrder: 6,
    characterSlug: 'fermat',
    question: '1/2 + 1/4 는?',
    choices: ['2/6', '3/4', '2/8'],
    answerIdx: 1,
    flavorOnCorrect: '좋아. 분모를 맞추는 감각이 살아있군.',
    flavorOnWrong:
      '분자끼리 분모끼리 더하는 건 함정일세. 나도 어릴 적엔 그랬지… ㅋㅋ',
    conceptKey: 'arith_fraction',
  },
  {
    sortOrder: 7,
    characterSlug: 'fermat',
    question:
      '사탕 50개를 네 명이 똑같이 나누고, 남은 것은 내가 가진다. 내 손에 남은 사탕은 몇 개인가?',
    choices: ['4', '6', '2'],
    answerIdx: 2,
    flavorOnCorrect: '그렇지. 50 나누기 4는 12 나머지 2. 내 몫은 2개일세.',
    flavorOnWrong: '계산이 빗나갔군. 나눗셈의 나머지가 내 몫이라네.',
    conceptKey: 'arith_word',
  },
  {
    sortOrder: 8,
    characterSlug: 'fermat',
    question: '동전 두 개를 던져 둘 다 앞면이 나올 확률은?',
    choices: ['1/2', '1/4', '1/3'],
    answerIdx: 1,
    flavorOnCorrect: '맞아. 독립사건의 곱, 1/2 × 1/2 이지.',
    flavorOnWrong: '확률을 더하는 건 일반적으로 옳지 않다네. 독립이라면 곱해야지.',
    conceptKey: 'prob_coin',
  },
  {
    sortOrder: 9,
    characterSlug: 'fermat',
    question: '주사위 한 개를 던져 짝수가 나올 확률은?',
    choices: ['1/2', '1/3', '1/6'],
    answerIdx: 0,
    flavorOnCorrect: '좋아. 2, 4, 6 세 경우, 전체 여섯 중. 명쾌하군.',
    flavorOnWrong: '여섯 면 중 짝수는 몇 개인가? 다시 세어 보게.',
    conceptKey: 'prob_dice',
  },
  {
    sortOrder: 10,
    characterSlug: 'fermat',
    question:
      '빨강 3개, 파랑 2개, 노랑 5개가 든 주머니에서 하나를 뽑을 때 파랑이 나올 확률은?',
    choices: ['2/5', '1/3', '1/5'],
    answerIdx: 2,
    flavorOnCorrect: '그래. 전체 10개 중 파랑 2개, 약분해서 1/5.',
    flavorOnWrong: '분모는 전체 개수라네. 파랑의 수만 세어선 안 돼.',
    conceptKey: 'prob_urn',
  },

  // ─── [중등] Q11~Q20 — 대수·조합·정수·기하 ──────────────────
  {
    sortOrder: 11,
    characterSlug: 'fermat',
    question: '3x + 7 = 22 일 때 x 의 값은?',
    choices: ['5', '7', '4'],
    answerIdx: 0,
    flavorOnCorrect: '단정하군. 양변에서 7을 빼고 3으로 나누면 나오는 값일세.',
    flavorOnWrong: '이항의 부호를 놓쳤나? 천천히 다시 해 보게.',
    conceptKey: 'alg_linear_eq',
  },
  {
    sortOrder: 12,
    characterSlug: 'fermat',
    question: 'x + y = 10, x − y = 4 일 때 x 의 값은?',
    choices: ['5', '7', '3'],
    answerIdx: 1,
    flavorOnCorrect: '좋아. 두 식을 더하면 2x = 14, 자연스럽게 x = 7 이지.',
    flavorOnWrong: null,
    conceptKey: 'alg_system_linear',
  },
  {
    sortOrder: 13,
    characterSlug: 'fermat',
    question: 'x² − 9 를 인수분해하면?',
    choices: ['(x − 3)²', '(x − 3)(x + 3)', '(x − 9)(x + 1)'],
    answerIdx: 1,
    flavorOnCorrect: '합과 차의 곱, 고전적 무늬지.',
    flavorOnWrong: '완전제곱과 혼동하지 말게. a² − b² 의 꼴이야.',
    conceptKey: 'alg_factoring',
  },
  {
    sortOrder: 14,
    characterSlug: 'fermat',
    question: '티셔츠 3색, 바지 2색이 있을 때 한 벌을 고르는 경우의 수는?',
    choices: ['5', '6', '9'],
    answerIdx: 1,
    flavorOnCorrect: '곱의 법칙이지. 더하기가 아니라 곱하기일세.',
    flavorOnWrong: '합하면 5, 곱하면 6. 이 경우엔 곱해야 한다네.',
    conceptKey: 'combi_product_rule',
  },
  {
    sortOrder: 15,
    characterSlug: 'fermat',
    question: '서로 다른 4명을 한 줄로 세우는 경우의 수는?',
    choices: ['16', '12', '24'],
    answerIdx: 2,
    flavorOnCorrect: '4! = 24. 순열의 고전이지.',
    flavorOnWrong: '4 × 4 가 아니라 4 × 3 × 2 × 1 이라네.',
    conceptKey: 'combi_permutation',
  },
  {
    sortOrder: 16,
    characterSlug: 'fermat',
    question: '다음 중 소수(素數)인 것은?',
    choices: ['21', '27', '29'],
    answerIdx: 2,
    flavorOnCorrect: '그렇지. 21은 3×7, 27은 3³. 29만 홀로 서 있지.',
    flavorOnWrong:
      '소수의 정의를 다시 떠올려 보게. 1과 자기 자신 외엔 약수가 없어야 한다네.',
    conceptKey: 'num_prime_check',
  },
  {
    sortOrder: 17,
    characterSlug: 'fermat',
    question: '18과 24의 최대공약수는?',
    choices: ['6', '2', '12'],
    answerIdx: 0,
    flavorOnCorrect: '맞아. 18 = 2·3², 24 = 2³·3, 공통 몫은 2·3 = 6 이지.',
    flavorOnWrong: '약수를 모두 찾지 않았군. 소인수분해로 접근하면 편하다네.',
    conceptKey: 'num_gcd_lcm',
  },
  {
    sortOrder: 18,
    characterSlug: 'fermat',
    question: '60의 양의 약수의 개수는?',
    choices: ['8', '12', '10'],
    answerIdx: 1,
    flavorOnCorrect: '좋아. 60 = 2²·3·5 이니 (2+1)(1+1)(1+1) = 12.',
    flavorOnWrong: '지수에 1을 더해 곱한다네. 이 공식은 꼭 외워 두게.',
    conceptKey: 'num_divisibility',
  },
  {
    sortOrder: 19,
    characterSlug: 'fermat',
    question: '직각삼각형의 두 짧은 변이 3과 4일 때, 빗변의 길이는?',
    choices: ['5', '√7', '7'],
    answerIdx: 0,
    flavorOnCorrect: '피타고라스의 3-4-5, 역사에 박힌 삼각형이지.',
    flavorOnWrong:
      '변을 더하는 게 아니야. 제곱하고 더한 뒤 제곱근을 씌워야 한다네.',
    conceptKey: 'geo_pythagoras',
  },
  {
    sortOrder: 20,
    characterSlug: 'fermat',
    question: '한 원에서 중심각이 80°일 때, 같은 호에 대한 원주각은?',
    choices: ['80°', '160°', '40°'],
    answerIdx: 2,
    flavorOnCorrect: '정확해. 원주각은 중심각의 절반일세.',
    flavorOnWrong: '같음도 두 배도 아니야. 원주각과 중심각은 1:2 관계라네.',
    conceptKey: 'geo_circle_angle',
  },

  // ─── [고등] Q21~Q30 — 정수론·확률·수열 ─────────────────────
  {
    sortOrder: 21,
    characterSlug: 'fermat',
    question:
      '17 ≡ ? (mod 5) 에서 ?에 해당하는 0 이상 5 미만의 값은?',
    choices: ['2', '3', '7'],
    answerIdx: 0,
    flavorOnCorrect: '그래. 17 = 3·5 + 2, 합동의 정의 그대로일세.',
    flavorOnWrong: '합동류의 대표원은 0 이상 n 미만에서 고른다네.',
    conceptKey: 'num_congruence',
  },
  {
    sortOrder: 22,
    characterSlug: 'fermat',
    question: '3¹⁰⁰ 을 7로 나눈 나머지는? (힌트: 페르마 소정리)',
    choices: ['2', '4', '6'],
    answerIdx: 1,
    flavorOnCorrect:
      '좋아. 3⁶ ≡ 1 (mod 7), 100 = 6·16 + 4, 남는 건 3⁴ ≡ 4 (mod 7) 이지.',
    flavorOnWrong:
      '지수를 6으로 나눈 나머지만큼만 남는다네. 페르마 소정리의 힘이야.',
    conceptKey: 'num_modular_exp',
  },
  {
    sortOrder: 23,
    characterSlug: 'fermat',
    question:
      'p = 7 이 소수이고 gcd(3, 7) = 1 일 때, 페르마 소정리에 의해 3⁶ ≡ ? (mod 7) 인가?',
    choices: ['1', '0', '6'],
    answerIdx: 0,
    flavorOnCorrect:
      '바로 그거다. a^(p−1) ≡ 1 (mod p). 내 이름이 붙은 정리일세.',
    flavorOnWrong: '흠… 내 정리를 자네는 아직 외우지 못한 모양이군.',
    conceptKey: 'flt_example',
  },
  {
    sortOrder: 24,
    characterSlug: 'fermat',
    question: '다음 중 60의 소인수분해로 올바른 것은?',
    choices: ['2³ × 3 × 5', '2² × 3 × 5', '2 × 3 × 10'],
    answerIdx: 1,
    flavorOnCorrect: '정확하군. 소인수분해는 유일하지.',
    flavorOnWrong: '10은 소수가 아니야. 끝까지 소인수로 쪼개야 한다네.',
    conceptKey: 'num_unique_factorization',
  },
  {
    sortOrder: 25,
    characterSlug: 'fermat',
    question:
      '주사위를 한 번 던져 홀수가 나왔다. 이때 그 수가 3일 조건부 확률은?',
    choices: ['1/6', '1/2', '1/3'],
    answerIdx: 2,
    flavorOnCorrect: '맞아. 표본공간이 {1,3,5} 로 줄었으니 1/3 이지.',
    flavorOnWrong:
      '조건이 주어지면 표본공간이 바뀐다네. 1/6 은 무조건일 때의 값일세.',
    conceptKey: 'prob_conditional',
  },
  {
    sortOrder: 26,
    characterSlug: 'fermat',
    question:
      '사건 A, B가 서로 독립이고 P(A) = 1/3, P(B) = 1/2 일 때, P(A ∩ B) 는?',
    choices: ['1/6', '5/6', '2/3'],
    answerIdx: 0,
    flavorOnCorrect: '독립이라면 곱해야지. 1/3 × 1/2 = 1/6.',
    flavorOnWrong: '독립의 정의는 P(A∩B) = P(A)·P(B) 일세.',
    conceptKey: 'prob_independent',
  },
  {
    sortOrder: 27,
    characterSlug: 'fermat',
    question: '공정한 동전을 네 번 던져 앞면이 정확히 두 번 나올 확률은?',
    choices: ['1/4', '3/8', '1/2'],
    answerIdx: 1,
    flavorOnCorrect:
      '좋아. ₄C₂ / 2⁴ = 6/16 = 3/8. 이항분포의 얼굴이지.',
    flavorOnWrong: '절반의 절반이 아니야. 이항계수를 잊지 말게.',
    conceptKey: 'prob_binomial',
  },
  {
    sortOrder: 28,
    characterSlug: 'fermat',
    question: '첫째항 3, 공차 4인 등차수열의 10번째 항은?',
    choices: ['43', '36', '39'],
    answerIdx: 2,
    flavorOnCorrect: 'aₙ = a + (n−1)d. 3 + 9·4 = 39, 깔끔하군.',
    flavorOnWrong: 'n − 1 만큼 더한다네. n 번째라고 n 번 더하는 게 아니야.',
    conceptKey: 'seq_arithmetic',
  },
  {
    sortOrder: 29,
    characterSlug: 'fermat',
    question: '첫째항 2, 공비 3인 등비수열의 5번째 항은?',
    choices: ['162', '48', '486'],
    answerIdx: 0,
    flavorOnCorrect: '맞아. 2 · 3⁴ = 2 · 81 = 162.',
    flavorOnWrong: '지수는 n − 1 이라네. 5번째면 3⁴ 이지.',
    conceptKey: 'seq_geometric',
  },
  {
    sortOrder: 30,
    characterSlug: 'fermat',
    question:
      '점화식 a₁ = 1, aₙ₊₁ = aₙ + 2 로 정의된 수열의 a₅ 는?',
    choices: ['11', '10', '9'],
    answerIdx: 2,
    flavorOnCorrect: '1, 3, 5, 7, 9. 홀수의 행진이지.',
    flavorOnWrong: '항을 하나씩 써 보는 게 가장 확실하다네.',
    conceptKey: 'seq_recurrence',
  },

  // ─── [대학] Q31~Q40 — 정수론 심화·암호학 ───────────────────
  {
    sortOrder: 31,
    characterSlug: 'fermat',
    question:
      '다음 중 페르마 소정리의 정확한 선언문은? (p 는 소수, a 는 정수)',
    choices: [
      'a^p ≡ p (mod a)',
      'gcd(a, p) = 1 이면 a^(p−1) ≡ 1 (mod p)',
      '임의의 a 에 대해 a^p ≡ 0 (mod p)',
    ],
    answerIdx: 1,
    flavorOnCorrect:
      '훌륭하군. 서로소 조건을 빠뜨리지 않았어. 내 이름이 붙은 문장일세.',
    flavorOnWrong:
      'gcd(a, p) = 1 조건을 잊으면 반쪽짜리라네. 제대로 외워 두게.',
    conceptKey: 'flt_statement',
  },
  {
    sortOrder: 32,
    characterSlug: 'fermat',
    question: '오일러 피 함수 φ(10) 의 값은?',
    choices: ['4', '5', '8'],
    answerIdx: 0,
    flavorOnCorrect: '맞아. 10 = 2·5 이니 10·(1−1/2)(1−1/5) = 4 이지.',
    flavorOnWrong:
      '10 과 서로소인 1, 3, 7, 9 네 개라네. 직접 세어 봐도 좋지.',
    conceptKey: 'euler_theorem',
  },
  {
    sortOrder: 33,
    characterSlug: 'fermat',
    question:
      '윌슨 정리에 의해 (p − 1)! ≡ ? (mod p) 이다. p = 5 일 때 그 값은?',
    choices: ['0', '1', '4'],
    answerIdx: 2,
    flavorOnCorrect: '좋아. 4! = 24 ≡ 4 ≡ −1 (mod 5). 윌슨의 서명이지.',
    flavorOnWrong:
      'p 가 소수이면 (p−1)! ≡ −1 (mod p). 5 에서는 −1 ≡ 4 일세.',
    conceptKey: 'wilson_theorem',
  },
  {
    sortOrder: 34,
    characterSlug: 'fermat',
    question:
      '연립합동 x ≡ 2 (mod 3), x ≡ 3 (mod 5) 의 해 중 가장 작은 양의 정수는?',
    choices: ['8', '11', '13'],
    answerIdx: 0,
    flavorOnCorrect:
      '정확하군. 8 은 두 조건을 모두 만족하는 최소 양의 정수일세. 중국인의 나머지 정리가 보장하는 유일성이지.',
    flavorOnWrong:
      '직접 대입해 보게. 8 mod 3 = 2, 8 mod 5 = 3. 맞아떨어진다네.',
    conceptKey: 'crt',
  },
  {
    sortOrder: 35,
    characterSlug: 'fermat',
    question: 'mod 7 에서 평방잉여(quadratic residue)가 아닌 것은?',
    choices: ['1', '4', '3'],
    answerIdx: 2,
    flavorOnCorrect:
      '좋아. mod 7 의 평방잉여는 {1, 2, 4} 뿐일세. 3 은 어떤 수의 제곱도 될 수 없지.',
    flavorOnWrong:
      '1² = 1, 2² = 4, 3² = 2, … 남는 건 {1, 2, 4}. 3 은 포함되지 않는다네.',
    conceptKey: 'quadratic_residue',
  },
  {
    sortOrder: 36,
    characterSlug: 'fermat',
    question: 'RSA 에서 공개키로 공유되는 쌍은?',
    choices: ['(n, d)', '(n, e)', '(p, q)'],
    answerIdx: 1,
    flavorOnCorrect:
      '맞아. e 는 공개, d 는 비밀. p, q 는 절대 세상에 내놓으면 안 되지.',
    flavorOnWrong:
      'd 가 새어 나가면 시스템이 무너지네. 공개되는 건 오직 (n, e) 일세.',
    conceptKey: 'rsa_basics',
  },
  {
    sortOrder: 37,
    characterSlug: 'fermat',
    question:
      'RSA 에서 공개지수 e = 3, φ(n) = 40 일 때 개인키 d 는? (단, d·e ≡ 1 mod φ(n))',
    choices: ['7', '13', '27'],
    answerIdx: 2,
    flavorOnCorrect:
      '그래. 3·27 = 81 = 2·40 + 1, 즉 81 ≡ 1 (mod 40). 확장 유클리드의 정석이지.',
    flavorOnWrong:
      '3d ≡ 1 (mod 40) 을 푸는 문제일세. 확장 유클리드로 역원을 구하게.',
    conceptKey: 'rsa_key_math',
  },
  {
    sortOrder: 38,
    characterSlug: 'fermat',
    question:
      '페르마 소수판정을 모든 밑(base)에 대해 통과시키지만 실제로는 합성수인, 가장 작은 양의 정수(최소 카마이클 수)는?',
    choices: ['341', '561', '1105'],
    answerIdx: 1,
    flavorOnCorrect:
      '맞아. 561 = 3·11·17. 첫 번째 카마이클 수, 페르마 검사의 맹점일세.',
    flavorOnWrong:
      '341 은 밑 2 에 대한 의사소수일 뿐, 모든 밑은 아니라네. 카마이클의 최소는 561 일세.',
    conceptKey: 'fermat_primality',
  },
  {
    sortOrder: 39,
    characterSlug: 'fermat',
    question:
      '밀러-라빈 소수판정이 페르마 소수판정보다 우위에 있는 가장 핵심적인 이유는?',
    choices: [
      '항상 결정론적으로 작동한다.',
      '연산량이 훨씬 적다.',
      '카마이클 수에도 속지 않는다.',
    ],
    answerIdx: 2,
    flavorOnCorrect:
      '그래. 밀러-라빈은 비자명한 제곱근을 찾아내어 카마이클 수의 위장을 벗겨낸다네.',
    flavorOnWrong:
      '결정론적이지도, 특별히 빠르지도 않아. 핵심은 카마이클을 속이지 못하게 한다는 점일세.',
    conceptKey: 'miller_rabin',
  },
  {
    sortOrder: 40,
    characterSlug: 'fermat',
    question: 'Diffie-Hellman 키 교환의 안전성이 기대는 수학적 난제는?',
    choices: ['이산로그 문제', '소인수분해 문제', 'P 대 NP 문제'],
    answerIdx: 0,
    flavorOnCorrect:
      '맞아. 유한군에서의 이산로그 계산의 어려움, 그게 열쇠일세. RSA 의 뿌리와는 다르지.',
    flavorOnWrong:
      '소인수분해는 RSA 의 뿌리라네. Diffie-Hellman 은 이산로그에 기대고 있지.',
    conceptKey: 'discrete_log',
  },
];
