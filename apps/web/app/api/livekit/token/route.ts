import { NextResponse } from 'next/server';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
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
  /** Topic string matching a row in `subjects` (e.g. "뺄셈", "페르마 소정리"). */
  subjectTopic?: string;
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

  // Stale-session cleanup — if the same user already has an `active_sessions`
  // row, force-close the old LiveKit room before issuing a new token. Prevents
  // the agent from being attached to two rooms at once when a client fails to
  // disconnect cleanly (React Strict Mode double-mount, tab close, mid-flight
  // route change).
  if (authUserId) {
    const { data: existing } = await supabase
      .from('active_sessions')
      .select('room_name')
      .eq('user_id', authUserId)
      .maybeSingle();
    if (existing?.room_name && existing.room_name !== roomName) {
      const httpUrl = livekitUrl.replace(/^wss?:/, (m) =>
        m === 'wss:' ? 'https:' : 'http:',
      );
      const rooms = new RoomServiceClient(httpUrl, apiKey, apiSecret);
      try {
        await rooms.deleteRoom(existing.room_name);
      } catch {
        /* best effort — room may already be gone on LiveKit side */
      }
      await supabase
        .from('active_sessions')
        .delete()
        .eq('user_id', authUserId);
    }
  }

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
      // Optional pre-selected subject topic from the lobby button — the agent
      // uses it to seed its system prompt so the first greeting can jump
      // straight into the chosen lesson.
      subjectTopic: body.subjectTopic,
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
