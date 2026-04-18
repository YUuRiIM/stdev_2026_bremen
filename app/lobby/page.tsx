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
        style={{ backgroundImage: `url(${bgLobby})` }}
      >
        <div className="main-lobby-overlay">
          <div className="main-lobby-top">
            <div
              className="main-lobby-user"
              style={{ backgroundImage: `url(${mainNickname})` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fermatProfile}
                alt="프로필"
                className="main-lobby-user__avatar"
              />
              <div className="main-lobby-user__info">
                <strong>닉네임</strong>
                <span>Lv. 100</span>
              </div>
            </div>

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

            <div className="main-lobby-board-shell">
  <div className="main-lobby-board-frame">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={mainWhiteboard}
      alt="화이트보드"
      className="main-lobby-board-bg"
    />

    <div className="main-lobby-board-viewport">
      <div className="main-lobby-board-content">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mainText}
          alt="Chapter 1"
          className="main-lobby-board-title-image"
        />

        {boardPages.map((item) => {
          if (item.type === 'lesson') {
            return (
              <div
                key={item.id}
                className={`board-node board-node--${item.status}`}
                style={item.position}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image} alt="" className="board-node__image" />
                <div className="board-node__label">
                  <span>{item.titleTop}</span>
                  <strong>{item.titleBottom}</strong>
                </div>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              className="board-quiz-button"
              style={item.position}
              onClick={() => setIsLessonPopupOpen(true)}
            >
              <span className="board-quiz-button__teacher">
                {item.teacher}
              </span>
              <span className="board-quiz-button__title">
                {item.label}
              </span>
            </button>
          );
        })}

        <div className="board-path board-path--one" />
        <div className="board-path board-path--two" />
        <div className="board-path board-path--three" />
      </div>
    </div>
  </div>

  <div className="main-lobby-scroll-indicator">
    <span />
  </div>
</div>
          </div>

          <div className="main-lobby-bottom">
            <div className="main-lobby-dialogue">
              <div className="main-lobby-dialogue__name">페르마</div>
              <p>좋은 아침이에요 교수님.</p>
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
            <h3>Chapter 1 학습</h3>
            <p>1-3 곱셈 수업 화면으로 이동할까요?</p>

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
