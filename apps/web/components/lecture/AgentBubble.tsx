'use client';

import { DialogueBox } from './DialogueBox';
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
    <DialogueBox speaker={speakerName} variant="agent" className={className}>
      {message.text}
    </DialogueBox>
  );
}
