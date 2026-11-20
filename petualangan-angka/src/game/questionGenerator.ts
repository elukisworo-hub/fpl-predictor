import { CHARACTER_NAMES } from './characters';
import { EXPLAIN_ITEMS, ITEMS, itemsWhere } from './items';
import { numberToWords, spellNumbers } from './language';
import { chance, defaultRng, pick, randInt, shuffle, type Rng } from './random';
import type {
  Category,
  CharacterId,
  Choice,
  ItemId,
  LeaveMode,
  Op,
  Question,
  QuestionKind,
  Slot,
  Visual,
} from './types';
import { getWorld } from './worlds';

export interface GenContext {
  rng: Rng;
  /** Smallest big number (sum / minuend). */
  min: number;
  /** Largest big number (sum / minuend). */
  max: number;
  worldId: number;
  stageIdx: number;
  index: number;
}

const HUMAN_NAMES = ['Budi', 'Siti', 'Ani', 'Dodi', 'Rina', 'Tono', 'Lala'];
const CHARACTER_IDS: CharacterId[] = ['foxy', 'bubu', 'mimi', 'pando'];
const GIVERS = ['Ibu', 'Ayah', 'Kakak', 'Nenek', 'Kakek'];

const PRESENTER: Record<Category, CharacterId> = {
  addition: 'foxy',
  subtraction: 'bubu',
  word: 'mimi',
  logic: 'pando',
};

// ── Small helpers ────────────────────────────────────────────

function resolveOp(rng: Rng, op: Op | 'mix'): Op {
  return op === 'mix' ? (chance(rng, 0.5) ? '+' : '-') : op;
}

/** Numbers for "a op b = result" where the big number lies in [min, max]. */
export function makeArith(rng: Rng, op: Op, min: number, max: number) {
  const lo = Math.max(2, min);
  const hi = Math.max(lo, max);
  if (op === '+') {
    const result = randInt(rng, lo, hi);
    const a = randInt(rng, 1, result - 1);
    return { a, b: result - a, result };
  }
  const a = randInt(rng, lo, hi);
  const b = randInt(rng, 1, a - 1);
  return { a, b, result: a - b };
}

/**
 * Three different whole-number choices (never negative) that include the
 * correct answer, in a random order. Distractors are close to the answer.
 */
export function numberChoices(rng: Rng, correct: number, ceiling: number): Choice[] {
  // Keep every option inside the stage's number range (1..ceiling) when possible.
  const lo = 1;
  const hi = Math.max(ceiling, correct);
  const around = (deltas: number[]) =>
    shuffle(
      rng,
      deltas.map((d) => correct + d).filter((v) => v >= lo && v <= hi),
    );
  const distractors = [...around([-2, -1, 1, 2]), ...around([-4, -3, 3, 4])].slice(0, 2);
  // Very small ranges: widen step by step (still never negative).
  for (let d = 1; distractors.length < 2; d++) {
    for (const v of [correct + d, correct - d]) {
      if (distractors.length < 2 && v >= 0 && v !== correct && !distractors.includes(v)) distractors.push(v);
    }
  }
  const values = shuffle(rng, [correct, ...distractors]);
  return values.map((v, i) => ({ id: `c${i}`, label: String(v), value: String(v) }));
}

function opWord(op: Op): string {
  return op === '+' ? 'tambah' : 'kurang';
}

function categoryFor(kind: QuestionKind, op: Op): Category {
  if (kind === 'word') return 'word';
  if (kind === 'compare' || kind === 'sequence' || kind === 'biggest') return 'logic';
  return op === '+' ? 'addition' : 'subtraction';
}

function base(kind: QuestionKind, op: Op, ctx: GenContext) {
  const category = categoryFor(kind, op);
  return {
    id: `${ctx.worldId}-${ctx.stageIdx}-${ctx.index}-${Math.floor(ctx.rng() * 1e9).toString(36)}`,
    kind,
    category,
    presenter: PRESENTER[category],
  };
}

function leaveFor(item: ItemId): LeaveMode {
  return ITEMS[item].leave ?? 'walk';
}

// ── Question builders ────────────────────────────────────────

function equationQuestion(op: Op, ctx: GenContext): Question {
  const { a, b, result } = makeArith(ctx.rng, op, ctx.min, ctx.max);
  return {
    ...base('equation', op, ctx),
    key: `eq:${op}:${a}:${b}`,
    instruction: 'Berapa hasilnya?',
    equation: { a, b, op, result: null },
    choices: numberChoices(ctx.rng, result, ctx.max),
    answer: String(result),
    explanation: { type: 'arith', op, a, b, result, unknown: 'result', item: pick(ctx.rng, EXPLAIN_ITEMS) },
    speech: `${numberToWords(a)} ${opWord(op)} ${numberToWords(b)}, sama dengan berapa?`,
  };
}

function missingQuestion(op: Op, ctx: GenContext): Question {
  const { a, b, result } = makeArith(ctx.rng, op, ctx.min, ctx.max);
  // Later worlds sometimes hide the first number of an addition.
  const unknown: 'a' | 'b' = op === '+' && ctx.worldId >= 5 && chance(ctx.rng, 0.4) ? 'a' : 'b';
  const answer = unknown === 'a' ? a : b;
  const spokenA = unknown === 'a' ? 'berapa' : numberToWords(a);
  const spokenB = unknown === 'b' ? 'berapa' : numberToWords(b);
  return {
    ...base('missing', op, ctx),
    key: `miss:${op}:${a}:${b}:${unknown}`,
    instruction: 'Angka berapa yang hilang?',
    equation: { a: unknown === 'a' ? null : a, b: unknown === 'b' ? null : b, op, result },
    choices: numberChoices(ctx.rng, answer, ctx.max),
    answer: String(answer),
    explanation: { type: 'arith', op, a, b, result, unknown, item: pick(ctx.rng, EXPLAIN_ITEMS) },
    speech: `${spokenA} ${opWord(op)} ${spokenB}, sama dengan ${numberToWords(result)}. Angka berapa yang hilang?`,
  };
}

function countAddQuestion(ctx: GenContext): Question {
  const { a, b, result } = makeArith(ctx.rng, '+', ctx.min, ctx.max);
  const item = pick(ctx.rng, ['apple', 'star', 'balloon', 'candy', 'butterfly', 'bird', 'duck', 'flower', 'fish', 'strawberry'] as ItemId[]);
  const info = ITEMS[item];
  const n = info.name;
  let story: string;
  if (item === 'star') story = `Ada ${a} bintang di langit. Muncul ${b} bintang lagi. Berapa semuanya?`;
  else if (item === 'flower') story = `Ada ${a} bunga di taman. Tumbuh ${b} bunga lagi. Berapa semuanya?`;
  else if (info.animal) story = `Ada ${a} ${n} ${info.place}. Datang ${b} ${n} lagi. Berapa semuanya?`;
  else story = `Ada ${a} ${n}. Teman memberi ${b} ${n} lagi. Berapa ${n} sekarang?`;
  return {
    ...base('countAdd', '+', ctx),
    key: `cadd:${a}:${b}`,
    instruction: 'Ayo hitung semuanya!',
    story,
    visual: { type: 'add', item, a, b },
    choices: numberChoices(ctx.rng, result, ctx.max),
    answer: String(result),
    explanation: { type: 'arith', op: '+', a, b, result, unknown: 'result', item },
    speech: spellNumbers(story),
  };
}

function countSubQuestion(ctx: GenContext): Question {
  const { a, b, result } = makeArith(ctx.rng, '-', ctx.min, ctx.max);
  const item = pick(ctx.rng, ['balloon', 'bird', 'butterfly', 'fish', 'duck', 'apple', 'cookie', 'candy', 'bunny', 'strawberry'] as ItemId[]);
  const info = ITEMS[item];
  const n = info.name;
  const leave = leaveFor(item);
  let story: string;
  switch (leave) {
    case 'fly':
      story = `Ada ${a} ${n}. Lalu, ${b} ${n} terbang pergi. Berapa ${n} yang tersisa?`;
      break;
    case 'swim':
      story = `Ada ${a} ${n} ${info.place}. Lalu, ${b} ${n} berenang pergi. Berapa yang masih ada?`;
      break;
    case 'walk':
      story = `Ada ${a} ${n} ${info.place}. Lalu, ${b} ${n} melompat pergi. Berapa yang masih ada?`;
      break;
    default:
      story = `Ada ${a} ${n}. Lalu, ${b} ${n} dimakan. Berapa ${n} yang tersisa?`;
  }
  return {
    ...base('countSub', '-', ctx),
    key: `csub:${a}:${b}`,
    instruction: 'Berapa yang tersisa?',
    story,
    visual: { type: 'sub', item, a, b, leave },
    choices: numberChoices(ctx.rng, result, ctx.max),
    answer: String(result),
    explanation: { type: 'arith', op: '-', a, b, result, unknown: 'result', item },
    speech: spellNumbers(story),
  };
}

function subjectName(rng: Rng): { name: string; isCharacter: boolean } {
  if (chance(rng, 0.5)) return { name: CHARACTER_NAMES[pick(rng, CHARACTER_IDS)], isCharacter: true };
  return { name: pick(rng, HUMAN_NAMES), isCharacter: false };
}

function friendFor(rng: Rng, subject: string): string {
  const pool = [...CHARACTER_IDS.map((c) => CHARACTER_NAMES[c]), ...HUMAN_NAMES].filter((x) => x !== subject);
  return pick(rng, pool);
}

function wordQuestion(op: Op, ctx: GenContext): Question {
  const rng = ctx.rng;
  const { a, b, result } = makeArith(rng, op, ctx.min, ctx.max);
  const { name: N } = subjectName(rng);
  let story: string;
  let item: ItemId;
  let visual: Visual;

  if (op === '+') {
    const variant = randInt(rng, 0, 3);
    if (variant === 0) {
      item = pick(rng, itemsWhere((i) => !!i.ownable && i.leave !== 'fly'));
      const n = ITEMS[item].name;
      story = `${N} punya ${a} ${n}. ${pick(rng, GIVERS)} memberinya ${b} ${n} lagi. Berapa ${n} ${N} sekarang?`;
    } else if (variant === 1) {
      item = pick(rng, itemsWhere((i) => !!i.pickable));
      const n = ITEMS[item].name;
      story = `${N} memetik ${a} ${n}. Lalu, dia memetik ${b} ${n} lagi. Berapa ${n} yang dipetik ${N}?`;
    } else if (variant === 2) {
      item = pick(rng, itemsWhere((i) => !!i.animal));
      const info = ITEMS[item];
      story = `Ada ${a} ${info.name} ${info.place}. Datang ${b} ${info.name} lagi. Berapa jumlah ${info.name} sekarang?`;
    } else {
      item = 'balloon';
      story = `${N} punya ${a} balon. Ayah membelikan ${b} balon lagi. Berapa balon ${N} sekarang?`;
    }
    visual = { type: 'add', item, a, b };
  } else {
    const variant = randInt(rng, 0, 3);
    let leave: LeaveMode;
    if (variant === 0) {
      item = pick(rng, itemsWhere((i) => !!i.edible));
      const n = ITEMS[item].name;
      story = `${N} punya ${a} ${n}. Dia makan ${b} ${n}. Berapa ${n} yang tersisa?`;
      leave = 'eat';
    } else if (variant === 1) {
      item = pick(rng, itemsWhere((i) => !!i.ownable && i.leave !== 'fly'));
      const n = ITEMS[item].name;
      story = `${N} punya ${a} ${n}. Dia memberikan ${b} ${n} kepada ${friendFor(rng, N)}. Berapa ${n} ${N} sekarang?`;
      leave = 'give';
    } else if (variant === 2) {
      item = 'balloon';
      story = `${N} punya ${a} balon. Lalu, ${b} balon terbang ke langit. Berapa balon ${N} sekarang?`;
      leave = 'fly';
    } else {
      item = pick(rng, itemsWhere((i) => !!i.animal));
      const info = ITEMS[item];
      story = `Ada ${a} ${info.name} ${info.place}. Lalu, ${b} ${info.name} pergi. Berapa ${info.name} yang masih ada?`;
      leave = leaveFor(item);
    }
    visual = { type: 'sub', item, a, b, leave };
  }

  return {
    ...base('word', op, ctx),
    key: `word:${op}:${a}:${b}`,
    instruction: 'Dengarkan ceritanya, ya!',
    story,
    visual,
    choices: numberChoices(rng, result, ctx.max),
    answer: String(result),
    explanation: { type: 'arith', op, a, b, result, unknown: 'result', item },
    speech: spellNumbers(story),
  };
}

function compareQuestion(ctx: GenContext): Question {
  const rng = ctx.rng;
  const [left, right] = shuffle(rng, CHARACTER_IDS).slice(0, 2);
  const top = Math.min(10, Math.max(4, ctx.max));
  // Keep the difference visible: at least 2 apart in easier worlds.
  const minGap = ctx.worldId >= 7 ? 1 : 2;
  let x = randInt(rng, 1, top);
  let y = randInt(rng, 1, top);
  for (let i = 0; i < 50 && Math.abs(x - y) < minGap; i++) {
    x = randInt(rng, 1, top);
    y = randInt(rng, 1, top);
  }
  if (x === y) y = x === top ? x - 1 : x + 1;
  const askMore = ctx.worldId < 7 || chance(rng, 0.6);
  const item = pick(rng, ['cookie', 'apple', 'candy', 'strawberry', 'carrot', 'balloon'] as ItemId[]);
  const n = ITEMS[item].name;
  const L = CHARACTER_NAMES[left];
  const R = CHARACTER_NAMES[right];
  const winner = askMore === x > y ? left : right;
  const story = `${L} punya ${x} ${n}. ${R} punya ${y} ${n}. Siapa yang punya ${n} lebih ${askMore ? 'banyak' : 'sedikit'}?`;
  const choices: Choice[] = shuffle(rng, [left, right]).map((c, i) => ({
    id: `c${i}`,
    label: CHARACTER_NAMES[c],
    value: c,
    character: c,
  }));
  return {
    ...base('compare', '+', ctx),
    key: `cmp:${Math.min(x, y)}:${Math.max(x, y)}:${askMore}`,
    instruction: askMore ? 'Siapa yang lebih banyak?' : 'Siapa yang lebih sedikit?',
    story,
    visual: { type: 'compare', item, left: { character: left, count: x }, right: { character: right, count: y } },
    choices,
    answer: winner,
    explanation: {
      type: 'compare',
      item,
      left: { character: left, count: x },
      right: { character: right, count: y },
      askMore,
      winner,
    },
    speech: spellNumbers(story),
  };
}

function sequenceQuestion(ctx: GenContext): Question {
  const rng = ctx.rng;
  const len = 4;
  let step = ctx.worldId >= 7 && ctx.stageIdx >= 2 && chance(rng, 0.5) ? 2 : 1;
  const top = Math.max(ctx.max, 6);
  if (top - step * (len - 1) < 1) step = 1;
  const start = randInt(rng, 1, top - step * (len - 1));
  const numbers = Array.from({ length: len }, (_, i) => start + i * step);
  const missingIndex = randInt(rng, 1, len - 1);
  const answer = numbers[missingIndex];
  const shown = numbers.map((v, i) => (i === missingIndex ? null : v));
  // Distractors: neighbours of the answer (never equal to visible numbers when avoidable).
  const choices = numberChoices(rng, answer, top);
  return {
    ...base('sequence', '+', ctx),
    key: `seq:${start}:${step}:${missingIndex}`,
    instruction: 'Angka berapa yang hilang?',
    story: step === 1 ? 'Ayo berhitung urut!' : 'Ayo berhitung lompat dua-dua!',
    visual: { type: 'sequence', numbers: shown },
    choices,
    answer: String(answer),
    explanation: { type: 'sequence', numbers, missingIndex, step },
    speech: `Ayo berhitung! ${shown.map((v) => (v === null ? 'berapa' : numberToWords(v))).join(', ')}. Angka berapa yang hilang?`,
  };
}

function biggestQuestion(ctx: GenContext): Question {
  const rng = ctx.rng;
  const top = Math.max(ctx.max, 6);
  const set = new Set<number>();
  while (set.size < 3) set.add(randInt(rng, 1, top));
  const numbers = shuffle(rng, [...set]);
  const answer = Math.max(...numbers);
  return {
    ...base('biggest', '+', ctx),
    key: `big:${[...numbers].sort((p, q) => p - q).join(',')}`,
    instruction: 'Angka mana yang paling besar?',
    choices: numbers.map((v, i) => ({ id: `c${i}`, label: String(v), value: String(v) })),
    answer: String(answer),
    explanation: { type: 'biggest', numbers, answer },
    speech: 'Angka mana yang paling besar?',
  };
}

export function generateQuestion(slot: Slot, ctx: GenContext): Question {
  const op = resolveOp(ctx.rng, slot.op);
  switch (slot.kind) {
    case 'equation':
      return equationQuestion(op, ctx);
    case 'missing':
      return missingQuestion(op, ctx);
    case 'countAdd':
      return countAddQuestion(ctx);
    case 'countSub':
      return countSubQuestion(ctx);
    case 'word':
      return wordQuestion(op, ctx);
    case 'compare':
      return compareQuestion(ctx);
    case 'sequence':
      return sequenceQuestion(ctx);
    case 'biggest':
      return biggestQuestion(ctx);
  }
}

/** Build the five questions for one stage, avoiding duplicates where possible. */
export function generateStage(worldId: number, stageIdx: number, rng: Rng = defaultRng): Question[] {
  const world = getWorld(worldId);
  const def = world.stages[stageIdx];
  if (!def) throw new Error(`Unknown stage ${worldId}-${stageIdx}`);
  const seen = new Set<string>();
  return def.slots.map((slot, index) => {
    const ctx: GenContext = { rng, min: def.min, max: def.max, worldId, stageIdx, index };
    let q = generateQuestion(slot, ctx);
    for (let attempt = 0; attempt < 40 && seen.has(q.key); attempt++) {
      q = generateQuestion(slot, ctx);
    }
    seen.add(q.key);
    return q;
  });
}
