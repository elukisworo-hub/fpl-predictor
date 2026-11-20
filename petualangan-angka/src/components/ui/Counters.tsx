import { motion } from 'framer-motion';
import { CoinIcon, StarIcon } from './Icons';

/** Pill-shaped counter for stars/coins shown in headers. */
export function Counter({ kind, value, testId }: { kind: 'star' | 'coin'; value: number; testId?: string }) {
  return (
    <div
      data-coin-target={kind === 'coin' ? 'true' : undefined}
      data-testid={testId}
      className="flex items-center gap-1.5 rounded-full bg-white/90 py-1 pl-1 pr-4 shadow-soft"
    >
      {kind === 'star' ? <StarIcon size={34} /> : <CoinIcon size={34} />}
      <motion.span
        key={value}
        initial={{ scale: 1.5 }}
        animate={{ scale: 1 }}
        className="min-w-[2ch] font-display text-2xl font-bold text-ink"
      >
        {value}
      </motion.span>
    </div>
  );
}

export function StarRow({ stars, size = 28, animate = false }: { stars: number; size?: number; animate?: boolean }) {
  return (
    <div className="flex items-end justify-center gap-0.5" aria-label={`${stars} bintang`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={animate ? { scale: 0, rotate: -90 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: animate ? 0.3 + i * 0.35 : 0, type: 'spring', stiffness: 260, damping: 12 }}
          style={{ marginBottom: i === 1 ? size * 0.25 : 0 }}
        >
          <StarIcon size={i === 1 ? size * 1.2 : size} filled={i < stars} />
        </motion.div>
      ))}
    </div>
  );
}
