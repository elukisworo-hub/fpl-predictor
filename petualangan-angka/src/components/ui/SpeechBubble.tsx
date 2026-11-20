import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Rounded speech bubble with a tail pointing to the character on the left. */
export function SpeechBubble({ children, className = '', tail = 'left' }: { children: ReactNode; className?: string; tail?: 'left' | 'bottom' }) {
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
      className={`relative rounded-3xl bg-white px-4 py-3 font-display text-xl font-semibold text-ink shadow-soft ${className}`}
    >
      {children}
      {tail === 'left' ? (
        <span className="absolute -left-2 top-1/2 h-5 w-5 -translate-y-1/2 rotate-45 rounded-sm bg-white" />
      ) : (
        <span className="absolute -bottom-2 left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 rounded-sm bg-white" />
      )}
    </motion.div>
  );
}
