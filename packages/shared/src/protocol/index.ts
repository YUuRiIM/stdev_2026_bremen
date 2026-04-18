/**
 * Data channel protocol between the web/Meet client and the LiveKit agent.
 *
 * All messages are JSON objects carried over LiveKit's data channel
 * (`room.publishData` + `topic`). Each topic has a dedicated zod schema for
 * runtime validation on both ends.
 *
 * Message directions:
 *   - Client → Agent: AuthRefresh, ChalkboardUpdate, ChalkboardClear,
 *     UserText, CutsceneEnd
 *   - Agent → Client: CutscenePlay, LectureState,
 *     LectureJudgePending, LectureVerdictApplied, ShowFormula,
 *     SuggestTypeInput
 *
 * Usage (agent side):
 *   const parsed = ChalkboardUpdateSchema.safeParse(JSON.parse(raw));
 *   if (parsed.success) handleChalkboardUpdate(parsed.data);
 *
 * Usage (client side):
 *   const payload: CutscenePlay = { ... };
 *   CutscenePlaySchema.parse(payload); // validate before send in dev
 *   room.localParticipant.publishData(
 *     new TextEncoder().encode(JSON.stringify(payload)),
 *     { topic: CUTSCENE_PLAY_TOPIC, reliable: true },
 *   );
 *
 * NOTE: Never send `objective.rubric`, judge reasoning, or verdict details
 * through these channels. Only the sanitized fields defined in the schemas.
 */

export * from './auth';
export * from './chalkboard';
export * from './cutscene';
export * from './formula';
export * from './lecture';
export * from './user-transcript';

import { z } from 'zod';
import {
  AuthRefreshSchema,
  AUTH_REFRESH_TOPIC,
} from './auth';
import {
  ChalkboardClearSchema,
  ChalkboardUpdateSchema,
  CHALKBOARD_CLEAR_TOPIC,
  CHALKBOARD_UPDATE_TOPIC,
  SuggestTypeInputSchema,
  SUGGEST_TYPE_INPUT_TOPIC,
  UserTextSchema,
  USER_TEXT_TOPIC,
} from './chalkboard';
import {
  CutsceneEndSchema,
  CutscenePlaySchema,
  CUTSCENE_END_TOPIC,
  CUTSCENE_PLAY_TOPIC,
} from './cutscene';
import { ShowFormulaSchema, SHOW_FORMULA_TOPIC } from './formula';
import {
  LectureJudgePendingSchema,
  LectureStateSchema,
  LectureVerdictAppliedSchema,
  LECTURE_JUDGE_PENDING_TOPIC,
  LECTURE_STATE_TOPIC,
  LECTURE_VERDICT_APPLIED_TOPIC,
} from './lecture';
import { UserTranscriptSchema, USER_TRANSCRIPT_TOPIC } from './user-transcript';

/** All valid data-channel topics. Use for exhaustive switch checks. */
export const DATA_CHANNEL_TOPICS = {
  AuthRefresh: AUTH_REFRESH_TOPIC,
  ChalkboardUpdate: CHALKBOARD_UPDATE_TOPIC,
  ChalkboardClear: CHALKBOARD_CLEAR_TOPIC,
  UserText: USER_TEXT_TOPIC,
  SuggestTypeInput: SUGGEST_TYPE_INPUT_TOPIC,
  CutscenePlay: CUTSCENE_PLAY_TOPIC,
  CutsceneEnd: CUTSCENE_END_TOPIC,
  ShowFormula: SHOW_FORMULA_TOPIC,
  LectureState: LECTURE_STATE_TOPIC,
  LectureJudgePending: LECTURE_JUDGE_PENDING_TOPIC,
  LectureVerdictApplied: LECTURE_VERDICT_APPLIED_TOPIC,
  UserTranscript: USER_TRANSCRIPT_TOPIC,
} as const;

/** Schema registry keyed by topic string. */
export const SCHEMAS_BY_TOPIC = {
  [AUTH_REFRESH_TOPIC]: AuthRefreshSchema,
  [CHALKBOARD_UPDATE_TOPIC]: ChalkboardUpdateSchema,
  [CHALKBOARD_CLEAR_TOPIC]: ChalkboardClearSchema,
  [USER_TEXT_TOPIC]: UserTextSchema,
  [SUGGEST_TYPE_INPUT_TOPIC]: SuggestTypeInputSchema,
  [CUTSCENE_PLAY_TOPIC]: CutscenePlaySchema,
  [CUTSCENE_END_TOPIC]: CutsceneEndSchema,
  [SHOW_FORMULA_TOPIC]: ShowFormulaSchema,
  [USER_TRANSCRIPT_TOPIC]: UserTranscriptSchema,
  [LECTURE_STATE_TOPIC]: LectureStateSchema,
  [LECTURE_JUDGE_PENDING_TOPIC]: LectureJudgePendingSchema,
  [LECTURE_VERDICT_APPLIED_TOPIC]: LectureVerdictAppliedSchema,
} as const;

export type DataChannelTopic = keyof typeof SCHEMAS_BY_TOPIC;

/**
 * Decode and validate an incoming data-channel payload.
 *
 *   const parsed = decodeDataChannel(topic, payload);
 *   if (!parsed.ok) console.warn('bad payload', parsed.error);
 *
 * Never throws.
 */
export function decodeDataChannel(
  topic: string,
  payload: unknown
):
  | { ok: true; topic: DataChannelTopic; data: unknown }
  | { ok: false; topic: string; error: string } {
  const schema = (SCHEMAS_BY_TOPIC as Record<string, z.ZodTypeAny>)[topic];
  if (!schema) return { ok: false, topic, error: `unknown topic: ${topic}` };
  const result = schema.safeParse(payload);
  if (!result.success) return { ok: false, topic, error: result.error.message };
  return { ok: true, topic: topic as DataChannelTopic, data: result.data };
}
