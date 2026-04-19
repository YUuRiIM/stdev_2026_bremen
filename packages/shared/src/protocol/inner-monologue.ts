import { z } from 'zod';

/**
 * Agent → Client. Character 의 속마음(내면 독백). TTS 로는 발화되지 않고,
 * 오직 자막/UI 렌더링 용. Agent 측에서 `(속마음: ...)` 패턴을 LLM 출력에서
 * 추출·제거한 뒤 payload.text 로 publish.
 *
 * Topic: "agent.inner_monologue"
 *
 * NOTE: 이 토픽은 speech 와 **중복되지 않는다** — 동일 문장이 TTS 로도 나오면
 *       안 된다. Agent 의 ttsNode 에서 반드시 strip 하라.
 */
export const InnerMonologueSchema = z.object({
  text: z.string().min(1),
  ts: z.number().int().positive(),
});
export type InnerMonologue = z.infer<typeof InnerMonologueSchema>;

export const INNER_MONOLOGUE_TOPIC = 'agent.inner_monologue' as const;
