/**
 * Read-aloud helper using the browser's speech synthesis (Indonesian voice
 * when the device has one). Young children can't read yet, so every question
 * can be listened to.
 */

let enabled = true;
let cachedVoice: SpeechSynthesisVoice | null | undefined;

function synth(): SpeechSynthesis | null {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  } catch {
    return null;
  }
}

function indonesianVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  if (cachedVoice !== undefined && cachedVoice !== null) return cachedVoice;
  const voices = s.getVoices();
  if (!voices.length) return null;
  cachedVoice =
    voices.find((v) => v.lang?.toLowerCase().startsWith('id') && /female|wanita|damayanti|gadis/i.test(v.name)) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith('id')) ??
    null;
  return cachedVoice;
}

if (typeof window !== 'undefined') {
  const s = synth();
  if (s && 'onvoiceschanged' in s) {
    s.onvoiceschanged = () => {
      cachedVoice = undefined;
    };
  }
}

export const speech = {
  isSupported(): boolean {
    return synth() !== null;
  },
  setEnabled(on: boolean) {
    enabled = on;
    if (!on) this.stop();
  },
  speak(text: string) {
    const s = synth();
    if (!s || !enabled || !text) return;
    try {
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      const v = indonesianVoice();
      if (v) u.voice = v;
      u.rate = 0.9;
      u.pitch = 1.15;
      s.speak(u);
    } catch {
      /* ignore */
    }
  },
  stop() {
    try {
      synth()?.cancel();
    } catch {
      /* ignore */
    }
  },
};
