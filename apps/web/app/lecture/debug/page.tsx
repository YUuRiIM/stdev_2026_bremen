'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { AgentBubble } from '@/components/lecture/AgentBubble';
import { CharacterStage } from '@/components/lecture/CharacterStage';
import { EndSessionButton } from '@/components/lecture/EndSessionButton';
import { RecordingIndicator } from '@/components/lecture/RecordingIndicator';
import { SubjectHeader } from '@/components/lecture/SubjectHeader';
import { UserTranscript } from '@/components/lecture/UserTranscript';
import { LECTURE_SUBJECTS } from '@/data/lecture-subjects';
import type { AgentMessage, RecordingState } from '@/services/agent-adapter';

const REC_STATES: RecordingState[] = [
  'idle',
  'listening',
  'sending',
  'awaiting_agent',
];

const SAMPLE_AGENT_LONG: AgentMessage = {
  kind: 'followup',
  text: '조건 하나를 빠뜨렸군. 서로소라는 조건 없이도 정리가 성립한다고 본 건가? 정의부터 다시 짚어 보지.',
};

const SAMPLE_AGENT_SHORT: AgentMessage = {
  kind: 'question',
  text: '서로소 조건은 어디에 쓰였나?',
};

export default function LectureDebugPage() {
  const subject = useMemo(() => LECTURE_SUBJECTS[0]!, []);

  return (
    <main className="lecture-scope min-h-screen w-full bg-slate-950 px-6 py-10 text-white md:px-10">
      <header className="mb-10 flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Lecture Debug Grid
        </h1>
        <p className="text-sm text-slate-300">
          7개 lecture 컴포넌트의 상태별 스냅샷. 공유 링크는 이곳을 통해
          확인하세요.
        </p>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/"
            className="rounded-full border border-white/40 px-4 py-1.5 hover:bg-white/10"
          >
            홈으로 (/)
          </Link>
          <Link
            href="/lecture"
            className="rounded-full border border-amber-300/70 bg-amber-400/20 px-4 py-1.5 text-amber-200 hover:bg-amber-400/30"
          >
            lecture 세션 시작 (/lecture)
          </Link>
          <Link
            href="/lecture/debug"
            className="rounded-full border border-white/40 px-4 py-1.5 hover:bg-white/10"
          >
            디버그 그리드 새로고침
          </Link>
        </nav>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DebugCell title="SubjectHeader">
          <SubjectHeader topic={subject.topic} chapter="강의 · 역튜터링" />
        </DebugCell>

        <DebugCell title="RecordingIndicator (4 states)">
          <div className="flex flex-wrap gap-3">
            {REC_STATES.map((s) => (
              <RecordingIndicator key={s} state={s} />
            ))}
          </div>
        </DebugCell>

        <DebugCell title="AgentBubble (empty / short / long)">
          <div className="flex flex-col gap-4">
            <AgentBubble message={null} />
            <span className="text-xs text-slate-400">
              (empty: null 메시지는 DOM 미렌더)
            </span>
            <AgentBubble message={SAMPLE_AGENT_SHORT} />
            <AgentBubble message={SAMPLE_AGENT_LONG} />
          </div>
        </DebugCell>

        <DebugCell title="UserTranscript (partial / final)">
          <div className="flex flex-col gap-3">
            <UserTranscript
              transcript={{
                text: '페르마 소정리는...',
                isFinal: false,
              }}
            />
            <UserTranscript
              transcript={{
                text: '페르마 소정리는 소수 p에 대해 a^(p-1) ≡ 1 mod p가 성립한다는 정리입니다.',
                isFinal: true,
              }}
            />
          </div>
        </DebugCell>

        <DebugCell title="EndSessionButton">
          <EndSessionButton onEnd={() => alert('끝내기 클릭 — debug')} />
        </DebugCell>

        <DebugCell title="CharacterStage (live manifest)">
          <div className="relative h-[420px] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-slate-800 to-slate-900">
            <CharacterStage />
          </div>
        </DebugCell>

        <DebugCell title="LectureScene (bg + overlay via /lecture)" className="md:col-span-2">
          <p className="text-sm text-slate-300">
            LectureScene 자체는 루트 래퍼라 별도 그리드 셀 데모가 모호합니다.
            실제 배치는{' '}
            <Link
              href="/lecture"
              className="underline decoration-amber-300 underline-offset-4"
            >
              /lecture
            </Link>{' '}
            라우트에서 확인하세요.
          </p>
        </DebugCell>
      </div>
    </main>
  );
}

function DebugCell({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-lg ${className ?? ''}`}
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
