import { LEVELS, STAGE_BY_ID, WORLDS, WORLD_BY_ID } from '../content/worlds';
import type { StageDef, WorldDef } from '../content/types';
import type { ProgressState, SessionRecord } from '../store/model';
import { emptyDay } from './mastery';
import { addDays, dayKey } from './util';

/* ---------------- Unlocking ---------------- */

export function isStageDone(state: ProgressState, stageId: string): boolean {
  return !!state.stages[stageId]?.completed;
}

/** A world opens once every required stage of the previous world is complete. */
export function isWorldUnlocked(state: ProgressState, worldId: string): boolean {
  const w = WORLD_BY_ID[worldId];
  if (!w) return false;
  if (w.index === 1) return true;
  const prev = WORLDS.find((x) => x.index === w.index - 1);
  return !!prev && isWorldComplete(state, prev.id);
}

export function isWorldComplete(state: ProgressState, worldId: string): boolean {
  return WORLD_BY_ID[worldId].stages.filter((s) => !s.optional).every((s) => isStageDone(state, s.id));
}

/** First stage of an unlocked world is open; others open after the previous one. */
export function isStageUnlocked(state: ProgressState, stageId: string): boolean {
  const stage = STAGE_BY_ID[stageId];
  if (!stage || !isWorldUnlocked(state, stage.worldId)) return false;
  const stages = WORLD_BY_ID[stage.worldId].stages;
  const i = stages.findIndex((s) => s.id === stageId);
  if (i <= 0) return true;
  // Skip over optional stages when checking the predecessor.
  for (let j = i - 1; j >= 0; j--) {
    if (!stages[j].optional) return isStageDone(state, stages[j].id);
  }
  return true;
}

export function isLevelComplete(state: ProgressState, level: string): boolean {
  return WORLDS.filter((w) => w.level === level).every((w) => isWorldComplete(state, w.id));
}

export function isLevelUnlocked(state: ProgressState, levelId: string): boolean {
  const i = LEVELS.findIndex((l) => l.id === levelId);
  if (i <= 0) return true;
  return isLevelComplete(state, LEVELS[i - 1].id);
}

/** Where "Continue Learning" should take the child. */
export function nextStage(state: ProgressState): StageDef | null {
  for (const w of WORLDS) {
    if (!isWorldUnlocked(state, w.id)) break;
    const s = w.stages.find((st) => !isStageDone(state, st.id) && isStageUnlocked(state, st.id));
    if (s) return s;
  }
  return null;
}

export function worldStars(state: ProgressState, w: WorldDef): { stars: number; max: number; done: number; total: number } {
  const stars = w.stages.reduce((a, s) => a + (state.stages[s.id]?.stars ?? 0), 0);
  const done = w.stages.filter((s) => isStageDone(state, s.id)).length;
  return { stars, max: w.stages.length * 3, done, total: w.stages.length };
}

export function totalStars(state: ProgressState): number {
  return Object.values(state.stages).reduce((a, s) => a + (s.stars ?? 0), 0);
}

export function overallProgress(state: ProgressState): number {
  const all = WORLDS.flatMap((w) => w.stages);
  return all.filter((s) => isStageDone(state, s.id)).length / all.length;
}

/* ---------------- Stars, XP and streak ---------------- */

/** Finishing always earns at least one star: effort is rewarded, never punished. */
export function starsFor(correct: number, total: number): number {
  if (total === 0) return 3;
  const acc = correct / total;
  if (acc >= 0.85) return 3;
  if (acc >= 0.6) return 2;
  return 1;
}

/** Days in a row (ending today, or yesterday if the child hasn't played yet today). */
export function currentStreak(state: ProgressState, today = dayKey()): number {
  const active = (k: string) => (state.days[k]?.games ?? 0) > 0;
  let cursor = active(today) ? today : addDays(today, -1);
  let n = 0;
  while (active(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export const XP = {
  stageBase: 10,
  perStar: 5,
  firstClear: 10,
  replayFactor: 0.5,
  consistency: 5,
  review: 15,
  missions: 20,
};

export interface SessionResult {
  kind: 'stage' | 'review';
  stageId?: string;
  correct: number;
  total: number;
  seconds: number;
}

export interface SessionOutcome {
  state: ProgressState;
  stars: number;
  xp: number;
  firstClear: boolean;
  newBest: boolean;
  consistencyBonus: boolean;
  unlockedWorld: WorldDef | null;
}

export function applySession(state: ProgressState, r: SessionResult, now = new Date()): SessionOutcome {
  const today = dayKey(now);
  const stars = starsFor(r.correct, r.total);
  const acc = r.total ? r.correct / r.total : 1;
  const yesterdayActive = (state.days[addDays(today, -1)]?.games ?? 0) > 0;
  const firstToday = (state.days[today]?.games ?? 0) === 0;
  const consistencyBonus = firstToday && yesterdayActive;

  let xp = 0;
  let firstClear = false;
  let newBest = false;
  let stages = state.stages;
  let unlockedWorld: WorldDef | null = null;

  if (r.kind === 'stage' && r.stageId) {
    const prev = state.stages[r.stageId];
    firstClear = !prev?.completed;
    newBest = !!prev && stars > prev.stars;
    const base = XP.stageBase + stars * XP.perStar;
    xp = firstClear ? base + XP.firstClear : newBest ? base : Math.max(5, Math.round(base * XP.replayFactor));
    stages = {
      ...state.stages,
      [r.stageId]: {
        completed: true,
        stars: Math.max(stars, prev?.stars ?? 0),
        bestAccuracy: Math.max(acc, prev?.bestAccuracy ?? 0),
        plays: (prev?.plays ?? 0) + 1,
        lastPlayed: now.toISOString(),
      },
    };
  } else {
    xp = XP.review + stars * 2;
  }
  if (consistencyBonus) xp += XP.consistency;

  const day = state.days[today] ?? emptyDay(today);
  const record: SessionRecord = {
    at: now.toISOString(),
    kind: r.kind,
    stageId: r.stageId,
    stars,
    correct: r.correct,
    wrong: r.total - r.correct,
    seconds: r.seconds,
    xp,
  };

  const next: ProgressState = {
    ...state,
    xp: state.xp + xp,
    stages,
    days: {
      ...state.days,
      [today]: {
        ...day,
        xp: day.xp + xp,
        games: day.games + 1,
        stages: day.stages + (r.kind === 'stage' ? 1 : 0),
        reviews: day.reviews + (r.kind === 'review' ? 1 : 0),
      },
    },
    sessions: [...state.sessions, record].slice(-300),
  };

  if (r.kind === 'stage' && r.stageId && firstClear) {
    const w = WORLD_BY_ID[STAGE_BY_ID[r.stageId].worldId];
    const nextWorld = WORLDS.find((x) => x.index === w.index + 1);
    if (nextWorld && !isWorldUnlocked(state, nextWorld.id) && isWorldUnlocked(next, nextWorld.id)) unlockedWorld = nextWorld;
  }

  return { state: next, stars, xp, firstClear, newBest, consistencyBonus, unlockedWorld };
}
