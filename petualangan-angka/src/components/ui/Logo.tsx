import { motion } from 'framer-motion';

const COLORS = ['#FF6FA5', '#FFC93C', '#3DD6A3', '#5BC0F8', '#8E6CF0', '#FF8A3D'];

function Word({ text, offset, size }: { text: string; offset: number; size: string }) {
  return (
    <span className="inline-flex">
      {text.split('').map((ch, i) => (
        <motion.span
          key={i}
          className={`logo-letter font-display font-bold ${size}`}
          style={{ color: COLORS[(i + offset) % COLORS.length] }}
          initial={{ y: -60, opacity: 0, rotate: -20 }}
          animate={{ y: [0, -6, 0], opacity: 1, rotate: i % 2 ? 4 : -4 }}
          transition={{
            y: { delay: 0.6 + (i + offset) * 0.05, duration: 2, repeat: Infinity, repeatDelay: 1.5 },
            opacity: { delay: (i + offset) * 0.05 },
            rotate: { delay: (i + offset) * 0.05, type: 'spring' },
          }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

export function Logo({ small = false }: { small?: boolean }) {
  const size = small ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-7xl';
  return (
    <div className="flex flex-col items-center leading-none" role="heading" aria-level={1} aria-label="Petualangan Angka">
      <Word text="Petualangan" offset={0} size={size} />
      <Word text="Angka" offset={3} size={small ? 'text-5xl sm:text-6xl' : 'text-7xl sm:text-8xl'} />
    </div>
  );
}
