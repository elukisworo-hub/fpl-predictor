import type { ItemId } from '../../game/types';

const BALLOON_COLORS = ['#FF5C7A', '#5BC0F8', '#FFC93C', '#3DD6A3', '#A07BFF', '#FF8A3D'];

const Shine = ({ cx, cy, rx = 6, ry = 4, rot = -30 }: { cx: number; cy: number; rx?: number; ry?: number; rot?: number }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" opacity="0.55" transform={`rotate(${rot} ${cx} ${cy})`} />
);

/** Cute, rounded SVG illustrations for countable objects. */
export function ItemIcon({ id, size = 48, variant = 0 }: { id: ItemId; size?: number; variant?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" style={{ overflow: 'visible' }}>
      {draw(id, variant)}
    </svg>
  );
}

function draw(id: ItemId, variant: number) {
  switch (id) {
    case 'apple':
      return (
        <g>
          <path d="M32 18 Q32 10 38 6" stroke="#7A4A2A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M34 14 Q44 6 50 12 Q42 20 34 14 Z" fill="#4CC36A" />
          <path d="M32 20 C20 12 6 20 8 36 C10 52 22 60 32 56 C42 60 54 52 56 36 C58 20 44 12 32 20 Z" fill="#FF4D5E" stroke="#D93246" strokeWidth="2.5" />
          <Shine cx={20} cy={30} rx={6} ry={4} />
        </g>
      );
    case 'star':
      return (
        <g>
          <path
            d="M32 5 L40 22 L58 24 L45 37 L49 56 L32 46 L15 56 L19 37 L6 24 L24 22 Z"
            fill="#FFD23F"
            stroke="#F2A900"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <Shine cx={25} cy={25} rx={5} ry={3} />
        </g>
      );
    case 'balloon': {
      const c = BALLOON_COLORS[variant % BALLOON_COLORS.length];
      return (
        <g>
          <path d="M32 46 Q28 54 33 62" stroke="#8A7FA8" strokeWidth="2" fill="none" />
          <ellipse cx="32" cy="24" rx="17" ry="21" fill={c} />
          <path d="M28 44 L36 44 L32 49 Z" fill={c} />
          <Shine cx={25} cy={16} rx={5} ry={7} rot={20} />
        </g>
      );
    }
    case 'candy':
      return (
        <g>
          <path d="M14 32 L2 22 L4 42 Z" fill="#FF9CC2" stroke="#E5679A" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M50 32 L62 22 L60 42 Z" fill="#FF9CC2" stroke="#E5679A" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="32" cy="32" r="17" fill="#FF6FA5" stroke="#E5679A" strokeWidth="2.5" />
          <path d="M20 24 Q32 32 24 46 M32 16 Q44 28 36 48 M44 20 Q50 30 46 42" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.85" />
        </g>
      );
    case 'carrot':
      return (
        <g>
          <path d="M30 16 Q24 4 18 6 M32 16 Q32 2 36 2 M34 16 Q42 6 48 10" stroke="#4CC36A" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M20 18 Q32 12 44 18 Q40 44 32 60 Q24 44 20 18 Z" fill="#FF8A3D" stroke="#E0661C" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M26 28 L32 29 M30 40 L36 39 M28 48 L32 48" stroke="#E0661C" strokeWidth="2.5" strokeLinecap="round" />
          <Shine cx={26} cy={22} rx={3} ry={5} rot={10} />
        </g>
      );
    case 'butterfly':
      return (
        <g>
          <path d="M31 30 Q12 4 6 18 Q2 32 30 34 Z" fill="#B48CFF" stroke="#8E6CF0" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M33 30 Q52 4 58 18 Q62 32 34 34 Z" fill="#B48CFF" stroke="#8E6CF0" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M31 35 Q12 40 14 52 Q24 56 31 38 Z" fill="#FF9CC2" stroke="#E5679A" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M33 35 Q52 40 50 52 Q40 56 33 38 Z" fill="#FF9CC2" stroke="#E5679A" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="16" cy="20" r="4" fill="#FFE066" />
          <circle cx="48" cy="20" r="4" fill="#FFE066" />
          <ellipse cx="32" cy="34" rx="3.5" ry="14" fill="#4A3B6B" />
          <path d="M31 21 Q26 12 22 12 M33 21 Q38 12 42 12" stroke="#4A3B6B" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'bird':
      return (
        <g>
          <path d="M10 34 Q2 26 6 20 Q14 26 16 30 Z" fill="#3E9BE0" />
          <ellipse cx="32" cy="36" rx="22" ry="19" fill="#5BC0F8" stroke="#3E9BE0" strokeWidth="2.5" />
          <ellipse cx="34" cy="42" rx="13" ry="10" fill="#D8F1FF" />
          <path d="M22 34 Q30 26 38 36 Q30 42 22 34 Z" fill="#3E9BE0" />
          <circle cx="42" cy="28" r="3.5" fill="#2B2140" />
          <circle cx="43" cy="27" r="1.2" fill="#fff" />
          <path d="M52 30 L61 33 L52 37 Z" fill="#FFB020" stroke="#E08A00" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M28 54 L26 60 M36 54 L36 60" stroke="#E08A00" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'cookie':
      return (
        <g>
          <circle cx="32" cy="32" r="24" fill="#E9B26B" stroke="#C88A3E" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="19" fill="#F2C584" />
          {[
            [24, 24],
            [38, 22],
            [42, 36],
            [28, 40],
            [20, 34],
            [34, 32],
          ].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="3.4" ry="2.8" fill="#6B3E22" />
          ))}
          <Shine cx={22} cy={18} rx={5} ry={3} />
        </g>
      );
    case 'fish':
      return (
        <g>
          <path d="M46 32 L60 20 L58 44 Z" fill="#FF8A3D" stroke="#E0661C" strokeWidth="2.5" strokeLinejoin="round" />
          <ellipse cx="30" cy="32" rx="22" ry="15" fill="#FFA552" stroke="#E0661C" strokeWidth="2.5" />
          <path d="M26 18 Q32 10 40 19" fill="#FF8A3D" />
          <path d="M30 20 Q34 32 30 44 M38 22 Q42 32 38 42" stroke="#FFD08A" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="17" cy="29" r="4" fill="#fff" />
          <circle cx="16.5" cy="29.5" r="2.4" fill="#2B2140" />
          <path d="M9 36 Q12 38 14 36" stroke="#2B2140" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'flower':
      return (
        <g>
          <path d="M32 40 L32 62" stroke="#4CC36A" strokeWidth="4" strokeLinecap="round" />
          <path d="M32 54 Q42 46 48 52 Q40 58 32 54 Z" fill="#4CC36A" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              cx={32 + Math.cos(((a - 90) * Math.PI) / 180) * 12}
              cy={26 + Math.sin(((a - 90) * Math.PI) / 180) * 12}
              rx="9"
              ry="9"
              fill={['#FF6FA5', '#FF9CC2', '#B48CFF'][variant % 3]}
            />
          ))}
          <circle cx="32" cy="26" r="7.5" fill="#FFD23F" stroke="#F2A900" strokeWidth="2" />
        </g>
      );
    case 'strawberry':
      return (
        <g>
          <path d="M32 18 C14 14 8 30 14 42 C20 54 28 60 32 60 C36 60 44 54 50 42 C56 30 50 14 32 18 Z" fill="#FF3D5A" stroke="#D42A45" strokeWidth="2.5" />
          <path d="M18 16 Q26 20 32 14 Q38 20 46 16 Q42 24 32 22 Q22 24 18 16 Z" fill="#4CC36A" stroke="#36A055" strokeWidth="2" strokeLinejoin="round" />
          {[
            [24, 30],
            [32, 34],
            [40, 30],
            [26, 42],
            [38, 42],
            [32, 50],
          ].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="1.6" ry="2.4" fill="#FFE8A0" />
          ))}
          <Shine cx={20} cy={30} rx={3} ry={5} rot={20} />
        </g>
      );
    case 'duck':
      return (
        <g>
          <path d="M8 40 Q8 58 32 58 Q54 58 56 40 Q46 46 30 40 Z" fill="#FFD23F" stroke="#E0A800" strokeWidth="2.5" />
          <ellipse cx="30" cy="44" rx="22" ry="12" fill="#FFE066" stroke="#E0A800" strokeWidth="2.5" />
          <circle cx="42" cy="24" r="12" fill="#FFE066" stroke="#E0A800" strokeWidth="2.5" />
          <path d="M52 24 L62 26 L52 30 Z" fill="#FF8A3D" stroke="#E0661C" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="45" cy="21" r="2.6" fill="#2B2140" />
          <path d="M18 42 Q26 36 34 44" stroke="#E0A800" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'bunny':
      return (
        <g>
          <ellipse cx="24" cy="14" rx="6" ry="14" fill="#fff" stroke="#D8CFEA" strokeWidth="2" transform="rotate(-10 24 14)" />
          <ellipse cx="40" cy="14" rx="6" ry="14" fill="#fff" stroke="#D8CFEA" strokeWidth="2" transform="rotate(10 40 14)" />
          <ellipse cx="24" cy="15" rx="2.6" ry="9" fill="#FFC2D9" transform="rotate(-10 24 15)" />
          <ellipse cx="40" cy="15" rx="2.6" ry="9" fill="#FFC2D9" transform="rotate(10 40 15)" />
          <ellipse cx="32" cy="48" rx="18" ry="13" fill="#fff" stroke="#D8CFEA" strokeWidth="2" />
          <circle cx="32" cy="34" r="15" fill="#fff" stroke="#D8CFEA" strokeWidth="2" />
          <circle cx="26" cy="32" r="2.4" fill="#2B2140" />
          <circle cx="38" cy="32" r="2.4" fill="#2B2140" />
          <ellipse cx="32" cy="38" rx="2.4" ry="1.8" fill="#FF7AA8" />
          <ellipse cx="22" cy="39" rx="3" ry="2" fill="#FF9CC2" opacity="0.6" />
          <ellipse cx="42" cy="39" rx="3" ry="2" fill="#FF9CC2" opacity="0.6" />
        </g>
      );
  }
}
