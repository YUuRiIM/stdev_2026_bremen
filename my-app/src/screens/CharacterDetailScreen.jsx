import { useState } from 'react';
import { Link } from 'react-router-dom';

function CharacterDetailScreen() {
  const [tab, setTab] = useState('info');

  return (
    <section className="screen screen--detail">
      <div className="detail-header">
        <Link to="/" className="button button--ghost">
          ← 뒤로
        </Link>
        <div>
          <p className="eyebrow">캐릭터 상세</p>
          <h1>페르마</h1>
          <p className="screen-description">기본 정보와 인연 스토리를 확인할 수 있는 화면입니다.</p>
        </div>
      </div>

      <div className="detail-layout">
        <aside className="skin-list">
          <div className="skin-item selected">표정 1</div>
          <div className="skin-item">표정 2</div>
          <div className="skin-item">표정 3</div>
        </aside>

        <div className="detail-preview">
          <div className="detail-preview__bg">(수학 공식 배경)</div>
          <div className="detail-preview__sprite">(캐릭터 스프라이트)</div>
        </div>

        <div className="detail-info">
          <div className="tab-bar">
            <button className={tab === 'info' ? 'tab active' : 'tab'} onClick={() => setTab('info')}>
              기본 정보
            </button>
            <button className={tab === 'story' ? 'tab active' : 'tab'} onClick={() => setTab('story')}>
              인연 스토리
            </button>
          </div>

          {tab === 'info' ? (
            <div className="tab-content">
              <p><strong>나이</strong> 24</p>
              <p><strong>대학교</strong> MIT</p>
              <p><strong>키</strong> 170cm</p>
              <div className="profile-description">
                페르마는 수학을 사랑하는 천재 학생입니다. 강의와 연구 모두에서 안정적인 모습을 보여줍니다.
              </div>
            </div>
          ) : (
            <div className="tab-content">
              <div className="story-item">
                <strong>스토리 1</strong>
                <p>첫 만남부터 지금까지 함께 성장한 이야기입니다.</p>
                <button className="button button--ghost">재생</button>
              </div>
              <div className="story-item story-item--locked">
                <strong>스토리 2</strong>
                <p>잠금 상태입니다. 해금 조건을 채우면 열어볼 수 있습니다.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default CharacterDetailScreen;
