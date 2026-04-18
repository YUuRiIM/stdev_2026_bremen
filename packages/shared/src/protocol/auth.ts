import { z } from 'zod';

/**
 * Client → Agent. Long-running voice sessions may outlive Supabase JWT TTL
 * (24h). Client detects pending expiry and publishes a refreshed JWT over the
 * LiveKit data channel. Agent swaps its Supabase client atomically.
 *
 * Topic: "auth.refresh"
 */
export const AuthRefreshSchema = z.object({
  jwt: z.string().min(1),
  expiresAt: z.number().int().positive(), // unix ms
  ts: z.number().int().positive(),
});
export type AuthRefresh = z.infer<typeof AuthRefreshSchema>;

export const AUTH_REFRESH_TOPIC = 'auth.refresh' as const;
