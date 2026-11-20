import type { Rng } from './random';
import { pick } from './random';

const ONES = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];

/** Spell a whole number (0–99) in Indonesian, for read-aloud text. */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0) return String(n);
  if (n < 10) return ONES[n];
  if (n === 10) return 'sepuluh';
  if (n === 11) return 'sebelas';
  if (n < 20) return `${ONES[n - 10]} belas`;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const rest = n % 10;
    return `${ONES[tens]} puluh${rest ? ` ${ONES[rest]}` : ''}`;
  }
  return String(n);
}

/** Replace digits inside a sentence with Indonesian words for speech. */
export function spellNumbers(text: string): string {
  return text.replace(/\d+/g, (m) => numberToWords(Number(m)));
}

export const MSG = {
  correct: [
    'Hebat! Kamu pintar!',
    'Wah, kamu berhasil!',
    'Petualanganmu semakin seru!',
    'Luar biasa!',
    'Pintar sekali!',
    'Betul! Kamu hebat!',
  ],
  wrong: [
    'Hampir benar! Ayo kita hitung bersama!',
    'Yuk, coba sekali lagi!',
    'Tidak apa-apa, ayo kita lihat bersama!',
    'Pelan-pelan saja, kamu pasti bisa!',
  ],
  retrySuccess: ['Wah, kamu berhasil!', 'Nah, betul! Kamu hebat!', 'Yeay! Kamu tidak menyerah!'],
};

export function randomMessage(rng: Rng, list: readonly string[]): string {
  return pick(rng, list);
}

export function resultMessage(stars: number): string {
  switch (stars) {
    case 3:
      return 'Sempurna! Kamu juara!';
    case 2:
      return 'Hebat sekali! Hampir sempurna!';
    case 1:
      return 'Bagus! Terus berlatih, ya!';
    default:
      return 'Yuk, coba sekali lagi! Kamu pasti bisa!';
  }
}
