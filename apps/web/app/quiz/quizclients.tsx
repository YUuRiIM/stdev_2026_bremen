'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const boardImg = '/assets/images/quiz-board.png';
const correctImg = '/assets/images/quiz-correct.png';
const incorrectImg = '/assets/images/quiz-incorrect.png';

export default function QuizClient() {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();

  const options = [9, 12, 15, 18];
  const correctIndex = 1; // options[1] === 12

  const handleSelect = (i: number) => {
    setSelected(i);
    setResult(i === correctIndex ? 'correct' : 'incorrect');
  };

  const handleScreenClick = () => {
    // When user clicked the screen after an incorrect answer, show explanation inside the board
    if (result === 'incorrect' && !showExplanation) {
      setShowExplanation(true);
      return;
    }

    // If explanation is already shown, a further click opens the completion popup
    if (result === 'incorrect' && showExplanation && !showPopup) {
      setShowPopup(true);
      return;
    }

    // If the user answered correctly, clicking the screen should open the completion popup
    if (result === 'correct' && !showPopup) {
      setShowPopup(true);
      return;
    }
  };

  return (
    <div onClick={handleScreenClick} style={{ position: 'relative', width: '880px', maxWidth: '94vw' }}>
      <img src={boardImg} alt="quiz board" style={{ width: '100%', display: 'block' }} />

      {/* 정답/오답 이미지: 보드 바로 위에 표시 */}
      {result && !showExplanation && (
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

      {/* 보드 위 오버레이: 질문 + 객관식 버튼 (해설 보여줄 때는 숨김) */}
      {!showExplanation && (
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
            <div style={{ color: '#f4f5f7ff', fontSize: 28, marginBottom: 6 }}>아래 연산의 결과는?</div>
            <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 18 }}>6 + 3 × 2</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, justifyContent: 'center' }}>
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    // prevent this click from bubbling up to the screen click handler
                    e.stopPropagation();
                    handleSelect(i);
                  }}
                  style={{
                    cursor: 'pointer',
                    padding: '14px 12px',
                    borderRadius: 10,
                    border: selected === i ? '2px solid #89f63bff' : '1px solid #cbd5e1',
                    background: selected === i ? '#89f63bff' : '#ffffff',
                    color: selected === i ? '#fff' : '#0b1220',
                    fontSize: 18,
                  }}
                >
                  <div>{opt}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Explanation view shown inside the board when user clicked after wrong answer */}
      {showExplanation && (
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
            <div style={{ color: '#f4f5f7ff', fontSize: 28, marginBottom: 6, whiteSpace: 'pre-line',}}>해설</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 18 }}>
              <br />
              곱셈이 먼저 계산됩니다.
              <br />
              <br />

              따라서 6 + 3 × 2 = 6 + (3×2) 
              <br />
              <br />
              = 12
            </div>
          </div>
        </div>
      )}
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
            <h3 style={{ margin: 0, fontSize: '1.2rem', color:'#333' }}>Chapter 1을 완료하였습니다.</h3>
            <p style={{ marginTop: 12, color: '#333' }}>다음 챕터로 넘어갑니다!</p>
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                style={{ padding: '10px 18px', borderRadius: 999, background: '#FEBC2F', color: '#fff', border: 'none', cursor: 'pointer' }}
                onClick={() => {
                  router.push('/lobby');
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}