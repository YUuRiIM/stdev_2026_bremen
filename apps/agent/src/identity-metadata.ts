import type { IdentityMode } from '@mys/shared/types';

export interface IdentityMetadata {
  userId: string | null;
  characterId: string | null;
  identityMode: IdentityMode;
  supabaseJwt: string | null;
  /** Subject topic (human string, e.g. "뺄셈") picked by the client on the
   *  lobby. When present, the agent preloads that subject so the first turn
   *  can jump straight into the lecture instead of asking "what topic today?". */
  subjectTopic: string | null;
}

// Participant metadata is attached by /api/livekit/token.
export function parseIdentityMetadata(
  raw: string | undefined | null,
): IdentityMetadata {
  if (!raw) {
    return {
      userId: null,
      characterId: null,
      identityMode: 'livekit',
      supabaseJwt: null,
      subjectTopic: null,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<
      Record<keyof IdentityMetadata, unknown>
    >;
    return {
      userId: typeof parsed.userId === 'string' ? parsed.userId : null,
      characterId:
        typeof parsed.characterId === 'string' ? parsed.characterId : null,
      identityMode:
        parsed.identityMode === 'meeting' ? 'meeting' : 'livekit',
      supabaseJwt:
        typeof parsed.supabaseJwt === 'string' ? parsed.supabaseJwt : null,
      subjectTopic:
        typeof parsed.subjectTopic === 'string' && parsed.subjectTopic.trim()
          ? parsed.subjectTopic.trim()
          : null,
    };
  } catch {
    return {
      userId: null,
      characterId: null,
      identityMode: 'livekit',
      supabaseJwt: null,
      subjectTopic: null,
    };
  }
}
