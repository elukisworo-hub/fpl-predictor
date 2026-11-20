/** Accessories drawn in the shared character coordinate system (head centred at 100,88). */
export function Accessory({ id, layer }: { id: string | null | undefined; layer: 'head' | 'neck' }) {
  if (!id) return null;
  if (layer === 'neck') return id === 'scarf' ? <Scarf /> : null;
  switch (id) {
    case 'partyHat':
      return (
        <g transform="rotate(-10 100 34)">
          <path d="M76 40 L100 -16 L124 40 Z" fill="#FF6FA5" stroke="#E04C86" strokeWidth="3" strokeLinejoin="round" />
          <path d="M86 18 L114 18 M80 30 L120 30" stroke="#FFE066" strokeWidth="5" strokeLinecap="round" />
          <circle cx="100" cy="-18" r="8" fill="#FFE066" stroke="#F2B705" strokeWidth="2" />
        </g>
      );
    case 'bow':
      return (
        <g transform="translate(140 40) rotate(20)">
          <path d="M0 0 L-24 -14 L-22 14 Z" fill="#FF6FA5" stroke="#D9437D" strokeWidth="3" strokeLinejoin="round" />
          <path d="M0 0 L24 -14 L22 14 Z" fill="#FF6FA5" stroke="#D9437D" strokeWidth="3" strokeLinejoin="round" />
          <circle r="7" fill="#FF9CC2" stroke="#D9437D" strokeWidth="3" />
        </g>
      );
    case 'glasses':
      return (
        <g fill="rgba(170,215,255,0.25)" stroke="#3B2E5A" strokeWidth="4.5">
          <circle cx="80" cy="92" r="15" />
          <circle cx="120" cy="92" r="15" />
          <path d="M95 90 Q100 85 105 90" fill="none" />
          <path d="M65 89 L50 84 M135 89 L150 84" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'flowerCrown': {
      const colors = ['#FF6FA5', '#FFC93C', '#8E6CF0', '#3DD6A3', '#5BC0F8', '#FF8A3D', '#FF6FA5'];
      return (
        <g>
          <path d="M48 58 Q100 14 152 58" fill="none" stroke="#4CAF50" strokeWidth="5" strokeLinecap="round" />
          {colors.map((c, i) => {
            const t = (-155 + (i * 130) / 6) * (Math.PI / 180);
            const x = 100 + Math.cos(t) * 56;
            const y = 82 + Math.sin(t) * 52;
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                {[0, 72, 144, 216, 288].map((a) => (
                  <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 6} cy={Math.sin((a * Math.PI) / 180) * 6} r="5.5" fill={c} />
                ))}
                <circle r="4" fill="#FFF3B0" />
              </g>
            );
          })}
        </g>
      );
    }
    case 'wizardHat':
      return (
        <g>
          <path d="M66 38 Q86 8 112 -26 Q114 4 134 38 Z" fill="#7B5CE0" stroke="#5A3FC0" strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="100" cy="38" rx="52" ry="11" fill="#6A4BD6" stroke="#5A3FC0" strokeWidth="3" />
          <path d="M70 32 Q100 42 130 32" stroke="#FFC93C" strokeWidth="5" fill="none" />
          <Star x={98} y={8} r={7} />
          <Star x={114} y={22} r={4.5} />
          <Star x={88} y={-6} r={4} />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path
            d="M64 42 L62 8 L82 24 L100 -2 L118 24 L138 8 L136 42 Z"
            fill="#FFD23F"
            stroke="#E0A800"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <rect x="64" y="34" width="72" height="9" rx="4" fill="#FFB703" />
          <circle cx="100" cy="22" r="5" fill="#FF6FA5" />
          <circle cx="78" cy="30" r="4" fill="#5BC0F8" />
          <circle cx="122" cy="30" r="4" fill="#3DD6A3" />
          <circle cx="62" cy="8" r="4" fill="#FFF3B0" />
          <circle cx="100" cy="-3" r="4" fill="#FFF3B0" />
          <circle cx="138" cy="8" r="4" fill="#FFF3B0" />
        </g>
      );
    default:
      return null;
  }
}

function Scarf() {
  return (
    <g>
      <path d="M56 130 Q100 158 144 130 L148 146 Q100 176 52 146 Z" fill="#FF5C6C" stroke="#D93A4B" strokeWidth="3" strokeLinejoin="round" />
      <path d="M70 140 L74 152 M90 146 L92 158 M110 146 L108 158 M130 140 L126 152" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M118 150 L132 150 L136 186 L120 188 Z" fill="#FF5C6C" stroke="#D93A4B" strokeWidth="3" strokeLinejoin="round" />
      <path d="M122 160 L133 160 M123 172 L134 172" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

function Star({ x, y, r }: { x: number; y: number; r: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`;
  }).join(' ');
  return <polygon points={pts} fill="#FFE066" />;
}
