import { Link } from 'react-router-dom';

function MainLobbyScreen() {
  return (
    <section className="screen screen--lobby">
      <div className="lobby-header">
        <div className="user-card">
          <div className="user-avatar">(프로필)</div>
          <div>
            <strong>교수님</strong>
            <p>초보 교수 · Lv.100</p>
          </div>
        </div>
        <button className="icon-button">⚙️</button>
      </div>

      <div className="lobby-body">
        <div className="lobby-preview">
          <div className="scene-card">
            <div className="scene-card__image">(연구실 배경)</div>
            <div className="scene-card__character">(캐릭터 스프라이트)</div>
          </div>
          <div className="dialogue-box">
            <strong>페르마</strong>
            <p>좋은 아침이에요 교수님.</p>
          </div>
        </div>

        <div className="chapter-board">
          <div className="chapter-board__title">Chapter 1</div>
          <div className="stage-map">
            <div className="stage-node stage-node--cleared">1</div>
            <div className="stage-node stage-node--current">2</div>
            <div className="stage-node">3</div>
            <div className="stage-node">4</div>
          </div>
        </div>
      </div>

      <div className="bottom-nav">
        <Link to="/detail" className="bottom-nav__item">
          캐릭터
        </Link>
        <Link to="/visual-novel" className="bottom-nav__item bottom-nav__item--accent">
          수업 시작
        </Link>
      </div>
    </section>
  );
}

export default MainLobbyScreen;
