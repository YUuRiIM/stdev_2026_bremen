'use client';

import { Loader2, MessageSquareDashed, Mic } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { RecordingState } from '@/services/agent-adapter';

export interface RecordingIndicatorProps {
  state: RecordingState;
  className?: string;
}

const STATE_META: Record<
  RecordingState,
  { label: string; icon: 'mic' | 'loader' | 'dashed'; color: string }
> = {
  idle: { label: '대기', icon: 'mic', color: 'text-slate-300' },
  listening: {
    label: '듣는 중',
    icon: 'mic',
    color: 'text-emerald-400',
  },
  sending: {
    label: '전송 중',
    icon: 'loader',
    color: 'text-sky-400',
  },
  awaiting_agent: {
    label: '응답 대기',
    icon: 'dashed',
    color: 'text-amber-400',
  },
};

export function RecordingIndicator({
  state,
  className,
}: RecordingIndicatorProps) {
  const meta = STATE_META[state];
  const animate =
    state === 'listening'
      ? 'animate-pulse'
      : state === 'sending'
        ? 'animate-spin'
        : '';

  return (
    <div
      data-testid="lecture-recording-indicator"
      data-state={state}
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className={cn('flex items-center', meta.color, animate)}>
        {meta.icon === 'mic' && <Mic size={18} />}
        {meta.icon === 'loader' && <Loader2 size={18} />}
        {meta.icon === 'dashed' && <MessageSquareDashed size={18} />}
      </span>
      <span className={cn(meta.color)}>{meta.label}</span>
    </div>
  );
}
