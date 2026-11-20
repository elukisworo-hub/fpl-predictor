/**
 * Tiny Web Audio sound engine. Every sound is synthesized, so the game needs
 * no audio files and works offline. All calls are safe no-ops when audio is
 * unavailable or not yet unlocked by a user gesture.
 */

type Wave = OscillatorType;

const NOTE = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12);
// Handy note frequencies
const C4 = NOTE(-9);
const E4 = NOTE(-5);
const G4 = NOTE(-2);
const A4 = NOTE(0);
const C5 = NOTE(3);
const D5 = NOTE(5);
const E5 = NOTE(7);
const G5 = NOTE(10);
const A5 = NOTE(12);
const C6 = NOTE(15);
const E6 = NOTE(19);
const G6 = NOTE(22);

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxOn = true;
  private musicOn = true;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private nextNoteTime = 0;
  private hidden = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.hidden = document.hidden;
        if (!this.ctx) return;
        if (this.hidden) void this.ctx.suspend().catch(() => undefined);
        else void this.ctx.resume().catch(() => undefined);
      });
    }
  }

  /** Must be called from a user gesture (tap) to satisfy autoplay rules. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = this.sfxOn ? 1 : 0;
        this.sfxBus.connect(this.master);
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = this.musicOn && this.sfxOn ? 1 : 0;
        this.musicBus.connect(this.master);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
      if (this.musicOn) this.startMusic();
    } catch {
      this.ctx = null;
    }
  }

  setSoundEnabled(on: boolean): void {
    this.sfxOn = on;
    this.applyGains();
  }

  setMusicEnabled(on: boolean): void {
    this.musicOn = on;
    this.applyGains();
    if (on && this.ctx) this.startMusic();
    if (!on) this.stopMusic();
  }

  private applyGains() {
    if (!this.ctx || !this.sfxBus || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(this.sfxOn ? 1 : 0, t, 0.05);
    // Global mute (sound off) silences the music too.
    this.musicBus.gain.setTargetAtTime(this.musicOn && this.sfxOn ? 1 : 0, t, 0.1);
  }

  private tone(
    freq: number,
    start: number,
    duration: number,
    opts: { type?: Wave; volume?: number; slideTo?: number; bus?: 'sfx' | 'music'; attack?: number } = {},
  ) {
    if (!this.ctx) return;
    const bus = opts.bus === 'music' ? this.musicBus : this.sfxBus;
    if (!bus) return;
    const t0 = this.ctx.currentTime + start;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + duration);
    const vol = opts.volume ?? 0.2;
    const attack = opts.attack ?? 0.01;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  private ready(): boolean {
    return !!this.ctx && this.sfxOn && !this.hidden;
  }

  click() {
    if (!this.ready()) return;
    this.tone(A5, 0, 0.08, { type: 'triangle', volume: 0.12, slideTo: C6 });
  }

  pop(index = 0) {
    if (!this.ready()) return;
    const f = C5 * Math.pow(2, Math.min(index, 14) / 12);
    this.tone(f, 0, 0.12, { type: 'sine', volume: 0.18, slideTo: f * 1.5 });
  }

  correct() {
    if (!this.ready()) return;
    [C5, E5, G5, C6].forEach((f, i) => this.tone(f, i * 0.08, 0.25, { type: 'triangle', volume: 0.18 }));
    this.tone(E6, 0.32, 0.35, { type: 'sine', volume: 0.1 });
  }

  /** Gentle, non-scary "hmm" sound for a wrong answer. */
  wrong() {
    if (!this.ready()) return;
    this.tone(G4, 0, 0.18, { type: 'sine', volume: 0.14 });
    this.tone(E4, 0.16, 0.28, { type: 'sine', volume: 0.12 });
  }

  star(index = 0) {
    if (!this.ready()) return;
    const base = [C6, E6, G6][index % 3];
    this.tone(base, 0, 0.3, { type: 'triangle', volume: 0.14 });
    this.tone(base * 1.5, 0.06, 0.25, { type: 'sine', volume: 0.08 });
  }

  coin() {
    if (!this.ready()) return;
    this.tone(NOTE(14), 0, 0.07, { type: 'square', volume: 0.05 });
    this.tone(NOTE(19), 0.06, 0.18, { type: 'square', volume: 0.05 });
  }

  levelComplete() {
    if (!this.ready()) return;
    const seq = [C5, E5, G5, C6, G5, C6];
    seq.forEach((f, i) => this.tone(f, i * 0.12, 0.3, { type: 'triangle', volume: 0.16 }));
    [C5, E5, G5, C6].forEach((f) => this.tone(f, 0.75, 0.9, { type: 'sine', volume: 0.07, attack: 0.04 }));
  }

  fanfare() {
    if (!this.ready()) return;
    const seq = [G4, C5, E5, G5, E5, G5, C6];
    seq.forEach((f, i) => this.tone(f, i * 0.1, 0.28, { type: 'square', volume: 0.06 }));
    [C5, E5, G5, C6, E6].forEach((f) => this.tone(f, 0.75, 1.2, { type: 'triangle', volume: 0.08, attack: 0.05 }));
  }

  // ── Background music: a cheerful looping pentatonic tune ──

  private static MELODY: Array<number | null> = [
    E5, G5, A5, G5, E5, D5, C5, null,
    D5, E5, G5, E5, D5, C5, D5, null,
    E5, G5, A5, C6, A5, G5, E5, G5,
    A5, G5, E5, D5, C5, D5, C5, null,
  ];
  private static BASS: number[] = [C4 / 2, G4 / 4, A4 / 4, NOTE(-16) / 2]; // C, G, A, F (low)

  startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    const stepDur = 60 / 116 / 2; // eighth notes at 116 bpm
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx) return;
      while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
        const offset = this.nextNoteTime - this.ctx.currentTime;
        const i = this.musicStep % SoundEngine.MELODY.length;
        const note = SoundEngine.MELODY[i];
        if (note) this.tone(note, offset, stepDur * 1.6, { type: 'triangle', volume: 0.035, bus: 'music' });
        if (i % 4 === 0) {
          const bass = SoundEngine.BASS[Math.floor(i / 8) % SoundEngine.BASS.length];
          this.tone(bass * 2, offset, stepDur * 3.5, { type: 'sine', volume: 0.06, bus: 'music', attack: 0.02 });
        }
        if (i % 2 === 1) this.tone(NOTE(27), offset, 0.03, { type: 'square', volume: 0.006, bus: 'music' });
        this.nextNoteTime += stepDur;
        this.musicStep++;
      }
    }, 60);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const sound = new SoundEngine();
