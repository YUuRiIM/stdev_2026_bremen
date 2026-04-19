'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export interface InnerMonologueCaptionProps {
  /** `id` forces re-mount per utterance so fade animations reset. */
  monologue: { id: number; text: string } | null;
  /** Fired when the caption finishes its visible window and should be cleared. */
  onDismiss: (id: number) => void;
  /** Visible duration in ms before fade-out starts. */
  visibleMs?: number;
  /** Fade-out duration in ms. */
  fadeMs?: number;
  className?: string;
}

export function InnerMonologueCaption({
  monologue,
  onDismiss,
  visibleMs = 3200,
  fadeMs = 700,
  className,
}: InnerMonologueCaptionProps) {
  if (!monologue) return null;
  return (
    <InnerMonologueBody
      key={monologue.id}
      id={monologue.id}
      text={monologue.text}
      onDismiss={onDismiss}
      visibleMs={visibleMs}
      fadeMs={fadeMs}
      className={className}
    />
  );
}

interface BodyProps extends Required<Omit<InnerMonologueCaptionProps, 'monologue' | 'className'>> {
  id: number;
  text: string;
  className?: string;
}

function InnerMonologueBody({
  id,
  text,
  onDismiss,
  visibleMs,
  fadeMs,
  className,
}: BodyProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'leave'>('enter');

  useEffect(() => {
    const enterTimer = window.setTimeout(() => setPhase('hold'), 40);
    const leaveTimer = window.setTimeout(() => setPhase('leave'), visibleMs);
    const dismissTimer = window.setTimeout(
      () => onDismiss(id),
      visibleMs + fadeMs,
    );
    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [id, visibleMs, fadeMs, onDismiss]);

  const opacityClass =
    phase === 'enter'
      ? 'opacity-0 translate-y-2'
      : phase === 'hold'
        ? 'opacity-100 translate-y-0'
        : 'opacity-0 translate-y-0';

  return (
    <div
      data-testid="lecture-inner-monologue"
      aria-live="polite"
      className={cn(
        'pointer-events-none flex justify-center px-6 transition-all ease-out',
        opacityClass,
        className,
      )}
      style={{ transitionDuration: `${fadeMs}ms` }}
    >
      <p
        className="max-w-xl rounded-full border border-white/10 bg-slate-950/65 px-5 py-2 text-center text-sm italic text-white/90 shadow-lg backdrop-blur-sm md:text-base"
      >
        <span aria-hidden className="mr-1 text-white/50">♡</span>
        {text}
      </p>
    </div>
  );
}
