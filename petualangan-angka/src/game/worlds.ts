import type { QuestionKind, Op, Slot, StageDef, WorldDef } from './types';

const s = (kind: QuestionKind, op: Op | 'mix'): Slot => ({ kind, op });

function stage(min: number, max: number, slots: Slot[]): StageDef {
  return { min, max, slots };
}

/**
 * The seven worlds. Each stage lists exactly five question "slots" and the
 * number range used for the big number (the sum, or the starting number in a
 * subtraction). Difficulty rises gently from stage to stage and world to world.
 */
export const WORLDS: WorldDef[] = [
  {
    id: 1,
    name: 'Hutan Ceria',
    topic: 'Penjumlahan 1–5',
    difficulty: 'Sangat Mudah',
    guide: 'foxy',
    theme: 'forest',
    intro: 'Halo! Aku Foxy. Ayo kita belajar menambah di Hutan Ceria!',
    stages: [
      stage(2, 4, [s('countAdd', '+'), s('countAdd', '+'), s('equation', '+'), s('countAdd', '+'), s('equation', '+')]),
      stage(2, 5, [s('countAdd', '+'), s('equation', '+'), s('countAdd', '+'), s('equation', '+'), s('equation', '+')]),
      stage(3, 5, [s('equation', '+'), s('countAdd', '+'), s('missing', '+'), s('equation', '+'), s('countAdd', '+')]),
      stage(3, 5, [s('equation', '+'), s('missing', '+'), s('countAdd', '+'), s('missing', '+'), s('equation', '+')]),
      stage(3, 5, [s('word', '+'), s('equation', '+'), s('missing', '+'), s('countAdd', '+'), s('word', '+')]),
    ],
  },
  {
    id: 2,
    name: 'Negeri Permen',
    topic: 'Pengurangan 1–5',
    difficulty: 'Sangat Mudah',
    guide: 'bubu',
    theme: 'candy',
    intro: 'Hai, aku Bubu! Di Negeri Permen kita belajar mengurangi.',
    stages: [
      stage(2, 4, [s('countSub', '-'), s('countSub', '-'), s('equation', '-'), s('countSub', '-'), s('equation', '-')]),
      stage(2, 5, [s('countSub', '-'), s('equation', '-'), s('countSub', '-'), s('equation', '-'), s('equation', '-')]),
      stage(3, 5, [s('equation', '-'), s('countSub', '-'), s('missing', '-'), s('equation', '-'), s('countSub', '-')]),
      stage(3, 5, [s('equation', '-'), s('missing', '-'), s('countSub', '-'), s('missing', '-'), s('equation', '-')]),
      stage(3, 5, [s('word', '-'), s('equation', '-'), s('missing', '-'), s('countSub', '-'), s('word', '-')]),
    ],
  },
  {
    id: 3,
    name: 'Desa Kelinci',
    topic: 'Penjumlahan 1–10',
    difficulty: 'Mudah',
    guide: 'foxy',
    theme: 'bunny',
    intro: 'Selamat datang di Desa Kelinci! Sekarang angkanya sampai 10.',
    stages: [
      stage(3, 6, [s('countAdd', '+'), s('equation', '+'), s('countAdd', '+'), s('equation', '+'), s('countAdd', '+')]),
      stage(4, 7, [s('equation', '+'), s('countAdd', '+'), s('equation', '+'), s('missing', '+'), s('countAdd', '+')]),
      stage(5, 8, [s('equation', '+'), s('missing', '+'), s('countAdd', '+'), s('equation', '+'), s('word', '+')]),
      stage(5, 9, [s('missing', '+'), s('equation', '+'), s('word', '+'), s('countAdd', '+'), s('missing', '+')]),
      stage(6, 10, [s('equation', '+'), s('missing', '+'), s('word', '+'), s('equation', '+'), s('missing', '+')]),
    ],
  },
  {
    id: 4,
    name: 'Gunung Beruang',
    topic: 'Pengurangan 1–10',
    difficulty: 'Mudah',
    guide: 'bubu',
    theme: 'mountain',
    intro: 'Ayo mendaki Gunung Beruang! Kita kurangi angka sampai 10.',
    stages: [
      stage(3, 6, [s('countSub', '-'), s('equation', '-'), s('countSub', '-'), s('equation', '-'), s('countSub', '-')]),
      stage(4, 7, [s('equation', '-'), s('countSub', '-'), s('equation', '-'), s('missing', '-'), s('countSub', '-')]),
      stage(5, 8, [s('equation', '-'), s('missing', '-'), s('countSub', '-'), s('equation', '-'), s('word', '-')]),
      stage(5, 9, [s('missing', '-'), s('equation', '-'), s('word', '-'), s('countSub', '-'), s('missing', '-')]),
      stage(6, 10, [s('equation', '-'), s('missing', '-'), s('word', '-'), s('equation', '-'), s('missing', '-')]),
    ],
  },
  {
    id: 5,
    name: 'Pulau Buah',
    topic: 'Tambah & Kurang 1–10',
    difficulty: 'Sedang',
    guide: 'pando',
    theme: 'island',
    intro: 'Pulau Buah penuh kejutan! Ada tambah, ada kurang.',
    stages: [
      stage(4, 8, [s('equation', '+'), s('countSub', '-'), s('equation', '-'), s('countAdd', '+'), s('equation', 'mix')]),
      stage(5, 9, [s('countAdd', '+'), s('equation', 'mix'), s('countSub', '-'), s('missing', '+'), s('equation', 'mix')]),
      stage(5, 10, [s('equation', 'mix'), s('missing', 'mix'), s('countSub', '-'), s('word', 'mix'), s('equation', 'mix')]),
      stage(6, 10, [s('missing', 'mix'), s('equation', 'mix'), s('word', 'mix'), s('countAdd', '+'), s('missing', 'mix')]),
      stage(6, 10, [s('equation', 'mix'), s('missing', 'mix'), s('word', 'mix'), s('equation', 'mix'), s('word', 'mix')]),
    ],
  },
  {
    id: 6,
    name: 'Istana Ajaib',
    topic: 'Soal Cerita',
    difficulty: 'Sedang',
    guide: 'mimi',
    theme: 'castle',
    intro: 'Aku Mimi! Di Istana Ajaib, setiap soal punya cerita seru.',
    stages: [
      stage(3, 6, [s('word', '+'), s('word', '+'), s('word', '-'), s('word', '+'), s('word', '-')]),
      stage(3, 8, [s('word', '-'), s('word', '+'), s('word', '-'), s('word', '+'), s('word', '-')]),
      stage(4, 10, [s('word', 'mix'), s('word', 'mix'), s('compare', 'mix'), s('word', 'mix'), s('word', 'mix')]),
      stage(5, 10, [s('word', 'mix'), s('compare', 'mix'), s('word', 'mix'), s('countSub', '-'), s('word', 'mix')]),
      stage(5, 10, [s('word', 'mix'), s('word', 'mix'), s('compare', 'mix'), s('word', 'mix'), s('missing', 'mix')]),
    ],
  },
  {
    id: 7,
    name: 'Kerajaan Naga',
    topic: 'Campuran & Logika',
    difficulty: 'Menantang',
    guide: 'pando',
    theme: 'dragon',
    intro: 'Kerajaan Naga adalah petualangan terakhir. Kamu pasti bisa!',
    stages: [
      stage(6, 12, [s('equation', 'mix'), s('sequence', 'mix'), s('compare', 'mix'), s('missing', '+'), s('word', 'mix')]),
      stage(8, 14, [s('equation', 'mix'), s('biggest', 'mix'), s('missing', 'mix'), s('sequence', 'mix'), s('word', 'mix')]),
      stage(10, 16, [s('word', 'mix'), s('equation', 'mix'), s('sequence', 'mix'), s('compare', 'mix'), s('missing', 'mix')]),
      stage(10, 18, [s('missing', 'mix'), s('biggest', 'mix'), s('word', 'mix'), s('sequence', 'mix'), s('equation', 'mix')]),
      stage(12, 20, [s('equation', 'mix'), s('sequence', 'mix'), s('word', 'mix'), s('compare', 'mix'), s('missing', 'mix')]),
    ],
  },
];

export const STAGES_PER_WORLD = 5;
export const TOTAL_STAGES = WORLDS.length * STAGES_PER_WORLD;
export const MAX_STARS = TOTAL_STAGES * 3;

export function getWorld(id: number): WorldDef {
  const w = WORLDS.find((x) => x.id === id);
  if (!w) throw new Error(`Unknown world ${id}`);
  return w;
}
