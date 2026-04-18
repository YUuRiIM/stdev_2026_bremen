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
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>스킵하시겠습니까?</h3>
        <p>진행 중인 스토리를 건너뛰고 결과를 확인합니다.</p>
        <div className="modal-buttons">
          <button className="button--ghost" onClick={onCancel}>
            취소
          </button>
          <button className="button" onClick={onConfirm}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
