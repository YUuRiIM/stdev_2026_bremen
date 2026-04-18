'use client';

import Link from 'next/link';

const cards = [
  { id: 'fermat', image: '/assets/images/cv-fermat.png', label: '페르마' },
  { id: 'hawking', image: '/assets/images/cv-hawking.png', label: '호킹' },
  {
    id: 'elon',
    image: '/assets/images/cv-elon.png',
    label: '일론',
    locked: true,
    lockMessage: '[화성 여행] DLC 구매로 획득 가능'
  }
];

function CharacterSelectScreen() {
  return (
    <section
      className="screen screen--select"
    >

      <img
        src='/assets/images/bg-pattern.png'
        alt=""
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          zIndex: -1
        }}
      />
      <div
        style={{
          maxWidth: '980px',
          width: '100%',
          height: '100%',
          margin: '0 auto 28px',
          textAlign: 'center',
          color: '#1c1b24'
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '42px',
            fontWeight: 800,
            letterSpacing: '-0.02em'
          }}
        >
          선발할 학생을 골라주세요.
        </h1>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'stretch',
          gap: '24px',
          flexWrap: 'wrap'
        }}
      >
        {cards.map((card) =>
          card.locked ? (
            <div
              key={card.id}
              style={{
                position: 'relative',
                width: 'min(320px, 28vw)',
                minWidth: '240px',
                borderRadius: '26px',
                overflow: 'hidden',
                boxShadow: '0 18px 40px rgba(0,0,0,0.14)',
                filter: 'grayscale(1)'
              }}
            >
              <img
                src={card.image}
                alt={`${card.label} 이력서`}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto'
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '24px',
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.52)',
                  color: '#fff'
                }}
              >
                <div
                  style={{
                    fontSize: '34px',
                    marginBottom: '12px'
                  }}
                >
                  🔒
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    lineHeight: 1.6,
                    fontWeight: 600,
                    maxWidth: '220px'
                  }}
                >
                  {card.lockMessage}
                </p>
              </div>
            </div>
          ) : (
            <Link
              key={card.id}
              href={`/confirm?character=${card.id}`}
              style={{
                position: 'relative',
                width: 'min(320px, 28vw)',
                minWidth: '240px',
                borderRadius: '26px',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.92)',
                boxShadow: '0 18px 40px rgba(0,0,0,0.14)',
                transition: '0.2s ease',
                textDecoration: 'none'
              }}
            >
              <img
                src={card.image}
                alt={`${card.label} 이력서`}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto'
                }}
              />
            </Link>
          )
        )}
      </div>
    </section>
  );
}

export default CharacterSelectScreen;