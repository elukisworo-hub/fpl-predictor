import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { CHARACTER_NAMES } from '../../game/characters';
import type { ItemId, LeaveMode, Visual } from '../../game/types';
import { Character } from '../characters/Character';
import { ItemIcon } from '../items/ItemIcon';
import { CountBadge, ItemGroup, itemSize, leaveTarget, useLeavePhase, useTapCount } from './ItemGroup';

export function QuestionVisual({ visual, qid }: { visual: Visual; qid: string }) {
  switch (visual.type) {
    case 'add':
      return <AddVisual key={qid} item={visual.item} a={visual.a} b={visual.b} />;
    case 'sub':
      return <SubVisual key={qid} item={visual.item} a={visual.a} b={visual.b} leave={visual.leave} qid={qid} />;
    case 'compare':
      return <CompareVisual key={qid} visual={visual} />;
    case 'sequence':
      return <SequenceVisual numbers={visual.numbers} />;
  }
}

function AddVisual({ item, a, b }: { item: ItemId; a: number; b: number }) {
  const { counts, tap } = useTapCount();
  // Prefer one row ("group + group") when the items still fit at a friendly size.
  const avail = Math.min(typeof window !== 'undefined' ? window.innerWidth : 390, 768) - 140;
  const rowSize = Math.min(itemSize(a + b), Math.floor(avail / (a + b)) - 8);
  const oneRow = rowSize >= 34;
  const size = oneRow ? rowSize : itemSize(a + b);
  return (
    <div
      className={`flex items-center justify-center gap-2 ${oneRow ? 'flex-row' : 'flex-col'}`}
      data-testid="visual-add"
    >
      <div className="rounded-3xl bg-white/70 p-2 shadow-inner">
        <ItemGroup item={item} count={a} size={size} groupKey="a" counts={counts} onTap={tap} />
      </div>
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint font-display text-3xl font-bold text-white shadow-pop-sm"
      >
        +
      </motion.span>
      <div className="rounded-3xl bg-white/70 p-2 shadow-inner ring-4 ring-mint/40">
        <ItemGroup item={item} count={b} size={size} groupKey="b" counts={counts} onTap={tap} appearDelay={0.7} variantOffset={a} />
      </div>
    </div>
  );
}

function SubVisual({ item, a, b, leave, qid }: { item: ItemId; a: number; b: number; leave: LeaveMode; qid: string }) {
  const { counts, tap, reset } = useTapCount();
  const { phase, replay } = useLeavePhase(1200, qid);
  const size = itemSize(a);
  const stay = a - b;
  return (
    <div className="relative flex flex-col items-center gap-2" data-testid="visual-sub">
      <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-3xl bg-white/70 p-2 shadow-inner">
        {Array.from({ length: a }, (_, i) => {
          const leaving = i >= stay;
          const key = `s-${i}`;
          const n = counts[key];
          return (
            <div key={i} className="relative" style={{ width: size + 4, height: size + 4 }}>
              {leaving && phase === 'after' && (
                <div className="absolute inset-0.5 rounded-2xl border-[3px] border-dashed border-ink/25" />
              )}
              <motion.button
                type="button"
                aria-label={`${item} ${i + 1}`}
                className="absolute inset-0 rounded-2xl p-0.5"
                initial={{ scale: 0 }}
                animate={leaving && phase === 'after' ? leaveTarget(leave, i) : { scale: 1, x: 0, y: 0, opacity: 1, rotate: 0 }}
                transition={
                  leaving && phase === 'after'
                    ? { duration: 0.9, delay: (i - stay) * 0.15, ease: 'easeIn' }
                    : { delay: i * 0.07, type: 'spring', stiffness: 400, damping: 18 }
                }
                onClick={() => !leaving && phase === 'after' && tap(key)}
                style={{ background: n ? 'rgba(255,201,60,0.28)' : undefined, pointerEvents: leaving ? 'none' : 'auto' }}
              >
                <ItemIcon id={item} size={size} variant={i} />
                {n ? <CountBadge n={n} /> : null}
              </motion.button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          reset();
          replay();
        }}
        className="flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 font-display text-sm font-semibold text-ink shadow"
      >
        <RotateCcw size={16} /> Lihat lagi
      </button>
    </div>
  );
}

function CompareVisual({ visual }: { visual: Extract<Visual, { type: 'compare' }> }) {
  const size = Math.min(itemSize(Math.max(visual.left.count, visual.right.count)), 44);
  const { counts, tap } = useTapCount();
  return (
    <div className="flex w-full flex-col gap-2" data-testid="visual-compare">
      {[visual.left, visual.right].map((side, row) => (
        <div key={row} className="flex items-center gap-2 rounded-3xl bg-white/75 p-2 shadow-inner">
          <div className="flex w-16 shrink-0 flex-col items-center">
            <Character id={side.character} size={52} still />
            <span className="font-display text-sm font-bold text-ink">{CHARACTER_NAMES[side.character]}</span>
          </div>
          <div className="flex flex-1 flex-wrap gap-1">
            <ItemGroup item={visual.item} count={side.count} size={size} groupKey={`r${row}`} counts={counts} onTap={tap} appearDelay={row * 0.4} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SequenceVisual({ numbers, reveal }: { numbers: Array<number | null>; reveal?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3" data-testid="visual-sequence">
      {numbers.map((n, i) => (
        <motion.div
          key={i}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.12 }}
          className={`flex h-16 w-16 items-center justify-center rounded-3xl font-display text-4xl font-bold shadow-pop-sm sm:h-20 sm:w-20 sm:text-5xl ${
            n === null && reveal === undefined
              ? 'animate-pulse-soft border-4 border-dashed border-grape bg-white text-grape'
              : n === null
                ? 'bg-mint text-white'
                : 'bg-white text-ink'
          }`}
        >
          {n === null ? (reveal ?? '?') : n}
        </motion.div>
      ))}
    </div>
  );
}

