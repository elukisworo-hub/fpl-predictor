import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { speak } from '../audio/speech';
import { PictureView } from '../components/PictureView';
import { SpeakerButton } from '../components/ui';
import type { ChoiceOption, ChoiceQuestion, Stimulus } from '../engine/questions';
import { hint, praise, retry, type GameProps } from './types';

function StimulusView({ s }: { s: Stimulus }) {
  switch (s.type) {
    case 'picture':
      return (
        <div className="card mx-auto flex h-36 w-36 items-center justify-center sm:h-52 sm:w-52">
          <PictureView picture={s.picture} size={120} />
        </div>
      );
    case 'sentence':
      return (
        <div className="card mx-auto flex max-w-lg flex-col items-center gap-2 px-5 py-4">
          {s.picture && <PictureView picture={s.picture} size={90} />}
          <p className="text-center text-2xl font-semibold sm:text-3xl">
            {s.text.split('___').map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <span className="mx-1 inline-block min-w-[3.5rem] border-b-4 border-dashed border-ocean align-baseline">&nbsp;</span>}
              </span>
            ))}
          </p>
        </div>
      );
    case 'count':
      return (
        <div className="card mx-auto grid max-w-md grid-cols-5 place-items-center gap-1 p-4">
          {Array.from({ length: s.n }, (_, i) => (
            <span key={i} className="emoji animate-pop text-4xl sm:text-5xl" style={{ animationDelay: `${i * 0.04}s` }}>
              {s.emoji}
            </span>
          ))}
        </div>
      );
    case 'text':
      return (
        <div className="mx-auto flex items-center justify-center">
          <span className="text-7xl font-bold text-berry">{s.text}</span>
        </div>
      );
  }
}

/** Generic multiple-choice game: listen & choose, picture → word, sentences, counting, colours, Q&A... */
export function ChoiceGame({ q, onDone, feedback }: GameProps<ChoiceQuestion>) {
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [solved, setSolved] = useState<string | null>(null);
  const [shaking, setShaking] = useState<string | null>(null);
  const attempts = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => speak(q.say ?? q.prompt), 350);
    return () => clearTimeout(t);
  }, [q]);

  const choose = (o: ChoiceOption) => {
    if (solved || wrong.has(o.key)) return;
    if (o.correct) {
      setSolved(o.key);
      sfx.correct();
      const p = praise();
      feedback({ mood: 'cheer', text: p });
      const firstTry = attempts.current === 0;
      setTimeout(() => void speak(p), 250);
      setTimeout(() => onDone([{ vocabIds: q.vocabIds, correct: firstTry }]), 1300);
    } else {
      attempts.current++;
      sfx.tryAgain();
      setShaking(o.key);
      setTimeout(() => setShaking(null), 450);
      setWrong((w) => new Set(w).add(o.key));
      if (attempts.current >= 2) {
        const h = hint();
        feedback({ mood: 'think', text: h });
        void speak(h).then(() => {
          if (q.say) void speak(q.say);
        });
      } else {
        const r = retry();
        feedback({ mood: 'think', text: r });
        void speak(r);
      }
    }
  };

  const showHint = attempts.current >= 2 && !solved;
  const n = q.options.length;

  const optionClass = (o: ChoiceOption) => {
    const base = 'tile relative';
    if (solved === o.key) return `${base} !border-grass !bg-green-50 scale-105`;
    if (wrong.has(o.key)) return `${base} opacity-40`;
    if (showHint && o.correct) return `${base} !border-sun ring-4 ring-sun/60 animate-bob`;
    return `${base} hover:border-ocean`;
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div className="flex items-center justify-center gap-3">
        {q.say && <SpeakerButton text={q.say} size="lg" />}
        <h2 className="text-center text-2xl font-bold sm:text-3xl">{q.showSay && q.say ? q.say : q.prompt}</h2>
      </div>

      {q.stimulus && <StimulusView s={q.stimulus} />}

      {q.layout === 'pictures' && (
        <div className={`mx-auto grid w-full max-w-2xl gap-3 sm:gap-4 ${n === 2 ? 'grid-cols-2' : n === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {q.options.map((o) => (
            <button
              key={o.key}
              type="button"
              data-testid="option"
              data-correct={o.correct ? 'true' : undefined}
              onClick={() => choose(o)}
              className={`${optionClass(o)} aspect-square p-2 ${shaking === o.key ? 'animate-shake' : ''}`}
              aria-label={o.label ?? 'picture option'}
            >
              {o.picture && <PictureView picture={o.picture} size={n <= 3 ? 110 : 96} />}
              {solved === o.key && <span className="emoji absolute -right-2 -top-2 text-3xl">✅</span>}
            </button>
          ))}
        </div>
      )}

      {q.layout === 'numbers' && (
        <div className={`mx-auto grid w-full gap-3 ${n === 2 ? 'max-w-xs grid-cols-2' : n === 3 ? 'max-w-md grid-cols-3' : 'max-w-xl grid-cols-4'}`}>
          {q.options.map((o) => (
            <button
              key={o.key}
              type="button"
              data-testid="option"
              data-correct={o.correct ? 'true' : undefined}
              onClick={() => choose(o)}
              className={`${optionClass(o)} aspect-square text-6xl font-bold text-ocean ${shaking === o.key ? 'animate-shake' : ''}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {q.layout === 'words' && (
        <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
          {q.options.map((o) => (
            <div key={o.key} className="flex items-center gap-2">
              <button
                type="button"
                data-testid="option"
                data-correct={o.correct ? 'true' : undefined}
                onClick={() => choose(o)}
                className={`${optionClass(o)} min-h-[4.5rem] flex-1 px-4 py-3 text-2xl font-semibold sm:text-3xl ${shaking === o.key ? 'animate-shake' : ''}`}
              >
                {o.label}
              </button>
              {o.speak && <SpeakerButton text={o.speak} size="md" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
