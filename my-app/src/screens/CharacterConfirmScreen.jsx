import { Link } from 'react-router-dom';

function CharacterConfirmScreen() {
  return (
    <section className="screen screen--confirm">
      <div className="screen-header">
        <p className="eyebrow">선발 확정</p>
        <h1>캐릭터 선택 확인</h1>
        <p className="screen-description">
          선택한 캐릭터의 상세 이력서와 일러스트를 확인한 뒤 선발을 확정합니다.
        </p>
      </div>

      <div className="confirm-layout">
        <article className="resume-card resume-card--large">
          <div className="resume-card__title">선택 캐릭터 이력서</div>
          <div className="resume-card__image resume-card__image--large">(이력서 그림)</div>
          <div className="resume-card__body">
            <p><strong>이름</strong> 페르마 (Fermat)</p>
            <p><strong>나이</strong> 24</p>
            <p><strong>이메일</strong> ferma@academy.kr</p>
            <p><strong>학력</strong> MIT 수학과</p>
            <p><strong>경력</strong> 연구 조교 3년</p>
            <p><strong>수상</strong> 수학 올림피아드 금메달</p>
          </div>
        </article>

        <div className="preview-panel">
          <div className="preview-card">
            <div className="preview-card__title">캐릭터 일러스트</div>
            <div className="preview-card__image">(전신 일러스트)</div>
          </div>
          <Link to="/lobby" className="button button--stamp">
            선발하기
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CharacterConfirmScreen;
