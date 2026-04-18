import { z } from 'zod';

/**
 * Agent → Client. Swap the character's sprite to reflect current emotion.
 * FE maps `emotion` to a sprite asset from `character_assets` where
 * `type='sprite'` and `emotion` matches.
 *
 * `intensity` (0–1) is a hint for FE to pick a stronger variant if available.
 *
 * Topic: "emotion.change"
 */
export const EmotionSchema = z.enum([
  'neutral',
  'happy',
  'joyful',
  'embarrassed',
  'focused',
  'surprised',
  'sad',
  'worried',
  'annoyed',
  'affectionate',
]);
export type Emotion = z.infer<typeof EmotionSchema>;

export const EmotionChangeSchema = z.object({
  emotion: EmotionSchema,
  intensity: z.number().min(0).max(1).default(0.5).optional(),
  reason: z.string().optional(), // free-form LLM note, FE may ignore
  ts: z.number().int().positive(),
});
export type EmotionChange = z.infer<typeof EmotionChangeSchema>;
export const EMOTION_CHANGE_TOPIC = 'emotion.change' as const;
