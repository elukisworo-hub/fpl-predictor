import type { ThemeId } from '../../game/types';
import { THEME_COLORS } from './SceneBackground';

/** Round illustrated badge representing each world on the map. */
export function WorldEmblem({ theme, size = 96, locked = false }: { theme: ThemeId; size?: number; locked?: boolean }) {
  const t = THEME_COLORS[theme];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" style={{ filter: locked ? 'grayscale(1) opacity(.55)' : undefined }}>
      <circle cx="50" cy="50" r="47" fill={t.skyTo} stroke="#fff" strokeWidth="5" />
      <clipPath id={`clip-${theme}`}>
        <circle cx="50" cy="50" r="44" />
      </clipPath>
      <g clipPath={`url(#clip-${theme})`}>
        <rect x="0" y="0" width="100" height="100" fill={t.skyFrom} opacity="0.55" />
        <path d="M0 74 Q50 58 100 74 V100 H0 Z" fill={t.near} />
        {emblem(theme)}
      </g>
    </svg>
  );
}

function emblem(theme: ThemeId) {
  switch (theme) {
    case 'forest':
      return (
        <g>
          <rect x="45" y="56" width="10" height="22" rx="4" fill="#A86B3C" />
          <circle cx="50" cy="40" r="22" fill="#4CC36A" />
          <circle cx="36" cy="52" r="13" fill="#4CC36A" />
          <circle cx="64" cy="52" r="13" fill="#4CC36A" />
          <circle cx="42" cy="32" r="6" fill="#fff" opacity="0.3" />
          <circle cx="58" cy="44" r="4" fill="#FF5C6C" />
          <circle cx="40" cy="50" r="4" fill="#FF5C6C" />
        </g>
      );
    case 'candy':
      return (
        <g>
          <rect x="47" y="48" width="6" height="34" rx="3" fill="#fff" />
          <circle cx="50" cy="38" r="22" fill="#FF6FA5" />
          <path d="M50 38 m-14 0 a14 14 0 1 1 14 14 a9 9 0 1 1 -9 -9 a4 4 0 1 1 4 4" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
        </g>
      );
    case 'bunny':
      return (
        <g>
          <rect x="28" y="46" width="44" height="32" rx="5" fill="#FFF5E1" />
          <path d="M22 50 L50 22 L78 50 Z" fill="#FF8A3D" stroke="#FF8A3D" strokeWidth="5" strokeLinejoin="round" />
          <rect x="44" y="58" width="12" height="20" rx="6" fill="#B07A4F" />
          <ellipse cx="38" cy="10" rx="5" ry="14" fill="#fff" transform="rotate(-10 38 10)" />
          <ellipse cx="62" cy="10" rx="5" ry="14" fill="#fff" transform="rotate(10 62 10)" />
        </g>
      );
    case 'mountain':
      return (
        <g>
          <path d="M6 80 L42 26 L78 80 Z" fill="#A3A0EC" />
          <path d="M40 80 L70 38 L100 80 Z" fill="#8E8BE0" />
          <path d="M42 26 L32 41 L38 39 L43 45 L48 39 L53 41 Z" fill="#fff" />
          <path d="M70 38 L62 50 L68 48 L72 53 L76 48 L80 50 Z" fill="#fff" />
          <circle cx="30" cy="70" r="7" fill="#8E5D38" />
          <circle cx="25" cy="64" r="3" fill="#8E5D38" />
          <circle cx="35" cy="64" r="3" fill="#8E5D38" />
        </g>
      );
    case 'island':
      return (
        <g>
          <rect x="0" y="62" width="100" height="40" fill="#4CCDEB" />
          <ellipse cx="50" cy="76" rx="34" ry="10" fill="#FFE09A" />
          <ellipse cx="50" cy="52" rx="13" ry="17" fill="#FFC93C" stroke="#E0A100" strokeWidth="2.5" />
          <path d="M44 48 L56 58 M56 48 L44 58 M44 40 L56 50" stroke="#E0A100" strokeWidth="2" opacity="0.6" />
          <path d="M42 36 L50 16 L58 36 M36 38 L42 22 M64 38 L58 22" stroke="#3DBB6A" strokeWidth="5" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'castle':
      return (
        <g>
          <rect x="26" y="44" width="48" height="36" fill="#FFD9F0" />
          <rect x="18" y="32" width="14" height="48" fill="#FFD9F0" />
          <rect x="68" y="32" width="14" height="48" fill="#FFD9F0" />
          <path d="M15 34 L25 14 L35 34 Z M65 34 L75 14 L85 34 Z M38 46 L50 20 L62 46 Z" fill="#B48CFF" />
          <path d="M44 80 V66 A6 6 0 0 1 56 66 V80 Z" fill="#B07A4F" />
          <path d="M80 12 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#FFE066" />
        </g>
      );
    case 'dragon':
      return (
        <g>
          <path d="M28 40 L20 22 L36 34 Z M72 40 L80 22 L64 34 Z" fill="#FFC93C" />
          <ellipse cx="50" cy="56" rx="28" ry="26" fill="#6FD38A" />
          <ellipse cx="50" cy="66" rx="18" ry="12" fill="#C9F5D2" />
          <circle cx="40" cy="50" r="5" fill="#2B2140" />
          <circle cx="60" cy="50" r="5" fill="#2B2140" />
          <circle cx="41.5" cy="48.5" r="1.8" fill="#fff" />
          <circle cx="61.5" cy="48.5" r="1.8" fill="#fff" />
          <circle cx="45" cy="64" r="2" fill="#3A9A5A" />
          <circle cx="55" cy="64" r="2" fill="#3A9A5A" />
          <path d="M44 71 Q50 75 56 71" stroke="#2B2140" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <ellipse cx="32" cy="60" rx="5" ry="3" fill="#FF9CC2" opacity="0.7" />
          <ellipse cx="68" cy="60" rx="5" ry="3" fill="#FF9CC2" opacity="0.7" />
          <path d="M44 32 L50 24 L56 32" fill="#FF8A3D" />
        </g>
      );
  }
}
