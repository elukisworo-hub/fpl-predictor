import { createDefaultSave } from './progress';
import { ACCESSORIES, DANCES } from './rewards';
import type { HistoryEntry, SaveData, StageProgress } from './types';

export const STORAGE_KEY = 'petualangan-angka:save:v1';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getStore(): Store | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

/**
 * Merge unknown (possibly old or corrupted) data into a valid SaveData.
 * Anything malformed falls back to defaults rather than crashing the game.
 */
export function sanitizeSave(raw: unknown): SaveData {
  const base = createDefaultSave();
  if (!isObj(raw)) return base;

  const stages: Record<string, StageProgress> = {};
  if (isObj(raw.stages)) {
    for (const [key, v] of Object.entries(raw.stages)) {
      if (!/^\d+-\d+$/.test(key) || !isObj(v)) continue;
      stages[key] = {
        bestScore: Math.min(100, num(v.bestScore)),
        stars: Math.min(3, num(v.stars)),
        completed: bool(v.completed, false),
        plays: num(v.plays),
      };
    }
  }

  const settings = isObj(raw.settings) ? raw.settings : {};
  const stats = isObj(raw.stats) ? raw.stats : {};
  const stat = (k: keyof SaveData['stats']) => {
    const s = isObj(stats[k]) ? (stats[k] as Record<string, unknown>) : {};
    const attempted = num(s.attempted);
    return { attempted, correct: Math.min(attempted, num(s.correct)) };
  };

  const history: HistoryEntry[] = Array.isArray(raw.history)
    ? raw.history.filter(isObj).map((h) => ({
        worldId: num(h.worldId, 1),
        stage: num(h.stage),
        score: num(h.score),
        stars: num(h.stars),
        correct: num(h.correct),
        passed: bool(h.passed, false),
        date: num(h.date),
      }))
    : [];

  const accessoryIds = ACCESSORIES.map((a) => a.id as string);
  const owned = Array.isArray(raw.ownedAccessories)
    ? raw.ownedAccessories.filter((a): a is string => typeof a === 'string' && accessoryIds.includes(a))
    : [];
  const equipped =
    typeof raw.equippedAccessory === 'string' && owned.includes(raw.equippedAccessory) ? raw.equippedAccessory : null;
  const danceIds = DANCES.map((d) => d.id as string);

  return {
    version: 1,
    stages,
    coins: num(raw.coins),
    totalCoinsEarned: num(raw.totalCoinsEarned),
    settings: {
      sound: bool(settings.sound, true),
      music: bool(settings.music, true),
      voice: bool(settings.voice, true),
    },
    stats: { addition: stat('addition'), subtraction: stat('subtraction'), word: stat('word'), logic: stat('logic') },
    history: history.slice(0, 30),
    ownedAccessories: [...new Set(owned)],
    equippedAccessory: equipped,
    badges: Array.isArray(raw.badges) ? raw.badges.filter((b): b is string => typeof b === 'string') : [],
    selectedDance:
      typeof raw.selectedDance === 'string' && danceIds.includes(raw.selectedDance) ? raw.selectedDance : 'bounce',
    celebratedWorlds: Array.isArray(raw.celebratedWorlds)
      ? raw.celebratedWorlds.filter((w): w is number => typeof w === 'number')
      : [],
  };
}

export function loadSave(store: Store | null = getStore()): SaveData {
  if (!store) return createDefaultSave();
  try {
    const text = store.getItem(STORAGE_KEY);
    if (!text) return createDefaultSave();
    return sanitizeSave(JSON.parse(text));
  } catch {
    return createDefaultSave();
  }
}

export function writeSave(save: SaveData, store: Store | null = getStore()): void {
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Storage full or blocked (private mode) — the game keeps working in memory.
  }
}

export function clearSave(store: Store | null = getStore()): void {
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
