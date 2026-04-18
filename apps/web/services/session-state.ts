import { useReducer } from 'react';
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

export interface SessionState {
  status: SessionStatus;
  agentMessage: AgentMessage | null;
  latestTranscript: UserTranscript | null;
  recordingState: RecordingState;
  connectionState: ConnectionState;
}

export type SessionAction =
  | { type: 'AGENT_MSG'; msg: AgentMessage }
  | { type: 'TRANSCRIPT'; text: string; isFinal: boolean }
  | { type: 'STATE'; state: RecordingState }
  | { type: 'CONN'; state: ConnectionState }
  | { type: 'ACTIVATE' }
  | { type: 'END' };

export const initialSessionState: SessionState = {
  status: 'booting',
  agentMessage: null,
  latestTranscript: null,
  recordingState: 'idle',
  connectionState: 'closed',
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
