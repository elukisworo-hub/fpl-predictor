import { speak } from '../audio/speech';

export type Mood = 'happy' | 'cheer' | 'think' | 'wave';

/** Olly the Owl — the friendly guide. Pure SVG, no image assets. */
export function Owl({ mood = 'happy', size = 120, className = '' }: { mood?: Mood; size?: number; className?: string }) {
  const wingUp = mood === 'cheer';
  const wave = mood === 'wave';
  const closedEyes = mood === 'cheer';
  const lookUp = mood === 'think';
  return (
    <svg viewBox="0 0 120 130" width={size} height={size * (130 / 120)} className={className} aria-label="Olly the owl" role="img">
      {/* ear tufts */}
      <path d="M28 30 L22 6 L44 22 Z" fill="#e8812f" />
      <path d="M92 30 L98 6 L76 22 Z" fill="#e8812f" />
      {/* wings */}
      <g style={{ transformOrigin: '22px 70px', transform: wingUp ? 'rotate(-55deg)' : wave ? 'rotate(-35deg)' : 'rotate(0deg)', transition: 'transform .3s' }}>
        <ellipse cx="18" cy="78" rx="12" ry="26" fill="#e8812f" />
      </g>
      <g style={{ transformOrigin: '98px 70px', transform: wingUp ? 'rotate(55deg)' : 'rotate(0deg)', transition: 'transform .3s' }}>
        <ellipse cx="102" cy="78" rx="12" ry="26" fill="#e8812f" />
      </g>
      {/* body */}
      <ellipse cx="60" cy="72" rx="44" ry="50" fill="#ff9f43" />
      <ellipse cx="60" cy="88" rx="28" ry="30" fill="#ffe3bf" />
      {/* belly feathers */}
      <path d="M48 84 q4 5 8 0 M60 84 q4 5 8 0 M54 96 q4 5 8 0" stroke="#f3b97a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* eyes */}
      <circle cx="42" cy="52" r="17" fill="#fff" />
      <circle cx="78" cy="52" r="17" fill="#fff" />
      {closedEyes ? (
        <>
          <path d="M33 54 q9 -10 18 0" stroke="#3c2a1e" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M69 54 q9 -10 18 0" stroke="#3c2a1e" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <g className="animate-blink" style={{ transformOrigin: '60px 52px' }}>
          <circle cx={lookUp ? 45 : 44} cy={lookUp ? 46 : 54} r="8" fill="#3c2a1e" />
          <circle cx={lookUp ? 81 : 80} cy={lookUp ? 46 : 54} r="8" fill="#3c2a1e" />
          <circle cx={lookUp ? 48 : 47} cy={lookUp ? 43 : 51} r="2.6" fill="#fff" />
          <circle cx={lookUp ? 84 : 83} cy={lookUp ? 43 : 51} r="2.6" fill="#fff" />
        </g>
      )}
      {/* cheeks */}
      <circle cx="30" cy="68" r="5" fill="#ff7b9c" opacity=".55" />
      <circle cx="90" cy="68" r="5" fill="#ff7b9c" opacity=".55" />
      {/* beak */}
      <path d="M54 62 L66 62 L60 73 Z" fill="#ffc93c" stroke="#e8a317" strokeWidth="1.5" strokeLinejoin="round" />
      {/* feet */}
      <path d="M44 120 l-5 7 M44 120 l0 8 M44 120 l5 7 M76 120 l-5 7 M76 120 l0 8 M76 120 l5 7" stroke="#e8a317" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Mascot with a speech bubble. Tapping repeats the line aloud. */
export function MascotSays({
  text,
  mood = 'happy',
  size = 96,
  sub,
  bubbleClass = '',
}: {
  text: string;
  mood?: Mood;
  size?: number;
  sub?: string;
  bubbleClass?: string;
}) {
  return (
    <button type="button" className="flex items-end gap-2 text-left" onClick={() => speak(text)} aria-label={`Olly says: ${text}`}>
      <Owl mood={mood} size={size} className="shrink-0 animate-bob drop-shadow" />
      <div className={`relative mb-6 rounded-3xl bg-white px-4 py-3 shadow-chunkysm ${bubbleClass}`}>
        <span className="absolute -left-2 bottom-4 h-4 w-4 rotate-45 bg-white" />
        <p className="relative text-lg font-semibold leading-snug text-ink sm:text-xl">{text}</p>
        {sub && <p className="relative mt-0.5 text-xs font-medium text-slate-400">{sub}</p>}
      </div>
    </button>
  );
}
