import {
  type JobContext,
  type JobProcess,
  ServerOptions,
  cli,
  defineAgent,
  voice,
} from '@livekit/agents';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as elevenlabs from '@livekit/agents-plugin-elevenlabs';
import * as googleLlm from '@livekit/agents-plugin-google';
import * as silero from '@livekit/agents-plugin-silero';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { composeSystemPrompt } from '@mys/shared/prompt';
import { loadCharacter, loadCharacterBySlug } from '@mys/shared/db';
import { buildAllToolDefs } from '@mys/shared/tools';
import type { ToolContext } from '@mys/shared/types';

import { parseIdentityMetadata } from './identity-metadata';
import { createAgentSupabase } from './supabase-client';
import { MiyeonshiAgent } from './miyeonshi-agent';
import { resolveEnvPath } from './env-path';
import { toLiveKitCatalog } from './tool-adapter';

// Diagnostic — confirms process boot + env shape on LiveKit Cloud.
// stdout/stderr unbuffered so container logs flush without waiting.
process.stdout.write('[mys-agent] boot ' + new Date().toISOString() + '\n');
process.stderr.write('[mys-agent] boot-err ' + new Date().toISOString() + '\n');
console.log('[mys-agent] env present:', {
  LIVEKIT_URL: !!process.env.LIVEKIT_URL,
  LIVEKIT_API_KEY: !!process.env.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: !!process.env.LIVEKIT_API_SECRET,
  DEEPGRAM_API_KEY: !!process.env.DEEPGRAM_API_KEY,
  GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
});

// Load env from apps/web/.env.local — resolved relative to this file so
// `pnpm --filter @mys/agent exec` or standalone deploy both work.
dotenv.config({ path: resolveEnvPath() });

const DEFAULT_VOICE_LLM = 'gemini-3-flash-preview';
const FALLBACK_VOICE_LLM = 'gemini-2.5-flash';

function resolveVoiceLlmModel(): string {
  return process.env.VOICE_LLM_MODEL || DEFAULT_VOICE_LLM;
}

function buildVoiceLlm(model: string): googleLlm.LLM {
  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GOOGLE_API_KEY;
  return new googleLlm.LLM({ model, apiKey });
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },

  entry: async (ctx: JobContext) => {
    const vad = ctx.proc.userData.vad! as silero.VAD;
    await ctx.connect();
    const participant = await ctx.waitForParticipant();

    const meta = parseIdentityMetadata(participant.metadata);
    if (!meta.userId || !meta.characterId) {
      console.error('[agent] missing userId or characterId in participant metadata', meta);
      return;
    }

    // JWT pass-through — NEVER a service_role key.
    const supabase = createAgentSupabase(meta.supabaseJwt);

    // Accept either a UUID or a slug (FE currently passes slug via token route).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const character = UUID_RE.test(meta.characterId)
      ? await loadCharacter(supabase, meta.characterId)
      : await loadCharacterBySlug(supabase, meta.characterId);
    if (!character) {
      console.error('[agent] character not found', meta.characterId);
      return;
    }

    // Sprint 3 T0: no active lecture yet when session starts; the student
    // agent has no subject context until the user explicitly begins one.
    const subject = null;

    const publish = async (topic: string, payload: unknown): Promise<void> => {
      const data = new TextEncoder().encode(JSON.stringify(payload));
      // `reliable` is required by @livekit/rtc-node's proto encoding — omitting
      // it throws `required field not set`, which silently kills tool calls.
      await ctx.room.localParticipant?.publishData(data, {
        topic,
        reliable: true,
      });
    };

    const ctxRef: { current: ToolContext } = {
      current: {
        userId: meta.userId,
        // Use the resolved UUID, not the slug that came in via participant
        // metadata. Tools query Postgres tables whose character_id column is
        // uuid-typed; passing a slug silently returns 0 rows.
        characterId: character.id,
        sessionId: ctx.room.name ?? crypto.randomUUID(),
        affectionLevel: 'stranger',
        identityMode: meta.identityMode,
        subjectId: null,
        supabase,
        publish,
        activeLectureSessionId: null,
      },
    };

    const stt = new deepgram.STT({
      model: 'nova-3',
      language: character.language || 'ko',
      apiKey: process.env.DEEPGRAM_API_KEY,
    });

    let llm: googleLlm.LLM;
    const requestedModel = resolveVoiceLlmModel();
    try {
      llm = buildVoiceLlm(requestedModel);
    } catch (err) {
      console.warn(
        `[agent] voice LLM init failed for model "${requestedModel}"; falling back to "${FALLBACK_VOICE_LLM}"`,
        err,
      );
      llm = buildVoiceLlm(FALLBACK_VOICE_LLM);
    }

    const tts = new elevenlabs.TTS({
      voiceId: character.voiceId,
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const session = new voice.AgentSession({ vad, stt, llm, tts });

    const tools = toLiveKitCatalog(buildAllToolDefs(), ctxRef);
    const instructions = composeSystemPrompt({
      character,
      affectionLevel: ctxRef.current.affectionLevel,
      subject,
      channel: 'voice',
    });

    let sessionStarted = false;
    // Data channel — typed-input path (same contract as the web FE)
    ctx.room.on(
      'dataReceived',
      (payload: Uint8Array, _participant, _kind, topic) => {
        if (topic !== 'user_text') return;
        if (!sessionStarted) return; // drop frames arriving before session.start resolves
        try {
          const { text } = JSON.parse(
            new TextDecoder().decode(payload),
          ) as { text: string };
          if (text?.trim()) session.generateReply({ userInput: text });
        } catch {
          // malformed — ignore
        }
      },
    );

    // Agent → Client: broadcast user STT transcripts so FE can render live
    // caption (interim + final). `user_input_transcribed` fires for both
    // partial and final segments from the STT plugin.
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
      void publish('user.transcript', {
        text: ev.transcript,
        isFinal: ev.isFinal,
        ts: Date.now(),
      });
    });

    await session.start({
      agent: new MiyeonshiAgent({ instructions, tools }),
      room: ctx.room,
    });
    sessionStarted = true;

    // Greeting — inject a virtual user turn so the conversation history starts
    // with [user → model] ordering. Gemini's function-calling validator rejects
    // any tool call that doesn't sit immediately after a user or function
    // response turn; without this seed, the first LLM completion can crash
    // with 400 "function call turn comes immediately after a user turn".
    // Also keep the first turn text-only (persona will naturally stay on
    // greetings before tools are relevant).
    session.generateReply({
      userInput: '(교수님 입장)',
      instructions:
        '교수님이 방금 접속하셨다. 자연스럽게 첫 인사만 건네고 끝내라. 짧게 2문장 이내. 어떠한 도구도 호출하지 마라.',
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
  }),
);
