import { speak } from '../audio/speech';
import { Owl } from '../components/Mascot';
import { IconButton } from '../components/ui';
import { BADGES } from '../engine/badges';
import { navigate } from '../router';
import { useProgress } from '../store/store';

export function Badges() {
  const state = useProgress();
  const count = BADGES.filter((b) => state.badges[b.id]).length;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 p-4 pb-10">
      <header className="flex items-center gap-3">
        <IconButton label="Back" onClick={() => navigate({ name: 'home' })}>
          ⬅️
        </IconButton>
        <h1 className="text-3xl font-bold">My Badges</h1>
        <span className="ml-auto rounded-2xl bg-white px-3 py-1 font-bold shadow-sm">
          {count}/{BADGES.length}
        </span>
      </header>
      <div className="flex items-center gap-3">
        <Owl size={70} mood="cheer" />
        <p className="text-lg font-semibold">Collect them all!</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BADGES.map((b) => {
          const got = !!state.badges[b.id];
          return (
            <button key={b.id} type="button" onClick={() => speak(b.name)} className={`card flex flex-col items-center gap-1 p-4 text-center ${got ? '' : 'opacity-60'}`}>
              <span className="emoji text-5xl" style={{ filter: got ? 'none' : 'grayscale(1)' }}>
                {got ? b.icon : '🔒'}
              </span>
              <span className="font-bold">{b.name}</span>
              <span className="text-xs text-slate-500">{b.nameId}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
