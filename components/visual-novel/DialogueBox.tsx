'use client';

type Props = {
  name?: string;
  text: string;
  onNext: () => void;
};

export default function DialogueBox({ name, text, onNext }: Props) {
  return (
    <div className="dialogue-box" onClick={(e) => e.stopPropagation()}>
      <div className="speaker-name">{name}</div>
      <p className="dialogue-text">
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
