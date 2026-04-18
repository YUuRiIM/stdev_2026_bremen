'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SubjectHeaderProps {
  topic: string;
  chapter?: string;
  className?: string;
}

export function SubjectHeader({
  topic,
  chapter,
  className,
}: SubjectHeaderProps) {
  return (
    <div
      data-testid="lecture-subject-header"
      className={cn('flex items-center gap-3', className)}
    >
      {chapter && (
        <Badge
          variant="secondary"
          className="bg-amber-400 text-slate-900 shadow-md"
        >
          {chapter}
        </Badge>
      )}
      <h1 className="text-lg font-bold tracking-tight text-white drop-shadow md:text-2xl">
        {topic}
      </h1>
    </div>
  );
}
