import { motion, type TargetAndTransition } from 'framer-motion';
import { useId, type ReactNode } from 'react';
import type { CharacterId, Mood } from '../../game/types';
import { Accessory } from './Accessory';

export type DanceMove = 'bounce' | 'wiggle' | 'spin' | 'flip';

interface Props {
  id: CharacterId;
  mood?: Mood;
  size?: number;
  accessory?: string | null;
  /** When set, plays a one-off dance (change `danceKey` to replay). */
  dance?: DanceMove | null;
  danceKey?: number;
  className?: string;
  still?: boolean;
  onClick?: () => void;
  title?: string;
}

interface Palette {
  main: string;
  mainDark: string;
  light: string;
  belly: string;
  limb: string;
  feet: string;
  eye: 'dark' | 'panda';
}

const PALETTES: Record<CharacterId, Palette> = {
  foxy: { main: '#FF9B4A', mainDark: '#E8692A', light: '#FFF6EC', belly: '#FFF1DE', limb: '#F07A35', feet: '#6B3420', eye: 'dark' },
  bubu: { main: '#C08A5B', mainDark: '#8E5D38', light: '#F2D3AE', belly: '#EBC79F', limb: '#A8754A', feet: '#E6BE93', eye: 'dark' },
  mimi: { main: '#FFFFFF', mainDark: '#E3DAF3', light: '#FFE4EF', belly: '#FFEAF2', limb: '#F4EEFB', feet: '#FFD3E4', eye: 'dark' },
  pando: { main: '#FFFFFF', mainDark: '#DDE3EE', light: '#FFFFFF', belly: '#F3F6FB', limb: '#34304A', feet: '#34304A', eye: 'panda' },
};

const MOOD_ANIM: Record<Mood, TargetAndTransition> = {
  idle: { y: [0, -6, 0], rotate: 0, transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } },
  talk: { y: [0, -4, 0], rotate: 0, transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' } },
  happy: {
    y: [0, -34, 0, -18, 0],
    scaleY: [1, 1.04, 0.92, 1.02, 1],
    rotate: 0,
    transition: { duration: 0.9, repeat: Infinity, repeatDelay: 0.5, ease: 'easeOut' },
  },
  encourage: {
    rotate: [0, -6, 6, -4, 0],
    y: [0, -4, 0],
    transition: { duration: 1.6, repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut' },
  },
};

const DANCE_ANIM: Record<DanceMove, TargetAndTransition> = {
  bounce: { y: [0, -50, 0, -50, 0, -25, 0], transition: { duration: 1.3, ease: 'easeOut' } },
  wiggle: { rotate: [0, -16, 16, -16, 16, -10, 10, 0], y: [0, -10, 0, -10, 0], transition: { duration: 1.3 } },
  spin: { rotate: [0, 360], scale: [1, 1.1, 1], transition: { duration: 1, ease: 'easeInOut' } },
  flip: { y: [0, -80, -80, 0], rotate: [0, 0, -360, -360], transition: { duration: 1.3, times: [0, 0.3, 0.8, 1] } },
};

export function Character({
  id,
  mood = 'idle',
  size = 160,
  accessory = null,
  dance = null,
  danceKey = 0,
  className = '',
  still = false,
  onClick,
  title,
}: Props) {
  const rawId = useId();
  const uid = `c${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const p = PALETTES[id];
  const animate = still ? { y: 0, rotate: 0 } : dance ? DANCE_ANIM[dance] : MOOD_ANIM[mood];
  const armAngle = mood === 'happy' || dance ? 150 : mood === 'encourage' ? 60 : 22;

  return (
    <motion.div
      key={dance ? `dance-${danceKey}` : `mood-${mood}`}
      className={`relative inline-block select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size * 1.22, transformOrigin: '50% 90%' }}
      animate={animate}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={title ?? id}
    >
      <svg viewBox="0 -24 200 244" width="100%" height="100%" overflow="visible">
        <defs>
          <radialGradient id={`${uid}-head`} cx="38%" cy="30%" r="75%">
            <stop offset="0" stopColor={lighten(p.main)} />
            <stop offset="0.55" stopColor={p.main} />
            <stop offset="1" stopColor={p.mainDark} />
          </radialGradient>
          <radialGradient id={`${uid}-body`} cx="40%" cy="25%" r="80%">
            <stop offset="0" stopColor={lighten(p.main)} />
            <stop offset="0.6" stopColor={p.main} />
            <stop offset="1" stopColor={p.mainDark} />
          </radialGradient>
          <radialGradient id={`${uid}-limb`} cx="35%" cy="30%" r="80%">
            <stop offset="0" stopColor={lighten(p.limb, 0.25)} />
            <stop offset="1" stopColor={p.limb} />
          </radialGradient>
        </defs>

        {/* ground shadow */}
        <ellipse cx="100" cy="212" rx="52" ry="7" fill="rgba(40,30,70,0.15)" />

        {/* behind the body */}
        {backParts(id, p)}

        {/* feet */}
        <ellipse cx="76" cy="200" rx="18" ry="11" fill={p.feet} />
        <ellipse cx="124" cy="200" rx="18" ry="11" fill={p.feet} />

        {/* body */}
        <ellipse cx="100" cy="160" rx="46" ry="42" fill={`url(#${uid}-body)`} />
        <ellipse cx="100" cy="168" rx="28" ry="26" fill={p.belly} opacity={id === 'pando' ? 0.6 : 1} />

        {/* arms */}
        <g style={{ transform: `translate(58px,142px) rotate(${armAngle}deg)`, transition: 'transform .35s ease' }}>
          <ellipse cx="0" cy="16" rx="11" ry="19" fill={`url(#${uid}-limb)`} />
        </g>
        <g style={{ transform: `translate(142px,142px) rotate(${-armAngle}deg)`, transition: 'transform .35s ease' }}>
          <ellipse cx="0" cy="16" rx="11" ry="19" fill={`url(#${uid}-limb)`} />
        </g>

        <Accessory id={accessory} layer="neck" />

        {/* ears */}
        {ears(id, p, uid)}

        {/* head */}
        <circle cx="100" cy="88" r="58" fill={`url(#${uid}-head)`} />
        {faceBase(id, p)}
        <ellipse cx="78" cy="56" rx="18" ry="11" fill="#fff" opacity="0.35" transform="rotate(-25 78 56)" />

        {/* face */}
        <Eyes mood={mood} panda={p.eye === 'panda'} />
        <ellipse cx="66" cy="110" rx="9" ry="6" fill="#FF7FA6" opacity="0.45" />
        <ellipse cx="134" cy="110" rx="9" ry="6" fill="#FF7FA6" opacity="0.45" />
        {nose(id)}
        <Mouth mood={mood} rabbit={id === 'mimi'} />

        <Accessory id={accessory} layer="head" />
      </svg>
    </motion.div>
  );
}

function lighten(hex: string, amt = 0.35): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function backParts(id: CharacterId, p: Palette): ReactNode {
  if (id === 'foxy')
    return (
      <g className="char-tail">
        <ellipse cx="160" cy="150" rx="18" ry="40" fill={p.main} transform="rotate(40 160 150)" />
        <ellipse cx="181" cy="124" rx="12" ry="14" fill="#FFF6EC" transform="rotate(40 181 124)" />
      </g>
    );
  if (id === 'mimi') return <circle cx="145" cy="182" r="15" fill="#fff" stroke="#EDE6F7" strokeWidth="2" />;
  if (id === 'bubu') return <circle cx="144" cy="186" r="9" fill={p.mainDark} />;
  return <circle cx="144" cy="186" r="9" fill="#34304A" />;
}

function ears(id: CharacterId, p: Palette, uid: string): ReactNode {
  switch (id) {
    case 'foxy':
      return (
        <g>
          <path d="M56 66 L48 6 L96 38 Z" fill={`url(#${uid}-head)`} stroke={p.main} strokeWidth="8" strokeLinejoin="round" />
          <path d="M144 66 L152 6 L104 38 Z" fill={`url(#${uid}-head)`} stroke={p.main} strokeWidth="8" strokeLinejoin="round" />
          <path d="M62 52 L56 20 L84 38 Z" fill="#6B3420" stroke="#6B3420" strokeWidth="4" strokeLinejoin="round" />
          <path d="M138 52 L144 20 L116 38 Z" fill="#6B3420" stroke="#6B3420" strokeWidth="4" strokeLinejoin="round" />
        </g>
      );
    case 'bubu':
      return (
        <g>
          <circle cx="54" cy="42" r="21" fill={p.main} />
          <circle cx="146" cy="42" r="21" fill={p.main} />
          <circle cx="54" cy="43" r="11" fill={p.light} />
          <circle cx="146" cy="43" r="11" fill={p.light} />
        </g>
      );
    case 'mimi':
      return (
        <g>
          <g className="char-ear-l">
            <ellipse cx="76" cy="10" rx="15" ry="40" fill="#fff" stroke="#EDE6F7" strokeWidth="2" transform="rotate(-10 76 10)" />
            <ellipse cx="76" cy="12" rx="7" ry="28" fill="#FFC2D9" transform="rotate(-10 76 12)" />
          </g>
          <g className="char-ear-r">
            <ellipse cx="124" cy="10" rx="15" ry="40" fill="#fff" stroke="#EDE6F7" strokeWidth="2" transform="rotate(10 124 10)" />
            <ellipse cx="124" cy="12" rx="7" ry="28" fill="#FFC2D9" transform="rotate(10 124 12)" />
          </g>
        </g>
      );
    case 'pando':
      return (
        <g>
          <circle cx="56" cy="40" r="20" fill="#34304A" />
          <circle cx="144" cy="40" r="20" fill="#34304A" />
          <circle cx="52" cy="35" r="6" fill="#fff" opacity="0.15" />
        </g>
      );
  }
}

function faceBase(id: CharacterId, p: Palette): ReactNode {
  switch (id) {
    case 'foxy':
      return (
        <path
          d="M44 96 Q56 142 100 146 Q144 142 156 96 Q132 114 100 106 Q68 114 44 96 Z"
          fill={p.light}
        />
      );
    case 'bubu':
      return <ellipse cx="100" cy="112" rx="27" ry="20" fill={p.light} />;
    case 'mimi':
      return null;
    case 'pando':
      return (
        <g fill="#34304A">
          <ellipse cx="79" cy="92" rx="15" ry="19" transform="rotate(-28 79 92)" />
          <ellipse cx="121" cy="92" rx="15" ry="19" transform="rotate(28 121 92)" />
        </g>
      );
  }
}

function nose(id: CharacterId): ReactNode {
  switch (id) {
    case 'foxy':
      return <ellipse cx="100" cy="104" rx="7" ry="5" fill="#2B2140" />;
    case 'bubu':
      return <ellipse cx="100" cy="103" rx="9" ry="6.5" fill="#3A2418" />;
    case 'mimi':
      return (
        <g>
          <path d="M94 101 Q100 98 106 101 Q100 108 94 101 Z" fill="#FF7AA8" />
          <g stroke="#CFC4E2" strokeWidth="2" strokeLinecap="round">
            <path d="M58 104 L80 106" />
            <path d="M58 114 L80 110" />
            <path d="M142 104 L120 106" />
            <path d="M142 114 L120 110" />
          </g>
        </g>
      );
    case 'pando':
      return <ellipse cx="100" cy="106" rx="8" ry="5.5" fill="#34304A" />;
  }
}

function Eyes({ mood, panda }: { mood: Mood; panda: boolean }) {
  const stroke = panda ? '#FFFFFF' : '#2B2140';
  if (mood === 'happy') {
    return (
      <g fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round">
        <path d="M71 95 Q80 83 89 95" />
        <path d="M111 95 Q120 83 129 95" />
      </g>
    );
  }
  const eye = (cx: number) =>
    panda ? (
      <g className="char-blink" key={cx}>
        <ellipse cx={cx} cy="92" rx="7.5" ry="8.5" fill="#fff" />
        <ellipse cx={cx + 0.5} cy="93" rx="5" ry="6" fill="#1E1A2E" />
        <circle cx={cx + 2.5} cy="90" r="2.2" fill="#fff" />
      </g>
    ) : (
      <g className="char-blink" key={cx}>
        <ellipse cx={cx} cy="92" rx="7.5" ry="9.5" fill="#2B2140" />
        <circle cx={cx + 2.6} cy="88" r="2.8" fill="#fff" />
        <circle cx={cx - 2.4} cy="96" r="1.3" fill="#fff" />
      </g>
    );
  return (
    <g>
      {eye(80)}
      {eye(120)}
      {mood === 'encourage' && (
        <g fill="none" stroke={panda ? '#34304A' : '#2B2140'} strokeWidth="3.5" strokeLinecap="round" opacity="0.8">
          <path d="M70 72 Q79 67 88 71" />
          <path d="M112 71 Q121 67 130 72" />
        </g>
      )}
    </g>
  );
}

function Mouth({ mood, rabbit }: { mood: Mood; rabbit: boolean }) {
  if (mood === 'happy') {
    return (
      <g>
        <path d="M86 112 Q100 134 114 112 Z" fill="#7A2E3A" stroke="#2B2140" strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="100" cy="124" rx="7" ry="4" fill="#FF8FA8" />
      </g>
    );
  }
  if (mood === 'talk') {
    return <ellipse className="char-talk" cx="100" cy="118" rx="7" ry="6" fill="#7A2E3A" stroke="#2B2140" strokeWidth="2.5" />;
  }
  const d = mood === 'encourage' ? 'M88 113 Q100 124 112 113' : 'M91 113 Q100 120 109 113';
  return (
    <g>
      <path d={d} fill="none" stroke="#2B2140" strokeWidth="3.5" strokeLinecap="round" />
      {rabbit && <rect x="96" y="116" width="8" height="7" rx="2" fill="#fff" stroke="#CFC4E2" strokeWidth="1.5" />}
    </g>
  );
}
