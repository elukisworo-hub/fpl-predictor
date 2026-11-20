import { describe, expect, it } from 'vitest';
import { numberToWords, spellNumbers } from '../language';
import {
  applyStageResult,
  createDefaultSave,
  isStageUnlocked,
  isWorldUnlocked,
  nextStage,
  recordAttempt,
  totalStars,
} from '../progress';
import { coinsFor, isPassed, scoreFor, starsFor } from '../scoring';
import { loadSave, sanitizeSave, STORAGE_KEY, writeSave } from '../storage';
import type { SaveData } from '../types';

function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

function clearWorld(save: SaveData, worldId: number, correct = 5): SaveData {
  let s = save;
  for (let i = 0; i < 5; i++) s = applyStageResult(s, { worldId, stage: i, correct }).save;
  return s;
}

describe('scoring', () => {
  it('awards points and stars as specified', () => {
    expect([0, 1, 2, 3, 4, 5].map(scoreFor)).toEqual([0, 20, 40, 60, 80, 100]);
    expect([0, 1, 2, 3, 4, 5].map(starsFor)).toEqual([0, 0, 0, 1, 2, 3]);
    expect([2, 3].map(isPassed)).toEqual([false, true]);
    expect(coinsFor(5, 3, true, false)).toBe(35);
  });
});

describe('progression', () => {
  it('starts with only world 1 stage 1 unlocked', () => {
    const s = createDefaultSave();
    expect(isWorldUnlocked(s, 1)).toBe(true);
    expect(isWorldUnlocked(s, 2)).toBe(false);
    expect(isStageUnlocked(s, 1, 0)).toBe(true);
    expect(isStageUnlocked(s, 1, 1)).toBe(false);
    expect(nextStage(s)).toEqual({ worldId: 1, stage: 0 });
  });

  it('a failed stage does not unlock the next stage', () => {
    const { save, result } = applyStageResult(createDefaultSave(), { worldId: 1, stage: 0, correct: 2 });
    expect(result.passed).toBe(false);
    expect(result.stars).toBe(0);
    expect(isStageUnlocked(save, 1, 1)).toBe(false);
    expect(result.coinsEarned).toBeGreaterThan(0); // effort is still rewarded
  });

  it('passing unlocks the next stage and finishing a world unlocks the next world', () => {
    let s = applyStageResult(createDefaultSave(), { worldId: 1, stage: 0, correct: 3 }).save;
    expect(isStageUnlocked(s, 1, 1)).toBe(true);
    for (let i = 1; i < 4; i++) s = applyStageResult(s, { worldId: 1, stage: i, correct: 4 }).save;
    expect(isWorldUnlocked(s, 2)).toBe(false);
    const last = applyStageResult(s, { worldId: 1, stage: 4, correct: 5 });
    expect(last.result.worldCompleted).toBe(true);
    expect(last.result.unlockedWorld).toBe(2);
    expect(last.result.newBadges).toContain('world-1');
    expect(isWorldUnlocked(last.save, 2)).toBe(true);
    expect(nextStage(last.save)).toEqual({ worldId: 2, stage: 0 });
  });

  it('keeps the best score and stars when replaying', () => {
    let s = applyStageResult(createDefaultSave(), { worldId: 1, stage: 0, correct: 5 }).save;
    const replay = applyStageResult(s, { worldId: 1, stage: 0, correct: 3 });
    s = replay.save;
    expect(s.stages['1-0']).toMatchObject({ bestScore: 100, stars: 3, completed: true, plays: 2 });
    expect(replay.result.firstClear).toBe(false);
    expect(replay.result.worldCompleted).toBe(false);
  });

  it('awards first-step and perfect badges once', () => {
    const first = applyStageResult(createDefaultSave(), { worldId: 1, stage: 0, correct: 5 });
    expect(first.result.newBadges).toEqual(expect.arrayContaining(['first-step', 'perfect']));
    const again = applyStageResult(first.save, { worldId: 1, stage: 0, correct: 5 });
    expect(again.result.newBadges).toEqual([]);
  });

  it('unlocks all seven worlds in order and the champion badge at the end', () => {
    let s = createDefaultSave();
    for (let w = 1; w <= 7; w++) {
      expect(isWorldUnlocked(s, w)).toBe(true);
      s = clearWorld(s, w);
    }
    expect(totalStars(s)).toBe(105);
    expect(s.badges).toContain('champion');
    expect(nextStage(s)).toBeNull();
  });

  it('records statistics per category', () => {
    let s = recordAttempt(createDefaultSave(), 'addition', true);
    s = recordAttempt(s, 'addition', false);
    expect(s.stats.addition).toEqual({ attempted: 2, correct: 1 });
  });
});

describe('storage', () => {
  it('round-trips the save data', () => {
    const store = memoryStore();
    const s = clearWorld(createDefaultSave(), 1);
    writeSave(s, store);
    expect(store.data.has(STORAGE_KEY)).toBe(true);
    expect(loadSave(store)).toEqual(s);
  });

  it('recovers from corrupted data', () => {
    const store = memoryStore();
    store.setItem(STORAGE_KEY, '{not json');
    expect(loadSave(store)).toEqual(createDefaultSave());
    const weird = sanitizeSave({ coins: -5, stages: { '1-0': { stars: 9, completed: true }, bad: 1 }, equippedAccessory: 'crown' });
    expect(weird.coins).toBe(0);
    expect(weird.stages['1-0'].stars).toBe(3);
    expect(weird.stages.bad).toBeUndefined();
    expect(weird.equippedAccessory).toBeNull();
  });
});

describe('language', () => {
  it('spells numbers in Indonesian', () => {
    expect([0, 1, 10, 11, 12, 19, 20].map(numberToWords)).toEqual([
      'nol',
      'satu',
      'sepuluh',
      'sebelas',
      'dua belas',
      'sembilan belas',
      'dua puluh',
    ]);
    expect(spellNumbers('Ada 3 apel')).toBe('Ada tiga apel');
  });
});
