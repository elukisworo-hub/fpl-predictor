import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { sound } from '../../audio/sound';
import { speech } from '../../audio/speech';
import { CHARACTER_NAMES } from '../../game/characters';
import { numberToWords } from '../../game/language';
import type { Explanation as ExplanationData } from '../../game/types';
import { Character } from '../characters/Character';
import { ItemIcon } from '../items/ItemIcon';
import { CountBadge, itemSize } from './ItemGroup';
import { SequenceVisual } from './QuestionVisual';

type ArithData = Extract<ExplanationData, { type: 'arith' }>;

interface Step {
  i: number;
  kind: 'count' | 'cross';
  n: number;
  /** Show a number badge on this step. */
  badge: boolean;
}

interface Plan {
  groups: Array<1 | 2>;
  /** Items hidden until their step plays. */
  hiddenUntilStep: Set<number>;
  steps: Step[];
  line: string;
}

export function buildArithPlan(e: ArithData): Plan {
  const { a, b, result, op, unknown } = e;
  if (op === '+') {
    const groups = [...Array<1>(a).fill(1), ...Array<2>(b).fill(2)];
    if (unknown === 'result') {
      return {
        groups,
        hiddenUntilStep: new Set(),
        steps: groups.map((_, i) => ({ i, kind: 'count', n: i + 1, badge: true })),
        line: `Kita hitung semuanya, ada ${result}!`,
      };
    }
    if (unknown === 'b') {
      const steps: Step[] = Array.from({ length: b }, (_, k) => ({ i: a + k, kind: 'count', n: k + 1, badge: true }));
      return {
        groups,
        hiddenUntilStep: new Set(steps.map((s) => s.i)),
        steps,
        line: `Dari ${a} sampai ${result}, perlu ${b} lagi!`,
      };
    }
    return {
      groups,
      hiddenUntilStep: new Set(),
      steps: Array.from({ length: a }, (_, k) => ({ i: k, kind: 'count', n: k + 1, badge: true })),
      line: `Semuanya ${result}. Tanpa yang ${b}, ada ${a}!`,
    };
  }
  // subtraction
  const groups = Array<1>(a).fill(1);
  const crosses: Step[] = Array.from({ length: b }, (_, k) => ({
    i: a - 1 - k,
    kind: 'cross',
    n: k + 1,
    badge: unknown === 'b',
  }));
  if (unknown === 'b') {
    return {
      groups,
      hiddenUntilStep: new Set(),
      steps: crosses,
      line: `Kita coret sampai sisa ${result}. Yang dicoret ada ${b}!`,
    };
  }
  return {
    groups,
    hiddenUntilStep: new Set(),
    steps: [...crosses, ...Array.from({ length: result }, (_, k) => ({ i: k, kind: 'count' as const, n: k + 1, badge: true }))],
    line: `Kita coret ${b}, sisanya ${result}!`,
  };
}

function ArithExplanation({ e }: { e: ArithData }) {
  const plan = useMemo(() => buildArithPlan(e), [e]);
  const [played, setPlayed] = useState(0);
  const done = played >= plan.steps.length;

  useEffect(() => {
    if (done) {
      speech.speak(plan.line.replace(/\d+/g, (m) => numberToWords(Number(m))));
      return;
    }
    const t = window.setTimeout(() => {
      const step = plan.steps[played];
      sound.pop(step.kind === 'count' ? step.n - 1 : 0);
      setPlayed((p) => p + 1);
    }, played === 0 ? 500 : 520);
    return () => window.clearTimeout(t);
  }, [played, done, plan]);

  const stateOf = (i: number) => {
    let st: { counted?: number; crossed?: boolean; crossN?: number } = {};
    for (let k = 0; k < played; k++) {
      const s = plan.steps[k];
      if (s.i !== i) continue;
      if (s.kind === 'count') st = { ...st, counted: s.n };
      else st = { ...st, crossed: true, crossN: s.badge ? s.n : undefined };
    }
    return st;
  };

  const size = Math.min(itemSize(plan.groups.length), 46);
  const opSign = e.op === '+' ? '+' : '−';
  return (
    <div className="flex flex-col items-center gap-3" data-testid="explanation">
      <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-3xl bg-white/80 p-3">
        {plan.groups.map((g, i) => {
          const st = stateOf(i);
          const hidden = plan.hiddenUntilStep.has(i) && st.counted === undefined;
          return (
            <motion.div
              key={i}
              className="relative rounded-2xl p-0.5"
              style={{
                background: g === 2 ? 'rgba(61,214,163,0.18)' : undefined,
                outline: hidden ? '3px dashed rgba(59,46,90,.25)' : undefined,
                outlineOffset: -3,
              }}
              animate={{ opacity: st.crossed ? 0.35 : 1, scale: st.counted ? [1, 1.25, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ opacity: hidden ? 0 : 1 }}>
                <ItemIcon id={e.item} size={size} variant={i} />
              </div>
              {st.crossed && (
                <svg className="absolute inset-0" viewBox="0 0 10 10">
                  <path d="M2 2 L8 8 M8 2 L2 8" stroke="#FF5C7A" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              )}
              {st.counted !== undefined && <CountBadge n={st.counted} tone={g === 2 ? 'mint' : 'sun'} />}
              {st.crossN !== undefined && <CountBadge n={st.crossN} tone="pink" />}
            </motion.div>
          );
        })}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: done ? 1 : 0.0001, y: done ? 0 : 10 }}
        className="flex flex-col items-center gap-1"
      >
        <div className="rounded-2xl bg-white px-4 py-1 font-display text-4xl font-bold text-ink shadow-pop-sm">
          {e.a} {opSign} {e.b} = <span className="text-mint">{e.result}</span>
        </div>
        <p className="font-display text-xl font-semibold text-ink">{plan.line}</p>
      </motion.div>
    </div>
  );
}

function CompareExplanation({ e }: { e: Extract<ExplanationData, { type: 'compare' }> }) {
  const max = Math.max(e.left.count, e.right.count);
  const size = 30;
  useEffect(() => {
    const t = window.setTimeout(
      () => speech.speak(`${CHARACTER_NAMES[e.winner]} punya lebih ${e.askMore ? 'banyak' : 'sedikit'}!`),
      600,
    );
    return () => window.clearTimeout(t);
  }, [e]);
  return (
    <div className="flex w-full flex-col items-center gap-2" data-testid="explanation">
      {[e.left, e.right].map((side, row) => (
        <div key={row} className="flex w-full items-center gap-2 rounded-3xl bg-white/80 p-2">
          <div className="relative">
            <Character id={side.character} size={44} still />
            {side.character === e.winner && (
              <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 text-sun" fill="#FFC93C" size={22} />
            )}
          </div>
          <div className="grid flex-1 gap-0.5" style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }}>
            {Array.from({ length: side.count }, (_, i) => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 + i * 0.08 }}>
                <ItemIcon id={e.item} size={size} />
              </motion.div>
            ))}
          </div>
          <span className="w-10 text-center font-display text-3xl font-bold text-ink">{side.count}</span>
        </div>
      ))}
      <p className="font-display text-xl font-semibold text-ink">
        {CHARACTER_NAMES[e.winner]} punya lebih {e.askMore ? 'banyak' : 'sedikit'}!
      </p>
    </div>
  );
}

function SequenceExplanation({ e }: { e: Extract<ExplanationData, { type: 'sequence' }> }) {
  useEffect(() => {
    speech.speak(e.numbers.map(numberToWords).join(', '));
  }, [e]);
  return (
    <div className="flex flex-col items-center gap-2" data-testid="explanation">
      <SequenceVisual numbers={e.numbers.map((n, i) => (i === e.missingIndex ? null : n))} reveal={e.numbers[e.missingIndex]} />
      <p className="font-display text-xl font-semibold text-ink">
        Setiap langkah tambah {e.step}. Jadi angkanya {e.numbers[e.missingIndex]}!
      </p>
    </div>
  );
}

export function NumberLine({ max, marks, highlight }: { max: number; marks: number[]; highlight?: number }) {
  // Zoom in on the interesting part of the line so close numbers stay readable.
  const lo = marks.length ? Math.max(0, Math.min(...marks) - 2) : 0;
  const hi = Math.max(lo + 6, max + 1);
  const span = hi - lo;
  const pos = (n: number) => `${((n - lo) / span) * 100}%`;
  // Stagger labels that would overlap.
  const sorted = [...marks].sort((a, b) => a - b);
  const level: Record<number, number> = {};
  sorted.forEach((m, i) => {
    const prev = sorted[i - 1];
    level[m] = prev !== undefined && (m - prev) / span < 0.13 ? (level[prev] + 1) % 2 : 0;
  });
  const anyStacked = Object.values(level).some((l) => l > 0);
  return (
    <div className="w-full px-2">
      <div className={`relative mx-4 h-2 rounded-full bg-ink/20 ${anyStacked ? 'mt-[4.75rem]' : 'mt-10'}`}>
        {Array.from({ length: span + 1 }, (_, k) => {
          const n = lo + k;
          return (
            <div key={n} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(n) }}>
              <div className="h-3 w-1 rounded bg-ink/30" />
              {(span <= 12 || n % 5 === 0 || marks.includes(n)) && (
                <span className="absolute left-1/2 top-3 -translate-x-1/2 font-display text-xs text-ink/60">{n}</span>
              )}
            </div>
          );
        })}
        {marks.map((m, i) => (
          <motion.div
            key={m}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.2 }}
            className={`absolute flex h-8 min-w-8 -translate-x-1/2 items-center justify-center rounded-xl px-1 font-display text-lg font-bold shadow ${
              m === highlight ? 'bg-mint text-white' : 'bg-white text-ink'
            }`}
            style={{ left: pos(m), top: level[m] ? '-4.5rem' : '-2.4rem' }}
          >
            {m}
            {level[m] ? <span className="absolute left-1/2 top-full h-7 w-0.5 -translate-x-1/2 bg-ink/25" /> : null}
          </motion.div>
        ))}
      </div>
      <div className="mt-6 flex justify-between font-display text-sm text-ink/60">
        <span>kecil</span>
        <span>besar ➜</span>
      </div>
    </div>
  );
}

function BiggestExplanation({ e }: { e: Extract<ExplanationData, { type: 'biggest' }> }) {
  useEffect(() => {
    speech.speak(`Angka ${numberToWords(e.answer)} paling besar!`);
  }, [e]);
  return (
    <div className="flex w-full flex-col items-center gap-2" data-testid="explanation">
      <NumberLine max={Math.max(...e.numbers)} marks={e.numbers} highlight={e.answer} />
      <p className="font-display text-xl font-semibold text-ink">Angka {e.answer} paling kanan, jadi paling besar!</p>
    </div>
  );
}

export function Explanation({ data }: { data: ExplanationData }) {
  switch (data.type) {
    case 'arith':
      return <ArithExplanation e={data} />;
    case 'compare':
      return <CompareExplanation e={data} />;
    case 'sequence':
      return <SequenceExplanation e={data} />;
    case 'biggest':
      return <BiggestExplanation e={data} />;
  }
}
