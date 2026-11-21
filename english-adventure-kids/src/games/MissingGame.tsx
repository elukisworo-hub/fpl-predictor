import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { speak } from '../audio/speech';
import { PictureView } from '../components/PictureView';
import { VOCAB_BY_ID } from '../content/vocabulary';
import type { MissingQuestion } from '../engine/questions';
import { hint, praise, retry, type GameProps } from './types';

const label = (id: string) => VOCAB_BY_ID[id].word;
const pic = (id: string) => {
  const v = VOCAB_BY_ID[id];
  return v.picture.kind === 'letter' ? { kind: 'emoji' as const, value: v.picture.emoji } : v.picture;
};

/** "What's missing?": look at four pictures, one disappears, find it. */
export function MissingGame({ q, onDone, feedback }: GameProps<MissingQuestion>) {
  const [phase, setPhase] = useState<'look' | 'guess'>('look');
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [solved, setSolved] = useState(false);
  const attempts = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 300));
      await speak('Look and remember!');
      for (const id of q.shown) {
        if (cancelled) return;
        await speak(label(id));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  const startGuess = () => {
    sfx.tap();
    setPhase('guess');
    void speak("What's missing?");
  };

  const choose = (id: string) => {
    if (solved || wrong.has(id)) return;
    if (id === q.removed) {
      setSolved(true);
      sfx.correct();
      const p = praise();
      feedback({ mood: 'cheer', text: p });
      void speak(label(id)).then(() => speak(p));
      setTimeout(() => onDone([{ vocabIds: [q.removed], correct: attempts.current === 0 }]), 1700);
    } else {
      attempts.current++;
      sfx.tryAgain();
      setWrong((w) => new Set(w).add(id));
      const t = attempts.current >= 2 ? hint() : retry();
      feedback({ mood: 'think', text: t });
      void speak(t);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">{phase === 'look' ? 'Look and remember!' : "What's missing?"}</h2>
      <div className="grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-4">
        {q.shown.map((id) => {
          const hidden = phase === 'guess' && id === q.removed && !solved;
          return (
            <div key={id} className={`tile aspect-square flex-col p-2 ${hidden ? '!border-dashed !bg-slate-50' : ''}`}>
              {hidden ? (
                <span className="text-6xl font-bold text-slate-300">?</span>
              ) : (
                <>
                  <PictureView picture={pic(id)} size={72} />
                  {phase === 'look' && <span className="mt-1 text-lg font-semibold">{label(id)}</span>}
                </>
              )}
            </div>
          );
        })}
      </div>

      {phase === 'look' ? (
        <button type="button" className="btn btn-green text-2xl" onClick={startGuess} data-testid="ready">
          I'm ready! <span className="emoji">👀</span>
        </button>
      ) : (
        <div className="grid w-full max-w-md grid-cols-3 gap-3">
          {q.options.map((id) => (
            <button
              key={id}
              type="button"
              data-testid="option"
              data-correct={id === q.removed ? 'true' : undefined}
              onClick={() => choose(id)}
              className={`tile aspect-square ${wrong.has(id) ? 'opacity-40' : ''} ${solved && id === q.removed ? '!border-grass !bg-green-50' : ''} ${
                attempts.current >= 2 && id === q.removed && !solved ? '!border-sun ring-4 ring-sun/60' : ''
              }`}
            >
              <PictureView picture={pic(id)} size={80} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
