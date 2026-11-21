import type { ProgressState } from '../store/model';
import { emptyDay } from './mastery';
import { XP } from './progress';
import { dayKey, hashString, seeded, shuffle } from './util';

export interface Mission {
  id: string;
  icon: string;
  title: string;
  titleId: string;
  goal: number;
  progress: number;
  done: boolean;
}

type Def = Omit<Mission, 'progress' | 'done'> & { value: (s: ProgressState, today: string) => number };

const DEFS: Def[] = [
  { id: 'new-words', icon: '🆕', title: 'Learn 5 new words', titleId: 'Pelajari 5 kata baru', goal: 5, value: (s, t) => s.days[t]?.newWords ?? 0 },
  { id: 'listening', icon: '👂', title: 'Answer 5 listening questions', titleId: 'Jawab benar 5 soal mendengar', goal: 5, value: (s, t) => s.days[t]?.listeningCorrect ?? 0 },
  { id: 'stage', icon: '🎮', title: 'Play 1 stage', titleId: 'Mainkan 1 stage', goal: 1, value: (s, t) => s.days[t]?.stages ?? 0 },
  { id: 'review', icon: '🔁', title: 'Review your words', titleId: 'Ulangi kata-kata (Review)', goal: 1, value: (s, t) => s.days[t]?.reviews ?? 0 },
  { id: 'speak', icon: '🎤', title: 'Say 3 words out loud', titleId: 'Ucapkan 3 kata', goal: 3, value: (s, t) => s.days[t]?.speakingTries ?? 0 },
];

/**
 * Three missions per day, stable within the day. "Review" is only offered once
 * the child has words to review; "Play 1 stage" is always included.
 */
export function dailyMissions(state: ProgressState, today = dayKey()): Mission[] {
  const hasWords = Object.keys(state.words).length >= 4;
  const pool = DEFS.filter((d) => d.id !== 'stage' && (d.id !== 'review' || hasWords));
  const rng = seeded(hashString(today));
  const chosen = [DEFS.find((d) => d.id === 'stage')!, ...shuffle(pool, rng).slice(0, 2)];
  return chosen.map(({ value, ...d }) => {
    const progress = Math.min(d.goal, value(state, today));
    return { ...d, progress, done: progress >= d.goal };
  });
}

export function canClaimMissions(state: ProgressState, today = dayKey()): boolean {
  return !state.missionsClaimed[today] && dailyMissions(state, today).every((m) => m.done);
}

export function claimMissions(state: ProgressState, today = dayKey()): ProgressState {
  if (!canClaimMissions(state, today)) return state;
  const day = state.days[today] ?? emptyDay(today);
  return {
    ...state,
    xp: state.xp + XP.missions,
    missionsClaimed: { ...state.missionsClaimed, [today]: true },
    days: { ...state.days, [today]: { ...day, xp: day.xp + XP.missions } },
  };
}
