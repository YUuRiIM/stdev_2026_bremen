'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface DialogueBoxProps {
  /** 스피커 이름 라벨 ("페르마", "교수님"). */
  speaker: string;
  children: ReactNode;
  /** 'agent' = 하단 메인 대사창. 'user' = 상단 슬림 에코 (내가 한 말). */
  variant?: 'agent' | 'user';
  /** 상태 태그 (interim transcript 등). */
  state?: 'interim' | null;
  className?: string;
}

/**
 * Visual-novel 스타일의 공통 다이얼로그 박스.
 *   - agent: 하단 메인. 어두운 패널 + amber 스피커 라벨, 큰 타이포.
 *   - user : 바로 위 슬림. 투명도 낮은 미묘한 echo, sky 계열 스피커 라벨.
 * 두 variant 모두 max-width / 중앙정렬 / 같은 radius 로 통일되어 "대화 흐름"
 * 으로 자연스레 읽힌다.
 */
export function DialogueBox({
  speaker,
  children,
  variant = 'agent',
  state,
  className,
}: DialogueBoxProps) {
  // `.lecture-scope *` CSS reset zeroes border-width on every element, so all
  // border utilities need `!` to win specificity.
  const base =
    'mx-auto w-full max-w-[min(92vw,880px)] rounded-[22px] !border backdrop-blur-md shadow-2xl';
  const variantClass =
    variant === 'agent'
      ? '!border-white/15 bg-slate-950/85 px-7 py-5 md:px-9 md:py-6'
      : '!border-sky-300/40 bg-slate-950/75 px-6 py-3 md:px-7 md:py-4';
  const speakerColor =
    variant === 'agent' ? 'text-amber-300' : 'text-sky-300';
  const textSize =
    variant === 'agent'
      ? 'text-lg md:text-xl leading-relaxed'
      : 'text-sm md:text-base leading-relaxed';
  const interim = state === 'interim';

  return (
    <div
      data-testid={
        variant === 'agent'
          ? 'lecture-agent-dialogue'
          : 'lecture-user-dialogue'
      }
      className={cn(base, variantClass, className)}
    >
      <div
        className={cn(
          'text-[0.7rem] font-bold uppercase tracking-[0.22em]',
          speakerColor,
        )}
      >
        {speaker}
      </div>
      <p
        className={cn(
          'mt-1.5 whitespace-pre-wrap text-white',
          textSize,
          interim && 'italic opacity-60',
        )}
      >
        {children}
      </p>
    </div>
  );
}
