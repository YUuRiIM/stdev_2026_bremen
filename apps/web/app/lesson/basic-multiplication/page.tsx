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
        badge: '1-3 곱셈',
        page: 1,
        total: 3,
        title: '곱셈은 같은 수를 여러 번 더할 때 편리하게 사용하는 계산이에요.',
        body: `두 숫자 사이에는 × 기호를 사용해요.

예를 들어, 3이 2번 더해지면 3 + 3 = 6 이에요.
이것을 곱셈으로 쓰면 3 × 2 = 6 이에요.`,
        character: fermatHappy,
        mode: 'explain' as const,
      },
      {
        badge: '1-3 곱셈',
        page: 2,
        total: 3,
        title: '한 번 더 정리해 볼까요?',
        body: `2 × 4 는
2를 4번 더한 것과 같아요.

즉,
2 + 2 + 2 + 2 = 8 이에요.`,
        character: fermatHappy,
        mode: 'explain' as const,
      },
      {
        badge: '1-3 곱셈',
        page: 3,
        total: 3,
        character: fermatCurious,
        mode: 'talk' as const,
        question: '그러면 3 × 2는 3을 두 번 더한다는 뜻이에요?',
        answer: '그렇지, 반복되는 덧셈을 더 간단하게 쓰는 방법이란다.',
      },
    ],
    []
  );

  const [pageIndex, setPageIndex] = useState(0);

  const current = lessonPages[pageIndex];
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

    // Local gate for the lobby's quiz button — mirrors the server-side
    // `lesson_basic_multiplication_awarded` flag but lets the UI respond
    // instantly on return without a round trip.
    try {
      localStorage.setItem('chapter1_lesson_done', 'true');
    } catch {
      /* storage blocked */
    }
    // Fire-and-forget affection bump; server dedupes via flag so repeat
    // plays don't stack. UI doesn't block on the response.
    void fetch('/api/lesson/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonSlug: 'basic-multiplication' }),
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
              <Image src={current.character} alt="페르마 캐릭터" className="lesson-character" width={240} height={360} />
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
                width={160}
                height={240}
              />
            </div>

            <div className="lesson-talk-right">
              <div className="speech-bubble speech-bubble--question">{current.question}</div>

              <div className="speech-bubble speech-bubble--answer">{current.answer}</div>
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
