'use client';

type Props = {
  name?: string;
  text: string;
  onNext: () => void;
};

export default function DialogueBox({ name, text }: Props) {
  // Click bubbles up to the parent <section onClick={next}> so clicking
  // anywhere on the dialogue box advances the script. The ▶ button remains
  // as a visual affordance and is keyboard-activatable (Enter/Space).
  return (
    <div className="dialogue-box">
      <div className="speaker-name">{name}</div>
      <p className="dialogue-text">
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
