import { z } from 'zod';

/**
 * Agent → Client. 캐릭터의 **한 턴 발화 텍스트** (LLM 이 방금 생성한 raw 한글
 * 원문에서 `(속마음: ...)` 같은 메타 블록을 제거한 것). 시각소설 스타일 대사
 * 박스에 그대로 들어간다.
 *
 * Topic: "agent.turn_text"
 *
 * 왜 별도 토픽인가: LiveKit 의 TTS-aligned transcription 은 ElevenLabs 가 한국어
 * voice 에서도 alignment 를 내부적으로 romanize 해서 돌려주기 때문에 음차 (예:
 * "pereumayi sojeongrineun…") 로 도착한다. LLM 원문을 그대로 실어 나르려면
 * 이 경로가 필요하다.
 */
export const AgentTurnTextSchema = z.object({
  text: z.string().min(1),
  ts: z.number().int().positive(),
});
export type AgentTurnText = z.infer<typeof AgentTurnTextSchema>;

export const AGENT_TURN_TEXT_TOPIC = 'agent.turn_text' as const;
