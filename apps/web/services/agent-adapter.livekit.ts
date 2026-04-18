import {
  Room,
  RoomEvent,
  ConnectionState as LKConnectionState,
  Track,
  type RemoteAudioTrack,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from 'livekit-client';
import { decodeDataChannel } from '@mys/shared/protocol';
import type {
  CutscenePlay,
  LectureState,
  LectureVerdictApplied,
  UserTranscript,
} from '@mys/shared/protocol';
import type {
  AdapterEvents,
  AgentAdapter,
  ConnectionState,
  Unsubscribe,
} from './agent-adapter';

interface TokenResponse {
  token: string;
  url: string;
  roomName: string;
  identity: string;
}

async function fetchToken(characterSlug: string): Promise<TokenResponse> {
  const resp = await fetch('/api/livekit/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId: characterSlug }),
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

export function createLiveKitAgentAdapter(): AgentAdapter {
  const handlers: AdapterEvents = {};
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });
  let connectionState: ConnectionState = 'closed';
  let disposed = false;
  const attachedAudioEls: HTMLAudioElement[] = [];

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
      // Other topics (chalkboard, show_formula, user_text, auth.refresh,
      // judge_pending, suggest_type_input, cutscene.end) are not wired to
      // adapter events yet — FE consumers for those land in follow-up PRs.
      default:
        break;
    }
  };

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
    }
  };

  const detachAllAudio = () => {
    for (const el of attachedAudioEls) el.remove();
    attachedAudioEls.length = 0;
  };

  room.on(RoomEvent.DataReceived, handleDataReceived);
  room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
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
    async startSession(subjectSlug) {
      if (disposed) return;
      const tokenResp = await fetchToken(subjectSlug);
      await room.connect(tokenResp.url, tokenResp.token);

      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[livekit-adapter] mic enable failed', err);
        }
      }
    },
    async endSession() {
      disposed = true;
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
