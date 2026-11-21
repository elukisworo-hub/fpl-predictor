import type { Skill } from '../content/types';
import { VOCAB_BY_ID } from '../content/vocabulary';
import type { DayLog, ProgressState, WordStat } from '../store/model';
import { addDays, dayKey } from './util';

/** Days until the next review for each Leitner box. */
export const REVIEW_INTERVALS = [0, 1, 2, 4, 7, 14];
export const MASTERED_BOX = 3;

export type MasteryLevel = 'new' | 'learning' | 'weak' | 'mastered';

export function emptyDay(date: string): DayLog {
  return { date, seconds: 0, xp: 0, newWords: 0, stages: 0, reviews: 0, correct: 0, wrong: 0, listeningCorrect: 0, speakingTries: 0, games: 0 };
}

export function newWordStat(today: string, now: string): WordStat {
  return { seen: 0, correct: 0, wrong: 0, box: 0, nextReview: today, introducedOn: today, lastSeen: now, recent: [] };
}

export function recentAccuracy(s: WordStat): number {
  if (!s.recent.length) return 0;
  return s.recent.reduce((a, b) => a + b, 0) / s.recent.length;
}

export function isWeak(s: WordStat | undefined): boolean {
  return !!s && s.recent.length >= 2 && recentAccuracy(s) < 0.6;
}

export function isMastered(s: WordStat | undefined): boolean {
  return !!s && s.box >= MASTERED_BOX && !isWeak(s);
}

export function masteryLevel(s: WordStat | undefined): MasteryLevel {
  if (!s || s.correct + s.wrong === 0) return 'new';
  if (isWeak(s)) return 'weak';
  if (isMastered(s)) return 'mastered';
  return 'learning';
}

function bumpDay(state: ProgressState, today: string, patch: (d: DayLog) => DayLog): ProgressState {
  const day = state.days[today] ?? emptyDay(today);
  return { ...state, days: { ...state.days, [today]: patch(day) } };
}

/** Child looked at a Learn card for these words. */
export function markSeen(state: ProgressState, vocabIds: string[], now = new Date()): ProgressState {
  const today = dayKey(now);
  const iso = now.toISOString();
  const words = { ...state.words };
  let fresh = 0;
  for (const id of vocabIds) {
    const prev = words[id];
    if (!prev) fresh++;
    const s = prev ?? newWordStat(today, iso);
    words[id] = { ...s, seen: s.seen + 1, lastSeen: iso };
  }
  const next = { ...state, words };
  return fresh ? bumpDay(next, today, (d) => ({ ...d, newWords: d.newWords + fresh })) : next;
}

/**
 * Record a first-try answer. Correct answers move the word up one Leitner box
 * (at most once per day so mastery reflects spaced practice); a miss moves it
 * down one box and makes it due again today so it comes back soon.
 */
export function recordAnswer(
  state: ProgressState,
  vocabIds: string[],
  skill: Skill,
  correct: boolean,
  now = new Date(),
): ProgressState {
  const today = dayKey(now);
  const iso = now.toISOString();
  const words = { ...state.words };
  let fresh = 0;
  for (const id of vocabIds) {
    if (!VOCAB_BY_ID[id]) continue;
    const prev = words[id];
    if (!prev) fresh++;
    const s = prev ?? newWordStat(today, iso);
    let box = s.box;
    let boxDay = s.boxDay;
    if (correct && boxDay !== today) {
      box = Math.min(5, box + 1);
      boxDay = today;
    } else if (!correct) {
      box = Math.max(0, box - 1);
      boxDay = today;
    }
    words[id] = {
      ...s,
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
      box,
      boxDay,
      nextReview: correct ? addDays(today, REVIEW_INTERVALS[box]) : today,
      lastSeen: iso,
      recent: [...s.recent, correct ? 1 : 0].slice(-6),
    };
  }
  const sk = state.skills[skill];
  let next: ProgressState = {
    ...state,
    words,
    skills: { ...state.skills, [skill]: { correct: sk.correct + (correct ? 1 : 0), wrong: sk.wrong + (correct ? 0 : 1) } },
  };
  next = bumpDay(next, today, (d) => ({
    ...d,
    newWords: d.newWords + fresh,
    correct: d.correct + (correct ? 1 : 0),
    wrong: d.wrong + (correct ? 0 : 1),
    listeningCorrect: d.listeningCorrect + (correct && skill === 'listening' ? 1 : 0),
    bySkill: {
      ...d.bySkill,
      [skill]: [(d.bySkill?.[skill]?.[0] ?? 0) + (correct ? 1 : 0), (d.bySkill?.[skill]?.[1] ?? 0) + (correct ? 0 : 1)],
    },
  }));
  return next;
}

/** Speaking attempts are tracked separately and never count as "wrong". */
export function recordSpeaking(state: ProgressState, vocabIds: string[], recognised: boolean | null, now = new Date()): ProgressState {
  const today = dayKey(now);
  let next: ProgressState = {
    ...state,
    speaking: { tries: state.speaking.tries + 1, recognised: state.speaking.recognised + (recognised ? 1 : 0) },
  };
  if (recognised) {
    const sk = next.skills.speaking;
    next = { ...next, skills: { ...next.skills, speaking: { ...sk, correct: sk.correct + 1 } } };
    next = recordWordTouch(next, vocabIds, now);
  }
  return bumpDay(next, today, (d) => ({ ...d, speakingTries: d.speakingTries + 1 }));
}

function recordWordTouch(state: ProgressState, vocabIds: string[], now: Date): ProgressState {
  const iso = now.toISOString();
  const words = { ...state.words };
  for (const id of vocabIds) if (words[id]) words[id] = { ...words[id], lastSeen: iso };
  return { ...state, words };
}

export function addStudySeconds(state: ProgressState, seconds: number, now = new Date()): ProgressState {
  const today = dayKey(now);
  return bumpDay(state, today, (d) => ({ ...d, seconds: d.seconds + seconds }));
}

/** Words the child has met, ordered by how much they need review. */
export function reviewCandidates(state: ProgressState, today = dayKey()): string[] {
  const entries = Object.entries(state.words).filter(([id]) => VOCAB_BY_ID[id]);
  const score = ([, s]: [string, WordStat]) => {
    let p = 0;
    if (isWeak(s)) p += 100;
    if (s.nextReview <= today) p += 50;
    p += (5 - s.box) * 5;
    if (s.correct + s.wrong === 0) p += 10;
    return p;
  };
  return entries.sort((a, b) => score(b) - score(a) || a[1].lastSeen.localeCompare(b[1].lastSeen)).map(([id]) => id);
}

export function dueCount(state: ProgressState, today = dayKey()): number {
  return Object.entries(state.words).filter(([id, s]) => VOCAB_BY_ID[id] && (s.nextReview <= today || isWeak(s))).length;
}
