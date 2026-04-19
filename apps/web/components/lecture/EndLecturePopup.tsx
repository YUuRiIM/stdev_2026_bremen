'use client';

import type { ObjectiveStatus } from '@/services/session-state';

export interface EndLecturePopupProps {
  open: boolean;
  objectives: ObjectiveStatus[];
  onClose: () => void;
  onConfirmLeave: () => void;
}

function statusTier(coverage: number): 'done' | 'partial' | 'pending' {
  if (coverage >= 0.7) return 'done';
  if (coverage >= 0.4) return 'partial';
  return 'pending';
}

function statusEmoji(tier: ReturnType<typeof statusTier>) {
  if (tier === 'done') return '✅';
  if (tier === 'partial') return '🔶';
  return '⚪';
}

export function EndLecturePopup({
  open,
  objectives,
  onClose,
  onConfirmLeave,
}: EndLecturePopupProps) {
  if (!open) return null;

  const doneCount = objectives.filter((o) => o.coverage >= 0.7).length;
  const total = objectives.length;
  const allDone = total > 0 && doneCount === total;

  const title = allDone ? '🎉 목표 달성!' : '수업을 종료할까요?';
  const lede = allDone
    ? '오늘 목표를 모두 이해했어요. 수고했어요.'
    : total > 0
      ? `현재 ${doneCount} / ${total} 목표 달성 — 여기서 멈춰도 돼요.`
      : '지금 종료하면 강의 결과가 저장되지 않을 수 있어요.';

  return (
    // z-index must beat the in-lecture layers (dialogue stack 1580, inner
    // monologue 1600, connecting overlay 1800) but stay below the cutscene
    // overlay (2000) so cutscenes still take precedence. The shared
    // `.main-lobby-modal-overlay` default of 1000 loses to the dialogue stack
    // and gets hidden behind the user transcript — bump explicitly.
    <div
      className="main-lobby-modal-overlay"
      style={{ zIndex: 1900 }}
      onClick={onClose}
    >
      <div className="main-lobby-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{lede}</p>

        {total > 0 && (
          <ul
            style={{
              margin: '0 0 20px',
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              textAlign: 'left',
            }}
          >
            {objectives.map((obj) => {
              const tier = statusTier(obj.coverage);
              return (
                <li
                  key={obj.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    color: '#333',
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                  }}
                >
                  <span aria-hidden>{statusEmoji(tier)}</span>
                  <span
                    style={{
                      flex: 1,
                      textDecoration:
                        tier === 'done' ? 'line-through' : 'none',
                      color: tier === 'done' ? '#7a7a7a' : '#222',
                    }}
                  >
                    {obj.statement}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="main-lobby-modal__buttons">
          <button
            type="button"
            className="main-lobby-modal__button main-lobby-modal__button--ghost"
            onClick={onClose}
            style={{
              minWidth: 120,
              padding: '12px 20px',
              borderRadius: 999,
              border: 'none',
              background: '#ececec',
              color: '#333',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
          <button
            type="button"
            className="main-lobby-modal__button main-lobby-modal__button--primary"
            onClick={onConfirmLeave}
            style={{
              minWidth: 120,
              padding: '12px 20px',
              borderRadius: 999,
              border: 'none',
              background: 'linear-gradient(180deg, #f7c14a, #e7a72f)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            로비 가기
          </button>
        </div>
      </div>
    </div>
  );
}
