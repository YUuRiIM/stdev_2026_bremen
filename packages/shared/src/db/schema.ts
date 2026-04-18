/**
 * Drizzle schema — Demo MVP (Sprint 1+2).
 *
 * Out-of-scope (DO NOT add without lifting to Sprint ≥ 4):
 *   memory_chunks (pgvector) · entities · relations · mood_state · turns
 *
 * Identity:
 *   - `public.users.id` references `auth.users(id)` with ON DELETE CASCADE.
 *     The FK + auto-insert trigger are declared in the raw SQL migration
 *     (Drizzle cannot express cross-schema FK cleanly). This file only holds
 *     the Drizzle type surface.
 *
 * Double-blind judge:
 *   - `subjects.objectives` jsonb contains `{ rubric, ... }` per objective.
 *     Student agent NEVER reads subjects directly; it receives a stripped
 *     variant via `stripRubricsForStudent()` (seed/subjects.ts).
 */

import {
  pgTable,
  pgSchema,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  real,
  primaryKey,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Cross-schema reference stub for auth.users ─────────────
// Drizzle doesn't own this table; it exists solely so FK columns typecheck.
const authSchema = pgSchema('auth');
export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
});

// ═══════════════════════════════════════════════════════════
// 1. users — mirror of auth.users (our app columns attached)
// ═══════════════════════════════════════════════════════════
export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  email: text('email'),
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ═══════════════════════════════════════════════════════════
// 2. characters — DB-driven persona content (public read)
// ═══════════════════════════════════════════════════════════
export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  displayName: text('display_name').notNull(),
  tagline: text('tagline'),
  basePersonaPrompt: text('base_persona_prompt').notNull(),
  personaRevision: integer('persona_revision').notNull().default(1),
  affectionOverlays: jsonb('affection_overlays').notNull().default({}),
  fewShotExamples: jsonb('few_shot_examples').notNull().default([]),
  guardrailAdditions: text('guardrail_additions'),
  voiceId: text('voice_id').notNull(),
  ttsModel: text('tts_model').notNull().default('eleven_flash_v2_5'),
  language: text('language').notNull().default('ko'),
  isDemoReady: boolean('is_demo_ready').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ═══════════════════════════════════════════════════════════
// 3. character_assets — sprite / video / cutscene / bgm
// ═══════════════════════════════════════════════════════════
export const characterAssets = pgTable(
  'character_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'sprite' | 'video' | 'cutscene' | 'bgm' | 'image'
    emotion: text('emotion'), // 'neutral' | 'happy' | ... (nullable for non-sprite)
    eventKey: text('event_key'), // optional cutscene linkage
    storageKey: text('storage_key').notNull(),
    signedUrl: text('signed_url'),
    signedUrlExpiresAt: timestamp('signed_url_expires_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    characterIdIdx: index('character_assets_character_id_idx').on(t.characterId),
    typeEmotionIdx: index('character_assets_type_emotion_idx').on(
      t.type,
      t.emotion,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════
// 4. events — cutscene / scene trigger conditions
// ═══════════════════════════════════════════════════════════
export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id').references(() => characters.id, {
      onDelete: 'cascade',
    }),
    key: text('key').notNull(), // e.g. 'approved_smile', 'confession_scene'
    triggerCondition: jsonb('trigger_condition').notNull().default({}),
    cutsceneAssetId: uuid('cutscene_asset_id').references(
      () => characterAssets.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    charKeyUnq: unique('events_character_key_unq').on(t.characterId, t.key),
  }),
);

// ═══════════════════════════════════════════════════════════
// 5. quizzes — PREP mode (duolingo-style, FE-only)
// ═══════════════════════════════════════════════════════════
export const quizzes = pgTable(
  'quizzes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterSlug: text('character_slug').notNull(), // denormalised for FE cheap read
    sortOrder: integer('sort_order').notNull().default(0),
    question: text('question').notNull(),
    choices: jsonb('choices').notNull(), // string[]
    answerIdx: integer('answer_idx').notNull(),
    flavorOnCorrect: text('flavor_on_correct'),
    flavorOnWrong: text('flavor_on_wrong'),
    conceptKey: text('concept_key'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    slugSortIdx: index('quizzes_slug_sort_idx').on(
      t.characterSlug,
      t.sortOrder,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════
// 6. subjects — 강의 주제 (lecture topic + objectives + rubric)
// ═══════════════════════════════════════════════════════════
export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').references(() => characters.id, {
    onDelete: 'set null',
  }), // null = 공용 주제
  topic: text('topic').notNull(),
  keyterms: text('keyterms').array().notNull().default(sql`'{}'::text[]`),
  // objectives: Objective[] (see packages/shared/src/seed/subjects.ts)
  //   { id, statement, conceptKey, weight, expectedTerms, rubric { must_hit, ... } }
  // rubric field is JUDGE-ONLY; stripped via stripRubricsForStudent()
  objectives: jsonb('objectives').notNull().default([]),
  prerequisites: text('prerequisites')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  difficulty: integer('difficulty').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ═══════════════════════════════════════════════════════════
// 7. conversation_threads — user×character 단일 스레드
// ═══════════════════════════════════════════════════════════
export const conversationThreads = pgTable(
  'conversation_threads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    activeLectureSessionId: uuid('active_lecture_session_id'),
    voiceRoomName: text('voice_room_name'),
    lastChannel: text('last_channel'), // 'voice' | 'text' | 'chalkboard'
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userCharUnq: unique('conv_threads_user_char_unq').on(
      t.userId,
      t.characterId,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════
// 8. affection_state — (user, character) 복합 PK
// ═══════════════════════════════════════════════════════════
export const affectionLevels = [
  'stranger',
  'acquaintance',
  'friend',
  'close',
  'lover',
] as const;
export type AffectionLevel = (typeof affectionLevels)[number];

export const affectionState = pgTable(
  'affection_state',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    level: text('level').notNull().default('stranger'), // AffectionLevel
    score: integer('score').notNull().default(0),
    flags: jsonb('flags').notNull().default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.characterId] }),
  }),
);

// ═══════════════════════════════════════════════════════════
// 9. session_memory — 롤링 요약 (per user × character)
// ═══════════════════════════════════════════════════════════
export const sessionMemory = pgTable(
  'session_memory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    summary: text('summary').notNull(),
    turnCount: integer('turn_count').notNull().default(0),
    lastSessionAt: timestamp('last_session_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userCharIdx: index('session_memory_user_char_idx').on(
      t.userId,
      t.characterId,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════
// 10. facts — semantic memory (user-level atomic facts)
// ═══════════════════════════════════════════════════════════
export const facts = pgTable(
  'facts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entityId: uuid('entity_id'), // nullable — stays simple in Sprint 1+2
    key: text('key').notNull(),
    value: text('value'),
    valueJsonb: jsonb('value_jsonb'),
    confidence: real('confidence').notNull().default(1.0),
    source: text('source'), // 'user_said' | 'llm_inferred' | 'system_event'
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userKeyUnq: unique('facts_user_entity_key_unq').on(
      t.userId,
      t.entityId,
      t.key,
    ),
    userIdx: index('facts_user_id_idx').on(t.userId),
  }),
);

// ═══════════════════════════════════════════════════════════
// 11. understood_concepts — 캐릭터가 배운 개념 (복합 PK)
// ═══════════════════════════════════════════════════════════
export const understoodConcepts = pgTable(
  'understood_concepts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id, {
      onDelete: 'set null',
    }),
    concept: text('concept').notNull(), // concept_key from rubric
    confidence: real('confidence').notNull().default(0.5),
    lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({
      columns: [t.userId, t.characterId, t.concept],
    }),
  }),
);

// ═══════════════════════════════════════════════════════════
// 12. lecture_sessions — 강의 세션 + verdict 기록
// ═══════════════════════════════════════════════════════════
export const lectureSessions = pgTable(
  'lecture_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'restrict' }),
    personaRevision: integer('persona_revision'), // audit trail
    threadId: uuid('thread_id').references(() => conversationThreads.id, {
      onDelete: 'set null',
    }),
    startedAt: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    verdict: jsonb('verdict'), // full verdict (judge-produced; never prompt-injected)
    affectionDelta: integer('affection_delta'),
    episodeTriggered: text('episode_triggered'),
  },
  (t) => ({
    userCharIdx: index('lecture_sessions_user_char_idx').on(
      t.userId,
      t.characterId,
    ),
    subjectIdx: index('lecture_sessions_subject_idx').on(t.subjectId),
  }),
);

// ═══════════════════════════════════════════════════════════
// 13. quiz_attempts — PREP 모드 정오답 로그
// ═══════════════════════════════════════════════════════════
export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    selectedIdx: integer('selected_idx').notNull(),
    correct: boolean('correct').notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userQuizIdx: index('quiz_attempts_user_quiz_idx').on(t.userId, t.quizId),
  }),
);

// ═══════════════════════════════════════════════════════════
// 14. active_sessions — concurrent voice session 방어
// ═══════════════════════════════════════════════════════════
export const activeSessions = pgTable('active_sessions', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  roomName: text('room_name').notNull(),
  characterId: uuid('character_id').references(() => characters.id, {
    onDelete: 'set null',
  }),
  startedAt: timestamp('started_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastHeartbeat: timestamp('last_heartbeat', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ═══════════════════════════════════════════════════════════
// 15. audit_log — Demo 스코프: 5 kinds만 실제 wire
// ═══════════════════════════════════════════════════════════
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    characterId: uuid('character_id').references(() => characters.id, {
      onDelete: 'set null',
    }),
    sessionId: text('session_id'),
    traceId: uuid('trace_id'),
    level: text('level').notNull().default('info'), // 'debug'|'info'|'warn'|'error'
    kind: text('kind').notNull(), // 'session.connect' | 'session.disconnect' | 'llm.call' | 'tool.call' | 'error' (+ future)
    name: text('name'),
    durationMs: integer('duration_ms'),
    payload: jsonb('payload').notNull().default({}),
    error: text('error'),
    model: text('model'),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
  },
  (t) => ({
    userTsIdx: index('audit_log_user_ts_idx').on(t.userId, t.ts),
    sessionTraceIdx: index('audit_log_session_trace_idx').on(
      t.sessionId,
      t.traceId,
    ),
    kindTsIdx: index('audit_log_kind_ts_idx').on(t.kind, t.ts),
    tsIdx: index('audit_log_ts_idx').on(t.ts),
  }),
);

// ═══════════════════════════════════════════════════════════
// Type exports (infer from tables)
// ═══════════════════════════════════════════════════════════
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type CharacterRow = typeof characters.$inferSelect;
export type NewCharacterRow = typeof characters.$inferInsert;
export type CharacterAssetRow = typeof characterAssets.$inferSelect;
export type NewCharacterAssetRow = typeof characterAssets.$inferInsert;
export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;
export type QuizRow = typeof quizzes.$inferSelect;
export type NewQuizRow = typeof quizzes.$inferInsert;
export type SubjectRow = typeof subjects.$inferSelect;
export type NewSubjectRow = typeof subjects.$inferInsert;
export type ConversationThreadRow = typeof conversationThreads.$inferSelect;
export type AffectionStateRow = typeof affectionState.$inferSelect;
export type NewAffectionStateRow = typeof affectionState.$inferInsert;
export type SessionMemoryRow = typeof sessionMemory.$inferSelect;
export type FactRow = typeof facts.$inferSelect;
export type NewFactRow = typeof facts.$inferInsert;
export type UnderstoodConceptRow = typeof understoodConcepts.$inferSelect;
export type LectureSessionRow = typeof lectureSessions.$inferSelect;
export type QuizAttemptRow = typeof quizAttempts.$inferSelect;
export type ActiveSessionRow = typeof activeSessions.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
