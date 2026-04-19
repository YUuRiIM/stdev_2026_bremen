'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const fermatHappy = '/assets/images/fermat-sd-happy.png';
const fermatCurious = '/assets/images/fermat-sd-curious.png';
const lessonBg = '/assets/images/bg-lesson.png';

function LessonScreen() {
  const router = useRouter();

  const lessonPages = useMemo(
    () => [
      {
        badge: '3-1 소수',
        page: 1,
        total: 3,
        title: '소수는 1과 자기 자신만을 약수로 갖는 1보다 큰 자연수예요.',
        body: `2, 3, 5, 7, 11, 13, … 모두 소수입니다.
1은 소수가 아니에요 — 약수가 1 하나뿐이라 규칙에서 빠져요.

4 = 2 × 2, 6 = 2 × 3, 9 = 3 × 3 처럼 자기 자신 외에 더 나누어지는 수는 "합성수" 예요.`,
        character: fermatHappy,
        mode: 'explain' as const,
      },
      {
        badge: '3-2 소수',
        page: 2,
        total: 3,
        title: '어떤 수가 소수인지 판정하는 기본 방법은 "약수 찾기" 예요.',
        body: `예를 들어 29 가 소수인지 볼까요?
2, 3, 4, … 로 나누어 보고 나누어떨어지는 수가 있는지 확인해요.

29 는 그 어떤 수로도 딱 나누어떨어지지 않아요.
그러니까 29 는 소수.`,
        character: fermatHappy,
        mode: 'explain' as const,
      },
      {
        badge: '3-3 소수',
        page: 3,
        total: 3,
        character: fermatCurious,
        mode: 'talk' as const,
        question: '소인수분해는 왜 중요하죠?',
        answer:
          '모든 합성수는 소수의 곱으로 유일하게 쪼갤 수 있다네. 수의 성질을 파악하는 열쇠이자, 훗날 암호학의 뿌리가 되지.',
      },
    ],
    [],
  );

  const [pageIndex, setPageIndex] = useState(0);

  const current = lessonPages[pageIndex]!;
  const isFirst = pageIndex === 0;
  const isLast = pageIndex === lessonPages.length - 1;

  const goPrev = () => {
    if (!isFirst) setPageIndex((prev) => prev - 1);
  };

  const goNext = () => {
    if (!isLast) {
      setPageIndex((prev) => prev + 1);
      return;
    }
    try {
      localStorage.setItem('chapter3_lesson_done', 'true');
    } catch {
      /* storage blocked */
    }
    void fetch('/api/lesson/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonSlug: 'basic-primes' }),
    }).catch(() => {});
    router.push('/lobby');
  };

  return (
    <section className="lesson-screen">
      <Link href="/lobby" className="character-detail__back-button">
        ←
      </Link>
      <div className="lesson-board" style={{ backgroundImage: `url(${lessonBg})` }}>
        <header className="lesson-board__top">
          <div className="lesson-badge">{current.badge}</div>
          <div className="lesson-pagination">
            <button
              type="button"
              className="lesson-arrow"
              onClick={goPrev}
              disabled={isFirst}
              aria-label="이전 페이지"
            >
              ‹
            </button>
            <span className="lesson-page-indicator">
              {current.page}/{current.total}
            </span>
            <button
              type="button"
              className="lesson-arrow"
              onClick={goNext}
              aria-label={isLast ? '수업 종료' : '다음 페이지'}
            >
              ›
            </button>
          </div>
        </header>

        {current.mode === 'explain' && (
          <div className="lesson-content">
            <div className="lesson-text-area">
              <p className="lesson-title">{current.title}</p>
              <p className="lesson-body">
                {current.body.split('\n').map((line, idx) => (
                  <span key={idx}>
                    {line}
                    <br />
                  </span>
                ))}
              </p>
            </div>
            <div className="lesson-character-wrap">
              <Image
                src={current.character}
                alt="페르마 캐릭터"
                className="lesson-character"
                width={240}
                height={360}
              />
            </div>
          </div>
        )}

        {current.mode === 'talk' && (
          <div className="lesson-talk-layout">
            <div className="lesson-talk-left">
              <Image
                src={current.character}
                alt="페르마 캐릭터"
                className="lesson-character lesson-character--small"
                width={1900}
                height={600}
              />
            </div>
            <div className="lesson-talk-right">
              <div className="speech-bubble speech-bubble--question">
                {current.question}
              </div>
              <div className="speech-bubble speech-bubble--answer">
                {current.answer}
              </div>
            </div>
          </div>
        )}

        <div className="lesson-footer">
          <div></div>
          <button type="button" className="lesson-finish-button" onClick={goNext}>
            {isLast ? '수업 종료' : '다음'}
            {isLast && <span className="lesson-finish-sub">페르마 호감도 +1</span>}
          </button>
        </div>
      </div>
    </section>
  );
}

export default LessonScreen;
