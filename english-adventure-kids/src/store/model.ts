import type { Skill } from '../content/types';

/** Per-word learning record (drives adaptive learning + spaced repetition). */
export interface WordStat {
  /** Times the word was shown on a Learn card. */
  seen: number;
  /** First-try correct / wrong answers across all games. */
  correct: number;
  wrong: number;
  /** Leitner box 0–5. Higher = better known, reviewed less often. */
  box: number;
  /** Date key (YYYY-MM-DD) the word is next due for review. */
  nextReview: string;
  /** Date key the box last moved (box climbs at most once per day). */
  boxDay?: string;
  introducedOn: string;
  lastSeen: string;
  /** Last up-to-6 first-try results, 1 = correct. */
  recent: number[];
}

export interface StageProgress {
  completed: boolean;
  stars: number;
  bestAccuracy: number;
  plays: number;
  lastPlayed: string;
}

export interface DayLog {
  date: string;
  seconds: number;
  xp: number;
  newWords: number;
  stages: number;
  reviews: number;
  correct: number;
  wrong: number;
  listeningCorrect: number;
  speakingTries: number;
  games: number;
  /** First-try [correct, wrong] per skill for this day (weekly reports). */
  bySkill?: Partial<Record<Skill, [number, number]>>;
}

export interface SessionRecord {
  at: string;
  kind: 'stage' | 'review';
  stageId?: string;
  stars: number;
  correct: number;
  wrong: number;
  seconds: number;
  xp: number;
}

export interface SkillStat {
  correct: number;
  wrong: number;
}

export interface Settings {
  /** Speech rate for TTS (0.6 slow – 1.0 normal). */
  speechRate: number;
  voiceURI: string | null;
  sfx: boolean;
  /**
   * Use the browser's speech recognition to check pronunciation. Off by default
   * because some browsers process audio on their servers; a parent opts in.
   */
  speechCheck: boolean;
  showTranslation: boolean;
  dailyMinutes: number;
}

export interface ProgressState {
  version: 1;
  childName: string;
  avatar: string;
  createdAt: string;
  onboarded: boolean;
  settings: Settings;
  parentPinHash: string | null;
  xp: number;
  stages: Record<string, StageProgress>;
  words: Record<string, WordStat>;
  skills: Record<Skill, SkillStat>;
  speaking: { tries: number; recognised: number };
  days: Record<string, DayLog>;
  sessions: SessionRecord[];
  missionsClaimed: Record<string, boolean>;
  badges: Record<string, string>;
}

export const DEFAULT_SETTINGS: Settings = {
  speechRate: 0.85,
  voiceURI: null,
  sfx: true,
  speechCheck: false,
  showTranslation: true,
  dailyMinutes: 15,
};

export function createInitialState(now = new Date()): ProgressState {
  return {
    version: 1,
    childName: '',
    avatar: '🦊',
    createdAt: now.toISOString(),
    onboarded: false,
    settings: { ...DEFAULT_SETTINGS },
    parentPinHash: null,
    xp: 0,
    stages: {},
    words: {},
    skills: {
      listening: { correct: 0, wrong: 0 },
      speaking: { correct: 0, wrong: 0 },
      reading: { correct: 0, wrong: 0 },
      writing: { correct: 0, wrong: 0 },
    },
    speaking: { tries: 0, recognised: 0 },
    days: {},
    sessions: [],
    missionsClaimed: {},
    badges: {},
  };
}

/** Fill in any fields missing from older saves so the app never crashes on load. */
export function migrate(raw: unknown): ProgressState {
  const base = createInitialState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<ProgressState>;
  return {
    ...base,
    ...r,
    version: 1,
    settings: { ...base.settings, ...(r.settings ?? {}) },
    skills: { ...base.skills, ...(r.skills ?? {}) },
    speaking: { ...base.speaking, ...(r.speaking ?? {}) },
    stages: r.stages ?? {},
    words: r.words ?? {},
    days: r.days ?? {},
    sessions: Array.isArray(r.sessions) ? r.sessions : [],
    missionsClaimed: r.missionsClaimed ?? {},
    badges: r.badges ?? {},
  };
}
