import { useMemo, type CSSProperties } from 'react';

const COLORS = ['#FF6FA5', '#FFC93C', '#3DD6A3', '#5BC0F8', '#8E6CF0', '#FF8A3D'];

/** Lightweight CSS-only confetti burst (no canvas, cheap on phones). */
export function Confetti({ count = 60, burstKey = 0 }: { count?: number; burstKey?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.8,
        color: COLORS[i % COLORS.length],
        size: 8 + Math.random() * 8,
        drift: (Math.random() - 0.5) * 160,
        spin: (Math.random() - 0.5) * 1080,
        round: Math.random() > 0.6,
      })),
    [count, burstKey],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={`${burstKey}-${p.id}`}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.5,
              background: p.color,
              borderRadius: p.round ? '50%' : 3,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
