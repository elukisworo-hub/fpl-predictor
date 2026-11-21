import { useMemo, useState } from 'react';
import { IconButton } from '../components/ui';
import { navigate } from '../router';
import { actions, checkPin } from '../store/actions';
import { useProgress } from '../store/store';

function MathGate({ onPass, title }: { onPass: () => void; title: string }) {
  const [a, b] = useMemo(() => [6 + Math.floor(Math.random() * 4), 6 + Math.floor(Math.random() * 4)], []);
  const [val, setVal] = useState('');
  const [err, setErr] = useState(false);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (Number(val) === a * b) onPass();
        else setErr(true);
      }}
    >
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-slate-500">Untuk memastikan yang membuka adalah orang tua, jawab soal ini:</p>
      <p className="text-3xl font-bold">
        {a} × {b} = ?
      </p>
      <input
        inputMode="numeric"
        autoFocus
        value={val}
        onChange={(e) => {
          setVal(e.target.value.replace(/\D/g, ''));
          setErr(false);
        }}
        className="rounded-2xl border-4 border-slate-200 px-4 py-3 text-2xl outline-none focus:border-ocean"
        aria-label="Jawaban"
      />
      {err && <p className="text-sm font-semibold text-berry">Jawaban belum tepat, coba lagi.</p>}
      <button type="submit" className="btn btn-blue">
        Lanjut
      </button>
    </form>
  );
}

function PinPad({ onComplete, error }: { onComplete: (pin: string) => void; error?: string }) {
  const [pin, setPin] = useState('');
  const press = (d: string) => {
    const next = (pin + d).slice(0, 4);
    if (next.length === 4) {
      setPin('');
      onComplete(next);
    } else setPin(next);
  };
  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`flex gap-3 ${error ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-5 w-5 rounded-full ${i < pin.length ? 'bg-ocean' : 'bg-slate-200'}`} />
        ))}
      </div>
      {error && <p className="text-sm font-semibold text-berry">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              data-testid={`pin-${k}`}
              onClick={() => (k === '⌫' ? setPin(pin.slice(0, -1)) : press(k))}
              className="h-16 w-16 rounded-2xl border-b-4 border-slate-200 bg-white text-2xl font-bold shadow-sm active:translate-y-0.5"
            >
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

/** PIN-protected entry to the parent area. First visit: math check, then set a PIN. */
export function ParentGate({ onUnlock }: { onUnlock: () => void }) {
  const { parentPinHash } = useProgress();
  const [stage, setStage] = useState<'math' | 'create' | 'confirm' | 'enter' | 'forgot'>(parentPinHash ? 'enter' : 'math');
  const [first, setFirst] = useState('');
  const [error, setError] = useState<string | undefined>();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col gap-5 p-6">
      <div className="flex items-center gap-3">
        <IconButton label="Kembali" onClick={() => navigate({ name: 'home' })}>
          ⬅️
        </IconButton>
        <h1 className="text-2xl font-bold">Area Orang Tua</h1>
      </div>
      <div className="card p-6">
        {stage === 'math' && <MathGate title="Buat PIN orang tua" onPass={() => setStage('create')} />}
        {stage === 'forgot' && <MathGate title="Lupa PIN? Buat PIN baru" onPass={() => setStage('create')} />}
        {stage === 'create' && (
          <div className="flex flex-col items-center gap-3">
            <p className="font-semibold">Buat PIN 4 angka</p>
            <PinPad
              onComplete={(p) => {
                setFirst(p);
                setError(undefined);
                setStage('confirm');
              }}
            />
          </div>
        )}
        {stage === 'confirm' && (
          <div className="flex flex-col items-center gap-3">
            <p className="font-semibold">Ulangi PIN</p>
            <PinPad
              error={error}
              onComplete={(p) => {
                if (p === first) {
                  actions.setPin(p);
                  onUnlock();
                } else {
                  setError('PIN tidak sama. Buat ulang.');
                  setStage('create');
                }
              }}
            />
          </div>
        )}
        {stage === 'enter' && (
          <div className="flex flex-col items-center gap-3">
            <p className="font-semibold">Masukkan PIN</p>
            <PinPad
              error={error}
              onComplete={(p) => {
                if (checkPin(p)) onUnlock();
                else setError('PIN salah, coba lagi.');
              }}
            />
            <button type="button" className="text-sm font-semibold text-ocean underline" onClick={() => setStage('forgot')}>
              Lupa PIN?
            </button>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-slate-400">Semua data belajar tersimpan di perangkat ini saja.</p>
    </div>
  );
}
