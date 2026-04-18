import { z } from 'zod';

/**
 * Agent → Client. Live STT transcript of the user's utterance.
 * Emitted for both interim (isFinal=false) and final (isFinal=true) segments so
 * FE can render a typewriter-style live caption that solidifies on final.
 *
 * Topic: "user.transcript"
 *
 * NOTE: Distinct from `user_text` (Client→Agent typed input). The direction
 * and semantic are opposite — don't collapse them.
 */
export const UserTranscriptSchema = z.object({
  text: z.string(),
  isFinal: z.boolean(),
  ts: z.number().int().positive(),
});
export type UserTranscript = z.infer<typeof UserTranscriptSchema>;
export const USER_TRANSCRIPT_TOPIC = 'user.transcript' as const;
