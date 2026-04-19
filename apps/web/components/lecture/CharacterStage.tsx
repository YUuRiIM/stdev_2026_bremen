'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import type { CharacterManifest } from '@/components/character-kit';

const Character = dynamic(
  () => import('@/components/character-kit').then((m) => m.Character),
  { ssr: false },
);

export interface CharacterStageProps {
  manifestUrl?: string;
  manifestOverride?: CharacterManifest;
  assetBase?: string;
  className?: string;
}

export function CharacterStage({
  manifestUrl = '/assets/fermat/manifest.json',
  manifestOverride,
  assetBase = '/assets/fermat',
  className,
}: CharacterStageProps) {
  const [manifest, setManifest] = useState<CharacterManifest | null>(
    manifestOverride ?? null,
  );

  useEffect(() => {
    if (manifestOverride) {
      setManifest(manifestOverride);
      return;
    }
    let cancelled = false;
    fetch(manifestUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`manifest fetch ${res.status}`);
        return res.json() as Promise<CharacterManifest>;
      })
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch((err) => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[CharacterStage] manifest load failed:', err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [manifestUrl, manifestOverride]);

  return (
    <div
      data-testid="lecture-character-stage"
      className={cn(
        'pointer-events-auto relative flex h-full w-full items-end justify-center',
        className,
      )}
    >
      {manifest ? (
        // Negative margin-bottom shifts the sprite below the stage's bottom
        // edge so the feet (which breathe) are cropped cleanly behind the
        // dialogue overlay instead of bobbing in/out of visible whitespace.
        <Character
          manifest={manifest}
          assetBase={assetBase}
          width="clamp(420px, 50vw, 760px)"
          className="drop-shadow-2xl mb-[-5vh]"
        />
      ) : null}
    </div>
  );
}
