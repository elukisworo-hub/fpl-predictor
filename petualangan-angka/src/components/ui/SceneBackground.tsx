import type { ReactNode } from 'react';
import type { ThemeId } from '../../game/types';

export type SceneId = ThemeId | 'home' | 'map';

interface ThemeColors {
  skyFrom: string;
  skyTo: string;
  far: string;
  near: string;
}

export const THEME_COLORS: Record<SceneId, ThemeColors & { accent: string; label: string }> = {
  home: { skyFrom: '#6CCBFF', skyTo: '#D9F4FF', far: '#9BE07F', near: '#6ACB5C', accent: '#FFC93C', label: '#2F7D2A' },
  map: { skyFrom: '#7FD3FF', skyTo: '#E2F7FF', far: '#A4E58C', near: '#7BD06A', accent: '#FFC93C', label: '#2F7D2A' },
  forest: { skyFrom: '#8EE0FF', skyTo: '#E9FBFF', far: '#93DB7C', near: '#5DBB55', accent: '#4CC36A', label: '#1F6B2A' },
  candy: { skyFrom: '#FFC2E3', skyTo: '#FFF0F8', far: '#FFB3D6', near: '#9BEBD0', accent: '#FF6FA5', label: '#A3245A' },
  bunny: { skyFrom: '#A9E2FF', skyTo: '#F2FBFF', far: '#C3EBA0', near: '#8FD67A', accent: '#FF8A3D', label: '#8A3C00' },
  mountain: { skyFrom: '#9CCBFF', skyTo: '#E8F3FF', far: '#B7B4F2', near: '#8FCF8A', accent: '#8E6CF0', label: '#3E2B8C' },
  island: { skyFrom: '#7EE0FF', skyTo: '#FFF4D6', far: '#4CCDEB', near: '#FFE09A', accent: '#3DD6A3', label: '#0F6C78' },
  castle: { skyFrom: '#C7B6FF', skyTo: '#FFE8F6', far: '#E2CCFF', near: '#B9E59B', accent: '#B48CFF', label: '#5A3FC0' },
  dragon: { skyFrom: '#FFB8A0', skyTo: '#FFF1D6', far: '#FFC48A', near: '#A8DE8A', accent: '#FF7A59', label: '#9A3412' },
};

/** Full-screen illustrated backdrop. Content renders above it. */
export function SceneBackground({ scene, children }: { scene: SceneId; children?: ReactNode }) {
  const t = THEME_COLORS[scene];
  return (
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${t.skyFrom} 0%, ${t.skyTo} 70%)` }} />
      {/* sun */}
      <div
        className="absolute right-[8%] top-[6%] h-24 w-24 rounded-full animate-sun"
        style={{ background: 'radial-gradient(circle at 40% 40%, #FFF6B0, #FFD23F 60%, rgba(255,210,63,0) 72%)' }}
      />
      <Cloud className="left-[-10%] top-[10%] animate-cloud-slow" scale={1} />
      <Cloud className="left-[40%] top-[22%] animate-cloud-fast" scale={0.7} />
      <Cloud className="left-[75%] top-[4%] animate-cloud-slow" scale={0.55} />
      {scene === 'home' && <Rainbow />}
      <svg
        className="absolute bottom-0 left-0 w-full"
        style={{ height: '42%' }}
        viewBox="0 0 400 220"
        preserveAspectRatio="xMidYMax slice"
      >
        {landscape(scene, t)}
      </svg>
      {children}
    </div>
  );
}

function Cloud({ className, scale }: { className: string; scale: number }) {
  return (
    <svg className={`absolute ${className}`} width={180 * scale} height={80 * scale} viewBox="0 0 180 80">
      <g fill="#fff" opacity="0.92">
        <ellipse cx="60" cy="50" rx="45" ry="26" />
        <ellipse cx="100" cy="38" rx="40" ry="32" />
        <ellipse cx="135" cy="54" rx="36" ry="22" />
        <rect x="30" y="50" width="130" height="26" rx="13" />
      </g>
    </svg>
  );
}

function Rainbow() {
  const colors = ['#FF8FA8', '#FFC27A', '#FFE58A', '#A6EBA0', '#8FD3FF', '#C3A8FF'];
  return (
    <svg className="absolute left-1/2 top-[18%] w-[130%] max-w-[900px] -translate-x-1/2 opacity-70" viewBox="0 0 400 200">
      {colors.map((c, i) => (
        <path key={c} d={`M${20 + i * 12} 200 A ${180 - i * 12} ${170 - i * 12} 0 0 1 ${380 - i * 12} 200`} fill="none" stroke={c} strokeWidth="12" />
      ))}
    </svg>
  );
}

function Tree({ x, y, s = 1, color = '#4CC36A' }: { x: number; y: number; s?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-5" y="-6" width="10" height="26" rx="4" fill="#A86B3C" />
      <circle cx="0" cy="-22" r="20" fill={color} />
      <circle cx="-12" cy="-12" r="13" fill={color} />
      <circle cx="12" cy="-12" r="13" fill={color} />
      <circle cx="-6" cy="-30" r="7" fill="#fff" opacity="0.25" />
    </g>
  );
}

function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-3" y="0" width="6" height="12" fill="#8A5A34" />
      <path d="M0 -40 L18 -8 L-18 -8 Z M0 -26 L22 6 L-22 6 Z" fill="#3FA66B" />
    </g>
  );
}

function Lollipop({ x, y, s = 1, c = '#FF6FA5' }: { x: number; y: number; s?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2.5" y="0" width="5" height="40" rx="2" fill="#fff" stroke="#EBD3E2" />
      <circle cx="0" cy="-8" r="16" fill={c} />
      <path d="M0 -8 m-10 0 a10 10 0 1 1 10 10 a6 6 0 1 1 -6 -6" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
    </g>
  );
}

function House({ x, y, s = 1, roof = '#FF8A3D' }: { x: number; y: number; s?: number; roof?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-16" y="-18" width="32" height="24" rx="4" fill="#FFF5E1" />
      <path d="M-22 -16 L0 -36 L22 -16 Z" fill={roof} stroke={roof} strokeWidth="4" strokeLinejoin="round" />
      <rect x="-5" y="-8" width="10" height="14" rx="5" fill="#B07A4F" />
      <circle cx="-10" cy="-8" r="3.5" fill="#8FD3FF" />
    </g>
  );
}

function Palm({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 Q4 -24 -2 -48" stroke="#B07A4F" strokeWidth="7" fill="none" strokeLinecap="round" />
      <g fill="#3DBB6A">
        <path d="M-2 -48 Q-26 -58 -38 -40 Q-20 -50 -2 -46 Z" />
        <path d="M-2 -48 Q22 -60 36 -42 Q18 -52 -2 -46 Z" />
        <path d="M-2 -48 Q-14 -72 -30 -66 Q-12 -62 -2 -48 Z" />
        <path d="M-2 -48 Q12 -72 28 -66 Q10 -62 -2 -48 Z" />
      </g>
      <circle cx="-4" cy="-44" r="4" fill="#8A5A34" />
      <circle cx="3" cy="-44" r="4" fill="#8A5A34" />
    </g>
  );
}

function Castle({ x, y, s = 1, wall = '#FFD9F0', roof = '#B48CFF' }: { x: number; y: number; s?: number; wall?: string; roof?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-40" y="-40" width="80" height="44" fill={wall} />
      <rect x="-52" y="-62" width="22" height="66" fill={wall} />
      <rect x="30" y="-62" width="22" height="66" fill={wall} />
      <rect x="-12" y="-76" width="24" height="40" fill={wall} />
      <path d="M-56 -60 L-41 -88 L-26 -60 Z M26 -60 L41 -88 L56 -60 Z M-16 -74 L0 -104 L16 -74 Z" fill={roof} />
      <path d="M0 -104 L0 -116 L12 -111 L0 -107" fill="#FFC93C" stroke="#E0A100" strokeWidth="1" />
      <path d="M-10 4 L-10 -14 A10 10 0 0 1 10 -14 L10 4 Z" fill="#B07A4F" />
      <circle cx="-41" cy="-40" r="5" fill="#8FD3FF" />
      <circle cx="41" cy="-40" r="5" fill="#8FD3FF" />
      <circle cx="0" cy="-54" r="5" fill="#8FD3FF" />
    </g>
  );
}

function Sparkles() {
  return (
    <g fill="#fff">
      {[
        [40, 60],
        [120, 30],
        [300, 50],
        [360, 90],
        [220, 20],
      ].map(([x, y], i) => (
        <path
          key={i}
          className="animate-twinkle"
          style={{ animationDelay: `${i * 0.4}s`, transformOrigin: `${x}px ${y}px` }}
          d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2} Z`}
        />
      ))}
    </g>
  );
}

function landscape(scene: SceneId, t: ThemeColors): ReactNode {
  const hills = (
    <>
      <path d="M0 120 Q60 70 130 110 T260 100 T400 95 V220 H0 Z" fill={t.far} />
      <path d="M0 160 Q90 120 180 150 T400 140 V220 H0 Z" fill={t.near} />
    </>
  );
  switch (scene) {
    case 'forest':
      return (
        <>
          {hills}
          <Tree x={40} y={140} s={1.1} />
          <Tree x={90} y={118} s={0.8} color="#62CF6F" />
          <Tree x={330} y={128} s={1} color="#3FB35F" />
          <Tree x={375} y={140} s={0.8} />
          <g transform="translate(250 168)">
            <rect x="-4" y="-2" width="8" height="12" rx="3" fill="#FFF1DE" />
            <path d="M-14 0 Q0 -20 14 0 Z" fill="#FF5C6C" />
            <circle cx="-5" cy="-6" r="2.5" fill="#fff" />
            <circle cx="5" cy="-5" r="2" fill="#fff" />
          </g>
        </>
      );
    case 'candy':
      return (
        <>
          <path d="M0 120 Q60 80 130 110 T260 100 T400 95 V220 H0 Z" fill={t.far} />
          <path d="M0 160 Q90 120 180 150 T400 140 V220 H0 Z" fill={t.near} />
          <Lollipop x={50} y={120} s={1.1} />
          <Lollipop x={345} y={112} s={1} c="#8E6CF0" />
          <Lollipop x={390} y={132} s={0.7} c="#FFC93C" />
          <g transform="translate(110 160)">
            <path d="M0 0 L0 -36 Q0 -48 12 -48 Q24 -48 24 -36" stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M0 0 L0 -36 Q0 -48 12 -48 Q24 -48 24 -36" stroke="#FF5C7A" strokeWidth="9" strokeDasharray="6 6" fill="none" strokeLinecap="round" />
          </g>
          {[200, 240, 280].map((x, i) => (
            <path key={x} d={`M${x - 12} ${172} Q${x} ${150} ${x + 12} ${172} Z`} fill={['#FF9CC2', '#FFE066', '#8FD3FF'][i]} />
          ))}
        </>
      );
    case 'bunny':
      return (
        <>
          {hills}
          <House x={70} y={128} s={1.2} />
          <House x={330} y={118} s={1} roof="#FF6FA5" />
          <Tree x={380} y={140} s={0.7} />
          {[160, 190, 220].map((x) => (
            <g key={x} transform={`translate(${x} 178)`}>
              <path d="M-6 0 L0 16 L6 0 Z" fill="#FF8A3D" />
              <path d="M0 0 L-5 -10 M0 0 L0 -12 M0 0 L5 -10" stroke="#4CC36A" strokeWidth="3" strokeLinecap="round" />
            </g>
          ))}
        </>
      );
    case 'mountain':
      return (
        <>
          <path d="M-20 160 L80 40 L180 160 Z" fill={t.far} />
          <path d="M120 160 L250 20 L380 160 Z" fill="#A3A0EC" />
          <path d="M260 160 L360 60 L460 160 Z" fill={t.far} />
          <path d="M80 40 L60 64 L72 60 L80 70 L90 60 L100 64 Z" fill="#fff" />
          <path d="M250 20 L224 48 L238 44 L250 56 L262 44 L276 48 Z" fill="#fff" />
          <path d="M360 60 L342 82 L354 78 L362 88 L372 78 L380 82 Z" fill="#fff" />
          <path d="M0 170 Q100 140 200 165 T400 155 V220 H0 Z" fill={t.near} />
          <Pine x={40} y={170} s={1.1} />
          <Pine x={70} y={176} s={0.8} />
          <Pine x={340} y={168} s={1} />
          <Pine x={372} y={174} s={0.8} />
        </>
      );
    case 'island':
      return (
        <>
          <rect x="0" y="120" width="400" height="100" fill={t.far} />
          <path d="M0 132 Q25 124 50 132 T100 132 T150 132 T200 132 T250 132 T300 132 T350 132 T400 132" stroke="#9BEAFF" strokeWidth="4" fill="none" />
          <path d="M40 170 Q200 120 360 170 V220 H40 Z" fill={t.near} />
          <Palm x={90} y={162} s={1.2} />
          <Palm x={310} y={160} s={1} />
          <g transform="translate(200 150)">
            <ellipse cx="0" cy="0" rx="10" ry="13" fill="#FFC93C" stroke="#E0A100" strokeWidth="2" />
            <path d="M-6 -12 L0 -26 L6 -12 M-10 -10 L-6 -22 M10 -10 L6 -22" stroke="#3DBB6A" strokeWidth="4" strokeLinecap="round" />
          </g>
        </>
      );
    case 'castle':
      return (
        <>
          <Sparkles />
          <path d="M0 130 Q100 100 200 125 T400 115 V220 H0 Z" fill={t.far} />
          <Castle x={200} y={130} s={1.1} />
          <path d="M0 170 Q100 140 200 165 T400 155 V220 H0 Z" fill={t.near} />
          <Tree x={50} y={170} s={0.8} color="#7FD08A" />
          <Tree x={350} y={168} s={0.9} color="#7FD08A" />
        </>
      );
    case 'dragon':
      return (
        <>
          <path d="M-10 150 L70 70 Q80 62 90 70 L170 150 Z" fill={t.far} />
          <path d="M70 70 Q80 50 92 66" stroke="#fff" strokeWidth="6" fill="none" opacity="0.6" />
          <path d="M230 150 L310 60 L390 150 Z" fill="#FFB27A" />
          <Castle x={200} y={150} s={0.8} wall="#FFE7C2" roof="#FF7A59" />
          <path d="M0 175 Q100 150 200 170 T400 160 V220 H0 Z" fill={t.near} />
          <Tree x={60} y={180} s={0.8} color="#6FCB6A" />
          <Tree x={350} y={178} s={0.8} color="#6FCB6A" />
        </>
      );
    default:
      return (
        <>
          {hills}
          <Tree x={40} y={150} s={1} />
          <Tree x={360} y={140} s={1.1} color="#3FB35F" />
          {[120, 150, 260, 300].map((x, i) => (
            <g key={x} transform={`translate(${x} ${178 + (i % 2) * 8})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 4} cy={Math.sin((a * Math.PI) / 180) * 4} r="3.5" fill={['#FF9CC2', '#FFE066', '#C3A8FF', '#fff'][i]} />
              ))}
              <circle r="2.5" fill="#FFC93C" />
            </g>
          ))}
        </>
      );
  }
}
