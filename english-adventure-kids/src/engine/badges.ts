import { WORLDS } from '../content/worlds';
import type { ProgressState } from '../store/model';
import { isMastered } from './mastery';
import { currentStreak, isWorldComplete, totalStars } from './progress';

export interface Badge {
  id: string;
  icon: string;
  name: string;
  nameId: string;
  check: (s: ProgressState) => boolean;
}

const mastered = (s: ProgressState) => Object.values(s.words).filter(isMastered).length;
const worldsDone = (s: ProgressState) => WORLDS.filter((w) => isWorldComplete(s, w.id)).length;
const learnDays = (s: ProgressState) => Object.values(s.days).filter((d) => d.games > 0).length;

export const BADGES: Badge[] = [
  { id: 'first-stage', icon: '🚀', name: 'First Step', nameId: 'Stage pertama selesai', check: (s) => Object.values(s.stages).some((x) => x.completed) },
  { id: 'stars-10', icon: '⭐', name: 'Star Collector', nameId: 'Kumpulkan 10 bintang', check: (s) => totalStars(s) >= 10 },
  { id: 'stars-50', icon: '🌟', name: 'Super Star', nameId: 'Kumpulkan 50 bintang', check: (s) => totalStars(s) >= 50 },
  { id: 'perfect', icon: '💯', name: 'Perfect!', nameId: 'Dapat 3 bintang di satu stage', check: (s) => Object.values(s.stages).some((x) => x.stars === 3) },
  { id: 'world-1', icon: '🏰', name: 'Explorer', nameId: 'Selesaikan 1 world', check: (s) => worldsDone(s) >= 1 },
  { id: 'world-5', icon: '🗺️', name: 'Adventurer', nameId: 'Selesaikan 5 world', check: (s) => worldsDone(s) >= 5 },
  { id: 'starters', icon: '🏆', name: 'Starters Champion', nameId: 'Selesaikan semua world Starters', check: (s) => worldsDone(s) >= WORLDS.length },
  { id: 'words-20', icon: '📚', name: 'Word Explorer', nameId: 'Kuasai 20 kata', check: (s) => mastered(s) >= 20 },
  { id: 'words-100', icon: '🧠', name: 'Word Wizard', nameId: 'Kuasai 100 kata', check: (s) => mastered(s) >= 100 },
  { id: 'streak-3', icon: '🔥', name: 'Three Days', nameId: 'Belajar 3 hari berturut-turut', check: (s) => currentStreak(s) >= 3 },
  { id: 'days-7', icon: '📅', name: 'Busy Bee', nameId: 'Belajar di 7 hari berbeda', check: (s) => learnDays(s) >= 7 },
  { id: 'speaker', icon: '🎤', name: 'Brave Speaker', nameId: 'Berlatih bicara 10 kali', check: (s) => s.speaking.tries >= 10 },
  { id: 'listener', icon: '👂', name: 'Good Listener', nameId: 'Jawab benar 50 soal mendengar', check: (s) => s.skills.listening.correct >= 50 },
  { id: 'reviewer', icon: '🔁', name: 'Review Hero', nameId: 'Selesaikan 5 sesi review', check: (s) => s.sessions.filter((x) => x.kind === 'review').length >= 5 },
];

/** Award any newly earned badges; returns updated state and the new badges. */
export function awardBadges(state: ProgressState, now = new Date()): { state: ProgressState; earned: Badge[] } {
  const earned = BADGES.filter((b) => !state.badges[b.id] && b.check(state));
  if (!earned.length) return { state, earned };
  const badges = { ...state.badges };
  for (const b of earned) badges[b.id] = now.toISOString();
  return { state: { ...state, badges }, earned };
}
