import { useState } from 'react';
import { sfx } from '../audio/sfx';
import { speak } from '../audio/speech';
import { MascotSays, Owl } from '../components/Mascot';
import { Confetti, Pill, ProgressBar } from '../components/ui';
import { LEVELS, WORLDS } from '../content/worlds';
import { BADGES } from '../engine/badges';
import { dueCount } from '../engine/mastery';
import { canClaimMissions, dailyMissions } from '../engine/missions';
import { currentStreak, isLevelUnlocked, isWorldComplete, isWorldUnlocked, nextStage, overallProgress, totalStars, worldStars } from '../engine/progress';
import { addDays, dayKey, lastNDays } from '../engine/util';
import { navigate } from '../router';
import { actions } from '../store/actions';
import type { ProgressState } from '../store/model';
import { useProgress } from '../store/store';

const AVATARS = ['🦊', '🐼', '🐯', '🐰', '🐻', '🐨', '🦁', '🐸', '🐵', '🦄', '🐧', '🐱'];

function greeting(state: ProgressState): string {
  const name = state.childName ? `, ${state.childName}` : '';
  const today = dayKey();
  const playedBefore = Object.keys(state.days).some((d) => d < today && state.days[d].games > 0);
  const recent = [1, 2].some((n) => (state.days[addDays(today, -n)]?.games ?? 0) > 0);
  if (playedBefore && !recent && !(state.days[today]?.games)) return `Welcome back${name}! I missed you!`;
  const h = new Date().getHours();
  const part = h < 11 ? 'Good morning' : h < 15 ? 'Hello' : h < 18 ? 'Good afternoon' : 'Good evening';
  return `${part}${name}! Let's play and learn!`;
}

function Onboarding() {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6">
      <Owl mood="wave" size={150} className="animate-bob" />
      <h1 className="text-center text-4xl font-bold text-ocean">English Adventure Kids</h1>
      <button type="button" onClick={() => speak("Hello! I'm Olly the Owl. Let's go on an English adventure!")} className="card px-5 py-3 text-center text-xl font-semibold">
        Hello! I'm Olly the Owl. Let's go on an English adventure! <span className="emoji">🔊</span>
      </button>
      <div className="card w-full p-5">
        <p className="mb-2 text-lg font-semibold">Choose your animal!</p>
        <div className="grid grid-cols-6 gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                sfx.tap();
                setAvatar(a);
              }}
              className={`emoji flex aspect-square items-center justify-center rounded-2xl text-3xl ${avatar === a ? 'bg-sun ring-4 ring-tangerine' : 'bg-slate-100'}`}
            >
              {a}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm font-semibold text-slate-500" htmlFor="nick">
          Nama panggilan anak (opsional, diisi orang tua)
        </label>
        <input
          id="nick"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Kiki"
          className="mt-1 w-full rounded-2xl border-4 border-slate-200 px-4 py-3 text-xl outline-none focus:border-ocean"
        />
        <p className="mt-2 text-xs text-slate-400">Hanya disimpan di perangkat ini. Tidak ada akun, iklan, atau data yang dikirim.</p>
      </div>
      <button
        type="button"
        className="btn btn-green w-full text-2xl"
        data-testid="start"
        onClick={() => {
          sfx.unlock();
          actions.completeOnboarding(name, avatar);
          void speak(`Hello${name ? ` ${name}` : ''}! Let's start!`);
        }}
      >
        Start! <span className="emoji">🚀</span>
      </button>
    </div>
  );
}

function WeekSuns({ state }: { state: ProgressState }) {
  const days = lastNDays(dayKey(), 7);
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return (
    <div className="flex gap-1">
      {days.map((d) => {
        const active = (state.days[d]?.games ?? 0) > 0;
        const [y, m, dd] = d.split('-').map(Number);
        const dow = new Date(y, m - 1, dd).getDay();
        return (
          <div key={d} className="flex flex-col items-center">
            <span className="emoji text-lg" style={{ filter: active ? 'none' : 'grayscale(1) opacity(.25)' }}>
              ☀️
            </span>
            <span className="text-[10px] font-semibold text-slate-400">{labels[dow]}</span>
          </div>
        );
      })}
    </div>
  );
}

function Missions({ state }: { state: ProgressState }) {
  const missions = dailyMissions(state);
  const claimable = canClaimMissions(state);
  const claimed = !!state.missionsClaimed[dayKey()];
  const [celebrate, setCelebrate] = useState(false);
  return (
    <section className="card p-4">
      {celebrate && <Confetti />}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          <span className="emoji">🎯</span> Daily Missions
        </h2>
        <span className="text-xs font-semibold text-slate-400">Misi hari ini</span>
      </div>
      <ul className="flex flex-col gap-3">
        {missions.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <span className={`emoji flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl ${m.done ? 'bg-green-100' : 'bg-slate-100'}`}>{m.done ? '✅' : m.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">{m.title}</p>
              <p className="text-xs text-slate-400">{m.titleId}</p>
              <ProgressBar value={m.progress / m.goal} height="h-2.5" className="mt-1" color={m.done ? 'bg-grass' : 'bg-sun'} />
            </div>
            <span className="text-sm font-bold text-slate-500">
              {m.progress}/{m.goal}
            </span>
          </li>
        ))}
      </ul>
      {claimable && (
        <button
          type="button"
          className="btn btn-orange mt-4 w-full animate-bob text-xl"
          onClick={() => {
            actions.claimMissions();
            sfx.fanfare();
            setCelebrate(true);
            void speak('Wow! All missions done! Here is your treasure!');
          }}
        >
          <span className="emoji">🎁</span> Open treasure! +20 XP
        </button>
      )}
      {claimed && <p className="mt-3 text-center font-semibold text-grassdark">All done today! See you tomorrow! 🌙</p>}
    </section>
  );
}

function WorldMap({ state }: { state: ProgressState }) {
  const current = nextStage(state);
  return (
    <section className="relative flex flex-col gap-6 py-2">
      <div className="absolute bottom-6 left-1/2 top-6 -z-0 w-2 -translate-x-1/2 rounded-full border-l-8 border-dotted border-white/90" aria-hidden />
      {WORLDS.map((w, i) => {
        const unlocked = isWorldUnlocked(state, w.id);
        const complete = isWorldComplete(state, w.id);
        const ws = worldStars(state, w);
        const here = current?.worldId === w.id;
        return (
          <div key={w.id} className={`relative z-10 flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
            <button
              type="button"
              data-testid={`world-${w.id}`}
              onClick={() => {
                sfx.tap();
                if (unlocked) navigate({ name: 'world', worldId: w.id });
                else void speak('This world is locked. Finish the world before it!');
              }}
              className={`relative w-[78%] max-w-sm rounded-[2rem] p-4 text-left text-white shadow-chunky transition-transform active:scale-95 ${unlocked ? '' : 'grayscale'}`}
              style={{ background: `linear-gradient(135deg, ${w.from}, ${w.to})` }}
            >
              {here && (
                <span className="absolute -top-8 right-4 flex items-end">
                  <Owl size={52} mood="wave" className="animate-bob" />
                </span>
              )}
              <div className="flex items-center gap-3">
                <span className="emoji flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/30 text-5xl">{unlocked ? w.emoji : '🔒'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-white/80">World {w.index}</p>
                  <p className="text-xl font-bold leading-tight drop-shadow">{w.name}</p>
                  {unlocked ? (
                    <div className="mt-1 flex items-center gap-2">
                      <ProgressBar value={ws.done / ws.total} height="h-2.5" color="bg-white" className="!bg-white/30" />
                      <span className="whitespace-nowrap text-sm font-bold">⭐ {ws.stars}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-white/90">Selesaikan World {w.index - 1} dulu</p>
                  )}
                </div>
                {complete && <span className="emoji text-3xl">🏆</span>}
              </div>
            </button>
          </div>
        );
      })}
    </section>
  );
}

function LockedLevels({ state }: { state: ProgressState }) {
  return (
    <section className="flex flex-col gap-3">
      {LEVELS.filter((l) => l.id !== 'starters').map((l) => {
        const open = isLevelUnlocked(state, l.id);
        return (
          <div key={l.id} className="card flex items-center gap-3 bg-slate-50 p-4 opacity-90">
            <span className="emoji text-4xl">{open ? '🚧' : '🔒'}</span>
            <div>
              <p className="text-lg font-bold">{l.name}</p>
              <p className="text-xs text-slate-500">
                {open ? 'Materi level ini sedang disiapkan (segera hadir).' : `Terbuka setelah ${l.id === 'movers' ? 'Pre A1 Starters' : 'A1 Movers'} selesai.`}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

export function Home() {
  const state = useProgress();
  if (!state.onboarded) return <Onboarding />;

  const stage = nextStage(state);
  const stars = totalStars(state);
  const streak = currentStreak(state);
  const due = dueCount(state);
  const earned = BADGES.filter((b) => state.badges[b.id]);
  const text = greeting(state);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-10 pt-4">
      <header className="flex items-center gap-2">
        <span className="emoji flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">{state.avatar}</span>
        <div className="mr-auto min-w-0">
          <p className="truncate text-lg font-bold leading-tight">{state.childName || 'Explorer'}</p>
          <p className="text-xs font-semibold text-slate-400">Pre A1 Starters</p>
        </div>
        <Pill icon="⭐" value={stars} label="Total stars" />
        <Pill icon="⚡" value={state.xp} label="Total XP" className="hidden sm:flex" />
        <button
          type="button"
          onClick={() => navigate({ name: 'parent' })}
          className="flex h-12 items-center gap-1 rounded-2xl bg-white px-3 text-sm font-semibold text-slate-500 shadow-sm"
          aria-label="Parent area"
          data-testid="parent-btn"
        >
          <span className="emoji text-xl">👨‍👩‍👧</span>
          <span className="hidden sm:inline">Orang tua</span>
        </button>
      </header>

      <section className="card flex flex-col gap-4 p-4">
        <MascotSays text={text} mood="wave" size={92} bubbleClass="!bg-sky-50" />
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-orange-50 p-2">
            <p className="emoji text-2xl">🔥</p>
            <p className="text-xl font-bold">{streak}</p>
            <p className="text-[11px] font-semibold text-slate-500">{streak === 1 ? 'day' : 'days'} in a row</p>
          </div>
          <div className="rounded-2xl bg-purple-50 p-2">
            <p className="emoji text-2xl">⚡</p>
            <p className="text-xl font-bold">{state.xp}</p>
            <p className="text-[11px] font-semibold text-slate-500">XP</p>
          </div>
          <div className="rounded-2xl bg-yellow-50 p-2">
            <p className="emoji text-2xl">⭐</p>
            <p className="text-xl font-bold">{stars}</p>
            <p className="text-[11px] font-semibold text-slate-500">stars</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <WeekSuns state={state} />
          <span className="text-xs font-semibold text-slate-400">This week</span>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
            <span>Starters adventure</span>
            <span>{Math.round(overallProgress(state) * 100)}%</span>
          </div>
          <ProgressBar value={overallProgress(state)} />
        </div>
        {stage ? (
          <button type="button" className="btn btn-green text-2xl" data-testid="continue" onClick={() => navigate({ name: 'stage', stageId: stage.id })}>
            <span className="emoji">▶️</span> {Object.keys(state.stages).length ? 'Continue' : 'Start learning'}
            <span className="ml-1 hidden text-base font-medium opacity-90 sm:inline">· {stage.title}</span>
          </button>
        ) : (
          <p className="text-center font-bold text-grassdark">🏆 You finished Pre A1 Starters! Play any stage again.</p>
        )}
        {due >= 3 && (
          <button type="button" className="btn btn-purple text-xl" onClick={() => navigate({ name: 'review' })} data-testid="review">
            <span className="emoji">🔁</span> Review {due} words
          </button>
        )}
      </section>

      <Missions state={state} />

      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            <span className="emoji">🏅</span> My Badges
          </h2>
          <button type="button" className="text-sm font-semibold text-ocean" onClick={() => navigate({ name: 'badges' })}>
            See all ({earned.length}/{BADGES.length})
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {BADGES.slice(0, 8).map((b) => (
            <span key={b.id} className="emoji flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-3xl" style={{ filter: state.badges[b.id] ? 'none' : 'grayscale(1) opacity(.3)' }} title={b.name}>
              {b.icon}
            </span>
          ))}
        </div>
      </section>

      <h2 className="mt-2 text-center text-2xl font-bold text-ocean drop-shadow-sm">
        <span className="emoji">🗺️</span> Adventure Map
      </h2>
      <WorldMap state={state} />
      <LockedLevels state={state} />
    </div>
  );
}
