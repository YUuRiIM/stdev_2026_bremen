'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BackgroundLayer from '@/components/visual-novel/BackgroundLayer';
import DialogueBox from '@/components/visual-novel/DialogueBox';
import NarrativeArea from '@/components/visual-novel/NarrativeArea';
import ChoiceList from '@/components/visual-novel/ChoiceList';
import SkipModal from '@/components/visual-novel/SkipModal';

const KNOWN_SCRIPTS = new Set([
  'intro',
  'fermat-1',
  'fermat-2',
  'fermat-3',
  'fermat-4',
]);

type ScriptEntry = {
  speaker: string;
  name?: string;
  text?: string;
  backgroundImage?: string;
  characterImage?: string;
  choices?: string[];
};

function VisualNovelScreen() {
  const params = useParams<{ scriptId: string }>();
  const scriptId = params?.scriptId as string;
  const router = useRouter();

  const [script, setScript] = useState<ScriptEntry[] | null>(null);
  const [index, setIndex] = useState(0);
  const [showSkipModal, setShowSkipModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fileName = KNOWN_SCRIPTS.has(scriptId) ? `script-${scriptId}` : 'script';
    import(`@/data/${fileName}.json`)
      .then((m) => {
        if (!cancelled) {
          setScript(m.default as ScriptEntry[]);
          setIndex(0);
        }
      })
      .catch((err) => {
        console.error('[VisualNovelScreen] load script failed', err);
        if (!cancelled) {
          import('@/data/script.json').then((m) => {
            if (!cancelled) setScript(m.default as ScriptEntry[]);
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scriptId]);

  if (!script) {
    return <div>Loading...</div>;
  }

  const current = script[index];

  const next = () => {
    if (index < script.length - 1) {
      setIndex(index + 1);
    } else {
      router.push('/');
    }
  };

  const confirmSkip = () => {
    setIndex(script.length - 1);
    setShowSkipModal(false);
    router.push('/');
  };

  const isChoiceMode = current.speaker === 'choice';

  return (
    <section className="visual-novel" onClick={!isChoiceMode ? next : undefined}>
      <BackgroundLayer
        backgroundImage={current.backgroundImage}
        characterImage={current.characterImage}
      />

      <button
        className="skip-button"
        onClick={(e) => {
          e.stopPropagation();
          setShowSkipModal(true);
        }}
      >
        ▶ Skip
      </button>

      {current.speaker === 'character' && current.text && (
        <DialogueBox name={current.name} text={current.text} onNext={next} />
      )}

      {current.speaker === 'narrative' && current.text && (
        <NarrativeArea text={current.text} onNext={next} />
      )}

      {current.speaker === 'choice' && current.choices && (
        <ChoiceList choices={current.choices} onSelect={() => next()} />
      )}

      {showSkipModal && (
        <SkipModal
          onConfirm={confirmSkip}
          onCancel={() => setShowSkipModal(false)}
        />
      )}
    </section>
  );
}

export default VisualNovelScreen;
