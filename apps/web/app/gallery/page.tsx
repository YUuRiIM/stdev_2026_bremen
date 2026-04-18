'use client';

import { useState } from 'react';
import Link from 'next/link';

const cards = [
  { id: '주인공-졸업', image: '/assets/images/bg-intro.png', locked: false },
  { id: '페르마', image: '/assets/images/fermat-full.png', locked: false },
  { id: '호킹', image: '/assets/images/hawking-full.png', locked: true },
  { id: '일론', image: '/assets/images/elon-full.png', locked: true },
  { id: '페르마-인연1', image: '/assets/images/bg-mem-1.png', locked: false },
  { id: '페르마-인연2', image: '/assets/images/bg-mem-2.png', locked: false },
  { id: '페르마-해변에서', image: '/assets/images/bg-fermat-ball.png', locked: true },
  { id: '페르마-인연3', image: '/assets/images/bg-mem-3.png', locked: true },
];

export default function GalleryScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <section style={{ position: 'relative', minHeight: '100vh', width: '100%', overflowY: 'auto' }}>

      <img
        src='/assets/images/bg-pattern.png'
        alt=""
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: -1,
        }}
      />
      
      <Link href="/lobby" className="character-detail__back-button">
        ←
      </Link>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
          margin: '0 auto',
          padding: '80px 64px',
        }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={() => !card.locked && setSelectedImage(card.image)}
            style={{
              aspectRatio: '16 / 9',
              width: '45vw',
              cursor: card.locked ? 'not-allowed' : 'pointer',
              overflow: 'hidden',
              borderRadius: '24px',
              border: '6px solid white',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              filter: card.locked ? 'grayscale(1)' : 'none',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => !card.locked && (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={(e) => !card.locked && (e.currentTarget.style.transform = 'scale(1)')}
          >
            <img
              src={card.image}
              alt={card.id}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ))}
      </div>

      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.9)',
            padding: '40px',
            animation: 'fadeIn 0.2s forwards',
          }}
        >
          <img
            src={selectedImage}
            alt="Full view"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '12px',
            }}
          />
          {/* 애니메이션을 위한 스타일 추가 */}
          <style jsx global>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </section>
  );
}