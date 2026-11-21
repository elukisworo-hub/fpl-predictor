import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { speak } from '../audio/speech';
import { PictureView } from '../components/PictureView';
import type { MatchQuestion } from '../engine/questions';
import { shuffle } from '../engine/util';
import { praise, retry, type GameProps } from './types';

const PAIR_COLORS = ['bg-pink-100 border-berry', 'bg-sky-100 border-ocean', 'bg-yellow-100 border-sun', 'bg-purple-100 border-grape'];

/** Picture matching: tap a picture, then its word. */
export function MatchGame({ q, onDone, feedback }: GameProps<MatchQuestion>) {
  const pics = useMemo(() => shuffle(q.pairs), [q]);
  const words = useMemo(() => shuffle(q.pairs), [q]);
  const [selPic, setSelPic] = useState<string | null>(null);
  const [selWord, setSelWord] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [shake, setShake] = useState<string[]>([]);
  const missed = useRef(new Set<string>());

  useEffect(() => {
    const t = setTimeout(() => speak('Match the pictures and the words!'), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!selPic || !selWord) return;
    if (selPic === selWord) {
      const pair = q.pairs.find((p) => p.id === selPic)!;
      sfx.correct();
      void speak(pair.say);
      const next = [...matched, selPic];
      setMatched(next);
      if (next.length === q.pairs.length) {
        const p = praise();
        feedback({ mood: 'cheer', text: p });
        setTimeout(() => void speak(p), 900);
        setTimeout(() => onDone(q.pairs.map((x) => ({ vocabIds: [x.id], correct: !missed.current.has(x.id) }))), 2000);
      } else {
        feedback({ mood: 'happy', text: praise() });
      }
    } else {
      missed.current.add(selPic).add(selWord);
      sfx.tryAgain();
      setShake([`p-${selPic}`, `w-${selWord}`]);
      setTimeout(() => setShake([]), 450);
      const r = retry();
      feedback({ mood: 'think', text: r });
      void speak(r);
    }
    setSelPic(null);
    setSelWord(null);
  }, [selPic, selWord]); // eslint-disable-line react-hooks/exhaustive-deps

  const colorFor = (id: string) => PAIR_COLORS[matched.indexOf(id) % PAIR_COLORS.length];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">Match them!</h2>
      <div className="mx-auto grid w-full max-w-xl grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          {pics.map((p) => {
            const done = matched.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                data-testid="match-pic"
                data-id={p.id}
                disabled={done}
                onClick={() => {
                  sfx.tap();
                  setSelPic(p.id);
                }}
                className={`tile h-24 sm:h-28 ${done ? colorFor(p.id) : selPic === p.id ? '!border-ocean ring-4 ring-ocean/40' : ''} ${shake.includes(`p-${p.id}`) ? 'animate-shake' : ''}`}
              >
                <PictureView picture={p.picture} size={80} />
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3">
          {words.map((p) => {
            const done = matched.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                data-testid="match-word"
                data-id={p.id}
                disabled={done}
                onClick={() => {
                  sfx.tap();
                  setSelWord(p.id);
                }}
                className={`tile h-24 px-2 text-2xl font-semibold sm:h-28 sm:text-3xl ${done ? colorFor(p.id) : selWord === p.id ? '!border-ocean ring-4 ring-ocean/40' : ''} ${shake.includes(`w-${p.id}`) ? 'animate-shake' : ''}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
