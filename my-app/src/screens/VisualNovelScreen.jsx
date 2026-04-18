import { useState } from 'react';

const script = [
  { speaker: 'character', name: '페르마', text: '교수님, 오늘은 어떤 수업을 하실 건가요?' },
  { speaker: 'player', text: '어느 분야에 관심이 있나요?' },
  { speaker: 'choice', choices: ['수학', '로켓과학', '물리'] },
];

function VisualNovelScreen() {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState('');

  const current = script[index];

  const next = () => {
    if (index < script.length - 1) {
      setIndex(index + 1);
    }
  };

  return (
    <section className="screen screen--novel">
      <div className="screen-header">
        <p className="eyebrow">비주얼 노벨</p>
        <h1>스토리 진행</h1>
        <p className="screen-description">
          플레이어 선택에 따라 분기되는 대화 UI를 확인할 수 있습니다.
        </p>
      </div>

      <div className="novel-stage">
        <div className="novel-background">(배경 이미지)</div>
        <div className="novel-character">(캐릭터 일러스트)</div>
      </div>

      <div className="novel-dialogue">
        {current.speaker === 'character' && (
          <div className="dialogue-box">
            <div className="dialogue-label">페르마</div>
            <p>{current.text}</p>
            <button className="button button--small" onClick={next}>
              다음
            </button>
          </div>
        )}

        {current.speaker === 'player' && (
          <div className="player-text">{current.text}</div>
        )}

        {current.speaker === 'choice' && (
          <div className="choice-panel">
            {current.choices.map((option) => (
              <button
                key={option}
                className="choice-button"
                onClick={() => {
                  setChoice(option);
                  setIndex(index + 1);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      {choice && <p className="choice-result">선택: {choice}</p>}
    </section>
  );
}

export default VisualNovelScreen;
