import {
  Room,
  RoomEvent,
  ConnectionState as LKConnectionState,
  Track,
  type Participant,
  type RemoteAudioTrack,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from 'livekit-client';
import { decodeDataChannel } from '@mys/shared/protocol';
import type {
  AgentTurnText,
  CutscenePlay,
  InnerMonologue,
  LectureState,
  LectureVerdictApplied,
  UserTranscript,
} from '@mys/shared/protocol';
import type {
  AdapterEvents,
  AgentAdapter,
  ConnectionState,
  RecordingState,
  Unsubscribe,
} from './agent-adapter';

interface TokenResponse {
  token: string;
  url: string;
  roomName: string;
  identity: string;
}

async function fetchToken(subjectTopic: string | undefined): Promise<TokenResponse> {
  // When the user picks a subject on the lobby, forward the human topic
  // string (e.g. "뺄셈") so the agent can seed its prompt with that subject
  // and skip a disambiguation round-trip via startLecture.
  const resp = await fetch('/api/livekit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subjectTopic ? { subjectTopic } : {}),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`token_fetch_failed (${resp.status}): ${body}`);
  }
  return (await resp.json()) as TokenResponse;
}

function mapConnectionState(s: LKConnectionState): ConnectionState {
  switch (s) {
    case LKConnectionState.Connected:
      return 'connected';
    case LKConnectionState.Reconnecting:
      return 'reconnecting';
    case LKConnectionState.Disconnected:
    case LKConnectionState.Connecting:
    default:
      return 'closed';
  }
}

/**
 * LiveKit Agents v1 publishes agent state via the participant attribute
 * `lk.agent.state` — one of 'initializing' | 'listening' | 'thinking' |
 * 'speaking'. Our RecordingState is user-centric, so we translate:
 *   - listening  → 'listening'       (mic hot, agent is hearing the user)
 *   - thinking   → 'awaiting_agent'  (agent running LLM/tools)
 *   - speaking   → 'idle'            (agent is replying; user just listens)
 *   - initializing/unknown → 'idle'
 */
function mapAgentStateAttr(attr: string | undefined): RecordingState {
  switch (attr) {
    case 'listening':
      return 'listening';
    case 'thinking':
      return 'awaiting_agent';
    case 'speaking':
      return 'idle';
    default:
      return 'idle';
  }
}

export function createLiveKitAgentAdapter(): AgentAdapter {
  const handlers: AdapterEvents = {};
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });
  let connectionState: ConnectionState = 'closed';
  let disposed = false;
  let starting = false;
  let started = false;
  const attachedAudioEls: HTMLAudioElement[] = [];

  // Hard unload (tab close / hard nav). Client-side navigation inside the
  // app goes through useEffect cleanup instead, so this is belt-and-suspenders.
  const handleHardUnload = () => {
    try {
      room.disconnect();
    } catch {
      /* best effort */
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleHardUnload);
    window.addEventListener('pagehide', handleHardUnload);
  }

  const emitConn = (s: ConnectionState) => {
    connectionState = s;
    handlers.onConnectionChange?.(s);
  };

  const handleDataReceived = (
    payload: Uint8Array,
    _participant: RemoteParticipant | undefined,
    _kind: unknown,
    topic?: string,
  ) => {
    if (!topic) return;
    let json: unknown;
    try {
      json = JSON.parse(new TextDecoder().decode(payload));
    } catch {
      return;
    }
    const parsed = decodeDataChannel(topic, json);
    if (!parsed.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[livekit-adapter] invalid data-channel payload', parsed);
      }
      return;
    }
    switch (parsed.topic) {
      case 'lecture.state':
        handlers.onLectureState?.(parsed.data as LectureState);
        break;
      case 'lecture.verdict_applied':
        handlers.onVerdictApplied?.(parsed.data as LectureVerdictApplied);
        break;
      case 'cutscene.play':
        handlers.onCutscenePlay?.(parsed.data as CutscenePlay);
        break;
      case 'user.transcript': {
        const t = parsed.data as UserTranscript;
        handlers.onUserTranscript?.(t.text, t.isFinal);
        break;
      }
      case 'agent.inner_monologue':
        handlers.onInnerMonologue?.(parsed.data as InnerMonologue);
        break;
      case 'agent.turn_text': {
        const t = parsed.data as AgentTurnText;
        handlers.onAgentMessage?.({ kind: 'followup', text: t.text });
        break;
      }
      // Other topics (chalkboard, show_formula, user_text, auth.refresh,
      // judge_pending, suggest_type_input, cutscene.end) are not wired to
      // adapter events yet — FE consumers for those land in follow-up PRs.
      default:
        break;
    }
  };

  let agentReadyFired = false;
  const handleTrackSubscribed = (
    track: RemoteTrack,
    _pub: RemoteTrackPublication,
    _participant: RemoteParticipant,
  ) => {
    if (track.kind === Track.Kind.Audio) {
      const audioTrack = track as RemoteAudioTrack;
      const el = audioTrack.attach();
      el.style.display = 'none';
      document.body.appendChild(el);
      attachedAudioEls.push(el);
      if (!agentReadyFired) {
        agentReadyFired = true;
        handlers.onAgentReady?.();
      }
    }
  };

  const detachAllAudio = () => {
    for (const el of attachedAudioEls) el.remove();
    attachedAudioEls.length = 0;
  };

  let lastRecording: RecordingState = 'idle';
  const applyAgentState = (attr: string | undefined) => {
    const next = mapAgentStateAttr(attr);
    if (next === lastRecording) return;
    lastRecording = next;
    handlers.onStateChange?.(next);
  };

  // Note: we deliberately don't subscribe to LiveKit's TTS-aligned transcription.
  // ElevenLabs returns alignment in romanized form for Korean voices (e.g.
  // "pereumayi sojeongrineun…") — unusable for the dialogue bubble. Instead the
  // agent publishes the raw LLM text on the `agent.turn_text` data channel, and
  // we route that to onAgentMessage above.
  const handleParticipantAttrs = (
    changed: Record<string, string>,
    participant: Participant,
  ) => {
    if (participant === room.localParticipant) return;
    if (!('lk.agent.state' in changed)) return;
    applyAgentState(changed['lk.agent.state']);
  };

  room.on(RoomEvent.DataReceived, handleDataReceived);
  room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
  room.on(RoomEvent.ParticipantAttributesChanged, handleParticipantAttrs);
  // Also pick up attributes that were set before we subscribed (agent may
  // have entered the room and emitted its initial state before our listener
  // attached). ParticipantConnected fires with full attribute snapshot.
  room.on(RoomEvent.ParticipantConnected, (p: RemoteParticipant) => {
    applyAgentState(p.attributes?.['lk.agent.state']);
  });
  room.on(RoomEvent.ConnectionStateChanged, (s: LKConnectionState) => {
    emitConn(mapConnectionState(s));
  });
  room.on(RoomEvent.Disconnected, () => emitConn('closed'));

  return {
    get connectionState() {
      return connectionState;
    },
    subscribe(h) {
      Object.assign(handlers, h);
      const unsubscribe: Unsubscribe = () => {
        for (const key of Object.keys(h) as Array<keyof AdapterEvents>) {
          delete handlers[key];
        }
      };
      return unsubscribe;
    },
    async startSession(subjectTopic) {
      // Re-entry guard. Without this, React Strict Mode (dev) or an HMR
      // re-render could kick off a second `room.connect` while the first
      // is still in flight, producing two live agent rooms.
      if (disposed) return;
      if (starting || started) return;
      starting = true;
      try {
        const tokenResp = await fetchToken(subjectTopic);
        if (disposed) return;
        await room.connect(tokenResp.url, tokenResp.token);
        if (disposed) {
          // endSession fired while we were connecting — tear down immediately
          // so we don't leak a connected room.
          try { await room.disconnect(); } catch { /* noop */ }
          return;
        }
        started = true;
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[livekit-adapter] mic enable failed', err);
          }
        }
      } finally {
        starting = false;
      }
    },
    async endSession() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener('beforeunload', handleHardUnload);
      window.removeEventListener('pagehide', handleHardUnload);
      detachAllAudio();
      try {
        await room.disconnect();
      } catch {
        /* best effort */
      }
      emitConn('closed');
    },
  };
}
