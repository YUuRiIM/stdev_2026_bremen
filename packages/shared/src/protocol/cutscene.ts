import { z } from 'zod';

/**
 * Agent → Client. Trigger pre-rendered cutscene video/image playback.
 * When `muteTTS: true`, FE should notify the agent via `cutscene.end` so the
 * agent can resume speech. Agent calls `session.interrupt()` when emitting this.
 *
 * Topic: "cutscene.play"
 */
export const CutscenePlaySchema = z.object({
  eventKey: z.string(),
  assetUrl: z.string().url(),
  mimeType: z.enum(['video/mp4', 'video/webm', 'image/webp', 'image/png']).optional(),
  duration: z.number().int().nonnegative().optional(), // milliseconds; omit for images
  muteTTS: z.boolean().default(true),
  ts: z.number().int().positive(),
});
export type CutscenePlay = z.infer<typeof CutscenePlaySchema>;
export const CUTSCENE_PLAY_TOPIC = 'cutscene.play' as const;

/**
 * Client → Agent. Cutscene playback ended (natural end or user skip).
 * Agent resumes normal turn-taking.
 *
 * Topic: "cutscene.end"
 */
export const CutsceneEndSchema = z.object({
  eventKey: z.string(),
  reason: z.enum(['natural', 'skipped', 'error']).default('natural'),
  ts: z.number().int().positive(),
});
export type CutsceneEnd = z.infer<typeof CutsceneEndSchema>;
export const CUTSCENE_END_TOPIC = 'cutscene.end' as const;
