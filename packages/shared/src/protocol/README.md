# @mys/shared/protocol — LiveKit Data Channel Contract

**오너**: 백엔드 (agent) — **소비자**: FE 팀

이 디렉토리의 zod 스키마는 **LiveKit data channel을 타고 흐르는 모든 JSON 메시지의 유일한 진실의 원천**이다. FE/Agent 양쪽에서 import하여 런타임 검증 + TypeScript 타입 공유.

---

## 11개 메시지 — 한눈에

### Client → Agent

| Topic | Schema | 용도 |
|---|---|---|
| `auth.refresh` | `AuthRefreshSchema` | JWT 만료 임박 시 새 토큰 주입 |
| `chalkboard.update` | `ChalkboardUpdateSchema` | 교수가 칠판에 쓴/수정한 내용 |
| `chalkboard.clear` | `ChalkboardClearSchema` | 칠판 지움 |
| `user_text` | `UserTextSchema` | 타이핑 입력 (이메일·OTP·어려운 용어) |
| `cutscene.end` | `CutsceneEndSchema` | 영상 재생 끝남 (자연/skip/error) |

### Agent → Client

| Topic | Schema | 용도 |
|---|---|---|
| `cutscene.play` | `CutscenePlaySchema` | 영상/이미지 재생 요청 (muteTTS 포함) |
| `formula.show` | `ShowFormulaSchema` | LaTeX 화면에 + TTS는 `speakAs`만 |
| `lecture.state` | `LectureStateSchema` | 강의 phase + objectives coverage |
| `lecture.judge_pending` | `LectureJudgePendingSchema` | 채점 중/재시도 advisory |
| `lecture.verdict_applied` | `LectureVerdictAppliedSchema` | 호감도·understood·episode unlock 결과 |
| `agent.suggest_type_input` | `SuggestTypeInputSchema` | "타이핑해주세요" UI hint |

---

## FE 사용 예 (송신)

```ts
import {
  ChalkboardUpdateSchema,
  CHALKBOARD_UPDATE_TOPIC,
  type ChalkboardUpdate,
} from '@mys/shared/protocol';

const payload: ChalkboardUpdate = {
  revision: 12,
  markdown: '## 편미분\n$\\partial f / \\partial x$',
  ts: Date.now(),
};
ChalkboardUpdateSchema.parse(payload); // dev에서만 throw

room.localParticipant.publishData(
  new TextEncoder().encode(JSON.stringify(payload)),
  { topic: CHALKBOARD_UPDATE_TOPIC, reliable: true }
);
```

## FE 사용 예 (수신)

```ts
import { decodeDataChannel } from '@mys/shared/protocol';

room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
  if (!topic) return;
  const text = new TextDecoder().decode(payload);
  let json: unknown;
  try { json = JSON.parse(text); } catch { return; }

  const parsed = decodeDataChannel(topic, json);
  if (!parsed.ok) {
    console.warn('invalid data-channel payload', parsed);
    return;
  }

  switch (parsed.topic) {
    case 'cutscene.play': {
      const data = parsed.data as CutscenePlay;
      playCutscene(data);
      break;
    }
    // ...
  }
});
```

---

## 보안 계약 — 이 스키마 너머로 흘려선 안 되는 것

- `objective.rubric` (채점 기준 전문)
- `judge.feedback` (채점 자연어 피드백)
- `verdict.hit_points` / `verdict.missing`
- Supabase JWT raw 값 (client → agent 한정)
- `service_role` 키 (어디에서도)

**`LectureVerdictApplied.newlyUnderstood`는 `concept_key` 문자열만** 노출한다. statement·rubric·점수 자연어 전부 제외. 이게 double-blind judge 격리의 out-path.

---

## 버전 관리

필드 추가는 기존 소비자에 안전 (zod가 unknown 필드 무시). **필드 제거·리네임은 FE와 동시 배포**. 각 스키마에 향후 `version: number` 필드 추가 가능.

---

## 참조

- 메인 설계: `.omc/plans/miyeonshi-demo-mvp-2026-04-18.md` §2.B.ch, §8
- 보안 계약: 같은 파일 §6 + §2.B.4 (judge 격리)
