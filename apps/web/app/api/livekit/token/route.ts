import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { randomUUID } from 'node:crypto';

import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/livekit/token
 *
 * Issues a LiveKit JWT for a lecture session. Strategy:
 *   1. Read Supabase session via cookies (set during magic-link exchange).
 *   2. If signed in: pass userId + supabaseJwt to the agent via participant
 *      metadata — agent uses that JWT for RLS-scoped queries.
 *   3. Without a session: fall back to an ephemeral demo identity so /lecture
 *      still boots during dev without login (no RLS-scoped writes will work,
 *      but data-channel + audio wiring can be verified).
 *
 * Body (optional): { characterId?: string, roomPrefix?: string }
 * Returns: { token, url, roomName, identity, authenticated }
 */

interface TokenRequest {
  characterId?: string;
  roomPrefix?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl =
    process.env.NEXT_PUBLIC_LIVEKIT_URL ?? process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !livekitUrl) {
    return NextResponse.json(
      { error: 'livekit_env_missing' },
      { status: 500 },
    );
  }

  let body: TokenRequest = {};
  try {
    body = (await req.json()) as TokenRequest;
  } catch {
    /* empty body OK */
  }

  // Try authenticated Supabase session first.
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authUserId = session?.user.id;
  const supabaseJwt = session?.access_token ?? null;

  const userId = authUserId ?? `demo-${randomUUID()}`;
  const characterId = body.characterId ?? 'fermat';
  const roomPrefix = body.roomPrefix ?? 'lecture';
  const roomName = `${roomPrefix}-${userId.slice(0, 8)}-${Date.now().toString(36)}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    metadata: JSON.stringify({
      userId,
      characterId,
      mode: 'livekit',
      // Forwarded to the agent via participant metadata; agent uses it as a
      // pass-through JWT against Supabase (never swaps in service_role).
      supabaseJwt,
      authenticated: Boolean(authUserId),
    }),
    ttl: 60 * 60, // 1h
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return NextResponse.json({
    token,
    url: livekitUrl,
    roomName,
    identity: userId,
    authenticated: Boolean(authUserId),
  });
}
