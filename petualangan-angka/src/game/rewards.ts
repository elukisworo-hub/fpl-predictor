import type { SaveData } from './types';
import { STAGES_PER_WORLD, WORLDS } from './worlds';

// ── Accessories (bought with coins, worn by every character) ──

export type AccessoryId = 'partyHat' | 'bow' | 'glasses' | 'flowerCrown' | 'scarf' | 'wizardHat' | 'crown';

export interface AccessoryDef {
  id: AccessoryId;
  name: string;
  cost: number;
}

export const ACCESSORIES: AccessoryDef[] = [
  { id: 'partyHat', name: 'Topi Pesta', cost: 20 },
  { id: 'bow', name: 'Pita Lucu', cost: 30 },
  { id: 'glasses', name: 'Kacamata Keren', cost: 45 },
  { id: 'flowerCrown', name: 'Mahkota Bunga', cost: 60 },
  { id: 'scarf', name: 'Syal Hangat', cost: 80 },
  { id: 'wizardHat', name: 'Topi Penyihir', cost: 120 },
  { id: 'crown', name: 'Mahkota Raja', cost: 200 },
];

export function getAccessory(id: string | null): AccessoryDef | undefined {
  return ACCESSORIES.find((a) => a.id === id);
}

// ── Dances (unlocked by total stars) ─────────────────────────

export type DanceId = 'bounce' | 'wiggle' | 'spin' | 'flip';

export interface DanceDef {
  id: DanceId;
  name: string;
  stars: number;
}

export const DANCES: DanceDef[] = [
  { id: 'bounce', name: 'Lompat Gembira', stars: 0 },
  { id: 'wiggle', name: 'Goyang Asyik', stars: 9 },
  { id: 'spin', name: 'Putar-Putar', stars: 24 },
  { id: 'flip', name: 'Salto Hebat', stars: 45 },
];

export function unlockedDances(totalStars: number): DanceId[] {
  return DANCES.filter((d) => totalStars >= d.stars).map((d) => d.id);
}

// ── Badges ───────────────────────────────────────────────────

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  earned: (s: BadgeSnapshot) => boolean;
}

export interface BadgeSnapshot {
  completedStages: number;
  totalStars: number;
  perfectStages: number;
  totalCoinsEarned: number;
  completedWorlds: number[];
}

const WORLD_BADGE_EMOJI = ['🌳', '🍭', '🐰', '🏔️', '🍍', '🏰', '🐉'];

export const BADGES: BadgeDef[] = [
  {
    id: 'first-step',
    name: 'Langkah Pertama',
    description: 'Selesaikan tahap pertamamu',
    emoji: '👣',
    earned: (s) => s.completedStages >= 1,
  },
  {
    id: 'perfect',
    name: 'Nilai Sempurna',
    description: 'Dapatkan 3 bintang di satu tahap',
    emoji: '🌟',
    earned: (s) => s.perfectStages >= 1,
  },
  ...WORLDS.map<BadgeDef>((w, i) => ({
    id: `world-${w.id}`,
    name: `Penjelajah ${w.name}`,
    description: `Selesaikan dunia ${w.name}`,
    emoji: WORLD_BADGE_EMOJI[i],
    earned: (s) => s.completedWorlds.includes(w.id),
  })),
  {
    id: 'diligent',
    name: 'Si Rajin',
    description: 'Selesaikan 10 tahap',
    emoji: '📚',
    earned: (s) => s.completedStages >= 10,
  },
  {
    id: 'coins-100',
    name: 'Celengan Penuh',
    description: 'Kumpulkan 100 koin',
    emoji: '🪙',
    earned: (s) => s.totalCoinsEarned >= 100,
  },
  {
    id: 'stars-50',
    name: 'Pengumpul Bintang',
    description: 'Kumpulkan 50 bintang',
    emoji: '✨',
    earned: (s) => s.totalStars >= 50,
  },
  {
    id: 'perfect-5',
    name: 'Bintang Super',
    description: 'Dapatkan 3 bintang di 5 tahap',
    emoji: '🏅',
    earned: (s) => s.perfectStages >= 5,
  },
  {
    id: 'champion',
    name: 'Juara Angka',
    description: 'Selesaikan semua dunia',
    emoji: '🏆',
    earned: (s) => s.completedWorlds.length >= WORLDS.length,
  },
];

export function getBadge(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}

export function badgeSnapshot(save: SaveData): BadgeSnapshot {
  const entries = Object.values(save.stages);
  const completedWorlds = WORLDS.filter((w) =>
    Array.from({ length: STAGES_PER_WORLD }, (_, i) => save.stages[`${w.id}-${i}`]?.completed).every(Boolean),
  ).map((w) => w.id);
  return {
    completedStages: entries.filter((e) => e.completed).length,
    totalStars: entries.reduce((sum, e) => sum + e.stars, 0),
    perfectStages: entries.filter((e) => e.stars >= 3).length,
    totalCoinsEarned: save.totalCoinsEarned,
    completedWorlds,
  };
}

export function earnedBadgeIds(save: SaveData): string[] {
  const snap = badgeSnapshot(save);
  return BADGES.filter((b) => b.earned(snap)).map((b) => b.id);
}
