import { describe, expect, it } from 'vitest';
import { generateStage, numberChoices } from '../questionGenerator';
import { createRng } from '../random';
import type { Question } from '../types';
import { WORLDS } from '../worlds';

const RUNS_PER_STAGE = 150;

function allStages(seed: number): Array<{ worldId: number; stage: number; questions: Question[] }> {
  const rng = createRng(seed);
  const out: Array<{ worldId: number; stage: number; questions: Question[] }> = [];
  for (const w of WORLDS) {
    for (let s = 0; s < w.stages.length; s++) {
      for (let r = 0; r < RUNS_PER_STAGE; r++) {
        out.push({ worldId: w.id, stage: s, questions: generateStage(w.id, s, rng) });
      }
    }
  }
  return out;
}

const generated = allStages(42);

describe('question generator', () => {
  it('creates 5 questions for every stage', () => {
    for (const g of generated) expect(g.questions).toHaveLength(5);
  });

  it('every question has exactly one correct choice and distinct options', () => {
    for (const { questions } of generated) {
      for (const q of questions) {
        const values = q.choices.map((c) => c.value);
        expect(new Set(values).size).toBe(values.length);
        expect(values.filter((v) => v === q.answer)).toHaveLength(1);
        expect(q.choices.length).toBeGreaterThanOrEqual(2);
        if (q.kind !== 'compare') expect(q.choices).toHaveLength(3);
      }
    }
  });

  it('never produces negative or non-integer numbers', () => {
    for (const { questions } of generated) {
      for (const q of questions) {
        for (const c of q.choices) {
          if (q.kind === 'compare') continue;
          const n = Number(c.value);
          expect(Number.isInteger(n)).toBe(true);
          expect(n).toBeGreaterThanOrEqual(0);
        }
        const e = q.explanation;
        if (e.type === 'arith') {
          for (const n of [e.a, e.b, e.result]) {
            expect(Number.isInteger(n)).toBe(true);
            expect(n).toBeGreaterThanOrEqual(1);
          }
        }
      }
    }
  });

  it('arithmetic is correct and the answer matches the unknown', () => {
    for (const { questions } of generated) {
      for (const q of questions) {
        const e = q.explanation;
        if (e.type !== 'arith') continue;
        expect(e.op === '+' ? e.a + e.b : e.a - e.b).toBe(e.result);
        const expected = e.unknown === 'a' ? e.a : e.unknown === 'b' ? e.b : e.result;
        expect(q.answer).toBe(String(expected));
        if (q.equation) {
          const { a, b, result, op } = q.equation;
          expect(op).toBe(e.op);
          expect(a === null ? e.unknown === 'a' : a === e.a).toBe(true);
          expect(b === null ? e.unknown === 'b' : b === e.b).toBe(true);
          expect(result === null ? e.unknown === 'result' : result === e.result).toBe(true);
        }
        if (q.visual?.type === 'add' || q.visual?.type === 'sub') {
          expect(q.visual.a).toBe(e.a);
          expect(q.visual.b).toBe(e.b);
          expect(q.visual.type === 'add' ? '+' : '-').toBe(e.op);
        }
      }
    }
  });

  it('respects the number range of each world', () => {
    for (const { worldId, stage, questions } of generated) {
      const def = WORLDS[worldId - 1].stages[stage];
      for (const q of questions) {
        const e = q.explanation;
        if (e.type === 'arith') {
          const big = e.op === '+' ? e.result : e.a;
          expect(big).toBeGreaterThanOrEqual(def.min);
          expect(big).toBeLessThanOrEqual(def.max);
        }
      }
      // Early worlds stay within 1–5, middle worlds within 1–10, advanced within 1–20.
      const limit = worldId <= 2 ? 5 : worldId <= 6 ? 10 : 20;
      for (const q of questions) {
        const e = q.explanation;
        if (e.type === 'arith') expect(Math.max(e.a, e.b, e.result)).toBeLessThanOrEqual(limit);
        if (e.type === 'sequence') expect(Math.max(...e.numbers)).toBeLessThanOrEqual(limit);
        if (e.type === 'biggest') expect(Math.max(...e.numbers)).toBeLessThanOrEqual(limit);
        if (e.type === 'compare') expect(Math.max(e.left.count, e.right.count)).toBeLessThanOrEqual(10);
        if (q.kind !== 'compare') {
          for (const c of q.choices) expect(Number(c.value)).toBeLessThanOrEqual(limit);
        }
      }
    }
  });

  it('only uses the right operations per world', () => {
    for (const { worldId, questions } of generated) {
      for (const q of questions) {
        if (q.explanation.type !== 'arith') continue;
        if (worldId === 1 || worldId === 3) expect(q.explanation.op).toBe('+');
        if (worldId === 2 || worldId === 4) expect(q.explanation.op).toBe('-');
      }
    }
  });

  it('compare, sequence and biggest questions are logically correct', () => {
    for (const { questions } of generated) {
      for (const q of questions) {
        const e = q.explanation;
        if (e.type === 'compare') {
          expect(e.left.count).not.toBe(e.right.count);
          const more = e.left.count > e.right.count ? e.left.character : e.right.character;
          const fewer = more === e.left.character ? e.right.character : e.left.character;
          expect(q.answer).toBe(e.askMore ? more : fewer);
        }
        if (e.type === 'sequence') {
          for (let i = 1; i < e.numbers.length; i++) expect(e.numbers[i] - e.numbers[i - 1]).toBe(e.step);
          expect(Math.min(...e.numbers)).toBeGreaterThanOrEqual(1);
          expect(q.answer).toBe(String(e.numbers[e.missingIndex]));
          expect(q.visual?.type === 'sequence' && q.visual.numbers[e.missingIndex]).toBeNull();
        }
        if (e.type === 'biggest') {
          expect(new Set(e.numbers).size).toBe(3);
          expect(q.answer).toBe(String(Math.max(...e.numbers)));
        }
      }
    }
  });

  it('mostly avoids duplicate questions within a stage', () => {
    let dupStages = 0;
    for (const { questions } of generated) {
      const keys = questions.map((q) => q.key);
      if (new Set(keys).size !== keys.length) dupStages++;
    }
    // Small ranges allow very few combinations, but duplicates must be rare.
    expect(dupStages / generated.length).toBeLessThan(0.02);
  });

  it('randomizes the position of the correct answer', () => {
    const positions = [0, 0, 0];
    for (const { questions } of generated) {
      for (const q of questions) {
        if (q.choices.length !== 3) continue;
        positions[q.choices.findIndex((c) => c.value === q.answer)]++;
      }
    }
    const total = positions.reduce((a, b) => a + b, 0);
    for (const p of positions) expect(p / total).toBeGreaterThan(0.25);
  });

  it('word problems contain the numbers of the calculation', () => {
    for (const { questions } of generated) {
      for (const q of questions) {
        if (q.kind !== 'word' || q.explanation.type !== 'arith') continue;
        expect(q.story).toContain(String(q.explanation.a));
        expect(q.story).toContain(String(q.explanation.b));
        expect(q.speech).not.toMatch(/\d/);
      }
    }
  });
});

describe('numberChoices', () => {
  it('works for the smallest answers', () => {
    const rng = createRng(1);
    for (let correct = 0; correct <= 20; correct++) {
      for (let i = 0; i < 50; i++) {
        const c = numberChoices(rng, correct, 5).map((x) => Number(x.value));
        expect(c).toContain(correct);
        expect(new Set(c).size).toBe(3);
        for (const v of c) expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
