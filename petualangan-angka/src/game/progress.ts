import { earnedBadgeIds, unlockedDances } from './rewards';
import { coinsFor, isPassed, scoreFor, starsFor } from './scoring';
import type { Category, SaveData, StageProgress, StageResult } from './types';
import { STAGES_PER_WORLD, WORLDS } from './worlds';

export const HISTORY_LIMIT = 30;

export const stageKey = (worldId: number, stage: number) => `${worldId}-${stage}`;

export function createDefaultSave(): SaveData {
  return {
    version: 1,
    stages: {},
    coins: 0,
    totalCoinsEarned: 0,
    settings: { sound: true, music: true, voice: true },
    stats: {
      addition: { attempted: 0, correct: 0 },
      subtraction: { attempted: 0, correct: 0 },
      word: { attempted: 0, correct: 0 },
      logic: { attempted: 0, correct: 0 },
    },
    history: [],
    ownedAccessories: [],
    equippedAccessory: null,
    badges: [],
    selectedDance: 'bounce',
    celebratedWorlds: [],
  };
}

export function getStage(save: SaveData, worldId: number, stage: number): StageProgress | undefined {
  return save.stages[stageKey(worldId, stage)];
}

export function isWorldComplete(save: SaveData, worldId: number): boolean {
  for (let i = 0; i < STAGES_PER_WORLD; i++) {
    if (!getStage(save, worldId, i)?.completed) return false;
  }
  return true;
}

/** World 1 is always open; others open once the previous world is complete. */
export function isWorldUnlocked(save: SaveData, worldId: number): boolean {
  if (worldId <= 1) return true;
  return isWorldComplete(save, worldId - 1);
}

export function isStageUnlocked(save: SaveData, worldId: number, stage: number): boolean {
  if (!isWorldUnlocked(save, worldId)) return false;
  if (stage === 0) return true;
  return !!getStage(save, worldId, stage - 1)?.completed;
}

export function worldStars(save: SaveData, worldId: number): number {
  let sum = 0;
  for (let i = 0; i < STAGES_PER_WORLD; i++) sum += getStage(save, worldId, i)?.stars ?? 0;
  return sum;
}

export function worldCompletedStages(save: SaveData, worldId: number): number {
  let n = 0;
  for (let i = 0; i < STAGES_PER_WORLD; i++) if (getStage(save, worldId, i)?.completed) n++;
  return n;
}

export function totalStars(save: SaveData): number {
  return Object.values(save.stages).reduce((sum, s) => sum + s.stars, 0);
}

export function completedStageCount(save: SaveData): number {
  return Object.values(save.stages).filter((s) => s.completed).length;
}

export function unlockedWorldIds(save: SaveData): number[] {
  return WORLDS.filter((w) => isWorldUnlocked(save, w.id)).map((w) => w.id);
}

/** The next stage to play: the first unlocked stage that is not complete. */
export function nextStage(save: SaveData): { worldId: number; stage: number } | null {
  for (const w of WORLDS) {
    if (!isWorldUnlocked(save, w.id)) break;
    for (let i = 0; i < STAGES_PER_WORLD; i++) {
      if (!getStage(save, w.id, i)?.completed) return { worldId: w.id, stage: i };
    }
  }
  return null;
}

export function hasAnyProgress(save: SaveData): boolean {
  return Object.keys(save.stages).length > 0;
}

export function recordAttempt(save: SaveData, category: Category, correct: boolean): SaveData {
  const prev = save.stats[category];
  return {
    ...save,
    stats: {
      ...save.stats,
      [category]: { attempted: prev.attempted + 1, correct: prev.correct + (correct ? 1 : 0) },
    },
  };
}

/**
 * Apply a finished stage to the save data. Pure function: returns the new save
 * and a summary of everything the child earned.
 */
export function applyStageResult(
  save: SaveData,
  input: { worldId: number; stage: number; correct: number },
  now: number = Date.now(),
): { save: SaveData; result: StageResult } {
  const { worldId, stage, correct } = input;
  const key = stageKey(worldId, stage);
  const prev = save.stages[key];
  const score = scoreFor(correct);
  const stars = starsFor(correct);
  const passed = isPassed(correct);
  const firstClear = passed && !prev?.completed;
  const worldWasComplete = isWorldComplete(save, worldId);
  const prevStars = totalStars(save);
  const prevDances = unlockedDances(prevStars);

  const updatedStage: StageProgress = {
    bestScore: Math.max(prev?.bestScore ?? 0, score),
    stars: Math.max(prev?.stars ?? 0, stars),
    completed: (prev?.completed ?? false) || passed,
    plays: (prev?.plays ?? 0) + 1,
  };

  let next: SaveData = {
    ...save,
    stages: { ...save.stages, [key]: updatedStage },
    history: [
      { worldId, stage, score, stars, correct, passed, date: now },
      ...save.history,
    ].slice(0, HISTORY_LIMIT),
  };

  const worldCompleted = !worldWasComplete && isWorldComplete(next, worldId);
  const coinsEarned = coinsFor(correct, stars, firstClear, worldCompleted);
  next = { ...next, coins: next.coins + coinsEarned, totalCoinsEarned: next.totalCoinsEarned + coinsEarned };

  const earned = earnedBadgeIds(next);
  const newBadges = earned.filter((b) => !save.badges.includes(b));
  next = { ...next, badges: [...save.badges, ...newBadges] };

  const newDances = unlockedDances(totalStars(next)).filter((d) => !prevDances.includes(d));
  const nextWorld = WORLDS.find((w) => w.id === worldId + 1);

  return {
    save: next,
    result: {
      worldId,
      stage,
      correct,
      score,
      stars,
      passed,
      coinsEarned,
      isNewBest: score > (prev?.bestScore ?? -1),
      firstClear,
      worldCompleted,
      unlockedWorld: worldCompleted && nextWorld ? nextWorld.id : null,
      newBadges,
      newDances,
    },
  };
}
