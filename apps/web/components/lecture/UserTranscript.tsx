'use client';

import { DialogueBox } from './DialogueBox';
import type { UserTranscript as Transcript } from '@/services/session-state';

export interface UserTranscriptProps {
  transcript: Transcript | null;
  speakerName?: string;
  className?: string;
}

export function UserTranscript({
  transcript,
  speakerName = '교수님',
  className,
}: UserTranscriptProps) {
  if (!transcript || !transcript.text) return null;
  return (
    <DialogueBox
      speaker={speakerName}
      variant="user"
      state={transcript.isFinal ? null : 'interim'}
      className={className}
    >
      {transcript.text}
    </DialogueBox>
  );
}
