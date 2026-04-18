import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { randomUUID } from 'node:crypto';

/**
 * POST /api/livekit/token
 *
 * Issues a LiveKit JWT for a lecture session. In demo mode auth is permissive:
 * if the client doesn't supply a userId the server generates an ephemeral one.
 * Real Supabase auth gating happens in a later phase (T1).
 *
 * Body: { characterId?: string, userId?: string, roomPrefix?: string }
 * Returns: { token, url, roomName, identity }
 */

interface TokenRequest {
  characterId?: string;
  userId?: string;
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
    /* empty body OK — we fall back to defaults */
  }

  const userId = body.userId ?? `demo-${randomUUID()}`;
  const characterId = body.characterId ?? 'fermat';
  const roomPrefix = body.roomPrefix ?? 'lecture';
  const roomName = `${roomPrefix}-${userId.slice(0, 8)}-${Date.now().toString(36)}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    metadata: JSON.stringify({
      userId,
      characterId,
      mode: 'livekit',
    }),
    ttl: 60 * 60, // 1h — single lecture session
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
  });
}
