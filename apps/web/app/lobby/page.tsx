'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AffectionGauge } from '@/components/affection/AffectionGauge';
import { useAffection } from '@/lib/affection/use-affection';
import { useChapterProgress } from '@/lib/affection/use-chapter-progress';
import { Character, useManifest } from '@/components/character-kit';

const bgLobby = '/assets/images/bg-lobby.png';
const fermatFull = '/assets/images/main-fermat.png';
const fermatProfile = '/assets/images/fermat-profile.png';
const mainWhiteboard = '/assets/images/main-whiteboard.png';
const mainText = '/assets/images/main-text.png';
const mainNickname = '/assets/images/main_nickname.png';
const mainCircle1 = '/assets/images/main-circle1.png';
const mainCircle2 = '/assets/images/main-circle2.png';
const mainCircle3 = '/assets/images/main-circle3.png';
const mainTalking = '/assets/images/main-talking.png';

// 챕터 카탈로그. 각 엔트리는 로비 화이트보드 + 강의하기 버튼을 구성한다.
// Ch1 = 사칙연산 (lesson/quiz 까지 완비), Ch2 = 분수 (강의만 준비됨).
interface ChapterDef {
  chapterNumber: number;
  title: string; // 화이트보드 h1
  topic: string; // 강의 subject topic
  subjectSlug: string; // lecture-subjects.ts slug
  /** 보드에 배치되는 스테이지들 (왼→오). lesson 은 `status: done|current|locked`
   *  으로 시각 상태를 표시. quiz 는 popup 진입점. */
  board: Array<
    | {
        id: string;
        type: 'lesson';
        titleTop: string;
        titleBottom: string;
        image: string;
        status: 'done' | 'current' | 'locked';
        position: { left: string; top: string };
      }
    | {
        id: string;
        type: 'quiz';
        label: string;
        teacher: string;
        position: { left: string; top: string };
      }
  >;
}

const CHAPTERS: ChapterDef[] = [
  {
    chapterNumber: 1,
    title: 'Chapter 1: 사칙연산',
    topic: '사칙연산',
    subjectSlug: 'basic-arithmetic',
    board: [
      {
        id: 'lesson-1',
        type: 'lesson',
        titleTop: '1-1',
        titleBottom: '덧셈',
        image: mainCircle1,
        status: 'done',
        position: { left: '70px', top: '120px' },
      },
      {
        id: 'lesson-2',
        type: 'lesson',
        titleTop: '1-2',
        titleBottom: '뺄셈',
        image: mainCircle2,
        status: 'current',
        position: { left: '255px', top: '145px' },
      },
      {
        id: 'lesson-3',
        type: 'lesson',
        titleTop: '1-3',
        titleBottom: '곱셈',
        image: mainCircle3,
        status: 'locked',
        position: { left: '460px', top: '118px' },
      },
      {
        id: 'chapter1-quiz',
        type: 'quiz',
        label: 'Chapter 1\n퀴즈',
        teacher: '페르마\n호감도 상승 가능',
        position: { left: '690px', top: '185px' },
      },
    ],
  },
  {
    chapterNumber: 2,
    title: 'Chapter 2: 분수',
    topic: '분수',
    subjectSlug: 'basic-fractions',
    // Chapter 2 는 음성 강의만 준비됨 (수업/퀴즈 콘텐츠는 다음 스프린트).
    // 보드는 비워두고, 진입은 하단 "강의하기" 버튼에서만 허용.
    board: [],
  },
];

function MainLobbyScreen() {
  const router = useRouter();
  const [isLessonPopupOpen, setIsLessonPopupOpen] = useState(false);
  const [isPopupQuiz, setIsPopupQuiz] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Gate the 강의하기 button until the chapter 1 quiz is passed (≥70%).
  // Flag is written by /quiz on completion; read on mount + whenever the
  // tab regains focus (handles the return-from-quiz navigation case).
  const [isQuizPassed, setIsQuizPassed] = useState(false);
  const [isLessonDone, setIsLessonDone] = useState(false);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const { progress: chapterProgress } = useChapterProgress();
  useEffect(() => {
    const read = () => {
      try {
        setIsQuizPassed(
          localStorage.getItem('chapter1_quiz_passed') === 'true',
        );
        setIsLessonDone(
          localStorage.getItem('chapter1_lesson_done') === 'true',
        );
        const savedChapter = Number(
          localStorage.getItem('current_chapter_idx') ?? '0',
        );
        if (
          Number.isFinite(savedChapter) &&
          savedChapter >= 0 &&
          savedChapter < CHAPTERS.length
        ) {
          setCurrentChapterIdx(savedChapter);
        }
      } catch {
        /* storage blocked — leave gates locked */
      }
    };
    read();
    // Mark this session as "not a first-time visit" so the landing (/)
    // redirect skips the intro chain on next reload.
    try {
      localStorage.setItem('demo_visited', 'true');
    } catch {
      /* ignore */
    }
    window.addEventListener('focus', read);
    return () => window.removeEventListener('focus', read);
  }, []);
  const { data: affection } = useAffection();
  const fermatAffection = affection.fermat ?? {
    slug: 'fermat',
    score: 0,
    level: 'stranger' as const,
  };
  const fermatManifest = useManifest('/assets/fermat/manifest.json');

  const currentChapter = CHAPTERS[currentChapterIdx] ?? CHAPTERS[0]!;
  const boardPages = currentChapter.board;
  // 챕터 해금 규칙: Ch1 은 항상, Ch2+ 는 바로 이전 챕터 강의 완료 flag 가 있어야.
  const isChapterUnlocked = (idx: number) =>
    idx === 0
      ? true
      : chapterProgress.lectureCompleted[CHAPTERS[idx - 1]!.chapterNumber] ===
        true;
  const gotoChapter = (idx: number) => {
    if (idx < 0 || idx >= CHAPTERS.length) return;
    if (!isChapterUnlocked(idx)) return;
    setCurrentChapterIdx(idx);
    try {
      localStorage.setItem('current_chapter_idx', String(idx));
    } catch {
      /* ignore */
    }
  };



  return (
    <>
      <section
        className="main-lobby-screen"
      >
        <img
          src={bgLobby}
          alt=""
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            objectFit: "cover",
            zIndex: -1
          }}
        />
        <div className="main-lobby-overlay">
          <div className="main-lobby-top">
            <img
              src={mainNickname}
              alt=""
              style={{
                position: "relative",
                left: "20px",
                width: "300px",
                height: "auto",
                objectFit: "cover",
                zIndex: -1
              }}
            />

            {fermatAffection && (
              <AffectionGauge
                score={fermatAffection.score}
                level={fermatAffection.level}
              />
            )}

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="main-lobby-setting"
                onClick={() => setIsSettingsOpen((v) => !v)}
                aria-expanded={isSettingsOpen}
              >
                ⚙
              </button>
              {isSettingsOpen && (
                <>
                  {/* Click-outside catcher */}
                  <div
                    onClick={() => setIsSettingsOpen(false)}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 998,
                    }}
                  />
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      minWidth: 180,
                      background: '#fff',
                      borderRadius: 12,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
                      padding: 8,
                      zIndex: 999,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !confirm(
                            '데모 리셋: 호감도·퀴즈 기록을 전부 지울까요?',
                          )
                        )
                          return;
                        try {
                          localStorage.removeItem('chapter1_quiz_passed');
                          localStorage.removeItem('chapter1_lesson_done');
                          localStorage.removeItem('demo_visited');
                          localStorage.removeItem('current_chapter_idx');
                        } catch {
                          /* ignore */
                        }
                        await fetch('/api/demo/reset', {
                          method: 'POST',
                        }).catch(() => {});
                        // Route through `/` so the intro gate kicks in (the
                        // demo_visited flag was just cleared).
                        location.href = '/';
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 14px',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        color: '#333',
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = '#f3f3f3')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'transparent')
                      }
                    >
                      🧪 데모 리셋
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="main-lobby-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {fermatManifest && (
              <div className="main-lobby-character">
                <Character
                  manifest={fermatManifest}
                  assetBase="/assets/fermat"
                  width={700}
                />
              </div>
            )}

            <div
              className="main-lobby-board-shell"
              style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                width: '800px',
                height: 'calc(100vh - 40px)',
                zIndex: 10
              }}
            >
              {/* 화이트보드 배경 */}
              <img
                src={mainWhiteboard}
                alt="화이트보드"
                style={{
                  position: 'absolute',
                  inset: 0,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />

              {/* 칠판 내부 실제 표시 영역 */}
              <div
                className="main-lobby-board-viewport"
                style={{
                  position: 'absolute',
                  top: '12%',
                  left: '8%',
                  width: '84%',
                  height: '68%',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  zIndex: 2,
                  scrollbarWidth: 'thin'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => gotoChapter(currentChapterIdx - 1)}
                    disabled={currentChapterIdx <= 0}
                    aria-label="이전 챕터"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#333',
                      cursor:
                        currentChapterIdx > 0 ? 'pointer' : 'not-allowed',
                      opacity: currentChapterIdx > 0 ? 1 : 0.35,
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    ‹
                  </button>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: '32px',
                      fontWeight: 800,
                      color: 'black',
                    }}
                  >
                    {currentChapter.title}
                  </h1>
                  <button
                    type="button"
                    onClick={() => gotoChapter(currentChapterIdx + 1)}
                    disabled={
                      currentChapterIdx >= CHAPTERS.length - 1 ||
                      !isChapterUnlocked(currentChapterIdx + 1)
                    }
                    aria-label="다음 챕터"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#333',
                      cursor:
                        currentChapterIdx < CHAPTERS.length - 1 &&
                        isChapterUnlocked(currentChapterIdx + 1)
                          ? 'pointer'
                          : 'not-allowed',
                      opacity:
                        currentChapterIdx < CHAPTERS.length - 1 &&
                        isChapterUnlocked(currentChapterIdx + 1)
                          ? 1
                          : 0.35,
                      fontSize: 18,
                      fontWeight: 700,
                    }}
                  >
                    ›
                  </button>
                </div>
                {/* 가로 맵 전체 길이 */}
                <div
                  className="main-lobby-board-content"
                  style={{
                    // minWidth: '1400px',
                    height: '100%',
                    position: 'relative',
                    padding: '28px 30px',
                    boxSizing: 'border-box'
                  }}
                >

                  {/* 레벨 줄 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '30px',
                      height: '220px',
                      position: 'relative'
                    }}
                  >
                    {boardPages.map((item, index) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0px'
                        }}
                      >
                        {/* lesson */}
                        {item.type === 'lesson' ? (
                          <div
                            style={{
                              width: '90px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              flexShrink: 0
                            }}
                          >
                            <img
                              src={item.image}
                              alt=""
                              style={{
                                width:
                                  item.status === 'current'
                                    ? '88px'
                                    : '72px',
                                height: 'auto',
                                objectFit: 'contain'
                              }}
                            />

                          </div>
                        ) : (
                          // QUIZ — 수업 완료 후에만 열림. 클릭 시 시작 팝업
                          // (isPopupQuiz=true) → /quiz.
                          <button
                            type="button"
                            disabled={!isLessonDone}
                            onClick={() => {
                              if (!isLessonDone) return;
                              setIsPopupQuiz(true);
                              setIsLessonPopupOpen(true);
                            }}
                            style={{
                              width: '118px',
                              border: 'none',
                              background: 'transparent',
                              cursor: isLessonDone ? 'pointer' : 'not-allowed',
                              padding: 0,
                              flexShrink: 0,
                              opacity: isLessonDone ? 1 : 0.45,
                              filter: isLessonDone ? 'none' : 'grayscale(0.7)',
                            }}
                          >
                            <div
                              style={{
                                marginBottom: '10px',
                                padding: '8px',
                                borderRadius: '10px',
                                background: '#efefef',
                                color: '#3d3d3d',
                                fontSize: '12px',
                                fontWeight: 700,
                                lineHeight: 1.25,
                                boxShadow:
                                  '0 2px 8px rgba(0,0,0,0.12)'
                              }}
                            >
                              {item.teacher}
                            </div>

                            <div
                              style={{
                                padding: '14px 8px',
                                borderRadius: '14px',
                                background:
                                  'linear-gradient(180deg,#f7c14a,#e7a72f)',
                                color: '#fff',
                                fontSize: '20px',
                                fontWeight: 800,
                                lineHeight: 1.05,
                                boxShadow:
                                  '0 6px 0 rgba(166,118,29,0.45)'
                              }}
                            >
                              {item.label}
                            </div>
                          </button>
                        )}

                        {/* 연결선 */}
                        {index !== boardPages.length - 1 && (
                          <div
                            style={{
                              width: '80px',
                              transform: 'translateY(-20px)',
                              marginLeft: '10px',
                              borderTop:
                                '4px dashed rgba(120,120,120,0.7)',
                              flexShrink: 0
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>


                {/* 스크롤 힌트 */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: '9%',
                    transform: 'translateX(-50%)',
                    width: '180px',
                    height: '6px',
                    borderRadius: '999px',
                    background: 'rgba(210,210,210,0.75)',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: '10px',
                      height: '100%',
                      background: '#f0ae2c',
                      borderRadius: '999px'
                    }}
                  />
                </div>

              </div>

            </div>
          </div>

          <div className="main-lobby-bottom"
            style={{
              zIndex: 1000,
            }}>

            <img src={mainTalking} alt="대사" className="main-lobby-dialogue__image" />

            <div className="main-lobby-actions">
              
              <Link href="/gallery" className="main-lobby-action main-lobby-action--ghost">
                갤러리
              </Link>

              <Link href="/detail" className="main-lobby-action main-lobby-action--ghost">
                캐릭터
              </Link>

              {(() => {
                // Ch1 만 퀴즈 선행. Ch2+ 는 챕터 자체가 해금 상태로 넘어와야 보임
                // (이전 챕터 강의 완료 flag 요구). 그래서 화면에 보이기만 해도 바로
                // 강의 진입 가능하게 둔다.
                const lectureEnabled =
                  currentChapter.chapterNumber === 1 ? isQuizPassed : true;
                const sub =
                  currentChapter.chapterNumber === 1
                    ? isQuizPassed
                      ? `Chapter ${currentChapter.chapterNumber} · ${currentChapter.topic}`
                      : '퀴즈 통과 후 해금'
                    : `Chapter ${currentChapter.chapterNumber} · ${currentChapter.topic}`;
                return (
                  <button
                    type="button"
                    className="main-lobby-action main-lobby-action--primary"
                    disabled={!lectureEnabled}
                    onClick={() =>
                      router.push(
                        `/lecture?subject=${currentChapter.subjectSlug}`,
                      )
                    }
                    style={
                      !lectureEnabled
                        ? {
                            opacity: 0.45,
                            cursor: 'not-allowed',
                            filter: 'grayscale(0.6)',
                          }
                        : undefined
                    }
                  >
                    강의하기
                    <span>{sub}</span>
                  </button>
                );
              })()}

              <button
                type="button"
                className="main-lobby-action main-lobby-action--primary"
                disabled={currentChapter.chapterNumber !== 1}
                onClick={() => {
                  if (currentChapter.chapterNumber !== 1) return;
                  setIsPopupQuiz(false);
                  setIsLessonPopupOpen(true);
                }}
                style={
                  currentChapter.chapterNumber !== 1
                    ? {
                        opacity: 0.45,
                        cursor: 'not-allowed',
                        filter: 'grayscale(0.6)',
                      }
                    : undefined
                }
              >
                수업
                <span>
                  {currentChapter.chapterNumber === 1
                    ? 'Chapter 1 · 곱셈 설명'
                    : '준비 중'}
                </span>
              </button>

            </div>
          </div>
        </div>
      </section>

      {isLessonPopupOpen && (
        <div className="main-lobby-modal-overlay">
          <div className="main-lobby-modal">
            <h3>
              Chapter {currentChapter.chapterNumber} ·{' '}
              {isPopupQuiz ? '퀴즈' : '수업'} 시작
            </h3>
            <p>
              {isPopupQuiz
                ? '4문제 퀴즈를 풀어볼까요? 70% 이상 맞히면 강의가 해금됩니다.'
                : '수업을 시작할까요? 끝내면 퀴즈가 해금됩니다.'}
            </p>

            <div className="main-lobby-modal__buttons">
              <button
                type="button"
                className="main-lobby-modal__button main-lobby-modal__button--ghost"
                onClick={() => setIsLessonPopupOpen(false)}
              >
                닫기
              </button>

              <button
                type="button"
                className="main-lobby-modal__button main-lobby-modal__button--primary"
                onClick={() => {
                  if(!isPopupQuiz){
                    router.push('/lesson/basic-multiplication')
                  }
                  else{
                    router.push('/quiz')
                  }
                }}
              >
                시작하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MainLobbyScreen;
