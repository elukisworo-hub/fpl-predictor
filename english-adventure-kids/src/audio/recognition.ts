/**
 * Optional pronunciation check using the browser's SpeechRecognition API.
 * Some browsers send audio to a cloud service, so this is only used when a
 * parent turns it on in the parent settings.
 */

interface RecognitionResultLike {
  0: { transcript: string };
  length: number;
  [i: number]: { transcript: string };
}
interface RecognitionEventLike {
  results: { length: number; [i: number]: RecognitionResultLike };
}
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function ctor(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const recognitionSupported = () => ctor() !== null;

/** Listen once and return all alternative transcripts (lowercased). */
export function listenOnce(timeoutMs = 6000): Promise<string[]> {
  const C = ctor();
  if (!C) return Promise.reject(new Error('unsupported'));
  return new Promise((resolve, reject) => {
    const r = new C();
    r.lang = 'en-GB';
    r.interimResults = false;
    r.continuous = false;
    r.maxAlternatives = 5;
    const out: string[] = [];
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(out);
    };
    r.onresult = (e) => {
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        for (let j = 0; j < res.length; j++) out.push(res[j].transcript.toLowerCase().trim());
      }
    };
    r.onerror = (e) => {
      if (settled) return;
      if (e.error === 'no-speech' || e.error === 'aborted') return finish();
      settled = true;
      reject(new Error(e.error));
    };
    r.onend = finish;
    setTimeout(() => {
      try {
        r.stop();
      } catch {
        /* ignore */
      }
      finish();
    }, timeoutMs);
    r.start();
  });
}
