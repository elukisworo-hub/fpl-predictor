import { describe, expect, it } from 'vitest';
import { STORIES } from '../content/stories';
import { VOCAB, VOCAB_BY_ID } from '../content/vocabulary';
import { STAGES, WORLDS } from '../content/worlds';
import { createInitialState, migrate } from '../store/model';
import { awardBadges } from './badges';
import { buildReview, buildStage, pictureKey } from './generator';
import { isMastered, isWeak, markSeen, recordAnswer } from './mastery';
import { canClaimMissions, claimMissions, dailyMissions } from './missions';
import { applySession, currentStreak, isStageUnlocked, isWorldUnlocked, nextStage, starsFor } from './progress';
import type { Question } from './questions';
import { addDays, dayKey, seeded } from './util';

function validate(q: Question) {
  switch (q.kind) {
    case 'choice': {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.filter((o) => o.correct)).toHaveLength(1);
      const keys = q.options.map((o) => o.label ?? (o.picture ? pictureKey(o.picture) : o.key));
      expect(new Set(keys).size).toBe(keys.length);
      break;
    }
    case 'spell':
      expect(q.word).toMatch(/^[a-z]{2,6}$/);
      for (const c of q.word) expect(q.tiles).toContain(c);
      break;
    case 'match':
      expect(q.pairs.length).toBeGreaterThanOrEqual(3);
      expect(new Set(q.pairs.map((p) => p.label)).size).toBe(q.pairs.length);
      break;
    case 'missing':
      expect(q.shown).toContain(q.removed);
      expect(q.options).toContain(q.removed);
      expect(q.options.filter((o) => q.shown.includes(o))).toEqual([q.removed]);
      break;
    case 'speak':
      expect(q.text.length).toBeGreaterThan(0);
      break;
  }
}

describe('content', () => {
  it('has at least 200 Starters vocabulary words (letters excluded)', () => {
    expect(VOCAB.filter((v) => v.topic !== 'alphabet').length).toBeGreaterThanOrEqual(200);
  });

  it('has unique ids', () => {
    expect(new Set(VOCAB.map((v) => v.id)).size).toBe(VOCAB.length);
  });

  it('every word has a translation and an example containing content', () => {
    for (const v of VOCAB) {
      expect(v.translation, v.id).toBeTruthy();
      expect(v.example.length, v.id).toBeGreaterThan(2);
    }
  });

  it('no two words in a topic share the same picture', () => {
    const byTopic = new Map<string, Set<string>>();
    for (const v of VOCAB) {
      const set = byTopic.get(v.topic) ?? new Set();
      const k = pictureKey(v.picture);
      expect(set.has(k), `${v.id} duplicates a picture`).toBe(false);
      set.add(k);
      byTopic.set(v.topic, set);
    }
  });

  it('has 10 worlds with 5–10 stages that reference real words and stories', () => {
    expect(WORLDS).toHaveLength(10);
    for (const w of WORLDS) {
      expect(w.stages.length).toBeGreaterThanOrEqual(5);
      expect(w.stages.length).toBeLessThanOrEqual(10);
      for (const s of w.stages) {
        for (const id of s.vocab) expect(VOCAB_BY_ID[id], id).toBeDefined();
        if (s.storyId) expect(STORIES.find((x) => x.id === s.storyId)).toBeDefined();
      }
    }
  });

  it('story answers are among their options', () => {
    for (const s of STORIES) for (const q of s.questions) expect(q.options).toContain(q.answer);
  });
});

describe('question generator', () => {
  it('builds valid questions for every stage (fresh and experienced learner)', () => {
    const fresh = createInitialState();
    let experienced = createInitialState();
    for (const v of VOCAB.slice(0, 120)) experienced = recordAnswer(experienced, [v.id], 'reading', Math.random() > 0.3);
    for (const state of [fresh, experienced]) {
      for (let seed = 1; seed <= 4; seed++) {
        for (const stage of STAGES) {
          const phases = buildStage(stage, state, seeded(seed * 97 + stage.id.length));
          expect(phases.length, stage.id).toBeGreaterThanOrEqual(3);
          const qs = phases.flatMap((p) => p.steps).flatMap((s) => (s.type === 'question' ? [s.q] : []));
          expect(qs.filter((q) => q.scored).length, stage.id).toBeGreaterThan(3);
          qs.forEach(validate);
        }
      }
    }
  });

  it('review needs at least 3 known words', () => {
    let s = createInitialState();
    expect(buildReview(s)).toBeNull();
    s = markSeen(s, ['animals.cat', 'animals.dog', 'animals.fish', 'animals.bird']);
    const r = buildReview(s, seeded(3));
    expect(r).not.toBeNull();
    r!.flatMap((p) => p.steps).forEach((st) => st.type === 'question' && validate(st.q));
  });
});

describe('mastery', () => {
  it('climbs one box per day and drops on mistakes', () => {
    let s = createInitialState();
    const d0 = new Date(2026, 0, 1, 10);
    s = recordAnswer(s, ['animals.cat'], 'listening', true, d0);
    s = recordAnswer(s, ['animals.cat'], 'listening', true, d0);
    expect(s.words['animals.cat'].box).toBe(1);
    s = recordAnswer(s, ['animals.cat'], 'listening', true, new Date(2026, 0, 2, 10));
    s = recordAnswer(s, ['animals.cat'], 'listening', true, new Date(2026, 0, 3, 10));
    expect(isMastered(s.words['animals.cat'])).toBe(true);
    s = recordAnswer(s, ['animals.cat'], 'listening', false, new Date(2026, 0, 4, 10));
    s = recordAnswer(s, ['animals.cat'], 'listening', false, new Date(2026, 0, 4, 11));
    s = recordAnswer(s, ['animals.cat'], 'listening', false, new Date(2026, 0, 4, 12));
    expect(isWeak(s.words['animals.cat'])).toBe(true);
    expect(s.words['animals.cat'].nextReview).toBe('2026-01-04');
    expect(s.skills.listening).toEqual({ correct: 4, wrong: 3 });
  });
});

describe('progress & unlocking', () => {
  it('only the first stage is open at the start', () => {
    const s = createInitialState();
    expect(isStageUnlocked(s, 'w1-s1')).toBe(true);
    expect(isStageUnlocked(s, 'w1-s2')).toBe(false);
    expect(isWorldUnlocked(s, 'w2')).toBe(false);
    expect(nextStage(s)?.id).toBe('w1-s1');
  });

  it('completing stages opens the next stage and then the next world', () => {
    let s = createInitialState();
    const w1 = WORLDS[0];
    let unlocked = null;
    for (const st of w1.stages) {
      expect(isStageUnlocked(s, st.id)).toBe(true);
      const out = applySession(s, { kind: 'stage', stageId: st.id, correct: 5, total: 5, seconds: 60 });
      s = out.state;
      unlocked = out.unlockedWorld ?? unlocked;
    }
    expect(unlocked?.id).toBe('w2');
    expect(isWorldUnlocked(s, 'w2')).toBe(true);
    expect(nextStage(s)?.id).toBe('w2-s1');
  });

  it('awards stars generously and XP for first clears and replays', () => {
    expect(starsFor(0, 6)).toBe(1);
    expect(starsFor(4, 6)).toBe(2);
    expect(starsFor(6, 6)).toBe(3);
    let s = createInitialState();
    const a = applySession(s, { kind: 'stage', stageId: 'w1-s1', correct: 3, total: 6, seconds: 30 });
    expect(a.firstClear).toBe(true);
    expect(a.xp).toBe(10 + 5 + 10);
    s = a.state;
    const b = applySession(s, { kind: 'stage', stageId: 'w1-s1', correct: 6, total: 6, seconds: 30 });
    expect(b.newBest).toBe(true);
    expect(b.state.stages['w1-s1'].stars).toBe(3);
    const c = applySession(b.state, { kind: 'stage', stageId: 'w1-s1', correct: 1, total: 6, seconds: 30 });
    expect(c.state.stages['w1-s1'].stars).toBe(3);
    expect(c.xp).toBeGreaterThanOrEqual(5);
  });

  it('streak counts consecutive days and gives a consistency bonus', () => {
    let s = createInitialState();
    const today = dayKey();
    s = applySession(s, { kind: 'stage', stageId: 'w1-s1', correct: 5, total: 5, seconds: 60 }, new Date(Date.now() - 86400000)).state;
    const out = applySession(s, { kind: 'stage', stageId: 'w1-s2', correct: 5, total: 5, seconds: 60 });
    expect(out.consistencyBonus).toBe(true);
    expect(currentStreak(out.state, today)).toBe(2);
    expect(currentStreak(out.state, addDays(today, 3))).toBe(0);
  });
});

describe('missions, badges, storage', () => {
  it('missions can be claimed once when complete', () => {
    let s = createInitialState();
    expect(dailyMissions(s)).toHaveLength(3);
    expect(canClaimMissions(s)).toBe(false);
    const today = dayKey();
    s = {
      ...s,
      words: Object.fromEntries(VOCAB.slice(0, 10).map((v) => [v.id, { seen: 1, correct: 1, wrong: 0, box: 1, nextReview: today, introducedOn: today, lastSeen: '', recent: [1] }])),
      days: { [today]: { date: today, seconds: 1, xp: 0, newWords: 9, stages: 2, reviews: 1, correct: 9, wrong: 0, listeningCorrect: 9, speakingTries: 5, games: 3 } },
    };
    expect(canClaimMissions(s)).toBe(true);
    const claimed = claimMissions(s);
    expect(claimed.xp).toBe(s.xp + 20);
    expect(canClaimMissions(claimed)).toBe(false);
  });

  it('awards the first-stage badge', () => {
    const s = applySession(createInitialState(), { kind: 'stage', stageId: 'w1-s1', correct: 5, total: 5, seconds: 60 }).state;
    const { earned } = awardBadges(s);
    expect(earned.map((b) => b.id)).toContain('first-stage');
  });

  it('migrates partial / corrupted saves safely', () => {
    expect(migrate(null).xp).toBe(0);
    const m = migrate({ xp: 42, settings: { sfx: false } });
    expect(m.xp).toBe(42);
    expect(m.settings.sfx).toBe(false);
    expect(m.settings.speechRate).toBeGreaterThan(0);
  });
});

import { speechMatches } from './speechMatch';
describe('speech matching', () => {
  it('is lenient but not random', () => {
    expect(speechMatches('cat', ['a cat'])).toBe(true);
    expect(speechMatches('elephant', ['elefant'])).toBe(true);
    expect(speechMatches('seven', ['7'])).toBe(true);
    expect(speechMatches('B', ['bee'])).toBe(true);
    expect(speechMatches('good morning', ['morning'])).toBe(false);
    expect(speechMatches('good morning', ['good morning mum'])).toBe(true);
    expect(speechMatches('dog', ['banana'])).toBe(false);
  });
});

import { parseHash, toHash } from '../router';
describe('router', () => {
  it('round-trips simple hashes and accepts old links', () => {
    for (const r of [{ name: 'home' }, { name: 'world', worldId: 'w3' }, { name: 'stage', stageId: 'w10-s7' }, { name: 'review' }, { name: 'parent' }] as const)
      expect(parseHash(toHash(r))).toEqual(r);
    expect(parseHash('#/stage/w1-s2')).toEqual({ name: 'stage', stageId: 'w1-s2' });
    expect(toHash({ name: 'stage', stageId: 'w1-s2' })).toMatch(/^#[A-Za-z0-9-]+$/);
  });
});
