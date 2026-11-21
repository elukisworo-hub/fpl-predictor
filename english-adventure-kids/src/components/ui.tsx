import { useEffect, useState, type ReactNode } from 'react';
import { speak } from '../audio/speech';
import { sfx } from '../audio/sfx';

export function Stars({ count, max = 3, size = 22, animate = false }: { count: number; max?: number; size?: number; animate?: boolean }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`emoji ${animate && i < count ? 'animate-pop' : ''}`}
          style={{ fontSize: size, filter: i < count ? 'none' : 'grayscale(1) opacity(.3)', animationDelay: `${i * 0.35}s` }}
        >
          ⭐
        </span>
      ))}
    </span>
  );
}

export function ProgressBar({ value, color = 'bg-grass', className = '', height = 'h-4' }: { value: number; color?: string; className?: string; height?: string }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-200 ${height} ${className}`}>
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }}>
        <div className="mx-2 mt-[3px] h-1 rounded-full bg-white/40" />
      </div>
    </div>
  );
}

/** Big round speaker button. */
export function SpeakerButton({ text, size = 'lg', label, onSpeak }: { text: string; size?: 'md' | 'lg' | 'xl'; label?: string; onSpeak?: () => void }) {
  const [busy, setBusy] = useState(false);
  const dims = size === 'xl' ? 'h-24 w-24 text-5xl' : size === 'lg' ? 'h-16 w-16 text-3xl' : 'h-11 w-11 text-xl';
  return (
    <button
      type="button"
      aria-label={label ?? `Play sound: ${text}`}
      className={`btn btn-blue !rounded-full !p-0 ${dims} ${busy ? 'animate-pulse' : ''}`}
      onClick={async (e) => {
        e.stopPropagation();
        setBusy(true);
        onSpeak?.();
        await speak(text);
        setBusy(false);
      }}
    >
      <span className="emoji">🔊</span>
    </button>
  );
}

export function IconButton({ children, onClick, label, className = '' }: { children: ReactNode; onClick: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        sfx.tap();
        onClick();
      }}
      className={`flex h-12 w-12 items-center justify-center rounded-2xl border-b-4 border-slate-200 bg-white text-2xl shadow-sm active:translate-y-0.5 ${className}`}
    >
      {children}
    </button>
  );
}

const CONFETTI = ['🎉', '⭐', '🎈', '✨', '🌟', '💖', '🎊'];

export function Confetti({ count = 26 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      size: 18 + Math.random() * 22,
      ch: CONFETTI[i % CONFETTI.length],
    })),
  );
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3800);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span key={p.id} className="emoji absolute animate-fall" style={{ left: `${p.left}%`, top: '-8vh', fontSize: p.size, animationDelay: `${p.delay}s` }}>
          {p.ch}
        </span>
      ))}
    </div>
  );
}

export function Pill({ icon, value, label, className = '' }: { icon: string; value: ReactNode; label: string; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-2xl bg-white px-3 py-1.5 shadow-sm ${className}`} aria-label={label} title={label}>
      <span className="emoji text-xl">{icon}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}

/** Modal used for confirmations (e.g. leaving a stage). */
export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm animate-pop p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
