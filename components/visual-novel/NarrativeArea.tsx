'use client';

type Props = {
  text: string;
  onNext: () => void;
};

export default function NarrativeArea({ text }: Props) {
  // Click bubbles to <section onClick={next}>; clicking anywhere advances.
  return (
    <div className="narrative-area">
      <p className="narrative-text">
        {text.split('\n').map((line, i) => (
          <span key={i}>
            {line}
            {i < text.split('\n').length - 1 && <br />}
          </span>
        ))}
      </p>
      <button className="next-icon" aria-label="다음">
        ▶
      </button>
    </div>
  );
}
