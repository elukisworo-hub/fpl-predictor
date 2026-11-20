import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ItemId, Question } from '../../game/types';
import { ItemIcon } from '../items/ItemIcon';
import { NumberLine } from './Explanation';

/** Gentle visual hint — never gives the answer away directly. */
export function HintPanel({ question }: { question: Question }) {
  const e = question.explanation;
  let text = 'Sentuh gambarnya satu per satu sambil berhitung!';
  let body: ReactNode = null;

  if (question.kind === 'equation' || question.kind === 'missing') {
    if (e.type === 'arith') {
      const size = e.a + e.b > 12 ? 24 : 32;
      if (e.unknown === 'result' && e.op === '+') {
        text = `Hitung semua gambarnya: ${e.a} dan ${e.b}.`;
        body = <Dots item={e.item} counts={[e.a, e.b]} size={size} />;
      } else if (e.unknown === 'result') {
        text = `Ada ${e.a}. Tutup ${e.b} dengan jarimu, lalu hitung sisanya!`;
        body = <Dots item={e.item} counts={[e.a]} size={size} />;
      } else if (e.op === '+' && e.unknown === 'b') {
        text = `Sudah ada ${e.a}. Berapa lagi supaya jadi ${e.result}?`;
        body = <Dots item={e.item} counts={[e.a]} ghosts={e.b} size={size} />;
      } else if (e.op === '+') {
        text = `Supaya jadi ${e.result}, sudah ada ${e.b}. Hitung yang kosong!`;
        body = <Dots item={e.item} counts={[]} ghosts={e.a} after={e.b} size={size} />;
      } else {
        text = `Mulai dari ${e.a}. Kurangi satu-satu sampai tersisa ${e.result}.`;
        body = <Dots item={e.item} counts={[e.a]} size={size} />;
      }
    }
  } else if (question.kind === 'compare') {
    text = 'Hitung gambar setiap teman, lalu bandingkan!';
  } else if (question.kind === 'sequence' && e.type === 'sequence') {
    text = e.step === 1 ? 'Hitung maju satu-satu, ya!' : 'Lompat dua-dua: tambah 2 setiap langkah!';
  } else if (question.kind === 'biggest' && e.type === 'biggest') {
    text = 'Angka yang lebih besar ada lebih ke kanan!';
    body = <NumberLine max={Math.max(...e.numbers)} marks={[]} />;
  } else if (question.kind === 'countSub' || question.visual?.type === 'sub') {
    text = 'Hitung yang masih ada saja, ya!';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex w-full flex-col items-center gap-2 rounded-3xl border-4 border-sun/60 bg-[#FFF6D6] p-3"
      data-testid="hint"
    >
      <div className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <Lightbulb className="shrink-0 text-[#E0A100]" fill="#FFE066" />
        <span>{text}</span>
      </div>
      {body}
    </motion.div>
  );
}

function Dots({
  item,
  counts,
  ghosts = 0,
  after = 0,
  size,
}: {
  item: ItemId;
  counts: number[];
  ghosts?: number;
  after?: number;
  size: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {ghosts > 0 && counts.length === 0 && <Ghosts n={ghosts} size={size} />}
      {counts.map((c, gi) => (
        <div key={gi} className="flex flex-wrap gap-0.5 rounded-2xl bg-white/80 p-1.5">
          {Array.from({ length: c }, (_, i) => (
            <ItemIcon key={i} id={item} size={size} variant={i} />
          ))}
        </div>
      ))}
      {ghosts > 0 && counts.length > 0 && <Ghosts n={ghosts} size={size} />}
      {after > 0 && (
        <div className="flex flex-wrap gap-0.5 rounded-2xl bg-white/80 p-1.5">
          {Array.from({ length: after }, (_, i) => (
            <ItemIcon key={i} id={item} size={size} variant={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function Ghosts({ n, size }: { n: number; size: number }) {
  return (
    <div className="flex flex-wrap gap-0.5 rounded-2xl bg-white/50 p-1.5">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="rounded-xl border-[3px] border-dashed border-grape/50" style={{ width: size, height: size }} />
      ))}
    </div>
  );
}
