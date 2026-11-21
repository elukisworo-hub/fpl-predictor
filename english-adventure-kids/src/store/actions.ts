import type { Skill } from '../content/types';
import { awardBadges, type Badge } from '../engine/badges';
import { addStudySeconds, markSeen, recordAnswer, recordSpeaking } from '../engine/mastery';
import { claimMissions } from '../engine/missions';
import { applySession, type SessionOutcome, type SessionResult } from '../engine/progress';
import { hashString } from '../engine/util';
import { createInitialState, migrate, type ProgressState, type Settings } from './model';
import { getState, replaceState, setState } from './store';

/** All state changes go through here: UI → actions → pure engine functions → store. */

function withBadges(s: ProgressState): { state: ProgressState; earned: Badge[] } {
  return awardBadges(s);
}

export const actions = {
  completeOnboarding(childName: string, avatar: string) {
    setState((s) => ({ ...s, childName: childName.trim().slice(0, 20), avatar, onboarded: true }));
  },
  seen(vocabIds: string[]) {
    setState((s) => markSeen(s, vocabIds));
  },
  answer(vocabIds: string[], skill: Skill, correct: boolean) {
    setState((s) => recordAnswer(s, vocabIds, skill, correct));
  },
  speakingAttempt(vocabIds: string[], recognised: boolean | null) {
    setState((s) => recordSpeaking(s, vocabIds, recognised));
  },
  addTime(seconds: number) {
    setState((s) => addStudySeconds(s, seconds));
  },
  finishSession(r: SessionResult): SessionOutcome & { badges: Badge[] } {
    const outcome = applySession(getState(), r);
    const { state, earned } = withBadges(outcome.state);
    replaceState(state);
    return { ...outcome, state, badges: earned };
  },
  claimMissions(): Badge[] {
    const claimed = claimMissions(getState());
    const { state, earned } = withBadges(claimed);
    replaceState(state);
    return earned;
  },
  updateSettings(patch: Partial<Settings>) {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  },
  updateProfile(patch: { childName?: string; avatar?: string }) {
    setState((s) => ({ ...s, ...patch }));
  },
  setPin(pin: string) {
    setState((s) => ({ ...s, parentPinHash: hashPin(pin) }));
  },
  resetProgress() {
    const s = getState();
    replaceState({ ...createInitialState(), childName: s.childName, avatar: s.avatar, onboarded: true, settings: s.settings, parentPinHash: s.parentPinHash });
  },
  importBackup(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (!parsed || parsed.version !== 1) return false;
      replaceState(migrate(parsed));
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * The PIN is a child gate, not account security: it is stored hashed so it
 * isn't readable at a glance, and everything stays on this device.
 */
export function hashPin(pin: string): string {
  return `p1:${hashString(`eak-salt:${pin}`).toString(36)}`;
}

export function checkPin(pin: string): boolean {
  return getState().parentPinHash === hashPin(pin);
}
