import { useState } from 'react';
import { Link } from 'react-router-dom';
import fermatFull from '../assets/images/fermat-full.png';
import fermatProfile from '../assets/images/fermat-profile.png';
import hawkingFull from '../assets/images/hawking-full.png';
import hawkingProfile from '../assets/images/hawking-profile.png';
import elonFull from '../assets/images/elon-full.png';
import elonProfile from '../assets/images/elon-profile.png';

const characters = [
  {
    id: 'fermat',
    name: '페르마',
    subject: '수학',
    profileImage: fermatProfile,
    fullImage: fermatFull,
    age: '24',
    university: 'MIT',
    height: '170cm',
    description: '페르마는 순수 수학의 아름다움에 매료된 천재입니다. 그녀의 증명은 우아하고 간결하며, 복잡한 문제도 본질적인 통찰력으로 풀어냅니다. 강의는 엄격하지만, 학생들이 스스로 깨달을 때까지 기꺼이 기다립니다.',
    stories: [
      { id: 1, title: '수학의 여왕', description: '오일러 추측을 마침내 증명한 날의 이야기입니다.', locked: false },
      { id: 2, title: '증명의 아름다움', description: '한 장의 냅킨에 모든 것을 담아낸 순간입니다.', locked: true },
    ]
  },
  {
    id: 'hawking',
    name: '호킹',
    subject: '물리',
    profileImage: hawkingProfile,
    fullImage: hawkingFull,
    age: '26',
    university: 'Cambridge',
    height: '175cm',
    description: '호킹은 우주의 신비를 탐구하는 물리학자입니다. 블랙홀의 특이점부터 우주 초기의 양자 요동까지, 그의 통찰력은 물리학의 경계를 확장했습니다. 학생들을 우주의 경이로움으로 이끕니다.',
    stories: [
      { id: 1, title: '블랙홀의 복사', description: '블랙홀도 증발한다는 것을 깨달은 순간입니다.', locked: false },
      { id: 2, title: '우주의 근원', description: '빅뱅 이전에는 무엇이 있었을까요?', locked: true },
    ]
  },
  {
    id: 'elon',
    name: '일론',
    subject: '로켓과학',
    profileImage: elonProfile,
    fullImage: elonFull,
    age: '25',
    university: 'Stanford',
    height: '180cm',
    description: '일론은 불가능을 가능으로 만드는 엔지니어입니다. 그의 목표는 화성이고, 그 길을 막는 모든 난제를 직접 풀어냅니다. 열정적이고 대담하며, 팀을 극한까지 끌어올리는 리더입니다.',
    stories: [
      { id: 1, title: '재사용 가능한 로켓', description: '첫 번째 1단계 로켓 착륙에 성공한 날입니다.', locked: false },
      { id: 2, title: '화성으로의 여정', description: '다음 세대의 우주 여행자들을 위한 꿈입니다.', locked: true },
    ]
  }
];

function CharacterDetailScreen() {
  const [selectedCharacterId, setSelectedCharacterId] = useState('fermat');
  const [tab, setTab] = useState('info');

  const character = characters.find(c => c.id === selectedCharacterId);

  return (
    <section className="character-detail-screen">
      {/* 배경 + 캐릭터 전신 레이어 */}
      <div className="character-detail__background">
        <img src={character.fullImage} alt={`${character.name} 전신`} className="character-detail__full-image" />
      </div>

      {/* 뒤로 가기 버튼 */}
      <Link to="/" className="character-detail__back-button">
        ←
      </Link>

      {/* 캐릭터 선택 리스트 */}
      <aside className="character-detail__portrait-list">
        {characters.map((char) => (
          <button
            key={char.id}
            className={`character-detail__portrait ${selectedCharacterId === char.id ? 'active' : ''}`}
            onClick={() => setSelectedCharacterId(char.id)}
            title={char.name}
          >
            <img src={char.profileImage} alt={char.name} />
          </button>
        ))}
      </aside>

      {/* 우측 정보 패널 */}
      <div className="character-detail__info-panel">
        {/* 헤더 */}
        <div className="character-detail__panel-header">
          <h1 className="character-detail__character-name">{character.name}</h1>
          <p className="character-detail__character-subject">{character.subject}</p>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="character-detail__panel-body">
          {tab === 'info' ? (
            <div className="character-detail__content">
              <div className="character-detail__section-header">기본 파일</div>
              <div className="character-detail__data-table">
                <div className="character-detail__data-row">
                  <span className="character-detail__label">나이</span>
                  <span className="character-detail__value">{character.age}</span>
                </div>
                <div className="character-detail__data-row">
                  <span className="character-detail__label">대학교</span>
                  <span className="character-detail__value">{character.university}</span>
                </div>
                <div className="character-detail__data-row">
                  <span className="character-detail__label">키</span>
                  <span className="character-detail__value">{character.height}</span>
                </div>
              </div>
              <div className="character-detail__section-header" style={{ marginTop: '20px' }}>상세 프로필</div>
              <p className="character-detail__profile-text">
                {character.description}
              </p>
            </div>
          ) : (
            <div className="character-detail__content">
              <div className="character-detail__story-list">
                {character.stories.map((story) => (
                  <div
                    key={story.id}
                    className={`character-detail__story-card ${story.locked ? 'character-detail__story-card--locked' : ''}`}
                  >
                    <strong>{story.title}</strong>
                    {!story.locked && <button className="character-detail__play-button">재생</button>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 탭 메뉴 */}
        <div className="character-detail__tab-nav">
          <button
            className={`character-detail__tab ${tab === 'info' ? 'active' : ''}`}
            onClick={() => setTab('info')}
          >
            기본 정보
          </button>
          <button
            className={`character-detail__tab ${tab === 'story' ? 'active' : ''}`}
            onClick={() => setTab('story')}
          >
            인연 스토리
          </button>
        </div>
      </div>
    </section>
  );
}

export default CharacterDetailScreen;
