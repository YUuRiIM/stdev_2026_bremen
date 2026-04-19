'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AgentBubble } from '@/components/lecture/AgentBubble';
import { CharacterStage } from '@/components/lecture/CharacterStage';
import { CutsceneOverlay } from '@/components/lecture/CutsceneOverlay';
import { EndLecturePopup } from '@/components/lecture/EndLecturePopup';
import { EndSessionButton } from '@/components/lecture/EndSessionButton';
import { InnerMonologueCaption } from '@/components/lecture/InnerMonologueCaption';
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

const DEFAULT_SUBJECT_SLUG = 'basic-arithmetic';

export default function LecturePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectSlug = searchParams?.get('subject') ?? DEFAULT_SUBJECT_SLUG;
  const subject = useMemo(() => getSubject(subjectSlug), [subjectSlug]);
  const [state, dispatch] = useSessionState();
  const adapterRef = useRef<AgentAdapter | null>(null);
  const [isEndPopupOpen, setEndPopupOpen] = useState(false);

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
        setEndPopupOpen(true);
        // Record chapter unlock. Demo covers only Chapter 1; extend once
        // more subjects gain chapter metadata.
        void fetch('/api/lecture/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapterNumber: 1 }),
        }).catch(() => {
          /* non-fatal */
        });
      },
      onCutscenePlay: (cutscene) => {
        if (cancelled) return;
        dispatch({ type: 'CUTSCENE_PLAY', cutscene });
      },
      onInnerMonologue: (monologue) => {
        if (cancelled) return;
        dispatch({ type: 'INNER_MONOLOGUE', monologue });
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

    adapter.startSession(subject.topic).catch((err) => {
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
        emitInnerMonologue: (text: string) =>
          dispatch({
            type: 'INNER_MONOLOGUE',
            monologue: { text, ts: Date.now() },
          }),
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
    router.push('/lobby');
  };

  const openEndPopup = () => setEndPopupOpen(true);
  const closeEndPopup = () => setEndPopupOpen(false);
  const confirmLeave = () => {
    setEndPopupOpen(false);
    // Only play the celebratory cutscene when the lecture was completed
    // successfully (verdict applied). Early exits skip straight to lobby.
    if (!state.verdict) {
      handleEnd();
      return;
    }
    const pool = [
      '/assets/cutscenes/lecture-end.mp4',
      '/assets/cutscenes/lecture-end-2.mp4',
    ];
    const assetUrl = pool[Math.floor(Math.random() * pool.length)]!;
    dispatch({
      type: 'CUTSCENE_PLAY',
      cutscene: {
        eventKey: 'lecture-end',
        assetUrl,
        mimeType: 'video/mp4',
        muteTTS: true,
        ts: Date.now(),
      },
    });
  };

  return (
    <LectureScene>
      {/* Top bar — subject on left, live controls on right (always visible). */}
      <header className="flex items-start justify-between gap-4 px-6 pt-6 md:px-10 md:pt-8">
        <SubjectHeader topic={subject.topic} chapter="강의 · 역튜터링" />
        <div className="flex items-center gap-3">
          <RecordingIndicator state={state.recordingState} />
          <EndSessionButton onEnd={openEndPopup} />
        </div>
      </header>

      {/* Stage — character sprite fills the middle; checklist overlays top-left.
          Dialogue stack sits on top of the stage (absolute, bottom-anchored)
          so the character sprite keeps its full vertical presence instead of
          being pushed up by flow-layout dialogue boxes. */}
      <div className="relative flex min-h-0 flex-1 items-end">
        <CharacterStage />
        <div className="pointer-events-auto absolute left-6 top-6 z-[1550] md:left-10">
          <ObjectiveChecklist objectives={state.objectivesStatus} />
        </div>

        {/* Dialogue overlay — user echo above, agent main below. Absolute so
            it overlays the character at the bottom without shifting the sprite. */}
        <section className="pointer-events-none absolute inset-x-0 bottom-0 z-[1580] flex flex-col items-stretch gap-2 px-4 pb-5 md:px-6 md:pb-7">
          {/* Nested wrappers re-enable pointer events just on the boxes; the
              outer section stays transparent-to-click so the character area
              above the dialogue remains interactive (hover ripples etc). */}
          <div className="pointer-events-auto">
            <UserTranscript transcript={state.latestTranscript} />
          </div>
          <div className="pointer-events-auto">
            <AgentBubble message={state.agentMessage} />
          </div>
        </section>

        {/* Inner-monologue caption — ephemeral, floats just above the dialogue
            stack. Absolute relative to the stage so it tracks with character. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[13rem] z-[1600]">
          <InnerMonologueCaption
            monologue={state.latestInnerMonologue}
            onDismiss={(id) => dispatch({ type: 'INNER_MONOLOGUE_CLEAR', id })}
          />
        </div>
      </div>

      <CutsceneOverlay
        cutscene={state.activeCutscene}
        onEnd={() => {
          const wasLectureEnd =
            state.activeCutscene?.eventKey === 'lecture-end';
          dispatch({ type: 'CUTSCENE_END' });
          if (wasLectureEnd) {
            handleEnd();
          }
        }}
      />

      <EndLecturePopup
        open={isEndPopupOpen}
        objectives={state.objectivesStatus}
        onClose={closeEndPopup}
        onConfirmLeave={confirmLeave}
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
