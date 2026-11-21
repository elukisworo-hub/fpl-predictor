import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { speak } from '../audio/speech';
import { PictureView } from '../components/PictureView';
import { SpeakerButton } from '../components/ui';
import type { SpellQuestion } from '../engine/questions';
import { praise, retry, type GameProps } from './types';

interface Drag {
  tile: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
}

/**
 * Drag-and-drop spelling: drag letter tiles into the boxes (or just tap a tile
 * to drop it in the next box). A wrong letter gently bounces back.
 */
export function SpellGame({ q, onDone, feedback }: GameProps<SpellQuestion>) {
  const letters = q.word.split('');
  const [placed, setPlaced] = useState<(number | null)[]>(() => letters.map(() => null));
  const [used, setUsed] = useState<Set<number>>(new Set());
  const [shake, setShake] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [done, setDone] = useState(false);
  const mistakes = useRef(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => speak(`Spell ${q.word}!`), 300);
    return () => clearTimeout(t);
  }, [q]);

  const nextSlot = placed.findIndex((p) => p === null);

  const tryPlace = (tile: number, slot: number) => {
    if (done || slot < 0 || placed[slot] !== null) return;
    if (q.tiles[tile] === letters[slot] && slot === nextSlot) {
      sfx.tap();
      const next = [...placed];
      next[slot] = tile;
      setPlaced(next);
      setUsed((u) => new Set(u).add(tile));
      if (next.every((p) => p !== null)) {
        setDone(true);
        sfx.correct();
        const p = praise();
        feedback({ mood: 'cheer', text: p });
        void speak(q.word).then(() => speak(p));
        setTimeout(() => onDone([{ vocabIds: q.vocabIds, correct: mistakes.current === 0 }]), 1800);
      }
    } else {
      mistakes.current++;
      sfx.tryAgain();
      setShake(tile);
      setTimeout(() => setShake(null), 450);
      const r = retry();
      feedback({ mood: 'think', text: r });
      void speak(r);
    }
  };

  const onPointerDown = (e: React.PointerEvent, tile: number) => {
    if (used.has(tile) || done) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ tile, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (drag) setDrag({ ...drag, x: e.clientX, y: e.clientY });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 12;
    const tile = drag.tile;
    setDrag(null);
    if (!moved) return tryPlace(tile, nextSlot);
    const el = document.elementsFromPoint(e.clientX, e.clientY).find((x) => (x as HTMLElement).dataset?.slot !== undefined) as HTMLElement | undefined;
    if (el) tryPlace(tile, Number(el.dataset.slot));
  };

  return (
    <div ref={root} className="flex touch-none flex-col items-center gap-5" data-target={q.word} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
      <div className="flex items-center gap-3">
        <SpeakerButton text={q.word} />
        <h2 className="text-2xl font-bold sm:text-3xl">Spell the word!</h2>
      </div>

      <div className="card flex h-40 w-40 items-center justify-center">
        <PictureView picture={q.picture} size={120} />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {letters.map((l, i) => {
          const tile = placed[i];
          return (
            <div
              key={i}
              data-slot={i}
              className={`flex h-16 w-14 items-center justify-center rounded-2xl border-4 text-4xl font-bold sm:h-20 sm:w-16 sm:text-5xl ${
                tile !== null ? 'border-grass bg-green-50 text-grassdark' : i === nextSlot ? 'border-dashed border-ocean bg-sky-50' : 'border-dashed border-slate-300 bg-white'
              }`}
            >
              {tile !== null ? q.tiles[tile] : q.showHint ? <span className="text-slate-300">{l}</span> : ''}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex max-w-md flex-wrap justify-center gap-3">
        {q.tiles.map((t, i) => (
          <button
            key={i}
            type="button"
            data-letter={t}
            disabled={used.has(i)}
            onPointerDown={(e) => onPointerDown(e, i)}
            className={`flex h-16 w-16 items-center justify-center rounded-2xl border-b-[6px] border-[#cc7800] bg-sun text-4xl font-bold text-ink shadow transition-opacity sm:h-20 sm:w-20 sm:text-5xl ${
              used.has(i) ? 'opacity-0' : ''
            } ${shake === i ? 'animate-shake' : ''} ${drag?.tile === i ? 'opacity-30' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>

      {drag && (
        <div
          className="pointer-events-none fixed z-50 flex h-20 w-20 items-center justify-center rounded-2xl bg-sun text-5xl font-bold shadow-xl"
          style={{ left: drag.x - 40, top: drag.y - 40 }}
        >
          {q.tiles[drag.tile]}
        </div>
      )}
      <p className="text-sm text-slate-400">Seret huruf ke kotak, atau ketuk hurufnya.</p>
    </div>
  );
}
