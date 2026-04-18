export type MicPermissionResult = 'granted' | 'denied' | 'unsupported';

let cachedResult: MicPermissionResult | null = null;

export async function requestMicOnce(): Promise<MicPermissionResult> {
  if (cachedResult) return cachedResult;

  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    cachedResult = 'unsupported';
    return cachedResult;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    cachedResult = 'granted';
    return cachedResult;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[voice-permission] mic request denied:', err);
    }
    cachedResult = 'denied';
    return cachedResult;
  }
}

export function resetMicPermissionCacheForTesting() {
  cachedResult = null;
}
