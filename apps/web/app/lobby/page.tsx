'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

function MainLobbyScreen() {
  const router = useRouter();
  const [isLessonPopupOpen, setIsLessonPopupOpen] = useState(false);

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

            <button type="button" className="main-lobby-setting">
              ⚙
            </button>
          </div>

          <div className="main-lobby-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fermatFull}
              alt="페르마"
              className="main-lobby-character"
            />

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
                          <button
                            type="button"
                            onClick={() =>
                              setIsLessonPopupOpen(true)
                            }
                            style={{
                              width: '118px',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: 0,
                              flexShrink: 0
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
            zIndex:1000,
          }}>
            <div className="main-lobby-dialogue">
              <img src={mainTalking} alt="대사" className="main-lobby-dialogue__image" />
            </div>

            <div className="main-lobby-actions">
              <Link href="/detail" className="main-lobby-action main-lobby-action--ghost">
                캐릭터
              </Link>

              <button
                type="button"
                className="main-lobby-action main-lobby-action--primary"
                onClick={() => setIsLessonPopupOpen(true)}
              >
                수업 시작
                <span>Chapter 1 퀴즈</span>
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
                onClick={() => router.push('/lesson/basic-multiplication')}
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
