import { Link } from 'react-router-dom';

function HomeScreen() {
  return (
    <section className="screen screen--home">
      <div className="panel panel--wide">
        <div className="screen-header">
          <div>
            <p className="eyebrow">디버깅 홈</p>
            <h1>게임 UI 개발 샘플</h1>
          </div>
          <p className="screen-description">
            이 화면은 언제든 홈으로 돌아와서 각 스크린을 빠르게 확인할 수 있는 디버깅용 홈입니다.
          </p>
        </div>

        <div className="home-grid">
          <Link to="/select" className="home-card">
            <strong>캐릭터 선택 화면</strong>
            <span>가로 스크롤 이력서 카드 목록</span>
          </Link>
          <Link to="/confirm" className="home-card">
            <strong>캐릭터 선택 확인 화면</strong>
            <span>선택 캐릭터 상세 + 선발 도장 버튼</span>
          </Link>
          <Link to="/lobby" className="home-card">
            <strong>메인 로비 화면</strong>
            <span>베이스캠프, 프로필, 스테이지 보드</span>
          </Link>
          <Link to="/detail" className="home-card">
            <strong>캐릭터 상세 화면</strong>
            <span>기본 정보 / 인연 스토리 탭</span>
          </Link>
          <Link to="/visual-novel" className="home-card">
            <strong>비주얼 노벨 화면</strong>
            <span>대화/선택지 분기 UI</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HomeScreen;
