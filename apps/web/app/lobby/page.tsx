'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AffectionGauge } from '@/components/affection/AffectionGauge';
import { useAffection } from '@/lib/affection/use-affection';
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

// "강의하기" (voice lecture) routing. Chapter 1 = 사칙연산 (단일 subject,
// 3 objectives 로 덧셈/뺄셈/곱셈 전부를 한 강의에서 다룸). DB subjects.topic
// = "사칙연산", FE slug = `basic-arithmetic`.
const CHAPTER_1_LECTURE = {
  chapterNumber: 1,
  topic: '사칙연산',
  subjectSlug: 'basic-arithmetic',
} as const;

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
  useEffect(() => {
    const read = () => {
      try {
        setIsQuizPassed(
          localStorage.getItem('chapter1_quiz_passed') === 'true',
        );
        setIsLessonDone(
          localStorage.getItem('chapter1_lesson_done') === 'true',
        );
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

  const boardPages = useMemo(
    () => [
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
    []
  );



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
                <h1
                  style={{
                    margin: 0,
                    fontSize: '32px',
                    fontWeight: 800,
                    color: 'black'
                  }}
                >
                  Chapter 1: 사칙연산
                </h1>
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
                          // QUIZ — gated until Chapter 1 수업 완료
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

              <button
                type="button"
                className="main-lobby-action main-lobby-action--primary"
                disabled={!isQuizPassed}
                onClick={() =>
                  router.push(`/lecture?subject=${CHAPTER_1_LECTURE.subjectSlug}`)
                }
                style={
                  !isQuizPassed
                    ? {
                        opacity: 0.45,
                        cursor: 'not-allowed',
                        filter: 'grayscale(0.6)',
                      }
                    : undefined
                }
              >
                강의하기
                <span>
                  {isQuizPassed
                    ? `Chapter ${CHAPTER_1_LECTURE.chapterNumber} · ${CHAPTER_1_LECTURE.topic}`
                    : '퀴즈 통과 후 해금'}
                </span>
              </button>

              <button
                type="button"
                className="main-lobby-action main-lobby-action--primary"
                onClick={() => {
                  setIsPopupQuiz(false);
                  setIsLessonPopupOpen(true);
                }}
              >
                수업
                <span>Chapter 1 · 곱셈 설명</span>
              </button>

            </div>
          </div>
        </div>
      </section>

      {isLessonPopupOpen && (
        <div className="main-lobby-modal-overlay">
          <div className="main-lobby-modal">
            <h3>Chapter 1 -  시작</h3>
            <p>수업을 시작할까요?</p>

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
