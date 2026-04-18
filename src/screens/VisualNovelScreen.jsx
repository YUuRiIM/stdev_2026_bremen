import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './VisualNovelScreen.css';
import scriptData from '../data/script.json';
import scriptIntro from '../data/script-intro.json';
import scriptFermat1 from '../data/script-fermat-1.json';
import scriptFermat2 from '../data/script-fermat-2.json';
import scriptFermat3 from '../data/script-fermat-3.json';
import scriptFermat4 from '../data/script-fermat-4.json';
import bgLobby from '../assets/images/bg-lobby.png';
import bgIntro from '../assets/images/bg-intro.png';
import bgMem1 from '../assets/images/bg-mem-1.png';
import bgMem2 from '../assets/images/bg-mem-2.png';
import bgMem3 from '../assets/images/bg-mem-3.png';
import fermatPng from '../assets/images/fermat-png.png';
import fermatPngDark from '../assets/images/fermat-png-dark.png';

const images = {
  'bg-lobby.png': bgLobby,
  'bg-intro.png': bgIntro,
  'bg-mem-1.png': bgMem1,
  'bg-mem-2.png': bgMem2,
  'bg-mem-3.png': bgMem3,
  // 'bg-mem-4.png': bgMem4,
  'fermat-png.png': fermatPng,
  'fermat-png-dark.png': fermatPngDark,
};

const scripts = {
  'intro': scriptIntro,
  'fermat-1': scriptFermat1,
  'fermat-2': scriptFermat2,
  'fermat-3': scriptFermat3,
  'fermat-4': scriptFermat4,
  'default': scriptData,
};

function VisualNovelScreen() {
  const { scriptId } = useParams();
  const script = scripts[scriptId] || scripts['default'];
  const [index, setIndex] = useState(0);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const navigate = useNavigate();

  const current = script[index];

  const next = () => {
    if (index < script.length - 1) {
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
          <p className="dialogue-text">
            {current.text.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < current.text.split('\n').length - 1 && <br />}
              </span>
            ))}
          </p>
          <button className="next-icon" onClick={next}>▶</button>
        </div>
      )}

      {current.speaker === 'narrative' && (
        <div className="narrative-area" onClick={(e) => e.stopPropagation()}>
          <p className="narrative-text">
            {current.text.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < current.text.split('\n').length - 1 && <br />}
              </span>
            ))}
          </p>
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
