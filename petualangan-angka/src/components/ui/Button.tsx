import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { sound } from '../../audio/sound';

export type ButtonColor = 'sun' | 'mint' | 'sky' | 'pink' | 'grape' | 'orange' | 'white';

const COLORS: Record<ButtonColor, { bg: string; edge: string; text: string }> = {
  sun: { bg: 'linear-gradient(180deg,#FFE066 0%,#FFC93C 100%)', edge: '#E0A100', text: '#5A3B00' },
  mint: { bg: 'linear-gradient(180deg,#6FF0C4 0%,#2FCB94 100%)', edge: '#1E9E72', text: '#0D4A35' },
  sky: { bg: 'linear-gradient(180deg,#8AD6FF 0%,#4BB2F2 100%)', edge: '#2A88C8', text: '#0B3A5C' },
  pink: { bg: 'linear-gradient(180deg,#FF9CC2 0%,#FF6FA5 100%)', edge: '#D9437D', text: '#5C0F2E' },
  grape: { bg: 'linear-gradient(180deg,#B9A0FF 0%,#8E6CF0 100%)', edge: '#6545C9', text: '#ffffff' },
  orange: { bg: 'linear-gradient(180deg,#FFB27A 0%,#FF8A3D 100%)', edge: '#D9661E', text: '#5A2200' },
  white: { bg: 'linear-gradient(180deg,#FFFFFF 0%,#F1ECFF 100%)', edge: '#C9BDF0', text: '#3B2E5A' },
};

interface BigButtonProps {
  children: ReactNode;
  onClick?: () => void;
  color?: ButtonColor;
  className?: string;
  disabled?: boolean;
  size?: 'md' | 'lg' | 'xl';
  silent?: boolean;
  ariaLabel?: string;
  testId?: string;
}

/** Chunky, squishy, game-style button with a 3D edge. */
export function BigButton({
  children,
  onClick,
  color = 'sun',
  className = '',
  disabled = false,
  size = 'lg',
  silent = false,
  ariaLabel,
  testId,
}: BigButtonProps) {
  const c = COLORS[color];
  const pad =
    size === 'xl'
      ? 'px-6 py-5 text-[1.7rem] sm:px-8 sm:text-3xl'
      : size === 'lg'
        ? 'px-5 py-4 text-2xl'
        : 'px-4 py-3 text-xl';
  return (
    <motion.button
      type="button"
      data-testid={testId}
      aria-label={ariaLabel}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.95, y: 4 }}
      onClick={() => {
        if (disabled) return;
        if (!silent) sound.click();
        onClick?.();
      }}
      className={`relative flex items-center justify-center gap-3 whitespace-nowrap rounded-3xl font-display font-bold tracking-wide outline-none focus-visible:ring-4 focus-visible:ring-white/80 disabled:cursor-not-allowed disabled:opacity-50 ${pad} ${className}`}
      style={{ background: c.bg, color: c.text, boxShadow: `0 6px 0 0 ${c.edge}, 0 12px 24px -8px rgba(59,46,90,.35)` }}
    >
      {children}
    </motion.button>
  );
}

interface IconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  color?: ButtonColor;
  className?: string;
  size?: number;
  testId?: string;
}

export function IconButton({ children, onClick, label, color = 'white', className = '', size = 56, testId }: IconButtonProps) {
  const c = COLORS[color];
  return (
    <motion.button
      type="button"
      data-testid={testId}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.9, y: 3 }}
      onClick={() => {
        sound.click();
        onClick?.();
      }}
      className={`flex shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/80 ${className}`}
      style={{
        width: size,
        height: size,
        background: c.bg,
        color: c.text,
        boxShadow: `0 4px 0 0 ${c.edge}, 0 8px 16px -6px rgba(59,46,90,.35)`,
      }}
    >
      {children}
    </motion.button>
  );
}
