import type { CSSProperties } from 'react';
import type { Picture, ShapeName } from '../content/types';

function ShapeSvg({ shape, hex, size }: { shape: ShapeName; hex: string; size: number }) {
  const stroke = hex.toLowerCase() === '#ffffff' ? '#cbd5e1' : 'rgba(0,0,0,0.12)';
  const common = { fill: hex, stroke, strokeWidth: 4, strokeLinejoin: 'round' as const };
  const el = (() => {
    switch (shape) {
      case 'circle': return <circle cx="50" cy="50" r="40" {...common} />;
      case 'square': return <rect x="12" y="12" width="76" height="76" rx="6" {...common} />;
      case 'triangle': return <path d="M50 10 L90 86 L10 86 Z" {...common} />;
      case 'rectangle': return <rect x="6" y="26" width="88" height="50" rx="6" {...common} />;
      case 'star': return <path d="M50 6 L62 37 L95 38 L69 59 L78 92 L50 73 L22 92 L31 59 L5 38 L38 37 Z" {...common} />;
      case 'heart': return <path d="M50 88 C10 60 6 34 22 20 C34 10 46 16 50 28 C54 16 66 10 78 20 C94 34 90 60 50 88 Z" {...common} />;
      case 'diamond': return <path d="M50 6 L88 50 L50 94 L12 50 Z" {...common} />;
      case 'oval': return <ellipse cx="50" cy="50" rx="30" ry="42" {...common} />;
    }
  })();
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      {el}
    </svg>
  );
}

function PaintBlob({ hex, size }: { hex: string; size: number }) {
  const stroke = hex.toLowerCase() === '#ffffff' ? '#cbd5e1' : 'rgba(0,0,0,0.12)';
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <path
        d="M52 8 C72 6 92 22 92 44 C94 66 80 92 54 92 C30 94 8 80 8 56 C6 30 28 10 52 8 Z"
        fill={hex}
        stroke={stroke}
        strokeWidth="4"
      />
      <ellipse cx="36" cy="32" rx="10" ry="6" fill="#fff" opacity=".35" transform="rotate(-25 36 32)" />
    </svg>
  );
}

function NumberCard({ n, size }: { n: number; size: number }) {
  const dots = Math.min(n, 20);
  return (
    <div className="flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <span className="font-bold leading-none text-ocean" style={{ fontSize: size * 0.5 }}>
        {n}
      </span>
      <div className="mt-1 flex max-w-full flex-wrap justify-center gap-[2px]" style={{ width: size * 0.9 }}>
        {Array.from({ length: dots }, (_, i) => (
          <span key={i} className="rounded-full bg-tangerine" style={{ width: size * 0.07, height: size * 0.07 }} />
        ))}
      </div>
    </div>
  );
}

function Scene({ thing, place, prep, size }: { thing: string; place: string; prep: string; size: number }) {
  const t = size * 0.32;
  const p = size * 0.5;
  const thingStyle: CSSProperties = (() => {
    switch (prep) {
      case 'in': return { left: '50%', top: '58%', transform: 'translate(-50%,-50%)', fontSize: t * 0.8, zIndex: 0, opacity: 0.95 };
      case 'on': return { left: '50%', top: '16%', transform: 'translate(-50%,-50%)', fontSize: t };
      case 'under': return { left: '50%', top: '92%', transform: 'translate(-50%,-50%)', fontSize: t };
      default: return { left: '86%', top: '58%', transform: 'translate(-50%,-50%)', fontSize: t };
    }
  })();
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <span className="emoji absolute" style={{ left: '50%', top: '55%', transform: 'translate(-50%,-50%)', fontSize: p, zIndex: 1, opacity: prep === 'in' ? 0.75 : 1 }}>
        {place}
      </span>
      <span className="emoji absolute" style={{ ...thingStyle, zIndex: prep === 'in' ? 2 : 3 }}>
        {thing}
      </span>
    </div>
  );
}

/** Renders any vocabulary picture at a given pixel size. */
export function PictureView({ picture, size = 96 }: { picture: Picture; size?: number }) {
  switch (picture.kind) {
    case 'emoji':
      return (
        <span className="emoji select-none" style={{ fontSize: size * 0.8 }} aria-hidden>
          {picture.value}
        </span>
      );
    case 'color': return <PaintBlob hex={picture.hex} size={size} />;
    case 'shape': return <ShapeSvg shape={picture.shape} hex={picture.hex} size={size} />;
    case 'number': return <NumberCard n={picture.n} size={size} />;
    case 'letter':
      return (
        <div className="flex items-center gap-2" style={{ height: size }}>
          <span className="font-bold leading-none text-berry" style={{ fontSize: size * 0.6 }}>
            {picture.letter}
            <span className="text-ocean">{picture.letter.toLowerCase()}</span>
          </span>
          {picture.emoji && (
            <span className="emoji" style={{ fontSize: size * 0.45 }}>
              {picture.emoji}
            </span>
          )}
        </div>
      );
    case 'scene': return <Scene {...picture} size={size} />;
  }
}
