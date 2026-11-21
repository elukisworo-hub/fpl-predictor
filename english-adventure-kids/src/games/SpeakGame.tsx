import { useEffect, useState } from 'react';
import { listenOnce, recognitionSupported } from '../audio/recognition';
import { playUrl, recordClip, recorderSupported } from '../audio/recorder';
import { sfx } from '../audio/sfx';
import { speak } from '../audio/speech';
import { PictureView } from '../components/PictureView';
import { SpeakerButton } from '../components/ui';
import { speechMatches } from '../engine/speechMatch';
import type { SpeakQuestion } from '../engine/questions';
import { actions } from '../store/actions';
import { useProgress } from '../store/store';
import type { GameProps } from './types';

type Status = 'idle' | 'listening' | 'heard' | 'retry' | 'done' | 'error';

/**
 * Speaking practice. Never marks the child "wrong":
 *  - with speech check on (parent setting) it listens and celebrates a match,
 *    otherwise it encourages another go and always lets the child continue;
 *  - by default it records on-device and plays the child's voice back next to
 *    the model pronunciation;
 *  - with no microphone, it simply invites the child to say the word aloud.
 */
export function SpeakGame({ q, onDone, feedback }: GameProps<SpeakQuestion>) {
  const { settings } = useProgress();
  const useCheck = settings.speechCheck && recognitionSupported();
  const canRecord = recorderSupported();
  const [status, setStatus] = useState<Status>('idle');
  const [tries, setTries] = useState(0);
  const [myClip, setMyClip] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => speak(`Say it! ${q.text}`), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => () => {
    if (myClip) URL.revokeObjectURL(myClip);
  }, [myClip]);

  const finish = () => onDone([]);

  const runCheck = async () => {
    setStatus('listening');
    try {
      const heard = await listenOnce();
      const ok = speechMatches(q.text, heard);
      actions.speakingAttempt(q.vocabIds, ok);
      setTries((t) => t + 1);
      if (ok) {
        sfx.correct();
        setStatus('done');
        feedback({ mood: 'cheer', text: 'Amazing! I heard you!' });
        void speak('Amazing! I heard you!');
      } else {
        setStatus('retry');
        feedback({ mood: 'happy', text: 'Good try! Listen and say it again.' });
        await speak('Good try! Listen.');
        await speak(q.text);
      }
    } catch {
      setStatus('error');
    }
  };

  const runRecord = async () => {
    setStatus('listening');
    try {
      const url = await recordClip(2500);
      setMyClip(url);
      actions.speakingAttempt(q.vocabIds, null);
      setTries((t) => t + 1);
      setStatus('heard');
      await playUrl(url);
      await speak(q.text);
      sfx.star();
      feedback({ mood: 'cheer', text: 'Well done! Great speaking!' });
      void speak('Well done!');
    } catch {
      setStatus('error');
    }
  };

  const saidIt = () => {
    actions.speakingAttempt(q.vocabIds, null);
    sfx.correct();
    feedback({ mood: 'cheer', text: 'Well done!' });
    void speak('Well done!');
    setTimeout(finish, 900);
  };

  const micMode = useCheck ? 'check' : canRecord ? 'record' : 'none';
  const showContinue = status === 'done' || status === 'heard' || (status === 'retry' && tries >= 2) || status === 'error';

  return (
    <div className="flex flex-col items-center gap-5">
      <h2 className="text-center text-2xl font-bold sm:text-3xl">Say it!</h2>
      <div className="card flex flex-col items-center gap-2 px-8 py-5">
        {q.picture && <PictureView picture={q.picture} size={130} />}
        <p className="text-4xl font-bold text-ocean">{q.text}</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <SpeakerButton text={q.text} size="xl" label="Listen" />
          <span className="text-sm font-semibold text-slate-500">Listen</span>
        </div>

        {micMode !== 'none' && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              aria-label="Speak"
              disabled={status === 'listening'}
              onClick={micMode === 'check' ? runCheck : runRecord}
              className={`btn btn-pink !h-24 !w-24 !rounded-full !p-0 text-5xl ${status === 'listening' ? 'animate-pulse ring-8 ring-berry/30' : ''}`}
            >
              <span className="emoji">🎤</span>
            </button>
            <span className="text-sm font-semibold text-slate-500">{status === 'listening' ? 'Speak now…' : 'Speak'}</span>
          </div>
        )}

        {myClip && (
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={() => playUrl(myClip)} className="btn btn-purple !h-16 !w-16 !rounded-full !p-0 text-3xl" aria-label="Hear me">
              <span className="emoji">🧒</span>
            </button>
            <span className="text-sm font-semibold text-slate-500">Me</span>
          </div>
        )}
      </div>

      {micMode === 'none' && (
        <div className="flex flex-col items-center gap-2">
          <button type="button" className="btn btn-green text-2xl" onClick={saidIt} data-testid="said-it">
            I said it! <span className="emoji">✅</span>
          </button>
          <p className="max-w-xs text-center text-sm text-slate-400">Mikrofon tidak tersedia. Ucapkan kata bersama orang tua, lalu ketuk tombol.</p>
        </div>
      )}
      {status === 'error' && <p className="text-center text-sm text-slate-500">Mikrofon tidak bisa dipakai (izin ditolak?). Tidak apa-apa — ucapkan saja dengan keras!</p>}
      {micMode === 'record' && status === 'idle' && <p className="text-center text-sm text-slate-400">Ketuk 🎤 lalu ucapkan kata. Suara direkam di perangkat ini saja untuk diputar ulang.</p>}

      <div className="flex gap-3">
        {showContinue ? (
          <button type="button" className="btn btn-green text-2xl" onClick={finish} data-testid="continue">
            Next <span className="emoji">➡️</span>
          </button>
        ) : (
          micMode !== 'none' && (
            <button type="button" className="text-base font-semibold text-slate-400 underline" onClick={finish} data-testid="skip">
              Skip
            </button>
          )
        )}
      </div>
    </div>
  );
}
