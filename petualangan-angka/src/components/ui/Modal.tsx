import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function Modal({ open, children, onBackdrop }: { open: boolean; children: ReactNode; onBackdrop?: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onBackdrop}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-5xl bg-cream p-6 text-center shadow-soft"
            initial={{ scale: 0.6, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
