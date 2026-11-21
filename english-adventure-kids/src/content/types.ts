/**
 * Content model. Everything a child learns lives in plain data files in this
 * folder, so new words, stages, worlds or stories can be added without touching
 * game logic or UI code.
 */

export type Skill = 'listening' | 'speaking' | 'reading' | 'writing';
export const SKILLS: Skill[] = ['listening', 'speaking', 'reading', 'writing'];

export type ShapeName = 'circle' | 'square' | 'triangle' | 'rectangle' | 'star' | 'heart' | 'diamond' | 'oval';
export type Preposition = 'in' | 'on' | 'under' | 'next to';

/** How a word is drawn. Emoji keep the bundle tiny and work offline. */
export type Picture =
  | { kind: 'emoji'; value: string }
  | { kind: 'color'; hex: string }
  | { kind: 'shape'; shape: ShapeName; hex: string }
  | { kind: 'number'; n: number }
  | { kind: 'letter'; letter: string; emoji: string }
  | { kind: 'scene'; thing: string; place: string; prep: Preposition };

export type TopicId =
  | 'alphabet' | 'numbers' | 'colors' | 'shapes' | 'animals' | 'fruits' | 'vegetables'
  | 'family' | 'body' | 'toys' | 'school' | 'food' | 'clothes' | 'house' | 'weather'
  | 'greetings' | 'actions' | 'prepositions';

export interface VocabItem {
  /** Stable id: `${topic}.${slug}`. Progress is stored against this id. */
  id: string;
  /** English word or short phrase, as the child should say it. */
  word: string;
  /** Indonesian meaning, shown small for parents. */
  translation: string;
  topic: TopicId;
  picture: Picture;
  /** Simple model sentence using the word. */
  example: string;
  /** 1 = easiest. Used to order introduction and pick spelling words. */
  difficulty: 1 | 2 | 3;
  /** Optional recorded pronunciation (e.g. `/audio/cat.mp3`). TTS is used when absent. */
  audio?: string;
  /** Plural form for counting questions. */
  plural?: string;
  /** Article used in "This is a/an ___" sentences ('' for uncountables). */
  article?: 'a' | 'an' | '';
}

export interface Topic {
  id: TopicId;
  title: string;
  titleId: string;
  /** Learning objective in Indonesian, shown on the parent dashboard. */
  objective: string;
}

/** The kind of interactive game used in a stage's "Play" phase. */
export type PlayKind = 'match' | 'missing' | 'spell' | 'count' | 'color' | 'story' | 'where' | 'qa' | 'speak';

/** Question families used in Practice and Challenge phases. */
export type ChallengeKind =
  | 'listen' | 'picture' | 'sentence' | 'count' | 'color' | 'letter' | 'starts'
  | 'spell' | 'speak' | 'instruction' | 'where' | 'qa';

export interface QAItem {
  question: string;
  answer: string;
  /** Wrong but friendly answers. */
  distractors: string[];
  translation: string;
}

export interface StageDef {
  id: string;
  worldId: string;
  title: string;
  /** Vocab ids introduced in this stage. Boss stages reuse earlier words. */
  vocab: string[];
  /** A review ("boss") stage: no new words, mixes the whole world. */
  boss?: boolean;
  /** Optional bonus stage, not required to unlock the next world. */
  optional?: boolean;
  practice: ChallengeKind[];
  play: PlayKind;
  challenge: ChallengeKind[];
  /** Indonesian learning objective for parents. */
  objective: string;
  storyId?: string;
  qa?: QAItem[];
}

export interface WorldDef {
  id: string;
  index: number;
  name: string;
  emoji: string;
  /** Tailwind-friendly gradient colors. */
  from: string;
  to: string;
  level: LevelId;
  topics: TopicId[];
  stages: StageDef[];
}

export type LevelId = 'starters' | 'movers' | 'flyers';

export interface LevelDef {
  id: LevelId;
  name: string;
  cefr: string;
  goal: string;
  topics: string[];
  /** True when playable content exists in this build. */
  available: boolean;
}

export interface StoryPage {
  scene: string;
  text: string;
}

export interface StoryQuestion {
  question: string;
  options: string[];
  answer: string;
  /** Vocab ids reinforced by the question (for mastery tracking). */
  vocab: string[];
}

export interface Story {
  id: string;
  title: string;
  cover: string;
  pages: StoryPage[];
  questions: StoryQuestion[];
}
