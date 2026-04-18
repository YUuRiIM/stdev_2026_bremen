import { useReducer } from 'react';
import type {
  LectureState,
  LectureVerdictApplied,
  CutscenePlay,
} from '@mys/shared/protocol';
import type {
  AgentMessage,
  ConnectionState,
  RecordingState,
} from './agent-adapter';

export type SessionStatus = 'booting' | 'active' | 'ended';

export interface UserTranscript {
  text: string;
  isFinal: boolean;
}

export type ObjectiveStatus = NonNullable<
  LectureState['objectivesStatus']
>[number];

export interface SessionState {
  status: SessionStatus;
  agentMessage: AgentMessage | null;
  latestTranscript: UserTranscript | null;
  recordingState: RecordingState;
  connectionState: ConnectionState;
  /** 강의 phase (idle/lecturing/judging/verdicted). */
  lecturePhase: LectureState['phase'];
  /** 체크리스트 — `checkObjective` 가 증분 갱신. */
  objectivesStatus: ObjectiveStatus[];
  /** 마지막 verdict_applied (감정 레벨·newlyUnderstood 등). */
  verdict: LectureVerdictApplied | null;
  /** 활성 컷씬 (null 이면 재생 안함). */
  activeCutscene: CutscenePlay | null;
}

export type SessionAction =
  | { type: 'AGENT_MSG'; msg: AgentMessage }
  | { type: 'TRANSCRIPT'; text: string; isFinal: boolean }
  | { type: 'STATE'; state: RecordingState }
  | { type: 'CONN'; state: ConnectionState }
  | { type: 'LECTURE_STATE'; state: LectureState }
  | { type: 'VERDICT_APPLIED'; verdict: LectureVerdictApplied }
  | { type: 'CUTSCENE_PLAY'; cutscene: CutscenePlay }
  | { type: 'CUTSCENE_END' }
  | { type: 'ACTIVATE' }
  | { type: 'END' };

export const initialSessionState: SessionState = {
  status: 'booting',
  agentMessage: null,
  latestTranscript: null,
  recordingState: 'idle',
  connectionState: 'closed',
  lecturePhase: 'idle',
  objectivesStatus: [],
  verdict: null,
  activeCutscene: null,
};

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case 'AGENT_MSG':
      return { ...state, agentMessage: action.msg, recordingState: 'idle' };
    case 'TRANSCRIPT':
      return {
        ...state,
        latestTranscript: { text: action.text, isFinal: action.isFinal },
      };
    case 'STATE':
      return { ...state, recordingState: action.state };
    case 'CONN':
      return { ...state, connectionState: action.state };
    case 'LECTURE_STATE':
      return {
        ...state,
        lecturePhase: action.state.phase,
        // phase-only 업데이트(objectivesStatus 생략)면 기존 체크리스트 보존.
        objectivesStatus:
          action.state.objectivesStatus ?? state.objectivesStatus,
      };
    case 'VERDICT_APPLIED':
      return { ...state, verdict: action.verdict };
    case 'CUTSCENE_PLAY':
      return { ...state, activeCutscene: action.cutscene };
    case 'CUTSCENE_END':
      return { ...state, activeCutscene: null };
    case 'ACTIVATE':
      return { ...state, status: 'active' };
    case 'END':
      return {
        ...state,
        status: 'ended',
        recordingState: 'idle',
      };
    default:
      return state;
  }
}

export function useSessionState() {
  return useReducer(sessionReducer, initialSessionState);
}
