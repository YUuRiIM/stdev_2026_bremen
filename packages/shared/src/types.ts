import type { SupabaseClient } from '@supabase/supabase-js';
import type { AffectionLevel } from './db/schema';

export type IdentityMode = 'livekit' | 'meeting';

export type PublishFn = (topic: string, payload: unknown) => Promise<void>;

export interface ToolContext {
  userId: string;
  characterId: string;
  sessionId: string;
  affectionLevel: AffectionLevel;
  identityMode: IdentityMode;
  subjectId?: string | null;
  // SECURITY: MUST be a JWT-scoped client from createAgentSupabase().
  // Passing a service_role client is a defect — breaks RLS invariants.
  supabase: SupabaseClient;
  publish: PublishFn;
  activeLectureSessionId?: string | null;
}
