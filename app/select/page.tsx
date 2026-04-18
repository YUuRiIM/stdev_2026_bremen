'use client';

import Link from 'next/link';
import { characters } from '@/data/dummyCharacters';

function CharacterSelectScreen() {
  return (
    <section className="screen screen--select">
      <div className="screen-header">
        <p className="eyebrow">선발할 학생 선택</p>
        <h1>선발할 학생을 골라주세요.</h1>
        <p className="screen-description">
          아래 카드를 가로로 밀어서 다양한 후보를 확인할 수 있습니다.
        </p>
      </div>

      <div className="card-slider">
        {characters.map((character) => (
          <article key={character.id} className="resume-card resume-card--small">
            <div className="resume-card__image">(그림)</div>
            <div className="resume-card__body">
              <div className="resume-card__head">
                <div>
                  <strong>{character.name}</strong>
                  <span>{character.englishName}</span>
                </div>
                <div className="post-it">{character.subject}</div>
              </div>
              <div className="resume-card__info">
                <p>나이 {character.age}</p>
                <p>{character.email}</p>
              </div>
              <div className="resume-card__table">
                <p>학력: {character.education}</p>
                <p>경력: {character.experience}</p>
                <p>수상: {character.awards}</p>
              </div>
            </div>
            <Link href="/confirm" className="button button--small">
              선택 확인으로 이동
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export default CharacterSelectScreen;
