'use client';

import { useState } from 'react';

const boardImg = '/assets/images/quiz-board.png';
const correctImg = '/assets/images/quiz-correct.png';
const incorrectImg = '/assets/images/quiz-incorrect.png';

export default function QuizClient() {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

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
    </div>
  );
}