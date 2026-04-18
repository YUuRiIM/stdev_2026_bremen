'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Character, useManifest } from '@/components/character-kit';
import { chapterClearStatus } from '@/config/gameConfig';

interface Story {
  id: number;
  chapter: number;
  title: string;
  description?: string;
}

interface DetailCharacter {
  id: string;
  name: string;
  subject: string;
  profileImage: string;
  fullImage: string;
  age: string;
  university: string;
  height: string;
  description: string;
  stories: Story[];
}

const characters: DetailCharacter[] = [
  {
    id: 'fermat',
    name: '페르마',
    subject: '수학',
    profileImage: '/assets/images/fermat-profile.png',
    fullImage: '/assets/images/fermat-full.png',
    age: '24',
    university: 'University of Orleans',
    height: '168cm',
    description: '프랑스 출신 천재 대학원생으로, 최연소 연구조교로 주목받고 있다. 차분하고 냉철한 성격이지만, 재능 있는 사람에게는 은근히 관심을 보인다. 수론과 기하학에 특히 강하며, “증명하지 못한 건 아직 포기하지 않았다는 뜻이야”라는 말을 자주 한다.',
    stories: [
      { id: 1, chapter: 1, title: '천재 교수와 아마추어 공주님' },
      { id: 2, chapter: 2, title: '새벽, 연구실, 지도' },
      { id: 3, chapter: 3, title: '졸업' },
      { id: 4, chapter: 4, title: '여백' },
    ],
  },
  {
    id: 'hawking',
    name: '호킹',
    subject: '천체물리',
    profileImage: '/assets/images/hawking-profile.png',
    fullImage: '/assets/images/hawking-full.png',
    age: '23',
    university: 'Oxford',
    height: '175cm',
    description: '호킹은 우주의 신비를 탐구하는 물리학자이다. 아픈 몸에도 불구하고 블랙홀의 특이점부터 우주 초기의 양자 요동까지, 그의 통찰력은 물리학의 경계를 확장했다.',
    stories: [
      { id: 1, chapter: 1, title: '병약 미소녀', description: '블랙홀도 증발한다는 것을 깨달은 순간입니다.' },
      { id: 2, chapter: 2, title: '우주의 근원', description: '빅뱅 이전에는 무엇이 있었을까요?' },
      { id: 3, chapter: 3, title: '시간의 교차', description: '시간과 공간의 경계에 다가선 순간입니다.' },
    ],
  },
  {
    id: 'elon',
    name: '일론',
    subject: '로켓과학',
    profileImage: '/assets/images/elon-profile.png',
    fullImage: '/assets/images/elon-full.png',
    age: '25',
    university: 'University of Pennsylvania',
    height: '180cm',
    description: '불가능이라는 단어는 일론에게는 존재하지 않는다. 화성에서 거주할 날을 꿈꾸며 그 길을 막는 모든 난제를 직접 풀어내는 열정적이고 대담한, 이 시대의 몇 안되는 개척가이다.',
    stories: [
      { id: 1, chapter: 1, title: '재사용', description: '첫 번째 1단계 로켓 착륙에 성공한 날입니다.' },
      { id: 2, chapter: 2, title: '화성으로의 여정', description: '다음 세대의 우주 여행자들을 위한 꿈입니다.' },
      { id: 3, chapter: 3, title: '스윙 바이', description: '지구와 우주를 이어주는 새로운 에너지 기반을 설계합니다.' },
      { id: 4, chapter: 4, title: '화성 데이트', description: '미래를 연결하는 인공위성 네트워크를 완성합니다.' },
    ],
  },
];

function CharacterDetailScreen() {
  const [selectedCharacterId, setSelectedCharacterId] = useState('fermat');
  const [tab, setTab] = useState('info');
  const fermatManifest = useManifest('/assets/fermat/manifest.json');

  const character = characters.find((c) => c.id === selectedCharacterId)!;
  const isStoryUnlocked = (story: Story) =>
    !!(chapterClearStatus as Record<string, boolean>)[`chapter${story.chapter}`];
  const isLockedCharacter = selectedCharacterId === 'hawking' || selectedCharacterId === 'elon';
  const lockMessage =
    selectedCharacterId === 'hawking'
      ? '메인 캐릭터 변경으로 획득 가능'
      : '[화성 여행] DLC 구매로 획득 가능';
  const backgroundImage = selectedCharacterId === 'fermat' ? '/assets/images/bg-fermat.png' : character.fullImage;

  return (
    <section className="character-detail-screen">
      {/* 배경 + 캐릭터 전신 레이어 */}
      <div className={`character-detail__background ${isLockedCharacter ? 'blocked' : ''}`}>
        <Image src={backgroundImage} alt={`${character.name} 캐릭터 전신 이미지`} className="character-detail__full-image" width={700} height={1000} />
      </div>
      {selectedCharacterId === 'fermat' && fermatManifest && (
        <div className="character-detail__character-overlay">
          <Character
            manifest={fermatManifest}
            assetBase="/assets/fermat"
            width={700}
          />
        </div>
      )}
      {isLockedCharacter && (
        <div className="character-detail__locked-overlay">
          <div className="character-detail__locked-card">
            <div className="character-detail__lock-icon">🔒</div>
            <p className="character-detail__locked-text">{lockMessage}</p>
          </div>
        </div>
      )}

      {/* 뒤로 가기 버튼 */}
      <Link href="/" className="character-detail__back-button">
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
            <Image src={char.profileImage} alt={`${char.name} 프로필 사진`} width={80} height={80} />
          </button>
        ))}
      </aside>

      {/* 우측 정보 패널 */}
      <div className={`character-detail__info-panel ${isLockedCharacter ? 'blocked' : ''}`}>
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
                {character.stories.map((story) => {
                  const unlocked = isStoryUnlocked(story);
                  return (
                    <div
                      key={story.id}
                      className={`character-detail__story-card ${unlocked ? 'character-detail__story-card--unlocked' : 'character-detail__story-card--locked'}`}
                    >
                      <div className="character-detail__story-row">
                        <span className="character-detail__story-title">{story.title}</span>
                        <button
                          className="character-detail__play-button"
                          type="button"
                          disabled={!unlocked}
                          aria-label="play story"
                        >
                          ▶
                        </button>
                      </div>
                      {!unlocked && (
                        <div className="character-detail__lock-badge">Chapter {story.chapter} 클리어 필요</div>
                      )}
                    </div>
                  );
                })}
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
