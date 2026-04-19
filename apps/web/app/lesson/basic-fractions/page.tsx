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
        badge: '2-1 분수',
        page: 1,
        total: 3,
        title: '분수는 전체를 똑같은 개수로 나눈 뒤 그 중 몇 부분을 가리키는 표기예요.',
        body: `피자를 4조각으로 똑같이 나누고, 그 중 한 조각을 먹었다면
그 한 조각은 전체의 1/4 이에요.

분수 a/b 에서
아래쪽 b 를 "분모" — 전체를 몇 등분했는지,
위쪽 a 를 "분자" — 그 중 몇 개를 가리키는지 나타냅니다.`,
        character: fermatHappy,
        mode: 'explain' as const,
      },
      {
        badge: '2-2 분수',
        page: 2,
        total: 3,
        title: '같은 크기를 서로 다른 분자·분모로 나타낸 분수를 등가분수 라고 해요.',
        body: `2/4 와 1/2 는 크기가 같아요.
분자·분모에 같은 수를 곱하거나 나눠도 값은 변하지 않기 때문이에요.

2/4 = 1/2  (분자·분모를 2로 나눔)
이처럼 더 간단하게 줄이는 걸 "약분" 이라고 합니다.`,
        character: fermatHappy,
        mode: 'explain' as const,
      },
      {
        badge: '2-3 분수',
        page: 3,
        total: 3,
        character: fermatCurious,
        mode: 'talk' as const,
        question: '분모가 같은 분수끼리 더하면 분모도 같이 더해지나요?',
        answer:
          '아니, 분모가 같을 땐 분자만 더하고 분모는 그대로 둔다네. 1/5 + 2/5 = 3/5 처럼.',
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
      localStorage.setItem('chapter2_lesson_done', 'true');
    } catch {
      /* storage blocked */
    }
    void fetch('/api/lesson/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonSlug: 'basic-fractions' }),
    }).catch(() => {
      /* non-fatal */
    });
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
