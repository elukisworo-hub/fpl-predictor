import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { Choice } from '../../game/types';
import { Character } from '../characters/Character';

const PALETTE = [
  { bg: 'linear-gradient(180deg,#8AD6FF,#4BB2F2)', edge: '#2A88C8' },
  { bg: 'linear-gradient(180deg,#FF9CC2,#FF6FA5)', edge: '#D9437D' },
  { bg: 'linear-gradient(180deg,#FFE066,#FFC93C)', edge: '#E0A100' },
];

interface Props {
  choices: Choice[];
  disabledValues: string[];
  correctValue: string | null;
  locked: boolean;
  onPick: (choice: Choice) => void;
  /** Dev-only: marks the correct button for automated tests. */
  debugAnswer?: string;
}

/** Huge touch-friendly answer buttons. */
export function AnswerButtons({ choices, disabledValues, correctValue, locked, onPick, debugAnswer }: Props) {
  const isCharacter = choices.some((c) => c.character);
  return (
    <div className={`grid w-full gap-3 sm:gap-5 ${isCharacter ? 'grid-cols-2' : 'grid-cols-3'}`} data-testid="answers">
      {choices.map((c, i) => {
        const p = PALETTE[i % PALETTE.length];
        const wrong = disabledValues.includes(c.value);
        const right = correctValue === c.value;
        return (
          <motion.button
            type="button"
            key={c.id}
            data-testid={`answer-${c.value}`}
            data-correct={debugAnswer === c.value ? 'true' : undefined}
            aria-label={`Jawaban ${c.label}`}
            disabled={locked || wrong}
            initial={{ y: 40, opacity: 0 }}
            animate={
              right
                ? { y: 0, opacity: 1, scale: [1, 1.15, 1.05] }
                : wrong
                  ? { y: 0, opacity: 0.45, x: [0, -8, 8, -5, 5, 0] }
                  : { y: 0, opacity: 1 }
            }
            transition={{ delay: right || wrong ? 0 : 0.3 + i * 0.1, duration: right ? 0.4 : 0.35 }}
            whileTap={locked || wrong ? undefined : { scale: 0.92, y: 5 }}
            onClick={() => onPick(c)}
            className={`relative flex flex-col items-center justify-center rounded-4xl font-display font-bold text-white outline-none focus-visible:ring-4 focus-visible:ring-white ${
              isCharacter ? 'min-h-[8.5rem] py-2 text-2xl' : 'min-h-[6.5rem] text-6xl sm:min-h-[8rem] sm:text-7xl'
            }`}
            style={{
              background: right ? 'linear-gradient(180deg,#6FF0C4,#2FCB94)' : wrong ? '#CFC8E3' : p.bg,
              boxShadow: `0 7px 0 0 ${right ? '#1E9E72' : wrong ? '#B3AACD' : p.edge}, 0 14px 24px -10px rgba(59,46,90,.45)`,
              textShadow: '0 3px 0 rgba(0,0,0,0.15)',
            }}
          >
            {c.character && <Character id={c.character} size={64} still />}
            <span>{c.label}</span>
            {right && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-mint"
              >
                <Check size={22} strokeWidth={4} />
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
