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
        badge: '4-1 페르마 소정리',
        page: 1,
        total: 3,
        title: 'p 가 소수이고 a 가 p 와 서로소일 때, a^(p-1) 을 p 로 나눈 나머지는 항상 1 이에요.',
        body: `식으로 쓰면:   a^(p-1) ≡ 1  (mod p)

예를 들어 p = 5, a = 2 일 때
  2^4 = 16 = 3·5 + 1  →  나머지 1.

아무리 큰 a 를 넣어도 (단, p 와 서로소이면) 이 규칙은 깨지지 않아요.`,
        character: fermatHappy,
        mode: 'explain' as const,
      },
      {
        badge: '4-2 페르마 소정리',
        page: 2,
        total: 3,
        title: '왜 이 규칙이 성립하는지 직관으로 이해해 볼까요?',
        body: `mod p 연산에서 a, 2a, 3a, …, (p-1)a 를 p 로 나눈 나머지를 나열해 봅니다.
이들이 전부 서로 다른 1 ~ (p-1) 을 한 번씩 가리킨다는 것을 보이면,

  a · 2a · 3a · … · (p-1)a ≡ (p-1)!  (mod p)
  a^(p-1) · (p-1)! ≡ (p-1)!  (mod p)
  a^(p-1) ≡ 1  (mod p)

우아하지요? 이게 내가 가장 아끼는 결과 중 하나라네.`,
        character: fermatHappy,
        mode: 'explain' as const,
      },
      {
        badge: '4-3 페르마 소정리',
        page: 3,
        total: 3,
        character: fermatCurious,
        mode: 'talk' as const,
        question: '이 정리가 실생활에는 어떻게 쓰이나요?',
        answer:
          'RSA 암호의 기반일세. 큰 소수를 다루면서 빠르게 계산하고 검증하기 위해 페르마 소정리의 변형을 쓰지. 17세기의 낙서가 21세기 보안을 받치고 있다는 게 제법 근사하지 않나?',
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
      localStorage.setItem('chapter4_lesson_done', 'true');
    } catch {
      /* storage blocked */
    }
    void fetch('/api/lesson/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonSlug: 'fermat-little-theorem' }),
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
