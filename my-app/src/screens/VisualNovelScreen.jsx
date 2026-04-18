import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import scriptData from '../data/script.json';
import bgLobby from '../assets/images/bg-lobby.png';
import fermatPng from '../assets/images/fermat-png.png';
import fermatPngDark from '../assets/images/fermat-png-dark.png';

const images = {
  'bg-lobby.png': bgLobby,
  'fermat-png.png': fermatPng,
  'fermat-png-dark.png': fermatPngDark,
};

function VisualNovelScreen() {
  const [index, setIndex] = useState(0);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const navigate = useNavigate();

  const current = scriptData[index];

  const next = () => {
    if (index < scriptData.length - 1) {
      setIndex(index + 1);
    } else {
      navigate('/');
    }
  };

  const handleSkip = () => {
    setShowSkipModal(true);
  };

  const confirmSkip = () => {
    // 스킵 로직: 마지막으로 이동
    setIndex(scriptData.length - 1);
    setShowSkipModal(false);
    navigate('/');
  };

  const cancelSkip = () => {
    setShowSkipModal(false);
  };

  const selectChoice = (choice) => {
    // 선택지 선택 시 다음으로 진행 (선택 결과는 저장하지 않음)
    next();
  };

  const isChoiceMode = current.speaker === 'choice';

  return (
    <section className="visual-novel" onClick={!isChoiceMode ? next : undefined}>
      {/* 배경 레이어 */}
      <div className="background-layer">
        <img src={images[current.backgroundImage]} alt="배경" className="background-image" />
      </div>

      {/* 캐릭터 레이어 */}
      <div className="character-layer">
        {current.characterImage && images[current.characterImage] && (
          <img src={images[current.characterImage]} alt="캐릭터" className="character-image" />
        )}
      </div>

      {/* 상단 버튼 UI */}
      <button className="skip-button" onClick={(e) => { e.stopPropagation(); handleSkip(); }}>
        ▶ Skip
      </button>

      {/* 하단 대화 영역 */}
      {current.speaker === 'character' && (
        <div className="dialogue-box" onClick={(e) => e.stopPropagation()}>
          <div className="speaker-name">{current.name}</div>
          <p className="dialogue-text">{current.text}</p>
          <button className="next-icon" onClick={next}>▶</button>
        </div>
      )}

      {current.speaker === 'narrative' && (
        <div className="narrative-area" onClick={(e) => e.stopPropagation()}>
          <p className="narrative-text">{current.text}</p>
          <button className="next-icon" onClick={next}>▶</button>
        </div>
      )}

      {current.speaker === 'choice' && (
        <div className="choice-container" onClick={(e) => e.stopPropagation()}>
          {current.choices.map((choice, idx) => (
            <button key={idx} className="choice-button" onClick={() => selectChoice(choice)}>
              {choice}
            </button>
          ))}
        </div>
      )}

      {/* 스킵 확인 팝업 */}
      {showSkipModal && (
        <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); cancelSkip(); }}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>스킵하시겠습니까?</h3>
            <p>진행 중인 스토리를 건너뛰고 결과를 확인합니다.</p>
            <div className="modal-buttons">
              <button className="button--ghost" onClick={cancelSkip}>취소</button>
              <button className="button" onClick={confirmSkip}>확인</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default VisualNovelScreen;
