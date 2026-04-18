'use client';

type Props = {
  choices: string[];
  onSelect: (choice: string) => void;
};

export default function ChoiceList({ choices, onSelect }: Props) {
  return (
    <div className="choice-container" onClick={(e) => e.stopPropagation()}>
      {choices.map((choice, idx) => (
        <button key={idx} className="choice-button" onClick={() => onSelect(choice)}>
          {choice}
        </button>
      ))}
    </div>
  );
}
