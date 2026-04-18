import type {
  LectureState,
  LectureVerdictApplied,
  CutscenePlay,
} from '@mys/shared/protocol';

export type ConnectionState = 'connected' | 'reconnecting' | 'closed';
export type RecordingState = 'idle' | 'listening' | 'sending' | 'awaiting_agent';

export interface AgentMessage {
  kind: 'question' | 'followup' | 'close';
  text: string;
}

export interface AdapterEvents {
  onAgentMessage?: (msg: AgentMessage) => void;
  onUserTranscript?: (text: string, isFinal: boolean) => void;
  onStateChange?: (state: RecordingState) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  /** `lecture.state` data channel — objective 체크리스트 라이브 업데이트. */
  onLectureState?: (state: LectureState) => void;
  /** `lecture.verdict_applied` — 세션 종료 최종 판정. */
  onVerdictApplied?: (verdict: LectureVerdictApplied) => void;
  /** `cutscene.play` — 풀스크린 컷씬 (TTS는 agent 측이 mute). */
  onCutscenePlay?: (cutscene: CutscenePlay) => void;
}

export type Unsubscribe = () => void;

export interface AgentAdapter {
  subscribe(handlers: AdapterEvents): Unsubscribe;
  startSession(subjectSlug: string): Promise<void>;
  endSession(): Promise<void>;
  readonly connectionState: ConnectionState;
}

export type MockProfile = 'steady' | 'burst' | 'silence';

export function createAgentAdapter(overrideProfile?: MockProfile): AgentAdapter {
  const envProfile = (process.env.NEXT_PUBLIC_AGENT_ADAPTER ?? 'mock') as
    | 'mock'
    | 'real';

  if (envProfile === 'real') {
    throw new Error(
      '[agent-adapter] real adapter not implemented in v1. Set NEXT_PUBLIC_AGENT_ADAPTER=mock.',
    );
  }

  const { createMockAgentAdapter } =
    require('./agent-adapter.mock') as typeof import('./agent-adapter.mock');
  return createMockAgentAdapter(overrideProfile);
}
