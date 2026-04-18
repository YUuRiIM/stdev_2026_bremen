/**
 * Agent dry-run smoke test (US-311).
 *
 * Verifies that the voice pipeline plugins load and instantiate without
 * going near LiveKit room connection (no VAD load if SILERO_SKIP_LOAD=1
 * since Silero downloads a model file on first run which is heavy for CI).
 *
 * Run: `pnpm --filter @mys/agent exec tsx src/smoke.ts`
 */

import { initializeLogger } from '@livekit/agents';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import * as googleLlm from '@livekit/agents-plugin-google';
import * as silero from '@livekit/agents-plugin-silero';
import dotenv from 'dotenv';

import { createAgentSupabase } from './supabase-client';
import { parseIdentityMetadata } from './identity-metadata';
import { resolveEnvPath } from './env-path';

dotenv.config({ path: resolveEnvPath() });

// @livekit/agents plugin instances (Deepgram/ElevenLabs/Silero) read from a
// global logger at construction time. `cli.runApp` normally initialises it;
// a standalone smoke script must do so manually.
initializeLogger({ pretty: false, level: 'warn' });

async function main() {
  console.log('[smoke] starting');

  // 1) parseIdentityMetadata smoke
  const meta = parseIdentityMetadata(
    JSON.stringify({
      userId: 'smoke_user',
      characterId: 'smoke_char',
      identityMode: 'livekit',
      supabaseJwt: null,
    }),
  );
  console.log('[smoke] parseIdentityMetadata ok', meta);

  // 2) Supabase client (anon — no JWT)
  const supabase = createAgentSupabase(null);
  const { error: anonErr } = await supabase
    .from('characters')
    .select('slug')
    .eq('slug', 'fermat')
    .maybeSingle();
  if (anonErr) throw new Error(`[smoke] anon supabase failed: ${anonErr.message}`);
  console.log('[smoke] supabase anon query ok');

  // 3) STT plugin
  const stt = new deepgram.STT({
    model: 'nova-3',
    language: 'ko',
    apiKey: process.env.DEEPGRAM_API_KEY,
  });
  console.log('[smoke] deepgram STT instantiated', stt.constructor.name);

  // 4) LLM plugin — gemini-3-flash-preview (with 2.5-flash fallback)
  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('[smoke] no Gemini API key');
  let llm: googleLlm.LLM;
  const primary = process.env.VOICE_LLM_MODEL || 'gemini-3-flash-preview';
  try {
    llm = new googleLlm.LLM({ model: primary, apiKey });
    console.log(`[smoke] google LLM instantiated with "${primary}"`);
  } catch (err) {
    console.warn(`[smoke] primary "${primary}" failed; fallback to gemini-2.5-flash`, err);
    llm = new googleLlm.LLM({ model: 'gemini-2.5-flash', apiKey });
    console.log('[smoke] google LLM instantiated with fallback "gemini-2.5-flash"');
  }

  // 5) TTS plugin
  const tts = new elevenlabs.TTS({
    voiceId: process.env.CHAR_DEFAULT_VOICE_ID ?? 'LTCsKRuKTT24n83eMvb9',
    apiKey: process.env.ELEVENLABS_API_KEY,
  });
  console.log('[smoke] elevenlabs TTS instantiated', tts.constructor.name);

  // 6) VAD — skipable (heavy model download)
  if (process.env.SILERO_SKIP_LOAD === '1') {
    console.log('[smoke] silero VAD skipped (SILERO_SKIP_LOAD=1)');
  } else {
    const vad = await silero.VAD.load();
    console.log('[smoke] silero VAD loaded', vad.constructor.name);
  }

  console.log('[smoke] all plugins ok');
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error('[smoke] failed', err);
    process.exit(1);
  },
);
