import { z } from 'zod';
import type { SharedToolDef } from '../types';

export const recordFact: SharedToolDef<
  {
    key: z.ZodString;
    value: z.ZodString;
    confidence: z.ZodOptional<z.ZodNumber>;
  },
  { ok: boolean; key: string; value: string; reason?: string }
> = {
  name: 'recordFact',
  description:
    "Record a concrete atomic fact the user explicitly stated about themselves (e.g. favorite_number=17). Do NOT record inferences, emotions, or session-opening observations. Only call when the user just said something factual worth remembering.",
  parameters: z.object({
    key: z.string().min(1).max(64),
    value: z.string().min(1).max(1024),
    confidence: z.number().min(0).max(1).optional(),
  }),
  minAffection: 'friend',
  execute: async ({ key, value, confidence }, ctx) => {
    const { error } = await ctx.supabase.from('facts').upsert(
      {
        user_id: ctx.userId,
        entity_id: null,
        key,
        value,
        confidence: confidence ?? 1.0,
        source: 'llm_inferred',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,entity_id,key' },
    );
    if (error) {
      return { ok: false, key, value, reason: `upsert_failed: ${error.message}` };
    }
    return { ok: true, key, value };
  },
};
