'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useChapterProgress } from '@/lib/affection/use-chapter-progress';

interface GalleryCard {
  id: string;
  /** Thumbnail + static fallback when `video` is not set. */
  image: string;
  /** Optional full-screen playback video (mp4). When set, clicking the card
   *  plays this instead of showing the image modal. */
  video?: string;
  /** Chapter number whose lecture must be cleared to unlock, or null for
   *  always-unlocked / always-locked-by-other-means (DLC). */
  requiresChapterLecture: number | null;
  /** DLC / permanent-locked placeholder — independent of progress. */
  alwaysLocked?: boolean;
}

const CARDS: GalleryCard[] = [
  { id: '주인공-졸업', image: '/assets/images/bg-intro.png', requiresChapterLecture: null },
  { id: '페르마', image: '/assets/images/fermat-full.png', requiresChapterLecture: null },
  { id: '호킹', image: '/assets/images/hawking-full.png', requiresChapterLecture: null, alwaysLocked: true },
  { id: '일론', image: '/assets/images/elon-full.png', requiresChapterLecture: null, alwaysLocked: true },
  { id: '페르마-인연1', image: '/assets/images/bg-mem-1.png', requiresChapterLecture: null },
  { id: '페르마-인연2', image: '/assets/images/bg-mem-2.png', requiresChapterLecture: null },
  {
    id: '페르마-해변에서',
    image: '/assets/images/bg-fermat-ball.png',
    video: '/assets/cutscenes/lecture-end.mp4',
    requiresChapterLecture: 1,
  },
  {
    id: '페르마-인연3',
    image: '/assets/images/bg-mem-3.png',
    video: '/assets/cutscenes/lecture-end-2.mp4',
    requiresChapterLecture: 2,
  },
];

export default function GalleryScreen() {
  const [selectedMedia, setSelectedMedia] = useState<
    { kind: 'image' | 'video'; src: string } | null
  >(null);
  const { progress } = useChapterProgress();
  const cards = useMemo(
    () =>
      CARDS.map((card) => {
        if (card.alwaysLocked) return { ...card, locked: true };
        if (card.requiresChapterLecture === null) return { ...card, locked: false };
        const done = progress.lectureCompleted[card.requiresChapterLecture] === true;
        return { ...card, locked: !done };
      }),
    [progress],
  );

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
            onClick={() => {
              if (card.locked) return;
              setSelectedMedia(
                card.video
                  ? { kind: 'video', src: card.video }
                  : { kind: 'image', src: card.image },
              );
            }}
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

      {selectedMedia && (
        <div
          onClick={() => setSelectedMedia(null)}
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
            cursor: 'pointer',
          }}
        >
          {selectedMedia.kind === 'video' ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={selectedMedia.src}
              autoPlay
              playsInline
              controls
              onEnded={() => setSelectedMedia(null)}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '12px',
              }}
            />
          ) : (
            <img
              src={selectedMedia.src}
              alt="Full view"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '12px',
              }}
            />
          )}
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