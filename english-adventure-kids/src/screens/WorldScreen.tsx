import { sfx } from '../audio/sfx';
import { speak } from '../audio/speech';
import { Owl } from '../components/Mascot';
import { IconButton, ProgressBar, Stars } from '../components/ui';
import { TOPICS } from '../content/topics';
import type { StageDef } from '../content/types';
import { WORLD_BY_ID } from '../content/worlds';
import { isStageDone, isStageUnlocked, isWorldUnlocked, worldStars } from '../engine/progress';
import { navigate } from '../router';
import { useProgress } from '../store/store';

function stageIcon(s: StageDef, i: number): string {
  if (s.boss) return '👑';
  if (s.storyId) return '📖';
  if (s.qa && !s.vocab.length) return '💬';
  return String(i + 1);
}

export function WorldScreen({ worldId }: { worldId: string }) {
  const state = useProgress();
  const world = WORLD_BY_ID[worldId];
  if (!world || !isWorldUnlocked(state, worldId)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
        <Owl mood="think" size={120} />
        <p className="text-2xl font-bold">This world is still locked!</p>
        <button type="button" className="btn btn-blue text-xl" onClick={() => navigate({ name: 'home' })}>
          <span className="emoji">🗺️</span> Map
        </button>
      </div>
    );
  }
  const ws = worldStars(state, world);
  const currentId = world.stages.find((s) => !isStageDone(state, s.id) && isStageUnlocked(state, s.id))?.id;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col pb-10">
      <header className="sticky top-0 z-20 rounded-b-[2rem] px-4 pb-4 pt-3 text-white shadow-chunky" style={{ background: `linear-gradient(135deg, ${world.from}, ${world.to})` }}>
        <div className="flex items-center gap-3">
          <IconButton label="Back to map" onClick={() => navigate({ name: 'home' })} className="!text-ink">
            ⬅️
          </IconButton>
          <span className="emoji text-4xl">{world.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-white/80">World {world.index}</p>
            <h1 className="truncate text-2xl font-bold drop-shadow">{world.name}</h1>
          </div>
          <span className="rounded-2xl bg-white/30 px-3 py-1 text-lg font-bold">⭐ {ws.stars}/{ws.max}</span>
        </div>
        <ProgressBar value={ws.done / ws.total} color="bg-white" className="mt-3 !bg-white/30" height="h-3" />
        <p className="mt-1 text-xs font-semibold text-white/90">{world.topics.map((t) => TOPICS[t].titleId).join(' · ')}</p>
      </header>

      <div className="relative mt-8 flex flex-col items-center gap-4 px-4">
        {world.stages.map((s, i) => {
          const unlocked = isStageUnlocked(state, s.id);
          const done = isStageDone(state, s.id);
          const stars = state.stages[s.id]?.stars ?? 0;
          const offset = Math.sin(i * 1.1) * 90;
          const isCurrent = s.id === currentId;
          return (
            <div key={s.id} className="relative flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
              {isCurrent && <Owl size={56} mood="wave" className="absolute -left-16 top-0 animate-bob" />}
              <button
                type="button"
                data-testid={`stage-${s.id}`}
                aria-label={`${s.title}${unlocked ? '' : ' (locked)'}`}
                onClick={() => {
                  sfx.tap();
                  if (unlocked) navigate({ name: 'stage', stageId: s.id });
                  else void speak('Finish the stage before this one first!');
                }}
                className={`flex h-24 w-24 items-center justify-center rounded-full border-b-[8px] text-4xl font-bold shadow-lg transition-transform active:translate-y-1 ${
                  !unlocked
                    ? 'border-slate-400 bg-slate-300 text-slate-500'
                    : done
                      ? 'border-[#cc9a00] bg-sun text-ink'
                      : s.boss
                        ? 'border-[#8445c2] bg-grape text-white'
                        : 'border-grassdark bg-grass text-white'
                } ${isCurrent ? 'ring-8 ring-white animate-bob' : ''}`}
              >
                <span className={/\d/.test(stageIcon(s, i)) ? '' : 'emoji'}>{unlocked ? stageIcon(s, i) : '🔒'}</span>
              </button>
              <div className="mt-1 flex flex-col items-center">
                {done && <Stars count={stars} size={18} />}
                <p className="max-w-[10rem] text-center text-sm font-bold leading-tight text-ink">{s.title}</p>
                {s.optional && <p className="text-[10px] font-semibold text-slate-400">bonus</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
