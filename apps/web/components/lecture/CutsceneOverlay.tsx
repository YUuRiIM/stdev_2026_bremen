'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { CutscenePlay } from '@mys/shared/protocol';
import { cn } from '@/lib/utils';

export interface CutsceneOverlayProps {
  cutscene: CutscenePlay | null;
  onEnd: () => void;
  /** Auto-dismiss after N ms. Default 6000. Video cutscenes are dismissed on 'ended'. */
  autoDismissMs?: number;
  className?: string;
}

export function CutsceneOverlay({
  cutscene,
  onEnd,
  autoDismissMs = 6000,
  className,
}: CutsceneOverlayProps) {
  // Stabilize onEnd so the timer/keydown effects don't re-run when the parent
  // passes a fresh arrow function each render. Without this, deps churn can
  // clear+reset the timer repeatedly and (in rare cases under dev HMR) fire
  // early.
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    if (!cutscene) return;
    const isVideo = cutscene.mimeType?.startsWith('video/');
    if (isVideo) return; // video element's 'ended' handler drives dismissal
    const id = setTimeout(() => onEndRef.current(), autoDismissMs);
    return () => clearTimeout(id);
  }, [cutscene, autoDismissMs]);

  useEffect(() => {
    if (!cutscene) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onEndRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cutscene]);

  if (!cutscene) return null;

  const isVideo = cutscene.mimeType?.startsWith('video/');

  return (
    <div
      data-testid="lecture-cutscene-overlay"
      role="dialog"
      aria-label="컷씬 재생"
      onClick={onEnd}
      className={cn(
        'fixed inset-0 z-[2000] flex cursor-pointer items-center justify-center bg-black/90',
        className,
      )}
    >
      {isVideo ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={cutscene.assetUrl}
          autoPlay
          playsInline
          onEnded={onEnd}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="relative h-full w-full">
          <Image
            src={cutscene.assetUrl}
            alt={`컷씬 ${cutscene.eventKey}`}
            fill
            priority
            sizes="100vw"
            className="object-contain"
            unoptimized={cutscene.assetUrl.startsWith('http')}
          />
        </div>
      )}
      <span className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/85 backdrop-blur">
        탭하여 계속 · esc/enter
      </span>
    </div>
  );
}
