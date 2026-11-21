import { STORY_BY_ID } from '../content/stories';
import type { ChallengeKind, Picture, PlayKind, QAItem, ShapeName, StageDef, TopicId, VocabItem } from '../content/types';
import { LETTER_ANCHOR, VOCAB, VOCAB_BY_ID, withArticle } from '../content/vocabulary';
import { WORLD_BY_ID, worldVocab } from '../content/worlds';
import type { ProgressState, WordStat } from '../store/model';
import { isMastered, isWeak, reviewCandidates } from './mastery';
import type { ChoiceOption, ChoiceQuestion, MatchQuestion, MissingQuestion, Phase, Question, SpeakQuestion, Step } from './questions';
import { type Rng, dayKey, pick, sample, shuffle } from './util';

/**
 * Turns curriculum definitions + the child's learning record into concrete
 * questions. Adaptive rules:
 *  - weak words (recent accuracy < 60%) appear more often, with fewer options
 *    and spelling hints;
 *  - mastered words get more options, extra spelling letters and fewer hints;
 *  - every challenge mixes in a couple of due words from earlier stages
 *    (spaced repetition).
 */

let counter = 0;
const nid = () => `q${Date.now().toString(36)}-${++counter}`;

interface Ctx {
  state: ProgressState;
  rng: Rng;
  stage?: StageDef;
  /** Words preferred as distractors (same stage / world). */
  prefer: string[];
  qaIndex: number;
}

const v = (id: string) => VOCAB_BY_ID[id];
const stat = (ctx: Ctx, id: string): WordStat | undefined => ctx.state.words[id];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function pictureKey(p: Picture): string {
  switch (p.kind) {
    case 'emoji': return `e:${p.value}`;
    case 'color': return `c:${p.hex}`;
    case 'shape': return `s:${p.shape}`;
    case 'number': return `n:${p.n}`;
    case 'letter': return `l:${p.letter}`;
    case 'scene': return `p:${p.prep}`;
  }
}

/** How many options to show, based on mastery. Fewer options = easier. */
function optionCount(ctx: Ctx, id: string, phase: 'practice' | 'challenge'): number {
  const s = stat(ctx, id);
  if (isWeak(s)) return 2;
  if (phase === 'practice') return !s || s.box === 0 ? 2 : 3;
  return isMastered(s) ? 4 : 3;
}

function distractors(ctx: Ctx, target: VocabItem, n: number, opts: { anyTopic?: boolean } = {}): VocabItem[] {
  const tKey = pictureKey(target.picture);
  const pool = VOCAB.filter(
    (x) =>
      x.id !== target.id &&
      x.word.toLowerCase() !== target.word.toLowerCase() &&
      pictureKey(x.picture) !== tKey &&
      (opts.anyTopic ? x.topic !== 'alphabet' : x.topic === target.topic),
  );
  if (target.topic === 'numbers' && target.picture.kind === 'number') {
    const t = target.picture.n;
    const near = pool.filter((x) => x.picture.kind === 'number' && Math.abs(x.picture.n - t) <= 3);
    return sample(near.length >= n ? near : pool, n, ctx.rng);
  }
  const preferred = shuffle(pool.filter((x) => ctx.prefer.includes(x.id)), ctx.rng);
  const rest = shuffle(pool.filter((x) => !ctx.prefer.includes(x.id)), ctx.rng);
  const out: VocabItem[] = [];
  const seen = new Set<string>();
  for (const x of [...preferred, ...rest]) {
    const k = pictureKey(x.picture);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
    if (out.length >= n) break;
  }
  return out;
}

function pictureOptions(target: VocabItem, others: VocabItem[], rng: Rng): ChoiceOption[] {
  return shuffle(
    [target, ...others].map((x) => ({ key: x.id, picture: x.picture, correct: x.id === target.id })),
    rng,
  );
}

function wordOptions(target: VocabItem, others: VocabItem[], rng: Rng): ChoiceOption[] {
  return shuffle(
    [target, ...others].map((x) => ({ key: x.id, label: x.word, correct: x.id === target.id })),
    rng,
  );
}

/* ------------------------------------------------------------------ */
/* Question builders                                                   */
/* ------------------------------------------------------------------ */

function listen(ctx: Ctx, t: VocabItem, phase: 'practice' | 'challenge'): Question {
  if (t.topic === 'alphabet') return letter(ctx, t, phase);
  if (t.topic === 'prepositions') return where(ctx, t, 'listen');
  const others = distractors(ctx, t, optionCount(ctx, t.id, phase) - 1);
  return {
    id: nid(), kind: 'choice', skill: 'listening', vocabIds: [t.id], scored: true,
    prompt: 'Listen and choose!', hint: 'Dengarkan kata, lalu pilih gambarnya.',
    say: t.word, layout: 'pictures', options: pictureOptions(t, others, ctx.rng),
  };
}

function picture(ctx: Ctx, t: VocabItem, phase: 'practice' | 'challenge'): Question {
  if (t.topic === 'alphabet') return starts(ctx, t, phase);
  if (t.topic === 'prepositions') return where(ctx, t, 'read');
  const others = distractors(ctx, t, optionCount(ctx, t.id, phase) - 1);
  const prompt = t.topic === 'colors' ? 'What colour is it?' : t.topic === 'numbers' ? 'What number is it?' : 'What is it? Find the word!';
  return {
    id: nid(), kind: 'choice', skill: 'reading', vocabIds: [t.id], scored: true,
    prompt, hint: 'Lihat gambar, lalu pilih kata bahasa Inggrisnya.',
    stimulus: { type: 'picture', picture: t.picture }, layout: 'words', options: wordOptions(t, others, ctx.rng),
  };
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sentence(ctx: Ctx, t: VocabItem, phase: 'practice' | 'challenge'): Question {
  const re = new RegExp(`(^|[^A-Za-z])(${escapeRe(t.word)})(?![A-Za-z])`, 'i');
  if (t.topic === 'alphabet' || !re.test(t.example)) return picture(ctx, t, phase);
  const gapped = t.example.replace(re, '$1___');
  const same = distractors(ctx, t, isMastered(stat(ctx, t.id)) ? 2 : 1);
  const contrastTopic: TopicId = t.topic === 'colors' ? 'animals' : t.topic === 'actions' ? 'colors' : pick(['colors', 'actions'] as TopicId[], ctx.rng);
  const contrast = sample(VOCAB.filter((x) => x.topic === contrastTopic && x.word !== t.word), 1, ctx.rng);
  return {
    id: nid(), kind: 'choice', skill: 'reading', vocabIds: [t.id], scored: true,
    prompt: 'Complete the sentence!', hint: 'Pilih kata yang tepat untuk melengkapi kalimat.',
    stimulus: { type: 'sentence', text: gapped, picture: t.picture }, layout: 'words',
    options: wordOptions(t, [...same, ...contrast], ctx.rng),
  };
}

const COUNT_THINGS = [
  { emoji: '🍎', one: 'apple', many: 'apples' }, { emoji: '⭐', one: 'star', many: 'stars' },
  { emoji: '⚽', one: 'ball', many: 'balls' }, { emoji: '🐱', one: 'cat', many: 'cats' },
  { emoji: '🐟', one: 'fish', many: 'fish' }, { emoji: '🐦', one: 'bird', many: 'birds' },
  { emoji: '🚗', one: 'car', many: 'cars' }, { emoji: '📕', one: 'book', many: 'books' },
  { emoji: '🦆', one: 'duck', many: 'ducks' }, { emoji: '🌷', one: 'flower', many: 'flowers' },
];

function count(ctx: Ctx, t: VocabItem, phase: 'practice' | 'challenge'): Question {
  if (t.picture.kind !== 'number') return listen(ctx, t, phase);
  const n = t.picture.n;
  const thing = pick(COUNT_THINGS, ctx.rng);
  const others = distractors(ctx, t, optionCount(ctx, t.id, phase) - 1);
  return {
    id: nid(), kind: 'choice', skill: 'listening', vocabIds: [t.id], scored: true,
    prompt: `How many ${thing.many}?`, hint: 'Hitung gambarnya, lalu pilih angkanya.',
    say: `How many ${thing.many}?`, stimulus: { type: 'count', emoji: thing.emoji, n }, layout: 'numbers',
    options: shuffle(
      [t, ...others].map((x) => ({ key: x.id, label: String((x.picture as { n: number }).n), correct: x.id === t.id })),
      ctx.rng,
    ),
  };
}

const SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond', 'oval'];

function color(ctx: Ctx, t: VocabItem, phase: 'practice' | 'challenge'): Question {
  if (t.picture.kind !== 'color') return listen(ctx, t, phase);
  const others = distractors(ctx, t, Math.max(2, optionCount(ctx, t.id, phase) - 1));
  const shapes = shuffle(SHAPES, ctx.rng);
  const opts: ChoiceOption[] = [t, ...others].map((x, i) => ({
    key: x.id,
    picture: { kind: 'shape', shape: shapes[i % shapes.length], hex: (x.picture as { hex: string }).hex },
    correct: x.id === t.id,
  }));
  return {
    id: nid(), kind: 'choice', skill: 'listening', vocabIds: [t.id], scored: true,
    prompt: `Find something ${t.word}!`, hint: `Cari benda berwarna ${t.translation}.`,
    say: `Find something ${t.word}!`, layout: 'pictures', options: shuffle(opts, ctx.rng),
  };
}

function letter(ctx: Ctx, t: VocabItem, phase: 'practice' | 'challenge'): Question {
  const others = sample(VOCAB.filter((x) => x.topic === 'alphabet' && x.id !== t.id), optionCount(ctx, t.id, phase) - 1, ctx.rng);
  return {
    id: nid(), kind: 'choice', skill: 'listening', vocabIds: [t.id], scored: true,
    prompt: 'Which letter is it?', hint: 'Dengarkan nama huruf, lalu pilih hurufnya.',
    say: t.word, layout: 'numbers',
    options: shuffle([t, ...others].map((x) => ({ key: x.id, label: x.word, correct: x.id === t.id })), ctx.rng),
  };
}

function starts(ctx: Ctx, t: VocabItem, phase: 'practice' | 'challenge'): Question {
  if (t.word === 'X') return letter(ctx, t, phase);
  const others = sample(
    VOCAB.filter((x) => x.topic === 'alphabet' && x.id !== t.id && x.word !== 'X'),
    optionCount(ctx, t.id, phase) - 1,
    ctx.rng,
  );
  return {
    id: nid(), kind: 'choice', skill: 'listening', vocabIds: [t.id], scored: true,
    prompt: `What starts with ${t.word}?`, hint: `Pilih gambar yang kata bahasa Inggrisnya diawali huruf ${t.word}.`,
    say: `What starts with ${t.word}?`, stimulus: { type: 'text', text: `${t.word} ${t.word.toLowerCase()}` }, layout: 'pictures',
    options: shuffle(
      [t, ...others].map((x) => ({ key: x.id, picture: { kind: 'emoji', value: LETTER_ANCHOR[x.word].emoji } as Picture, correct: x.id === t.id })),
      ctx.rng,
    ),
  };
}

const SPELLABLE = /^[a-z]{2,6}$/;
export const isSpellable = (word: string) => SPELLABLE.test(word);

function spell(ctx: Ctx, t: VocabItem, phase: 'practice' | 'challenge'): Question {
  if (!isSpellable(t.word)) return picture(ctx, t, phase);
  const s = stat(ctx, t.id);
  const extra = isWeak(s) || !s ? 0 : isMastered(s) ? 2 : 1;
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('').filter((c) => !t.word.includes(c));
  const tiles = shuffle([...t.word.split(''), ...sample(letters, extra, ctx.rng)], ctx.rng);
  return {
    id: nid(), kind: 'spell', skill: 'writing', vocabIds: [t.id], scored: true,
    word: t.word, picture: t.picture, showHint: !s || s.box < 2 || isWeak(s) || phase === 'practice', tiles,
  };
}

function speak(_ctx: Ctx, t: VocabItem): SpeakQuestion {
  return { id: nid(), kind: 'speak', skill: 'speaking', vocabIds: [t.id], scored: false, text: t.word, picture: t.picture };
}

function instruction(ctx: Ctx, t: VocabItem, phase: 'practice' | 'challenge'): Question {
  const say =
    t.topic === 'body' ? `Touch your ${t.word}!`
      : t.topic === 'actions' ? `${cap(t.word)}! Find "${t.word}".`
        : t.topic === 'clothes' ? `Put on your ${t.word}!`
          : t.topic === 'school' ? `Show me your ${t.word}!`
            : `Find the ${t.word}!`;
  if (t.topic === 'alphabet' || t.topic === 'prepositions') return listen(ctx, t, phase);
  const others = distractors(ctx, t, optionCount(ctx, t.id, phase) - 1);
  return {
    id: nid(), kind: 'choice', skill: 'listening', vocabIds: [t.id], scored: true,
    prompt: 'Listen and do it!', hint: 'Dengarkan instruksi, lalu pilih gambar yang sesuai.',
    say, layout: 'pictures', options: pictureOptions(t, others, ctx.rng),
  };
}

function where(ctx: Ctx, t: VocabItem, mode?: 'read' | 'listen'): Question {
  if (t.picture.kind !== 'scene') return listen(ctx, t, 'practice');
  const m = mode ?? (ctx.rng() < 0.5 ? 'read' : 'listen');
  const preps = VOCAB.filter((x) => x.topic === 'prepositions');
  const others = sample(preps.filter((x) => x.id !== t.id), 2, ctx.rng);
  if (m === 'listen') {
    return {
      id: nid(), kind: 'choice', skill: 'listening', vocabIds: [t.id], scored: true,
      prompt: 'Listen and choose!', hint: 'Dengarkan kalimat, lalu pilih gambar yang sesuai.',
      say: `The ball is ${t.word} the box.`, layout: 'pictures', options: pictureOptions(t, others, ctx.rng),
    };
  }
  return {
    id: nid(), kind: 'choice', skill: 'reading', vocabIds: [t.id], scored: true,
    prompt: 'Where is the ball?', hint: 'Lihat gambar. Di mana bolanya?',
    say: 'Where is the ball?', showSay: true, stimulus: { type: 'picture', picture: t.picture }, layout: 'words',
    options: shuffle(
      [t, ...others].map((x) => ({ key: x.id, label: `${x.word} the box`, speak: `${x.word} the box`, correct: x.id === t.id })),
      ctx.rng,
    ),
  };
}

/* ---------- Questions & answers ---------- */

const WEATHER_ANSWER: Record<string, string> = {
  sun: 'It is sunny.', rain: 'It is rainy.', cloud: 'It is cloudy.', snow: 'It is snowy.', wind: 'It is windy.', hot: 'It is hot.', cold: 'It is cold.',
};

function nounAnswer(x: VocabItem) {
  if (x.word.endsWith('s') && !x.article) return `They are ${x.word}.`;
  return `It is ${withArticle(x.word)}.`;
}

interface QATemplate {
  question: (x: VocabItem) => string;
  answer: (x: VocabItem) => string | null;
}

function qaTemplate(topic: TopicId): QATemplate | null {
  switch (topic) {
    case 'alphabet': case 'greetings': case 'numbers': return null;
    case 'colors': return { question: () => 'What colour is it?', answer: (x) => `It is ${x.word}.` };
    case 'shapes': return { question: () => 'What shape is it?', answer: (x) => `It is ${withArticle(x.word)}.` };
    case 'prepositions': return { question: () => 'Where is the ball?', answer: (x) => `It is ${x.word} the box.` };
    case 'family': return { question: () => 'Who is this?', answer: (x) => `This is my ${x.word}.` };
    case 'actions': return { question: () => 'What can you do?', answer: (x) => `I can ${x.word}.` };
    case 'weather': return { question: () => "What's the weather like?", answer: (x) => WEATHER_ANSWER[x.word] ?? null };
    default: return { question: () => 'What is this?', answer: nounAnswer };
  }
}

function staticQA(ctx: Ctx, item: QAItem): ChoiceQuestion {
  const opts = shuffle([item.answer, ...item.distractors], ctx.rng);
  return {
    id: nid(), kind: 'choice', skill: 'listening', vocabIds: [], scored: true,
    prompt: 'Listen and answer!', hint: `Pertanyaan: "${item.translation}" Pilih jawaban yang tepat.`,
    say: item.question, showSay: true, layout: 'words',
    options: opts.map((o, i) => ({ key: `qa${i}`, label: o, speak: o, correct: o === item.answer })),
  };
}

function qa(ctx: Ctx, t: VocabItem | undefined, phase: 'practice' | 'challenge'): Question | null {
  const items = ctx.stage?.qa;
  if (items?.length && (!t || ctx.rng() < 0.5)) {
    const item = items[ctx.qaIndex++ % items.length];
    return staticQA(ctx, item);
  }
  if (!t) return null;
  if (t.topic === 'numbers' && t.picture.kind === 'number') {
    const n = t.picture.n;
    const thing = pick(COUNT_THINGS, ctx.rng);
    const others = distractors(ctx, t, 2);
    const ans = (x: VocabItem) => {
      const k = (x.picture as { n: number }).n;
      return k === 1 ? `There is one ${thing.one}.` : `There are ${x.word} ${thing.many}.`;
    };
    return {
      id: nid(), kind: 'choice', skill: 'reading', vocabIds: [t.id], scored: true,
      prompt: `How many ${thing.many}?`, hint: 'Hitung, lalu pilih kalimat jawaban yang tepat.',
      say: `How many ${thing.many}?`, showSay: true, stimulus: { type: 'count', emoji: thing.emoji, n }, layout: 'words',
      options: shuffle([t, ...others].map((x) => ({ key: x.id, label: ans(x), speak: ans(x), correct: x.id === t.id })), ctx.rng),
    };
  }
  const tpl = qaTemplate(t.topic);
  const answer = tpl?.answer(t);
  if (!tpl || !answer) return null;
  const others = distractors(ctx, t, optionCount(ctx, t.id, phase) - 1).filter((x) => tpl.answer(x));
  if (!others.length) return null;
  return {
    id: nid(), kind: 'choice', skill: 'reading', vocabIds: [t.id], scored: true,
    prompt: tpl.question(t), hint: 'Lihat gambar. Pilih jawaban yang tepat.',
    say: tpl.question(t), showSay: true, stimulus: { type: 'picture', picture: t.picture }, layout: 'words',
    options: shuffle(
      [t, ...others].map((x) => {
        const label = tpl.answer(x)!;
        return { key: x.id, label, speak: label, correct: x.id === t.id };
      }),
      ctx.rng,
    ),
  };
}

function build(ctx: Ctx, kind: ChallengeKind, id: string, phase: 'practice' | 'challenge'): Question {
  const t = v(id);
  switch (kind) {
    case 'listen': return listen(ctx, t, phase);
    case 'picture': return picture(ctx, t, phase);
    case 'sentence': return sentence(ctx, t, phase);
    case 'count': return count(ctx, t, phase);
    case 'color': return color(ctx, t, phase);
    case 'letter': return t.topic === 'alphabet' ? letter(ctx, t, phase) : listen(ctx, t, phase);
    case 'starts': return t.topic === 'alphabet' ? starts(ctx, t, phase) : picture(ctx, t, phase);
    case 'spell': return spell(ctx, t, phase);
    case 'speak': return speak(ctx, t);
    case 'instruction': return instruction(ctx, t, phase);
    case 'where': return where(ctx, t);
    case 'qa': return qa(ctx, t, phase) ?? picture(ctx, t, phase);
  }
}

/* ------------------------------------------------------------------ */
/* Play-phase games                                                     */
/* ------------------------------------------------------------------ */

function distinctByPicture(idsIn: string[]): string[] {
  const seen = new Set<string>();
  return idsIn.filter((id) => {
    const k = v(id).topic === 'alphabet' ? `a:${v(id).word}` : pictureKey(v(id).picture);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function match(ctx: Ctx, focus: string[], pool: string[]): MatchQuestion {
  let chosen = distinctByPicture(weightedPick(ctx, focus, 4));
  if (chosen.length < 3) chosen = distinctByPicture([...chosen, ...sample(pool.filter((x) => !chosen.includes(x)), 4, ctx.rng)]).slice(0, 4);
  return {
    id: nid(), kind: 'match', skill: 'reading', vocabIds: chosen, scored: true,
    pairs: chosen.map((id) => {
      const x = v(id);
      if (x.topic === 'alphabet') {
        const a = LETTER_ANCHOR[x.word];
        return { id, label: `${x.word}${x.word.toLowerCase()}`, picture: { kind: 'emoji', value: a.emoji }, say: x.example };
      }
      return { id, label: x.word, picture: x.picture, say: x.word };
    }),
  };
}

function missing(ctx: Ctx, focus: string[], pool: string[]): MissingQuestion {
  let shown = distinctByPicture(weightedPick(ctx, focus, 4));
  if (shown.length < 4) shown = distinctByPicture([...shown, ...shuffle(pool.filter((x) => !shown.includes(x)), ctx.rng)]).slice(0, 4);
  const removed = pick(shown, ctx.rng);
  const outside = distinctByPicture([...shown, ...shuffle(pool.filter((x) => !shown.includes(x)), ctx.rng)]).filter((x) => !shown.includes(x));
  let extra = outside.slice(0, 2);
  if (extra.length < 2) {
    const topicPool = VOCAB.filter((x) => x.topic === v(removed).topic && !shown.includes(x.id)).map((x) => x.id);
    extra = distinctByPicture([...shown, ...extra, ...shuffle(topicPool, ctx.rng)]).filter((x) => !shown.includes(x)).slice(0, 2);
  }
  return {
    id: nid(), kind: 'missing', skill: 'reading', vocabIds: [removed], scored: true,
    shown, removed, options: shuffle([removed, ...extra], ctx.rng),
  };
}

function playSteps(ctx: Ctx, kind: PlayKind, focus: string[], pool: string[]): Step[] {
  const q = (x: Question): Step => ({ type: 'question', q: x });
  const three = (ids: string[]) => weightedPick(ctx, ids, 3);
  switch (kind) {
    case 'match': return [q(match(ctx, focus, pool))];
    case 'missing': return [q(missing(ctx, focus, pool)), q(missing(ctx, focus, pool))];
    case 'spell': {
      let words = focus.filter((id) => isSpellable(v(id).word));
      if (words.length < 2) words = [...words, ...pool.filter((id) => isSpellable(v(id).word) && !words.includes(id))];
      if (!words.length) return [q(match(ctx, focus, pool))];
      return three(words).map((id) => q(spell(ctx, v(id), 'practice')));
    }
    case 'count': {
      const nums = focus.filter((id) => v(id).topic === 'numbers');
      return three(nums.length ? nums : pool.filter((id) => v(id).topic === 'numbers')).map((id) => q(count(ctx, v(id), 'challenge')));
    }
    case 'color': {
      const cols = focus.filter((id) => v(id).topic === 'colors');
      if (!cols.length) return [q(match(ctx, focus, pool))];
      return three(cols).map((id) => q(color(ctx, v(id), 'challenge')));
    }
    case 'where': return three(focus).map((id) => q(where(ctx, v(id))));
    case 'qa': {
      const out: Step[] = [];
      for (let i = 0; i < 3; i++) {
        const x = qa(ctx, focus.length ? v(pick(focus, ctx.rng)) : undefined, 'challenge');
        if (x) out.push(q(x));
      }
      return out.length ? out : [q(match(ctx, focus, pool))];
    }
    case 'speak': return three(focus).map((id) => q(speak(ctx, v(id))));
    case 'story': {
      const story = ctx.stage?.storyId ? STORY_BY_ID[ctx.stage.storyId] : undefined;
      if (!story) return [q(match(ctx, focus, pool))];
      return story.questions.map((sq) =>
        q({
          id: nid(), kind: 'choice', skill: 'listening', vocabIds: sq.vocab.filter((x) => VOCAB_BY_ID[x]), scored: true,
          prompt: 'Listen and answer!', hint: 'Pertanyaan tentang cerita. Ketuk 🔊 untuk mendengar pilihan.',
          say: sq.question, showSay: true, layout: 'words',
          options: shuffle(sq.options.map((o, i) => ({ key: `s${i}`, label: o, speak: o, correct: o === sq.answer })), ctx.rng),
        }),
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Stage + review assembly                                              */
/* ------------------------------------------------------------------ */

function weight(ctx: Ctx, id: string): number {
  const s = stat(ctx, id);
  if (!s) return 2;
  return 1 + (isWeak(s) ? 3 : 0) + (s.box === 0 ? 1 : 0) + (isMastered(s) ? -0.5 : 0);
}

/** Weighted sample without replacement: weak words are more likely to be picked. */
export function weightedPick(ctx: Ctx, idsIn: string[], n: number): string[] {
  const pool = [...new Set(idsIn)];
  const out: string[] = [];
  while (out.length < n && pool.length) {
    const ws = pool.map((id) => Math.max(0.2, weight(ctx, id)));
    let r = ctx.rng() * ws.reduce((a, b) => a + b, 0);
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= ws[i];
      if (r <= 0) break;
    }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/** Words for stages without their own vocab (stories, Q&A): words met earlier in the world. */
function borrowedFocus(stage: StageDef, state: ProgressState): string[] {
  const world = WORLD_BY_ID[stage.worldId];
  const idx = world.stages.findIndex((s) => s.id === stage.id);
  const before = [...new Set(world.stages.slice(0, idx).flatMap((s) => (s.boss ? [] : s.vocab)))];
  const met = before.filter((id) => state.words[id]);
  return met.length >= 4 ? met : before.length ? before : worldVocab(stage.worldId);
}

/** Due words from outside this stage, for spaced-repetition mixing. */
function reviewMix(ctx: Ctx, exclude: string[], n: number): string[] {
  const todayKey = dayKey();
  return reviewCandidates(ctx.state, todayKey)
    .filter((id) => !exclude.includes(id))
    .filter((id) => {
      const s = ctx.state.words[id];
      return s.nextReview <= todayKey || isWeak(s);
    })
    .slice(0, n);
}

export function buildStage(stage: StageDef, state: ProgressState, rng: Rng = Math.random): Phase[] {
  const pool = worldVocab(stage.worldId);
  const own = stage.vocab;
  const ctx: Ctx = { state, rng, stage, prefer: own.length ? own : pool, qaIndex: 0 };
  const focusAll = own.length ? own : borrowedFocus(stage, state);
  const focus = stage.boss ? weightedPick(ctx, focusAll, 8) : focusAll;

  // LEARN
  const learn: Step[] = stage.storyId
    ? [{ type: 'story', storyId: stage.storyId }]
    : stage.boss
      ? [{ type: 'intro', title: 'Review time!', text: "Let's play with all the words from this world!", emoji: '🏆' }]
      : !own.length && stage.qa
        ? [{ type: 'dialogue', items: stage.qa }]
        : [{ type: 'learn', vocabIds: own }];

  // PRACTICE: one easy question per word, weak words get a second go.
  const practice: Step[] = [];
  if (!own.length && stage.qa && !stage.storyId) {
    for (let i = 0; i < Math.min(3, stage.qa.length); i++) practice.push({ type: 'question', q: staticQA(ctx, stage.qa[ctx.qaIndex++ % stage.qa.length]) });
  } else {
    const words = (stage.boss || stage.storyId ? weightedPick(ctx, focus, 4) : focus.slice(0, 6));
    words.forEach((id, i) => {
      const kind = stage.practice[i % stage.practice.length];
      practice.push({ type: 'question', q: build(ctx, kind, id, 'practice') });
    });
    const weak = words.filter((id) => isWeak(stat(ctx, id))).slice(0, 2);
    weak.forEach((id, i) => {
      const kind = stage.practice[(i + 1) % stage.practice.length];
      practice.push({ type: 'question', q: build(ctx, kind, id, 'practice') });
    });
  }

  // PLAY
  const play = playSteps(ctx, stage.play, focus, pool);

  // CHALLENGE: stage words (weighted) + due words from earlier.
  const n = stage.boss ? 7 : 5;
  const kinds = stage.challenge.filter((k) => k !== 'speak');
  const wantsSpeak = stage.challenge.includes('speak');
  const challengeWords = weightedPick(ctx, focus, Math.min(n - (wantsSpeak ? 1 : 0), focus.length));
  while (challengeWords.length < n - (wantsSpeak ? 1 : 0) && focus.length) challengeWords.push(pick(focus, ctx.rng));
  const chQuestions: Question[] = challengeWords.map((id, i) => build(ctx, kinds[i % kinds.length], id, 'challenge'));
  const mix = reviewMix(ctx, focusAll, stage.boss ? 0 : 2);
  for (const id of mix) chQuestions.push(build(ctx, ctx.rng() < 0.5 ? 'listen' : 'picture', id, 'challenge'));
  const challenge: Step[] = shuffle(chQuestions, rng).map((q) => ({ type: 'question', q }));
  if (wantsSpeak && focus.length) challenge.push({ type: 'question', q: speak(ctx, v(pick(focus, rng))) });

  return [
    { id: 'learn', title: 'Learn', icon: '📖', steps: learn },
    { id: 'practice', title: 'Practice', icon: '✏️', steps: practice },
    { id: 'play', title: 'Play', icon: '🎲', steps: play },
    { id: 'challenge', title: 'Challenge', icon: '🏅', steps: challenge },
  ].filter((p) => p.steps.length > 0) as Phase[];
}

const KINDS_BY_TOPIC: Partial<Record<TopicId, ChallengeKind[]>> = {
  alphabet: ['letter', 'starts'],
  numbers: ['listen', 'count', 'picture'],
  colors: ['listen', 'color', 'picture'],
  prepositions: ['where'],
  body: ['listen', 'instruction', 'picture', 'sentence'],
  actions: ['listen', 'instruction', 'picture', 'sentence'],
  greetings: ['listen', 'picture'],
};
const DEFAULT_KINDS: ChallengeKind[] = ['listen', 'picture', 'sentence', 'spell'];

/** A short mixed review of the words that most need it. Returns null if too few words are known. */
export function buildReview(state: ProgressState, rng: Rng = Math.random): Phase[] | null {
  const words = reviewCandidates(state).slice(0, 6);
  if (words.length < 3) return null;
  const ctx: Ctx = { state, rng, prefer: words, qaIndex: 0 };
  const steps: Step[] = words.map((id, i) => {
    const kinds = KINDS_BY_TOPIC[v(id).topic] ?? DEFAULT_KINDS;
    return { type: 'question', q: build(ctx, kinds[(i + Math.floor(rng() * kinds.length)) % kinds.length], id, 'challenge') };
  });
  const pairs = distinctByPicture(words.filter((id) => v(id).topic !== 'alphabet'));
  const play: Step[] = pairs.length >= 3 ? [{ type: 'question', q: match(ctx, pairs.slice(0, 4), pairs) }] : [];
  play.push({ type: 'question', q: speak(ctx, v(pick(words, rng))) });
  return [
    { id: 'practice', title: 'Review', icon: '🔁', steps },
    { id: 'play', title: 'Play', icon: '🎲', steps: play },
  ];
}
