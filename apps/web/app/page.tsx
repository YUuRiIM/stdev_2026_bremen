'use client';

import Link from 'next/link';

function HomeScreen() {
  const scripts = [
    { id: 'intro', title: '인트로', description: '랜딩' },
    { id: 'fermat-1', title: '페르마 이야기 1', description: '인연 첫 번째 이야기' },
    { id: 'fermat-2', title: '페르마 이야기 2', description: '인연 두 번째 이야기' },
    { id: 'fermat-3', title: '페르마 이야기 3', description: '인연 세 번째 이야기' },
    { id: 'fermat-4', title: '페르마 이야기 4', description: '인연 마지막 이야기' },
  ];

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
          <Link href="/select" className="home-card">
            <strong>캐릭터 선택 화면</strong>
            <span>가로 스크롤 이력서 카드 목록</span>
          </Link>
          <Link href="/confirm" className="home-card">
            <strong>캐릭터 선택 확인 화면</strong>
            <span>선택 캐릭터 상세 + 선발 도장 버튼</span>
          </Link>
          <Link href="/lobby" className="home-card">
            <strong>메인 로비 화면</strong>
            <span>베이스캠프, 프로필, 스테이지 보드</span>
          </Link>
          <Link href="/lobby" className="home-card">
            <strong>전화 화면</strong>
            <span>전화 화면</span>
          </Link>
          <Link href="/detail" className="home-card">
            <strong>캐릭터 상세 화면</strong>
            <span>기본 정보 / 인연 스토리 탭</span>
          </Link>
          {scripts.map((script) => (
            <Link key={script.id} href={`/visual-novel/${script.id}`} className="home-card">
              <strong>{script.title}</strong>
              <span>{script.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HomeScreen;
