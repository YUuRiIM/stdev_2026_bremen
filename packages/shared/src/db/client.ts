/**
 * Drizzle client — Demo MVP.
 *
 * We intentionally do NOT ship a `withScope` / `withServiceRole` indirection
 * layer (as in `me/`). The design principle is **JWT pass-through** (see
 * `.omc/plans/miyeonshi-livekit-sts-plan-2026-04-18.md` §7.5.1):
 *
 * - Web code uses Supabase `@supabase/ssr` with the user's JWT cookie.
 * - Agent workers use `@supabase/supabase-js` initialised with the participant
 *   JWT extracted from LiveKit metadata.
 * - RLS policies enforce user-scoped access everywhere.
 *
 * `service_role` key is intentionally absent from both web and agent envs.
 * For seed / migration we use the Supabase MCP (`apply_migration`/`execute_sql`)
 * at author time, not runtime.
 *
 * This module exists to expose a typed Drizzle client for **optional** direct
 * SQL use (e.g. batch scripts, drizzle-kit migrations). Most runtime code
 * should use `@supabase/supabase-js` through JWT pass-through, not this.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let cachedClient: Db | null = null;
let cachedSql: ReturnType<typeof postgres> | null = null;

/**
 * Returns a Drizzle client using `DATABASE_URL`. Caches the `postgres` pool.
 *
 * Intended use:
 *   - `scripts/migrate.ts` (drizzle-kit generate → raw SQL → MCP apply)
 *   - `scripts/seed.ts` (seed data batch insert, if not using MCP)
 *   - Local experiments
 *
 * Do NOT import this inside agent runtime or Next.js request handlers —
 * use the Supabase client with the user's JWT instead.
 */
export function getDb(): Db {
  if (cachedClient) return cachedClient;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is required for direct Drizzle client. ' +
        'For runtime app code, prefer @supabase/supabase-js with JWT pass-through.',
    );
  }
  cachedSql = postgres(url, { prepare: false });
  cachedClient = drizzle(cachedSql, { schema });
  return cachedClient;
}

export async function closeDb(): Promise<void> {
  if (cachedSql) {
    await cachedSql.end();
    cachedSql = null;
    cachedClient = null;
  }
}
