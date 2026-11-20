import { motion } from 'framer-motion';
import { Check, Home } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { speech } from '../audio/speech';
import { Character } from '../components/characters/Character';
import { IconButton } from '../components/ui/Button';
import { Counter } from '../components/ui/Counters';
import { LockIcon, StarIcon } from '../components/ui/Icons';
import { SceneBackground, THEME_COLORS } from '../components/ui/SceneBackground';
import { SoundToggle, TopBar } from '../components/ui/TopBar';
import { WorldEmblem } from '../components/ui/WorldEmblem';
import { isWorldComplete, isWorldUnlocked, nextStage, totalStars, worldCompletedStages, worldStars } from '../game/progress';
import { STAGES_PER_WORLD, WORLDS } from '../game/worlds';
import { useGame } from '../state/GameContext';

export function WorldMapScreen() {
  const { state, navigate } = useGame();
  const { save } = state;
  const current = nextStage(save)?.worldId ?? WORLDS.length;
  const [shake, setShake] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const currentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  const tapLocked = (id: number) => {
    setShake(id);
    sound.wrong();
    const msg = 'Selesaikan dunia sebelumnya dulu, ya!';
    setToast(msg);
    speech.speak(msg);
    window.setTimeout(() => setShake(null), 500);
    window.setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="relative min-h-[100dvh]">
      <SceneBackground scene="map" />
      <div className="sticky top-0 z-30 bg-gradient-to-b from-sky/60 to-transparent backdrop-blur-[2px]">
        <TopBar
          left={
            <IconButton label="Beranda" onClick={() => navigate('home')} testId="home-nav">
              <Home size={28} strokeWidth={2.6} />
            </IconButton>
          }
          center={
            <h1 className="logo-letter truncate font-display text-3xl font-bold text-white sm:text-4xl">Peta Dunia</h1>
          }
          right={
            <>
              <Counter kind="star" value={totalStars(save)} />
              <span className="hidden sm:block">
                <SoundToggle />
              </span>
            </>
          }
        />
      </div>

      <main className="relative z-10 mx-auto max-w-xl px-4 pb-16 pt-2">
        {/* dotted trail */}
        <svg className="pointer-events-none absolute left-0 top-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 700" aria-hidden="true">
          <path
            d="M50 30 C 90 80, 90 110, 50 130 S 10 180, 50 230 S 90 280, 50 330 S 10 380, 50 430 S 90 480, 50 530 S 10 580, 50 630"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeDasharray="1 4"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: 10 }}
          />
        </svg>

        <div className="relative flex flex-col gap-5">
          {WORLDS.map((w, i) => {
            const unlocked = isWorldUnlocked(save, w.id);
            const complete = isWorldComplete(save, w.id);
            const stars = worldStars(save, w.id);
            const done = worldCompletedStages(save, w.id);
            const isCurrent = unlocked && w.id === current && !complete;
            const t = THEME_COLORS[w.theme];
            const alignRight = i % 2 === 1;
            return (
              <motion.div
                key={w.id}
                ref={isCurrent ? currentRef : undefined}
                initial={{ opacity: 0, x: alignRight ? 60 : -60 }}
                animate={{ opacity: 1, x: shake === w.id ? [0, -10, 10, -6, 6, 0] : 0 }}
                transition={{ delay: shake === w.id ? 0 : i * 0.07 }}
                className={`flex ${alignRight ? 'justify-end' : 'justify-start'}`}
              >
                <motion.button
                  type="button"
                  data-testid={`world-${w.id}`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (!unlocked) return tapLocked(w.id);
                    sound.click();
                    navigate('levels', w.id);
                  }}
                  className={`relative flex w-[88%] items-center gap-3 rounded-4xl p-3 text-left shadow-soft sm:w-[80%] ${
                    unlocked ? 'bg-white/95' : 'bg-white/60'
                  } ${isCurrent ? 'ring-4 ring-sun' : ''}`}
                  style={{ borderBottom: `6px solid ${unlocked ? t.accent : '#C9C2DE'}` }}
                  aria-label={`${w.name}${unlocked ? '' : ' (terkunci)'}`}
                >
                  <div className="relative shrink-0">
                    <WorldEmblem theme={w.theme} size={84} locked={!unlocked} />
                    {!unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <LockIcon size={44} />
                      </div>
                    )}
                    {complete && (
                      <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-mint text-white">
                        <Check size={18} strokeWidth={4} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-sm font-semibold" style={{ color: unlocked ? t.label : '#8F86A8' }}>
                      Dunia {w.id}
                    </div>
                    <div className={`truncate font-display text-2xl font-bold ${unlocked ? 'text-ink' : 'text-ink/50'}`}>{w.name}</div>
                    <div className="font-display text-sm text-ink/60">{w.topic}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink/10">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: t.accent }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(done / STAGES_PER_WORLD) * 100}%` }}
                          transition={{ delay: 0.4 + i * 0.07, duration: 0.6 }}
                        />
                      </div>
                      <span className="flex items-center gap-0.5 font-display text-base font-bold text-ink/80">
                        <StarIcon size={20} filled={stars > 0} />
                        {stars}/{STAGES_PER_WORLD * 3}
                      </span>
                    </div>
                  </div>
                  {isCurrent && (
                    <div className={`pointer-events-none absolute -top-12 ${alignRight ? '-left-2' : '-right-2'}`}>
                      <Character id="pando" size={64} mood="happy" accessory={save.equippedAccessory} />
                    </div>
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </main>

      {toast && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 font-display text-lg font-semibold text-ink shadow-soft"
        >
          <LockIcon size={28} /> {toast}
        </motion.div>
      )}
    </div>
  );
}
