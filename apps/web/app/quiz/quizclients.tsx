'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const boardImg = '/assets/images/quiz-board.png';
const correctImg = '/assets/images/quiz-correct.png';
const incorrectImg = '/assets/images/quiz-incorrect.png';

// Chapter → DB sort_order range. Ch1 은 초등 사칙 (1..4), Ch2 는 분수
// (11..14). 새 챕터 추가 시 이 맵과 quizzes 시드 둘 다 갱신.
const CHAPTER_SORT_RANGE: Record<number, { min: number; max: number }> = {
  1: { min: 1, max: 4 },
  2: { min: 11, max: 14 },
  3: { min: 21, max: 24 },
  4: { min: 31, max: 34 },
};
const CHARACTER_SLUG = 'fermat';

interface Quiz {
  id: string;
  sortOrder: number;
  question: string;
  choices: string[];
  answerIdx: number;
  flavorOnCorrect: string | null;
  flavorOnWrong: string | null;
}

export default function QuizClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chapterParam = Number(searchParams?.get('chapter') ?? '1');
  const chapter = CHAPTER_SORT_RANGE[chapterParam] ? chapterParam : 1;
  const range = CHAPTER_SORT_RANGE[chapter]!;
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // Fetch the quiz batch once.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from('quizzes')
          .select(
            'id, sort_order, question, choices, answer_idx, flavor_on_correct, flavor_on_wrong',
          )
          .eq('character_slug', CHARACTER_SLUG)
          .gte('sort_order', range.min)
          .lte('sort_order', range.max)
          .order('sort_order', { ascending: true });
        if (cancelled) return;
        if (error) {
          setLoadError(error.message);
          return;
        }
        const mapped: Quiz[] = (data ?? []).map((row) => ({
          id: row.id as string,
          sortOrder: row.sort_order as number,
          question: row.question as string,
          choices: row.choices as string[],
          answerIdx: row.answer_idx as number,
          flavorOnCorrect: row.flavor_on_correct as string | null,
          flavorOnWrong: row.flavor_on_wrong as string | null,
        }));
        setQuizzes(mapped);
      } catch (err) {
        if (!cancelled) {
          setLoadError((err as Error).message);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = quizzes?.[idx];

  const recordAttempt = useCallback(
    async (quizId: string, selectedIdx: number, correct: boolean) => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) return; // demo / unauthenticated — skip logging
        await supabase.from('quiz_attempts').insert({
          user_id: uid,
          quiz_id: quizId,
          selected_idx: selectedIdx,
          correct,
        });
      } catch {
        /* best-effort logging */
      }
    },
    [],
  );

  const handleSelect = (i: number) => {
    if (!current || selected !== null) return;
    setSelected(i);
    const isCorrect = i === current.answerIdx;
    setResult(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) setCorrectCount((c) => c + 1);
    void recordAttempt(current.id, i, isCorrect);
  };

  const advance = () => {
    const last = idx >= (quizzes?.length ?? 0) - 1;
    if (last) {
      const total = quizzes?.length ?? 0;
      const passed = total > 0 && correctCount / total >= 0.7;
      if (passed) {
        // Local flag drives the lobby's "강의하기" button gate (per chapter).
        try {
          localStorage.setItem(`chapter${chapter}_quiz_passed`, 'true');
        } catch {
          /* storage blocked */
        }
        // Server-side: affection bump with dedupe on
        // `quiz_chapter_${chapter}_awarded`. Fire-and-forget.
        void fetch('/api/quiz/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapter,
            correctCount,
            total,
          }),
        }).catch(() => {
          /* non-fatal */
        });
      }
      setShowPopup(true);
      return;
    }
    setIdx((n) => n + 1);
    setSelected(null);
    setResult(null);
    setShowExplanation(false);
  };

  const handleScreenClick = () => {
    if (!current) return;
    // Wrong answer → first click shows explanation, next click advances
    if (result === 'incorrect' && !showExplanation) {
      setShowExplanation(true);
      return;
    }
    if (result !== null) {
      advance();
    }
  };

  if (loadError) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          color: '#333',
        }}
      >
        퀴즈를 불러오지 못했어요: {loadError}
      </div>
    );
  }

  if (!quizzes) {
    return (
      <div
        style={{
          color: '#fff',
          fontSize: 18,
          letterSpacing: '0.04em',
        }}
      >
        퀴즈 불러오는 중…
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          color: '#333',
        }}
      >
        준비된 문제가 없어요.
      </div>
    );
  }

  return (
    <div
      onClick={handleScreenClick}
      style={{ position: 'relative', width: '880px', maxWidth: '94vw' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={boardImg}
        alt="quiz board"
        style={{ width: '100%', display: 'block' }}
      />

      {/* 진행 표시 */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#fff',
          fontSize: 18,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          opacity: 0.75,
          pointerEvents: 'none',
        }}
      >
        {idx + 1} / {quizzes.length}
      </div>

      {/* 정답/오답 이미지 */}
      {result && !showExplanation && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={result === 'correct' ? correctImg : incorrectImg}
          alt={result}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: 150,
            width: 320,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}

      {/* 질문 + 객관식 */}
      {!showExplanation && current && (
        <div
          style={{
            position: 'absolute',
            top: '110px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ width: 620, pointerEvents: 'auto', textAlign: 'center' }}>
            <div
              style={{
                color: '#f4f5f7ff',
                fontSize: 26,
                marginBottom: 18,
                lineHeight: 1.5,
              }}
            >
              {current.question}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2,1fr)',
                gap: 12,
                justifyContent: 'center',
              }}
            >
              {current.choices.map((opt, i) => {
                const isSelected = selected === i;
                const isCorrectAns =
                  result !== null && i === current.answerIdx;
                const isWrongSelected =
                  result === 'incorrect' && isSelected;
                const background = isCorrectAns
                  ? '#89f63bff'
                  : isWrongSelected
                    ? '#ff6b6b'
                    : '#ffffff';
                return (
                  <button
                    key={i}
                    disabled={selected !== null}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(i);
                    }}
                    style={{
                      cursor: selected !== null ? 'default' : 'pointer',
                      padding: '14px 12px',
                      borderRadius: 10,
                      border:
                        isSelected || isCorrectAns
                          ? '2px solid #89f63bff'
                          : '1px solid #cbd5e1',
                      background,
                      color:
                        isSelected || isCorrectAns || isWrongSelected
                          ? '#fff'
                          : '#0b1220',
                      fontSize: 18,
                    }}
                  >
                    <div>{opt}</div>
                  </button>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* 해설 화면 (오답 시 2번째 클릭에서) */}
      {showExplanation && current && (
        <div
          style={{
            position: 'absolute',
            top: '110px',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        >
          <div style={{ width: 620, pointerEvents: 'auto', textAlign: 'center' }}>
            <div
              style={{
                color: '#f4f5f7ff',
                fontSize: 22,
                marginBottom: 10,
              }}
            >
              해설
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 12,
                color: '#fff',
              }}
            >
              정답: {current.choices[current.answerIdx]}
            </div>
            <div
              style={{
                marginTop: 16,
                color: '#fff',
                opacity: 0.7,
                fontSize: 13,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              탭하여 다음 문제로
            </div>
          </div>
        </div>
      )}

      {/* 완료 팝업 */}
      {showPopup && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(0,0,0,0.45)',
            zIndex: 1200,
          }}
          onClick={() => setShowPopup(false)}
        >
          <div
            style={{
              width: 'min(420px, calc(100% - 32px))',
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>
              Chapter {chapter} 완료!
            </h3>
            <p style={{ marginTop: 12, color: '#333' }}>
              {correctCount} / {quizzes.length} 문제를 맞혔어요.
            </p>
            {correctCount / quizzes.length >= 0.7 && (
              <div
                style={{
                  marginTop: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 999,
                  background:
                    'linear-gradient(135deg,#ff6b8f22,#febc2f22)',
                  color: '#d04063',
                  fontSize: 14,
                  fontWeight: 700,
                  border: '1px solid rgba(208,64,99,0.25)',
                }}
              >
                <span aria-hidden>♥</span>
                <span>페르마 호감도 +{correctCount}</span>
              </div>
            )}
            <div
              style={{
                marginTop: 18,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  background: '#FEBC2F',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  router.push('/lobby');
                }}
              >
                로비로
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
