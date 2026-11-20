import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../../audio/sound';
import { speech } from '../../audio/speech';
import { numberToWords } from '../../game/language';
import type { ItemId } from '../../game/types';
import { ItemIcon } from '../items/ItemIcon';

export function itemSize(total: number): number {
  const wide = typeof window !== 'undefined' && window.innerWidth >= 768;
  const base = total <= 5 ? 58 : total <= 8 ? 48 : total <= 12 ? 40 : 32;
  return wide ? Math.round(base * 1.3) : base;
}

/** Tap-to-count state shared across several groups (numbers keep going). */
export function useTapCount() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const ref = useRef(counts);
  const tap = useCallback((key: string) => {
    const prev = ref.current;
    if (prev[key]) return;
    const n = Object.keys(prev).length + 1;
    const next = { ...prev, [key]: n };
    ref.current = next;
    setCounts(next);
    sound.pop(n - 1);
    speech.speak(numberToWords(n));
  }, []);
  const reset = useCallback(() => {
    ref.current = {};
    setCounts({});
  }, []);
  return { counts, tap, reset };
}

export function CountBadge({ n, tone = 'sun' }: { n: number; tone?: 'sun' | 'pink' | 'mint' }) {
  const bg = tone === 'sun' ? '#FFC93C' : tone === 'pink' ? '#FF6FA5' : '#2FCB94';
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -right-1 -top-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white px-1 font-display text-base font-bold text-ink shadow"
      style={{ background: bg }}
    >
      {n}
    </motion.span>
  );
}

interface ItemGroupProps {
  item: ItemId;
  count: number;
  size: number;
  groupKey: string;
  counts?: Record<string, number>;
  onTap?: (key: string) => void;
  /** Delay (s) before items pop in. */
  appearDelay?: number;
  variantOffset?: number;
}

/** A wrap of tappable items that pop in one by one. */
export function ItemGroup({ item, count, size, groupKey, counts = {}, onTap, appearDelay = 0, variantOffset = 0 }: ItemGroupProps) {
  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
      {Array.from({ length: count }, (_, i) => {
        const key = `${groupKey}-${i}`;
        const n = counts[key];
        return (
          <motion.button
            type="button"
            key={key}
            aria-label={`${item} ${i + 1}`}
            className="relative rounded-2xl p-0.5 outline-none"
            initial={{ scale: 0, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: appearDelay + i * 0.08, type: 'spring', stiffness: 400, damping: 18 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => onTap?.(key)}
            style={{ cursor: onTap ? 'pointer' : 'default', background: n ? 'rgba(255,201,60,0.28)' : undefined }}
          >
            <ItemIcon id={item} size={size} variant={i + variantOffset} />
            {n ? <CountBadge n={n} /> : null}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Plays the "objects leave" animation for subtraction questions. */
export function useLeavePhase(delayMs = 1100, resetKey: unknown = 0) {
  const [phase, setPhase] = useState<'before' | 'after'>('before');
  const [run, setRun] = useState(0);
  useEffect(() => {
    setPhase('before');
    const t = window.setTimeout(() => setPhase('after'), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs, run, resetKey]);
  return { phase, replay: () => setRun((r) => r + 1) };
}

export function leaveTarget(mode: string, i: number) {
  switch (mode) {
    case 'fly':
      return { y: -220, x: (i % 2 ? 1 : -1) * 40, opacity: 0, rotate: 15 };
    case 'swim':
    case 'walk':
    case 'give':
      return { x: 180, opacity: 0 };
    default:
      return { scale: 0, opacity: 0, rotate: -20 };
  }
}

