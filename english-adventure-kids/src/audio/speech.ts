/**
 * Text-to-speech with a British English preference.
 *
 * Recorded audio can be dropped in later: give a VocabItem an `audio` URL (or
 * register one with `registerAudio`) and it is played instead of TTS.
 */

const config = { rate: 0.85, voiceURI: null as string | null };
const recorded = new Map<string, string>();
let voices: SpeechSynthesisVoice[] = [];
let current: HTMLAudioElement | null = null;

const PREFERRED_GB = ['Google UK English Female', 'Serena', 'Kate', 'Martha', 'Stephanie', 'Libby', 'Sonia', 'Hazel', 'Google UK English Male', 'Daniel', 'Arthur', 'Oliver'];

export const ttsAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function loadVoices() {
  if (!ttsAvailable()) return;
  voices = window.speechSynthesis.getVoices();
}

if (ttsAvailable()) {
  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export function englishVoices(): SpeechSynthesisVoice[] {
  loadVoices();
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith('en'))
    .sort((a, b) => Number(b.lang.toLowerCase().includes('gb')) - Number(a.lang.toLowerCase().includes('gb')));
}

export function chosenVoice(): SpeechSynthesisVoice | null {
  const list = englishVoices();
  if (!list.length) return null;
  if (config.voiceURI) {
    const v = list.find((x) => x.voiceURI === config.voiceURI);
    if (v) return v;
  }
  const gb = list.filter((v) => /en[-_]gb/i.test(v.lang));
  for (const name of PREFERRED_GB) {
    const v = gb.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return gb[0] ?? list[0];
}

export function configureSpeech(opts: { rate?: number; voiceURI?: string | null }) {
  if (opts.rate !== undefined) config.rate = opts.rate;
  if (opts.voiceURI !== undefined) config.voiceURI = opts.voiceURI;
}

export function registerAudio(text: string, url: string) {
  recorded.set(text.toLowerCase(), url);
}

export function stopSpeech() {
  if (ttsAvailable()) window.speechSynthesis.cancel();
  if (current) {
    current.pause();
    current = null;
  }
}

/** Speak text. Resolves when finished (or after a safety timeout). */
export function speak(text: string, opts: { rate?: number; audio?: string } = {}): Promise<void> {
  stopSpeech();
  const url = opts.audio ?? recorded.get(text.toLowerCase());
  if (url) {
    return new Promise((resolve) => {
      const a = new Audio(url);
      current = a;
      a.playbackRate = Math.max(0.6, opts.rate ?? config.rate);
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });
  }
  if (!ttsAvailable()) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const voice = chosenVoice();
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-GB';
    u.rate = opts.rate ?? config.rate;
    u.pitch = 1.05;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    u.onend = finish;
    u.onerror = finish;
    setTimeout(finish, 1200 + text.length * 120);
    window.speechSynthesis.speak(u);
  });
}

/** Speak several lines one after another. */
export async function speakSequence(lines: string[], gapMs = 250) {
  for (const line of lines) {
    await speak(line);
    await new Promise((r) => setTimeout(r, gapMs));
  }
}
