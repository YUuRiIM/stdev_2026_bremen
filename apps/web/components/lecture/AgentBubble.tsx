'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AgentMessage } from '@/services/agent-adapter';

export interface AgentBubbleProps {
  message: AgentMessage | null;
  speakerName?: string;
  className?: string;
}

export function AgentBubble({
  message,
  speakerName = '페르마',
  className,
}: AgentBubbleProps) {
  if (!message || !message.text) return null;

  return (
    <Card
      data-testid="lecture-agent-bubble"
      className={cn(
        'relative max-w-xl rounded-[28px] border-2 border-white/70 bg-white/95 px-6 py-5 text-slate-900 shadow-2xl backdrop-blur',
        className,
      )}
    >
      <CardContent className="flex flex-col gap-2 p-0">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
          {speakerName}
        </span>
        <p className="text-base leading-relaxed md:text-lg">{message.text}</p>
      </CardContent>
      <span
        aria-hidden
        className="absolute -bottom-3 left-12 h-6 w-6 rotate-45 border-b-2 border-r-2 border-white/70 bg-white/95"
      />
    </Card>
  );
}
