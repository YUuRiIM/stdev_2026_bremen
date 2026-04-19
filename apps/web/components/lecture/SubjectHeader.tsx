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
      className={cn(
        // `!border` wins against `.lecture-scope * { border: 0 }` scope reset.
        'inline-flex items-center gap-3 rounded-full !border !border-white/10',
        'bg-slate-950/70 px-4 py-2 shadow-lg backdrop-blur md:px-5 md:py-2.5',
        className,
      )}
    >
      {chapter && (
        <Badge
          variant="secondary"
          className="bg-amber-400 text-slate-900 shadow-md"
        >
          {chapter}
        </Badge>
      )}
      <h1 className="text-base font-bold tracking-tight text-white md:text-xl">
        {topic}
      </h1>
    </div>
  );
}
