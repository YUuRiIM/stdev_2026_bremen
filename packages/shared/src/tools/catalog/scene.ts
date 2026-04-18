import { z } from 'zod';
import type { SharedToolDef } from '../types';
import {
  EMOTION_CHANGE_TOPIC,
  EmotionSchema,
  CUTSCENE_PLAY_TOPIC,
} from '../../protocol';

export const playCutscene: SharedToolDef<
  { eventKey: z.ZodString },
  { ok: boolean; eventKey: string; reason?: string }
> = {
  name: 'playCutscene',
  description:
    "Play a pre-rendered cutscene for a story moment keyed by eventKey (e.g. 'approved_smile'). Only call this at narratively significant moments.",
  parameters: z.object({
    eventKey: z.string().min(1),
  }),
  minAffection: 'acquaintance',
  execute: async ({ eventKey }, ctx) => {
    const { data: event, error: evErr } = await ctx.supabase
      .from('events')
      .select('id, cutscene_asset_id')
      .eq('character_id', ctx.characterId)
      .eq('key', eventKey)
      .maybeSingle();
    if (evErr || !event?.cutscene_asset_id) {
      return { ok: false, eventKey, reason: 'event_or_asset_not_seeded' };
    }

    const { data: asset } = await ctx.supabase
      .from('character_assets')
      .select('signed_url, storage_key, type, signed_url_expires_at')
      .eq('id', event.cutscene_asset_id)
      .maybeSingle();

    const assetUrl = asset?.signed_url;
    if (!assetUrl) {
      return { ok: false, eventKey, reason: 'asset_url_missing' };
    }

    const mimeType = asset?.type === 'video' ? 'video/mp4' : undefined;
    await ctx.publish(CUTSCENE_PLAY_TOPIC, {
      eventKey,
      assetUrl,
      mimeType,
      muteTTS: true,
      ts: Date.now(),
    });

    return { ok: true, eventKey };
  },
};

export const setEmotion: SharedToolDef<
  {
    emotion: z.ZodEnum<
      [
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
      ]
    >;
  },
  { ok: boolean; emotion: string }
> = {
  name: 'setEmotion',
  description:
    "Change the character's visible emotion/sprite. Only call when the emotion actually changes; avoid calling during a normal reply.",
  parameters: z.object({
    emotion: EmotionSchema,
  }),
  minAffection: 'acquaintance',
  execute: async ({ emotion }, ctx) => {
    await ctx.publish(EMOTION_CHANGE_TOPIC, {
      emotion,
      ts: Date.now(),
    });
    return { ok: true, emotion };
  },
};
