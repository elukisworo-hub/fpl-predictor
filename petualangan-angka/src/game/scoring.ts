export const QUESTIONS_PER_STAGE = 5;
export const POINTS_PER_CORRECT = 20;
export const MAX_SCORE = QUESTIONS_PER_STAGE * POINTS_PER_CORRECT;
/** Minimum correct answers needed to pass a stage. */
export const PASS_CORRECT = 3;

export const COINS_PER_CORRECT = 2;
export const COINS_PER_STAR = 5;
export const FIRST_CLEAR_BONUS = 10;
export const WORLD_COMPLETE_BONUS = 50;

export function scoreFor(correct: number): number {
  return clampCorrect(correct) * POINTS_PER_CORRECT;
}

/** 5 → 3★, 4 → 2★, 3 → 1★, fewer → 0★ (retry). */
export function starsFor(correct: number): number {
  const c = clampCorrect(correct);
  if (c >= 5) return 3;
  if (c === 4) return 2;
  if (c === 3) return 1;
  return 0;
}

export function isPassed(correct: number): boolean {
  return clampCorrect(correct) >= PASS_CORRECT;
}

/** Coins are always given for effort (even when retrying is needed). */
export function coinsFor(correct: number, stars: number, firstClear: boolean, worldCompleted: boolean): number {
  return (
    clampCorrect(correct) * COINS_PER_CORRECT +
    stars * COINS_PER_STAR +
    (firstClear ? FIRST_CLEAR_BONUS : 0) +
    (worldCompleted ? WORLD_COMPLETE_BONUS : 0)
  );
}

function clampCorrect(correct: number): number {
  if (!Number.isFinite(correct)) return 0;
  return Math.max(0, Math.min(QUESTIONS_PER_STAGE, Math.floor(correct)));
}
