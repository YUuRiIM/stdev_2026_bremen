'use client';

import { Check, Circle, CircleDot } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ObjectiveStatus } from '@/services/session-state';

export interface ObjectiveChecklistProps {
  objectives: ObjectiveStatus[];
  className?: string;
  /** 제목 (기본: "오늘의 목표"). null 이면 숨김. */
  title?: string | null;
}

function statusTier(coverage: number): 'done' | 'partial' | 'pending' {
  if (coverage >= 0.7) return 'done';
  if (coverage >= 0.4) return 'partial';
  return 'pending';
}

function StatusIcon({ tier }: { tier: ReturnType<typeof statusTier> }) {
  if (tier === 'done') {
    return (
      <div
        aria-label="달성"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md"
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </div>
    );
  }
  if (tier === 'partial') {
    return (
      <CircleDot
        aria-label="부분 달성"
        className="h-6 w-6 shrink-0 text-amber-400"
        strokeWidth={2.2}
      />
    );
  }
  return (
    <Circle
      aria-label="미달성"
      className="h-6 w-6 shrink-0 text-white/60"
      strokeWidth={2}
    />
  );
}

export function ObjectiveChecklist({
  objectives,
  className,
  title = '오늘의 목표',
}: ObjectiveChecklistProps) {
  if (!objectives.length) return null;

  return (
    <Card
      data-testid="lecture-objective-checklist"
      className={cn(
        'pointer-events-auto w-[min(380px,90vw)] rounded-2xl border border-white/15 bg-slate-900/70 p-4 text-white shadow-2xl backdrop-blur-md',
        className,
      )}
    >
      {title && (
        <h2 className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-amber-300">
          {title}
        </h2>
      )}
      <ul className="flex flex-col gap-2.5">
        {objectives.map((obj) => {
          const tier = statusTier(obj.coverage);
          return (
            <li
              key={obj.id}
              data-status={tier}
              className="flex items-start gap-3"
            >
              <StatusIcon tier={tier} />
              <p
                className={cn(
                  'flex-1 text-sm leading-snug',
                  tier === 'done' && 'text-white line-through decoration-emerald-400/80 decoration-2',
                  tier === 'partial' && 'text-white',
                  tier === 'pending' && 'text-white/85',
                )}
              >
                {obj.statement}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
