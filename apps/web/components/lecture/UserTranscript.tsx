'use client';

import { cn } from '@/lib/utils';
import type { UserTranscript as Transcript } from '@/services/session-state';

export interface UserTranscriptProps {
  transcript: Transcript | null;
  className?: string;
}

export function UserTranscript({ transcript, className }: UserTranscriptProps) {
  if (!transcript || !transcript.text) return null;

  return (
    <div
      data-testid="lecture-user-transcript"
      className={cn(
        'pointer-events-none max-w-2xl rounded-2xl bg-slate-900/75 px-5 py-3 text-sm text-slate-50 shadow-xl backdrop-blur md:text-base',
        className,
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          'block',
          !transcript.isFinal && 'italic opacity-60',
        )}
      >
        {transcript.text}
      </span>
    </div>
  );
}
