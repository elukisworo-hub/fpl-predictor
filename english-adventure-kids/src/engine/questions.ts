import type { Picture, QAItem, Skill } from '../content/types';

/** Shapes of concrete questions produced by the generator and rendered by games. */

export type Stimulus =
  | { type: 'picture'; picture: Picture }
  | { type: 'sentence'; text: string; picture?: Picture }
  | { type: 'count'; emoji: string; n: number }
  | { type: 'text'; text: string; picture?: Picture };

export interface ChoiceOption {
  key: string;
  label?: string;
  picture?: Picture;
  correct: boolean;
  /** When set, a small speaker on the option reads it aloud (supports non-readers). */
  speak?: string;
}

interface Base {
  id: string;
  skill: Skill;
  vocabIds: string[];
  /** Whether the answer counts towards stars. Speaking never does. */
  scored: boolean;
}

export interface ChoiceQuestion extends Base {
  kind: 'choice';
  /** Spoken English instruction, e.g. "Listen and choose!" */
  prompt: string;
  /** Indonesian helper line for the parent. */
  hint: string;
  /** Audio the child can replay (word, question...). */
  say?: string;
  /** Text to show for say (e.g. a question). Not shown for pure listening. */
  showSay?: boolean;
  stimulus?: Stimulus;
  layout: 'pictures' | 'words' | 'numbers';
  options: ChoiceOption[];
}

export interface SpellQuestion extends Base {
  kind: 'spell';
  word: string;
  picture: Picture;
  showHint: boolean;
  tiles: string[];
}

export interface MatchQuestion extends Base {
  kind: 'match';
  pairs: Array<{ id: string; label: string; picture: Picture; say: string }>;
}

export interface MissingQuestion extends Base {
  kind: 'missing';
  shown: string[];
  removed: string;
  options: string[];
}

export interface SpeakQuestion extends Base {
  kind: 'speak';
  text: string;
  picture?: Picture;
}

export type Question = ChoiceQuestion | SpellQuestion | MatchQuestion | MissingQuestion | SpeakQuestion;

export type Step =
  | { type: 'learn'; vocabIds: string[] }
  | { type: 'dialogue'; items: QAItem[] }
  | { type: 'story'; storyId: string }
  | { type: 'intro'; title: string; text: string; emoji: string }
  | { type: 'question'; q: Question };

export type PhaseId = 'learn' | 'practice' | 'play' | 'challenge';

export interface Phase {
  id: PhaseId;
  title: string;
  icon: string;
  steps: Step[];
}

/** Results a game reports back. Match games report one entry per pair. */
export interface AnswerResult {
  vocabIds: string[];
  correct: boolean;
}
