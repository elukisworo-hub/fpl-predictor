/** Tiny synthesised sound effects (no audio files needed). */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSfxEnabled(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  tap() {
    if (enabled) tone(660, 0, 0.08, 'triangle', 0.1);
  },
  correct() {
    if (!enabled) return;
    tone(784, 0, 0.15, 'triangle');
    tone(1047, 0.12, 0.25, 'triangle');
  },
  /** A soft, friendly "boop" — never a harsh buzzer. */
  tryAgain() {
    if (enabled) tone(330, 0, 0.18, 'sine', 0.12);
  },
  star() {
    if (enabled) tone(1319, 0, 0.18, 'triangle', 0.14);
  },
  fanfare() {
    if (!enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.3, 'triangle', 0.16));
  },
  unlock() {
    if (!enabled) return;
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.25, 'sine', 0.14));
  },
};
