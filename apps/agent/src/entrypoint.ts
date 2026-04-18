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
import { loadCharacter } from '@mys/shared/db';
import { buildAllToolDefs } from '@mys/shared/tools';
import type { ToolContext } from '@mys/shared/types';

import { parseIdentityMetadata } from './identity-metadata';
import { createAgentSupabase } from './supabase-client';
import { MiyeonshiAgent } from './miyeonshi-agent';
import { resolveEnvPath } from './env-path';
import { toLiveKitCatalog } from './tool-adapter';

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

    const character = await loadCharacter(supabase, meta.characterId);
    if (!character) {
      console.error('[agent] character not found', meta.characterId);
      return;
    }

    // Sprint 3 T0: no active lecture yet when session starts; the student
    // agent has no subject context until the user explicitly begins one.
    const subject = null;

    const publish = async (topic: string, payload: unknown): Promise<void> => {
      const data = new TextEncoder().encode(JSON.stringify(payload));
      await ctx.room.localParticipant?.publishData(data, { topic });
    };

    const ctxRef: { current: ToolContext } = {
      current: {
        userId: meta.userId,
        characterId: meta.characterId,
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

    // Greeting — `character.basePersonaPrompt` already defines the tone; a
    // brief opener keeps the first-turn latency visible for demo.
    session.generateReply({
      instructions:
        '교수님이 방금 접속하셨다. 자연스럽게 첫 인사를 건네라. 짧게 2문장 이내.',
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
  }),
);
