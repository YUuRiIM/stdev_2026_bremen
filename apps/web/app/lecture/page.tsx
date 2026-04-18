'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';

import { AgentBubble } from '@/components/lecture/AgentBubble';
import { CharacterStage } from '@/components/lecture/CharacterStage';
import { CutsceneOverlay } from '@/components/lecture/CutsceneOverlay';
import { EndSessionButton } from '@/components/lecture/EndSessionButton';
import { LectureScene } from '@/components/lecture/LectureScene';
import { ObjectiveChecklist } from '@/components/lecture/ObjectiveChecklist';
import { RecordingIndicator } from '@/components/lecture/RecordingIndicator';
import { SubjectHeader } from '@/components/lecture/SubjectHeader';
import { UserTranscript } from '@/components/lecture/UserTranscript';
import { getSubject } from '@/data/lecture-subjects';
import {
  createAgentAdapter,
  type AgentAdapter,
} from '@/services/agent-adapter';
import { useSessionState } from '@/services/session-state';
import { requestMicOnce } from '@/services/voice-permission';

const DEFAULT_SUBJECT_SLUG = 'fermat-little-theorem';

export default function LecturePage() {
  const router = useRouter();
  const subject = useMemo(() => getSubject(DEFAULT_SUBJECT_SLUG), []);
  const [state, dispatch] = useSessionState();
  const adapterRef = useRef<AgentAdapter | null>(null);

  useEffect(() => {
    const adapter = createAgentAdapter();
    adapterRef.current = adapter;
    let cancelled = false;

    const unsubscribe = adapter.subscribe({
      onAgentMessage: (msg) => {
        if (cancelled) return;
        dispatch({ type: 'AGENT_MSG', msg });
      },
      onUserTranscript: (text, isFinal) => {
        if (cancelled) return;
        dispatch({ type: 'TRANSCRIPT', text, isFinal });
      },
      onStateChange: (recState) => {
        if (cancelled) return;
        dispatch({ type: 'STATE', state: recState });
      },
      onConnectionChange: (conn) => {
        if (cancelled) return;
        dispatch({ type: 'CONN', state: conn });
      },
      onLectureState: (lectureState) => {
        if (cancelled) return;
        dispatch({ type: 'LECTURE_STATE', state: lectureState });
      },
      onVerdictApplied: (verdict) => {
        if (cancelled) return;
        dispatch({ type: 'VERDICT_APPLIED', verdict });
      },
      onCutscenePlay: (cutscene) => {
        if (cancelled) return;
        dispatch({ type: 'CUTSCENE_PLAY', cutscene });
      },
      onAgentReady: () => {
        if (cancelled) return;
        dispatch({ type: 'AGENT_READY' });
      },
    });

    dispatch({ type: 'ACTIVATE' });

    requestMicOnce().catch(() => {
      /* permission errors are handled inside requestMicOnce */
    });

    adapter.startSession(subject.slug).catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[lecture] startSession failed:', err);
      }
    });

    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      (window as unknown as {
        __lectureDebug?: Record<string, unknown>;
      }).__lectureDebug = {
        setRecordingState: (s: Parameters<typeof dispatch>[0] extends never
          ? never
          : 'idle' | 'listening' | 'sending' | 'awaiting_agent') =>
          dispatch({ type: 'STATE', state: s }),
        emitAgentMessage: (text: string) =>
          dispatch({
            type: 'AGENT_MSG',
            msg: { kind: 'question', text },
          }),
        emitTranscript: (text: string, isFinal = true) =>
          dispatch({ type: 'TRANSCRIPT', text, isFinal }),
        getState: () => state,
      };
    }

    return () => {
      cancelled = true;
      unsubscribe();
      adapter.endSession().catch(() => {
        /* best effort */
      });
      dispatch({ type: 'END' });
      adapterRef.current = null;
      if (
        process.env.NODE_ENV !== 'production' &&
        typeof window !== 'undefined'
      ) {
        delete (window as unknown as { __lectureDebug?: unknown })
          .__lectureDebug;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.slug]);

  const handleEnd = () => {
    adapterRef.current?.endSession().catch(() => {
      /* best effort */
    });
    dispatch({ type: 'END' });
    router.push('/');
  };

  return (
    <LectureScene>
      <header className="flex items-start justify-between px-6 pt-6 md:px-10 md:pt-8">
        <SubjectHeader topic={subject.topic} chapter="강의 · 역튜터링" />
        <RecordingIndicator state={state.recordingState} />
      </header>

      <div className="relative flex flex-1 items-end">
        <CharacterStage />
        <div className="pointer-events-auto absolute left-6 top-6 md:left-10">
          <ObjectiveChecklist objectives={state.objectivesStatus} />
        </div>
        <div className="pointer-events-none absolute right-6 top-6 hidden md:block">
          <AgentBubble message={state.agentMessage} />
        </div>
      </div>

      <footer className="flex flex-col gap-4 px-6 pb-8 md:flex-row md:items-end md:justify-between md:px-10 md:pb-10">
        <div className="md:max-w-2xl">
          <AgentBubble
            message={state.agentMessage}
            className="md:hidden"
          />
          <UserTranscript transcript={state.latestTranscript} />
        </div>
        <EndSessionButton onEnd={handleEnd} />
      </footer>

      <CutsceneOverlay
        cutscene={state.activeCutscene}
        onEnd={() => dispatch({ type: 'CUTSCENE_END' })}
      />

      {state.status === 'active' && !state.agentReady && (
        <div
          data-testid="lecture-connecting-overlay"
          className="pointer-events-none absolute inset-0 z-[1800] flex items-center justify-center bg-slate-950/65 backdrop-blur-sm"
        >
          <div className="pointer-events-auto flex flex-col items-center gap-4 rounded-2xl border border-white/15 bg-slate-900/80 px-8 py-7 shadow-2xl">
            <div
              aria-hidden
              className="h-9 w-9 animate-spin rounded-full border-[3px] border-white/20 border-t-amber-300"
            />
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-amber-300">
              Connecting
            </p>
            <p className="text-center text-base text-white">
              페르마가 연구실로 들어오는 중이에요…
            </p>
          </div>
        </div>
      )}
    </LectureScene>
  );
}
