import type {
  LectureState,
  LectureVerdictApplied,
  CutscenePlay,
} from '@mys/shared/protocol';
import type {
  AdapterEvents,
  AgentAdapter,
  AgentMessage,
  ConnectionState,
  MockProfile,
  Unsubscribe,
} from './agent-adapter';

const STEADY_USER_PARTIAL = '페르마 소정리는...';
const STEADY_USER_FINAL =
  '...소수 p에 대해 a^(p-1)≡1 mod p가 성립합니다.';
const STEADY_AGENT_MSG: AgentMessage = {
  kind: 'followup',
  text: '조건 하나를 빠뜨렸군. 서로소라는 조건은 짚지 않았나?',
};

const BURST_MESSAGES: AgentMessage[] = [
  { kind: 'question', text: '자네, 정의를 한 번 더 말해주지.' },
  { kind: 'followup', text: '소수라는 전제는 빠뜨리면 안 되네.' },
  { kind: 'followup', text: '서로소 조건은?' },
  { kind: 'followup', text: '지수 p-1이 맞나, p-2가 맞나?' },
  { kind: 'followup', text: '잠깐, 정리하면서 말해보게.' },
];

const SILENCE_MESSAGE: AgentMessage = {
  kind: 'question',
  text: '…그래서, 조건은?',
};

// 데모 seed와 정렬된 objective statements (conceptKey 기반).
// 실제 subject id 는 미정이라 UUID 자리엔 null 을 넣음.
const MOCK_OBJECTIVES: NonNullable<LectureState['objectivesStatus']> = [
  {
    id: 'obj_flt_statement',
    statement:
      '페르마 소정리의 정리 선언문을 정확히 설명한다 (p가 소수이고 gcd(a,p)=1일 때 a^(p-1) ≡ 1 mod p).',
    coverage: 0,
  },
  {
    id: 'obj_flt_example',
    statement:
      '구체 수치 예시로 정리를 검증한다 (예: 2^4 mod 5 = 1).',
    coverage: 0,
  },
  {
    id: 'obj_flt_applications',
    statement:
      '페르마 소정리의 실제 활용처를 하나 이상 제시한다 (소수 판정, RSA 등).',
    coverage: 0,
  },
];

const MOCK_CUTSCENE: CutscenePlay = {
  eventKey: 'approved_smile',
  assetUrl: '/assets/cv-fermat.png',
  muteTTS: true,
  ts: 0,
};

function resolveProfile(override?: MockProfile): MockProfile {
  if (override) return override;
  if (typeof window !== 'undefined') {
    const urlProfile = new URLSearchParams(window.location.search).get(
      'profile',
    );
    if (
      urlProfile === 'steady' ||
      urlProfile === 'burst' ||
      urlProfile === 'silence'
    ) {
      return urlProfile;
    }
  }
  const envProfile = process.env.NEXT_PUBLIC_AGENT_MOCK_PROFILE;
  if (envProfile === 'burst' || envProfile === 'silence') return envProfile;
  return 'steady';
}

export function createMockAgentAdapter(
  overrideProfile?: MockProfile,
): AgentAdapter {
  const handlers: AdapterEvents = {};
  const timers: Array<ReturnType<typeof setTimeout>> = [];
  let connectionState: ConnectionState = 'closed';
  let disposed = false;

  // 가변 체크리스트 상태 (cycle 마다 증분 bump).
  const objectives: NonNullable<LectureState['objectivesStatus']> =
    MOCK_OBJECTIVES.map((o) => ({ ...o }));

  const schedule = (ms: number, fn: () => void) => {
    if (disposed) return;
    const id = setTimeout(() => {
      if (disposed) return;
      fn();
    }, ms);
    timers.push(id);
  };

  const clearAllTimers = () => {
    for (const id of timers) clearTimeout(id);
    timers.length = 0;
  };

  const emitAgent = (msg: AgentMessage) => handlers.onAgentMessage?.(msg);
  const emitTranscript = (text: string, isFinal: boolean) =>
    handlers.onUserTranscript?.(text, isFinal);
  const emitState = (s: Parameters<
    NonNullable<AdapterEvents['onStateChange']>
  >[0]) => handlers.onStateChange?.(s);
  const emitConn = (s: ConnectionState) => {
    connectionState = s;
    handlers.onConnectionChange?.(s);
  };
  const emitLectureState = (
    phase: LectureState['phase'],
    includeObjectives = true,
  ) => {
    const payload: LectureState = {
      phase,
      subjectId: null,
      objectivesStatus: includeObjectives
        ? objectives.map((o) => ({ ...o }))
        : undefined,
      ts: Date.now(),
    };
    handlers.onLectureState?.(payload);
  };
  const emitVerdict = (payload: LectureVerdictApplied) =>
    handlers.onVerdictApplied?.(payload);
  const emitCutscene = (payload: CutscenePlay) =>
    handlers.onCutscenePlay?.(payload);

  const bumpObjective = (idx: number, coverage: number) => {
    if (idx < 0 || idx >= objectives.length) return;
    const target = objectives[idx]!;
    if (coverage > target.coverage) target.coverage = coverage;
  };

  const runSteadyCycle = (cycleOffsetMs: number, objectiveIdx: number) => {
    schedule(cycleOffsetMs + 0, () => {
      emitState('listening');
      emitTranscript(STEADY_USER_PARTIAL, false);
    });
    schedule(cycleOffsetMs + 2500, () => {
      emitTranscript(STEADY_USER_FINAL, true);
      emitState('sending');
    });
    schedule(cycleOffsetMs + 3000, () => emitState('awaiting_agent'));
    schedule(cycleOffsetMs + 4500, () => {
      emitAgent(STEADY_AGENT_MSG);
      emitState('idle');
      // objective 하나씩 달성 — checkObjective 시뮬레이션.
      bumpObjective(objectiveIdx, 0.75);
      emitLectureState('lecturing');
    });
  };

  const runBurst = () => {
    for (let i = 0; i < BURST_MESSAGES.length; i += 1) {
      schedule(i * 300, () => emitAgent(BURST_MESSAGES[i]!));
    }
    schedule(1500, () => emitState('idle'));
    schedule(11500, () => runSteadyCycle(0, 0));
  };

  const runSilence = () => {
    emitState('listening');
    schedule(30_000, () => {
      emitAgent(SILENCE_MESSAGE);
      emitState('idle');
    });
  };

  const runSteadyLoop = () => {
    let objectiveIdx = 0;
    const loop = () => {
      if (disposed) return;
      runSteadyCycle(0, objectiveIdx);
      objectiveIdx += 1;
      if (objectiveIdx >= objectives.length) {
        // 모두 달성 → verdict_applied + cutscene + phase=verdicted.
        schedule(5500, () => {
          emitVerdict({
            affectionDelta: 4,
            affectionLevel: 'acquaintance',
            episodeUnlocked: 'approved_smile',
            newlyUnderstood: objectives.map((o) => o.id),
            ts: Date.now(),
          });
          emitCutscene({ ...MOCK_CUTSCENE, ts: Date.now() });
          emitLectureState('verdicted');
        });
        return;
      }
      schedule(5000, loop);
    };
    loop();
  };

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
    async startSession(_subjectSlug) {
      if (disposed) return;
      emitConn('connected');
      // 초기 체크리스트 broadcast.
      emitLectureState('lecturing');
      const profile = resolveProfile(overrideProfile);
      if (profile === 'burst') runBurst();
      else if (profile === 'silence') runSilence();
      else runSteadyLoop();
    },
    async endSession() {
      disposed = true;
      clearAllTimers();
      emitConn('closed');
    },
  };
}
