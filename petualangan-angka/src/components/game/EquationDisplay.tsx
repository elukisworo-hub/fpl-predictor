import { motion } from 'framer-motion';
import type { Equation } from '../../game/types';

function Token({ value, delay, highlight = false }: { value: string; delay: number; highlight?: boolean }) {
  const isUnknown = value === '?';
  return (
    <motion.span
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay, type: 'spring', stiffness: 350, damping: 15 }}
      className={`flex h-[4.5rem] min-w-[4.5rem] items-center justify-center rounded-3xl px-2 font-display text-5xl font-bold shadow-pop-sm sm:h-24 sm:min-w-24 sm:text-6xl md:h-32 md:min-w-32 md:text-7xl ${
        isUnknown
          ? 'animate-pulse-soft border-4 border-dashed border-grape bg-white text-grape'
          : highlight
            ? 'bg-mint text-white'
            : 'bg-white text-ink'
      }`}
    >
      {value}
    </motion.span>
  );
}

function Sign({ value, delay }: { value: string; delay: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      className="font-display text-5xl font-bold text-ink/80 sm:text-6xl md:text-7xl"
    >
      {value}
    </motion.span>
  );
}

/** Big, friendly equation like  [3] + [2] = [?]  */
export function EquationDisplay({ equation, reveal }: { equation: Equation; reveal?: string }) {
  const show = (v: number | null) => (v === null ? (reveal ?? '?') : String(v));
  const hl = (v: number | null) => v === null && reveal !== undefined;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3" data-testid="equation">
      <Token value={show(equation.a)} delay={0} highlight={hl(equation.a)} />
      <Sign value={equation.op === '+' ? '+' : '−'} delay={0.15} />
      <Token value={show(equation.b)} delay={0.25} highlight={hl(equation.b)} />
      <Sign value="=" delay={0.4} />
      <Token value={show(equation.result)} delay={0.5} highlight={hl(equation.result)} />
    </div>
  );
}
