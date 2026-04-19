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
  { id: '페르마-인연2', image: '/assets/images/bg-mem-2.png', requiresChapterLecture: 1 },
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
  { id: '페르마-인연4-1', image: '/assets/images/bg-fermat-mem4-1.png', requiresChapterLecture: 3 },
  { id: '페르마-인연4-2', image: '/assets/images/bg-fermat-mem4-2.png', requiresChapterLecture: 3 },
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
              position: 'relative',
              aspectRatio: '16 / 9',
              width: '45vw',
              cursor: card.locked ? 'not-allowed' : 'pointer',
              overflow: 'hidden',
              borderRadius: '24px',
              border: '6px solid white',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) =>
              !card.locked && (e.currentTarget.style.transform = 'scale(1.03)')
            }
            onMouseLeave={(e) =>
              !card.locked && (e.currentTarget.style.transform = 'scale(1)')
            }
          >
            <img
              src={card.image}
              alt={card.id}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                // Lock state: blur + darken slightly so the silhouette stays
                // visible but the detail is obscured. Unlocked: crisp.
                filter: card.locked ? 'blur(14px) brightness(0.72)' : 'none',
                transform: card.locked ? 'scale(1.06)' : 'none',
                transition: 'filter 0.3s',
              }}
            />
            {/* VIDEO indicator — shows on both locked and unlocked video cards
                so users know there's an animated cutscene here. */}
            {card.video && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  background: 'rgba(0,0,0,0.55)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  padding: '4px 10px',
                  borderRadius: 999,
                  backdropFilter: 'blur(4px)',
                }}
              >
                ▶ 영상
              </div>
            )}
            {/* Lock overlay — blur already dims content; this adds the lock
                plate with a hint about the unlock requirement. */}
            {card.locked && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  gap: 8,
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.5))',
                }}
              >
                <div style={{ fontSize: 48, lineHeight: 1 }}>🔒</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textShadow: '0 2px 6px rgba(0,0,0,0.6)',
                  }}
                >
                  {card.alwaysLocked
                    ? '[DLC] 추가 캐릭터'
                    : card.requiresChapterLecture !== null
                      ? `Chapter ${card.requiresChapterLecture} 강의 완료 시 해금`
                      : '잠금'}
                </div>
              </div>
            )}
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