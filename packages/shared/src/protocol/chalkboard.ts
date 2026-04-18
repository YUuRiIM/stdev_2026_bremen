import { z } from 'zod';

/**
 * Client → Agent. Professor wrote/edited the chalkboard.
 * Agent merges `markdown` into its system prompt under "## 현재 칠판 상태".
 *
 * Topic: "chalkboard.update"
 */
export const ChalkboardUpdateSchema = z.object({
  revision: z.number().int().nonnegative(),
  markdown: z.string(),
  latexBlocks: z
    .array(
      z.object({
        position: z.number().int().nonnegative(),
        src: z.string(),
      })
    )
    .optional(),
  ts: z.number().int().positive(),
});
export type ChalkboardUpdate = z.infer<typeof ChalkboardUpdateSchema>;
export const CHALKBOARD_UPDATE_TOPIC = 'chalkboard.update' as const;

/**
 * Client → Agent. Chalkboard erased.
 *
 * Topic: "chalkboard.clear"
 */
export const ChalkboardClearSchema = z.object({
  revision: z.number().int().nonnegative(),
  ts: z.number().int().positive(),
});
export type ChalkboardClear = z.infer<typeof ChalkboardClearSchema>;
export const CHALKBOARD_CLEAR_TOPIC = 'chalkboard.clear' as const;

/**
 * Client → Agent. Typed user text (email, OTP, hard-to-pronounce term).
 * Handled identically to a user utterance, bypassing STT.
 *
 * Topic: "user_text"
 */
export const UserTextSchema = z.object({
  text: z.string().min(1),
  ts: z.number().int().positive(),
});
export type UserText = z.infer<typeof UserTextSchema>;
export const USER_TEXT_TOPIC = 'user_text' as const;

/**
 * Agent → Client. Request that the user type something (STT likely to fail).
 * FE renders a modal/popup input. Response returns via `user_text` or
 * `chalkboard.update`.
 *
 * Topic: "agent.suggest_type_input"
 */
export const SuggestTypeInputSchema = z.object({
  reason: z.string(),
  fieldKind: z.enum(['formula', 'text']),
  placeholder: z.string().optional(),
  ts: z.number().int().positive(),
});
export type SuggestTypeInput = z.infer<typeof SuggestTypeInputSchema>;
export const SUGGEST_TYPE_INPUT_TOPIC = 'agent.suggest_type_input' as const;
