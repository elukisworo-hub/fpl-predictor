/** Lenient pronunciation matching for young learners. */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const NUMBER_DIGITS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20',
};

/** How recognisers commonly transcribe spoken letter names. */
const LETTER_NAMES: Record<string, string[]> = {
  a: ['ay', 'hey', 'eh'], b: ['bee', 'be'], c: ['see', 'sea'], d: ['dee'], e: ['ee'], f: ['ef', 'eff'], g: ['gee', 'jee'],
  h: ['aitch', 'h'], i: ['eye', 'aye'], j: ['jay'], k: ['kay', 'ok'], l: ['el', 'elle'], m: ['em'], n: ['en', 'and'],
  o: ['oh', 'owe'], p: ['pee', 'pea'], q: ['queue', 'cue'], r: ['are', 'our'], s: ['es', 'ess'], t: ['tea', 'tee'],
  u: ['you'], v: ['vee'], w: ['double you'], x: ['ex'], y: ['why'], z: ['zed', 'zee'],
};

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** True if any transcript is close enough to the target word or phrase. */
export function speechMatches(target: string, transcripts: string[]): boolean {
  const t = norm(target);
  const variants = new Set([t]);
  if (NUMBER_DIGITS[t]) variants.add(NUMBER_DIGITS[t]);
  if (LETTER_NAMES[t]) LETTER_NAMES[t].forEach((n) => variants.add(n));
  for (const raw of transcripts) {
    const heard = norm(raw);
    if (!heard) continue;
    for (const v of variants) {
      if (heard === v || ` ${heard} `.includes(` ${v} `)) return true;
      const tol = v.length >= 6 ? 2 : v.length >= 4 ? 1 : 0;
      if (tol && heard.split(' ').some((w) => levenshtein(w, v) <= tol)) return true;
      if (v.includes(' ')) {
        const words = v.split(' ');
        const hit = words.filter((w) => heard.split(' ').includes(w)).length;
        if (hit / words.length >= 0.6) return true;
      }
    }
  }
  return false;
}
