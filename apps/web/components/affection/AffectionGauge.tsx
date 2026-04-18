'use client';

import {
  AFFECTION_LEVEL_LABELS,
  AFFECTION_THRESHOLDS,
  type AffectionLevel,
} from '@/lib/affection/use-affection';

interface AffectionGaugeProps {
  score: number;
  level: AffectionLevel;
  /** "compact" = inline chip, "bar" = gauge with progress toward next level. */
  variant?: 'compact' | 'bar';
  className?: string;
}

function nextThreshold(level: AffectionLevel): number | null {
  switch (level) {
    case 'stranger':
      return AFFECTION_THRESHOLDS.acquaintance;
    case 'acquaintance':
      return AFFECTION_THRESHOLDS.friend;
    case 'friend':
      return AFFECTION_THRESHOLDS.close;
    case 'close':
      return AFFECTION_THRESHOLDS.lover;
    case 'lover':
      return null;
  }
}

function currentThreshold(level: AffectionLevel): number {
  switch (level) {
    case 'stranger':
      return 0;
    case 'acquaintance':
      return AFFECTION_THRESHOLDS.acquaintance;
    case 'friend':
      return AFFECTION_THRESHOLDS.friend;
    case 'close':
      return AFFECTION_THRESHOLDS.close;
    case 'lover':
      return AFFECTION_THRESHOLDS.lover;
  }
}

export function AffectionGauge({
  score,
  level,
  variant = 'bar',
  className,
}: AffectionGaugeProps) {
  const label = AFFECTION_LEVEL_LABELS[level];
  const next = nextThreshold(level);
  const cur = currentThreshold(level);
  const pct =
    next === null ? 100 : Math.min(100, Math.max(0, ((score - cur) / (next - cur)) * 100));

  if (variant === 'compact') {
    return (
      <span className={`affection-chip ${className ?? ''}`}>
        <span className="affection-chip__level">{label}</span>
        <span className="affection-chip__score">{score}</span>
      </span>
    );
  }

  return (
    <div className={`affection-gauge ${className ?? ''}`}>
      <div className="affection-gauge__head">
        <span className="affection-gauge__heart" aria-hidden>
          ♥
        </span>
        <span className="affection-gauge__level">{label}</span>
        <span className="affection-gauge__score">
          {score}
          {next !== null && (
            <span className="affection-gauge__score-next"> / {next}</span>
          )}
        </span>
      </div>
      <div className="affection-gauge__track">
        <div
          className="affection-gauge__fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
