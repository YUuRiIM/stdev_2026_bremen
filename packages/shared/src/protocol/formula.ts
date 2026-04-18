import { z } from 'zod';

/**
 * Agent → Client. LLM wants to display a LaTeX formula while speaking it aloud
 * in a TTS-friendly form. FE renders `latex` via KaTeX (or equivalent); TTS
 * pipeline speaks `speakAs` only.
 *
 * The split exists because ElevenLabs (and most TTS) cannot read raw LaTeX
 * naturally, but the formula needs to be visible for pedagogical accuracy.
 *
 * Topic: "formula.show"
 */
export const ShowFormulaSchema = z.object({
  latex: z.string().min(1),
  speakAs: z.string().min(1),
  displayMode: z.enum(['inline', 'block']).default('block').optional(),
  caption: z.string().optional(), // optional caption under the formula
  ts: z.number().int().positive(),
});
export type ShowFormula = z.infer<typeof ShowFormulaSchema>;
export const SHOW_FORMULA_TOPIC = 'formula.show' as const;
