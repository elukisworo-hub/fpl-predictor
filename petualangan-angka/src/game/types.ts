// ─────────────────────────────────────────────────────────────
// Shared domain types for Petualangan Angka (UI-agnostic).
// ─────────────────────────────────────────────────────────────

export type CharacterId = 'foxy' | 'bubu' | 'mimi' | 'pando';

export type Mood = 'idle' | 'happy' | 'encourage' | 'talk';

export type ItemId =
  | 'apple'
  | 'star'
  | 'balloon'
  | 'candy'
  | 'carrot'
  | 'butterfly'
  | 'bird'
  | 'cookie'
  | 'fish'
  | 'flower'
  | 'strawberry'
  | 'duck'
  | 'bunny';

export type Op = '+' | '-';

export type QuestionKind =
  | 'equation' // 3 + 2 = ?
  | 'countAdd' // illustrated addition
  | 'countSub' // illustrated subtraction (animated)
  | 'missing' // 2 + ? = 5
  | 'word' // short story problem
  | 'compare' // who has more / fewer
  | 'sequence' // 1, 2, ?, 4
  | 'biggest'; // which number is the biggest

/** Learning area used by the parent dashboard. */
export type Category = 'addition' | 'subtraction' | 'word' | 'logic';

/** How removed objects leave the scene in a subtraction animation. */
export type LeaveMode = 'fly' | 'eat' | 'swim' | 'walk' | 'give';

export type Visual =
  | { type: 'add'; item: ItemId; a: number; b: number }
  | { type: 'sub'; item: ItemId; a: number; b: number; leave: LeaveMode }
  | {
      type: 'compare';
      item: ItemId;
      left: { character: CharacterId; count: number };
      right: { character: CharacterId; count: number };
    }
  | { type: 'sequence'; numbers: Array<number | null> };

export type Explanation =
  | {
      type: 'arith';
      op: Op;
      a: number;
      b: number;
      result: number;
      /** Which part the child had to find. */
      unknown: 'a' | 'b' | 'result';
      item: ItemId;
    }
  | {
      type: 'compare';
      item: ItemId;
      left: { character: CharacterId; count: number };
      right: { character: CharacterId; count: number };
      askMore: boolean;
      winner: CharacterId;
    }
  | { type: 'sequence'; numbers: number[]; missingIndex: number; step: number }
  | { type: 'biggest'; numbers: number[]; answer: number };

export interface Choice {
  id: string;
  label: string;
  value: string;
  character?: CharacterId;
}

export interface Equation {
  a: number | null;
  b: number | null;
  op: Op;
  result: number | null;
}

export interface Question {
  id: string;
  /** Used to avoid duplicates inside one stage. */
  key: string;
  kind: QuestionKind;
  category: Category;
  presenter: CharacterId;
  /** Very short instruction shown in the speech bubble. */
  instruction: string;
  /** Optional story text (word problems / illustrated questions). */
  story?: string;
  equation?: Equation;
  visual?: Visual;
  choices: Choice[];
  /** `value` of the correct choice. */
  answer: string;
  explanation: Explanation;
  /** Friendly text that is read aloud (numbers spelled out). */
  speech: string;
}

// ── Worlds & stages ──────────────────────────────────────────

export type ThemeId = 'forest' | 'candy' | 'bunny' | 'mountain' | 'island' | 'castle' | 'dragon';

export interface Slot {
  kind: QuestionKind;
  op: Op | 'mix';
}

export interface StageDef {
  /** Smallest "big number" (sum or minuend) used in this stage. */
  min: number;
  /** Largest "big number" (sum or minuend) used in this stage. */
  max: number;
  slots: Slot[];
}

export interface WorldDef {
  id: number;
  name: string;
  topic: string;
  difficulty: string;
  guide: CharacterId;
  theme: ThemeId;
  intro: string;
  stages: StageDef[];
}

// ── Persistence ──────────────────────────────────────────────

export interface StageProgress {
  bestScore: number;
  stars: number;
  completed: boolean;
  plays: number;
}

export interface CategoryStat {
  attempted: number;
  correct: number;
}

export interface HistoryEntry {
  worldId: number;
  stage: number; // 0-based
  score: number;
  stars: number;
  correct: number;
  passed: boolean;
  date: number;
}

export interface SaveData {
  version: 1;
  stages: Record<string, StageProgress>;
  coins: number;
  totalCoinsEarned: number;
  settings: { sound: boolean; music: boolean; voice: boolean };
  stats: Record<Category, CategoryStat>;
  history: HistoryEntry[];
  ownedAccessories: string[];
  equippedAccessory: string | null;
  badges: string[];
  selectedDance: string;
  celebratedWorlds: number[];
}

export interface StageResult {
  worldId: number;
  stage: number;
  correct: number;
  score: number;
  stars: number;
  passed: boolean;
  coinsEarned: number;
  isNewBest: boolean;
  firstClear: boolean;
  worldCompleted: boolean;
  unlockedWorld: number | null;
  newBadges: string[];
  newDances: string[];
}
