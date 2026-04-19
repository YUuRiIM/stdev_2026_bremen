'use client';

import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface EndSessionButtonProps {
  onEnd: () => void;
  className?: string;
  label?: string;
}

/**
 * 강의 세션 종료 버튼. 시각소설 톤에 맞춘 고스트 pill — amber accent, 다크
 * 글라스 배경. `RecordingIndicator` 와 나란히 상단에 놓여도 시각적 무게가
 * 균형이 맞도록 padding/line-height 를 맞춤.
 */
export function EndSessionButton({
  onEnd,
  className,
  label = '끝내기',
}: EndSessionButtonProps) {
  return (
    <button
      type="button"
      data-testid="lecture-end-btn"
      onClick={onEnd}
      className={cn(
        // `!` prefixes defeat the `.lecture-scope button { background:none; padding:0 }`
        // scope-reset rule (higher specificity than bare Tailwind utilities).
        'group inline-flex items-center gap-2 rounded-full !border !border-amber-400/25',
        '!bg-slate-950/75 !px-4 !py-2 text-sm font-semibold text-slate-100 shadow-lg backdrop-blur',
        'transition-[background-color,border-color,color,transform] duration-150 ease-out',
        'hover:-translate-y-px hover:!border-amber-300 hover:!bg-amber-500/20 hover:text-amber-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        'active:translate-y-0',
        className,
      )}
      aria-label={label}
    >
      <X
        size={16}
        className="text-amber-300/80 transition-colors group-hover:text-amber-200"
      />
      <span className="tracking-wide">{label}</span>
    </button>
  );
}
