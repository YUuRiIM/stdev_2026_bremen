'use client';

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
};

export default function SkipModal({ onConfirm, onCancel }: Props) {
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(420px, 92vw)',
          background: '#ffffff',
          borderRadius: '28px',
          padding: '32px 28px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          textAlign: 'center'
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 600,
            color: '#1f1f1f'
          }}
        >
          스킵하시겠습니까?
        </h3>

        <p
          style={{
            margin: 0,
            fontSize: '16px',
            lineHeight: 1.6,
            color: '#666'
          }}
        >
          진행 중인 스토리를 건너뛰고 결과를 확인합니다.
        </p>

        <div
          className="modal-buttons"
          style={{
            marginTop: '10px',
            display: 'flex',
            gap: '12px'
          }}
        >
          <button
            className="button--ghost"
            onClick={onCancel}
            style={{
              flex: 1,
              height: '54px',
              borderRadius: '18px',
              border: '2px solid #e5e5e5',
              background: '#626262',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            취소
          </button>

          <button
            className="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              height: '54px',
              borderRadius: '18px',
              border: 'none',
              background: 'linear-gradient(135deg, #ffb347, #ff8c42)',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(255,140,66,0.25)'
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
