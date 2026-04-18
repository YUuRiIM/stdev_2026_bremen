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

  const runSteadyCycle = (cycleOffsetMs: number) => {
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
    });
  };

  const runBurst = () => {
    for (let i = 0; i < BURST_MESSAGES.length; i += 1) {
      schedule(i * 300, () => emitAgent(BURST_MESSAGES[i]!));
    }
    schedule(1500, () => emitState('idle'));
    schedule(11500, () => runSteadyCycle(0));
  };

  const runSilence = () => {
    emitState('listening');
    schedule(30_000, () => {
      emitAgent(SILENCE_MESSAGE);
      emitState('idle');
    });
  };

  const runSteadyLoop = () => {
    let cycle = 0;
    const loop = () => {
      if (disposed) return;
      runSteadyCycle(0);
      schedule(5000, loop);
      cycle += 1;
      if (cycle > 100) return;
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
