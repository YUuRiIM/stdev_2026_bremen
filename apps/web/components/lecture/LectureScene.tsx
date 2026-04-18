'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface LectureSceneProps {
  children: ReactNode;
  className?: string;
  /** Override for tests / debug (e.g. demo background). */
  backgroundSrc?: string;
  backgroundAlt?: string;
}

export function LectureScene({
  children,
  className,
  backgroundSrc = '/assets/images/bg-classroom.png',
  backgroundAlt = '강의실 배경',
}: LectureSceneProps) {
  return (
    <section
      data-testid="lecture-scene"
      className={cn(
        'lecture-scope fixed inset-0 z-[1500] h-[100svh] w-full overflow-hidden',
        className,
      )}
    >
      <Image
        src={backgroundSrc}
        alt={backgroundAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/40"
      />
      <div className="relative z-[1] flex h-full w-full flex-col">
        {children}
      </div>
    </section>
  );
}
