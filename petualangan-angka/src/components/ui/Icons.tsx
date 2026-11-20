import { useId } from 'react';

export function StarIcon({ size = 28, filled = true }: { size?: number; filled?: boolean }) {
  const raw = useId();
  const id = `s${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#FFF3A6" />
          <stop offset="0.5" stopColor="#FFD23F" />
          <stop offset="1" stopColor="#FFA800" />
        </radialGradient>
      </defs>
      <path
        d="M32 4 L40.5 21.5 L59.5 24 L45.5 37.5 L49 56.5 L32 47.5 L15 56.5 L18.5 37.5 L4.5 24 L23.5 21.5 Z"
        fill={filled ? `url(#${id})` : '#E4DDF5'}
        stroke={filled ? '#E08A00' : '#C9BFE6'}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {filled && <ellipse cx="24" cy="24" rx="6" ry="3.5" fill="#fff" opacity="0.6" transform="rotate(-30 24 24)" />}
    </svg>
  );
}

export function CoinIcon({ size = 28 }: { size?: number }) {
  const raw = useId();
  const id = `k${raw.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#FFF0A0" />
          <stop offset="0.55" stopColor="#FFC93C" />
          <stop offset="1" stopColor="#E89B00" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="27" fill={`url(#${id})`} stroke="#C98200" strokeWidth="3.5" />
      <circle cx="32" cy="32" r="19" fill="none" stroke="#E8A400" strokeWidth="3" />
      <path d="M32 20 L35 28 L43 29 L37 35 L39 43 L32 39 L25 43 L27 35 L21 29 L29 28 Z" fill="#FFF5C2" />
    </svg>
  );
}

export function LockIcon({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path d="M20 30 V22 a12 12 0 0 1 24 0 V30" fill="none" stroke="#9C8FC4" strokeWidth="7" strokeLinecap="round" />
      <rect x="12" y="28" width="40" height="30" rx="10" fill="#B8A9F0" stroke="#8B7AD6" strokeWidth="3" />
      <circle cx="26" cy="42" r="3" fill="#3B2E5A" />
      <circle cx="38" cy="42" r="3" fill="#3B2E5A" />
      <path d="M28 49 Q32 52 36 49" stroke="#3B2E5A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="20" cy="34" rx="4" ry="2" fill="#fff" opacity="0.5" />
    </svg>
  );
}
