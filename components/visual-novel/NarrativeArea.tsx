'use client';

type Props = {
  text: string;
  onNext: () => void;
};

export default function NarrativeArea({ text, onNext }: Props) {
  return (
    <div className="narrative-area" onClick={(e) => e.stopPropagation()}>
      <p className="narrative-text">
        {text.split('\n').map((line, i) => (
          <span key={i}>
            {line}
            {i < text.split('\n').length - 1 && <br />}
          </span>
        ))}
      </p>
      <button className="next-icon" onClick={onNext}>
        ▶
      </button>
    </div>
  );
}
