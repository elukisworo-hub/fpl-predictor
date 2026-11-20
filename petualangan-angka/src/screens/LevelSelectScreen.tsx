import { motion } from 'framer-motion';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sound } from '../audio/sound';
import { speech } from '../audio/speech';
import { Character } from '../components/characters/Character';
import { IconButton } from '../components/ui/Button';
import { Counter, StarRow } from '../components/ui/Counters';
import { LockIcon } from '../components/ui/Icons';
import { SceneBackground, THEME_COLORS } from '../components/ui/SceneBackground';
import { SpeechBubble } from '../components/ui/SpeechBubble';
import { SoundToggle, TopBar } from '../components/ui/TopBar';
import { getStage, isStageUnlocked, isWorldUnlocked, worldStars } from '../game/progress';
import { getWorld, STAGES_PER_WORLD } from '../game/worlds';
import { useGame } from '../state/GameContext';

// Zig-zag positions (percent of width) for the 5 stage bubbles.
const XS = [22, 62, 30, 72, 44];

export function LevelSelectScreen() {
  const { state, navigate, startStage } = useGame();
  const { save, worldId } = state;
  const world = getWorld(worldId);
  const t = THEME_COLORS[world.theme];
  const [lockedMsg, setLockedMsg] = useState(false);

  useEffect(() => {
    if (state.screen === 'levels' && !isWorldUnlocked(save, worldId)) navigate('map');
  }, [save, worldId, navigate, state.screen]);

  useEffect(() => {
    const id = window.setTimeout(() => speech.speak(world.intro), 350);
    return () => window.clearTimeout(id);
  }, [world]);

  const firstOpen = Array.from({ length: STAGES_PER_WORLD }, (_, i) => i).find(
    (i) => isStageUnlocked(save, worldId, i) && !getStage(save, worldId, i)?.completed,
  );

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <SceneBackground scene={world.theme} />
      <TopBar
        left={
          <IconButton label="Kembali ke peta" onClick={() => navigate('map')} testId="back-to-map">
            <ArrowLeft size={30} strokeWidth={3} />
          </IconButton>
        }
        center={
          <div className="text-center">
            <div className="font-display text-sm font-bold" style={{ color: t.label }}>
              Dunia {world.id} · {world.topic}
            </div>
            <h1 className="logo-letter font-display text-3xl font-bold text-white sm:text-4xl">{world.name}</h1>
          </div>
        }
        right={
          <>
            <Counter kind="star" value={worldStars(save, worldId)} />
            <span className="hidden sm:block">
              <SoundToggle />
            </span>
          </>
        }
      />

      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-8">
        <div className="flex items-center gap-2">
          <Character id={world.guide} size={80} mood="talk" accessory={world.guide === 'pando' ? save.equippedAccessory : null} />
          <SpeechBubble className="flex-1 text-lg leading-snug sm:text-xl">
            <div className="flex items-start gap-2">
              <span className="flex-1">{lockedMsg ? 'Selesaikan tahap sebelumnya dulu, ya!' : world.intro}</span>
              <button type="button" aria-label="Dengarkan" onClick={() => speech.speak(world.intro)} className="text-grape">
                <Volume2 size={24} />
              </button>
            </div>
          </SpeechBubble>
        </div>

        <div className="relative mt-3 flex-1" style={{ minHeight: 480 }}>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline
              points={XS.map((x, i) => `${x},${8 + i * 18.5}`).join(' ')}
              fill="none"
              stroke="#fff"
              strokeOpacity="0.85"
              strokeDasharray="0.5 3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 12 }}
            />
          </svg>
          {XS.map((x, i) => {
            const unlocked = isStageUnlocked(save, worldId, i);
            const prog = getStage(save, worldId, i);
            const isNext = i === firstOpen;
            return (
              <motion.div
                key={i}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${x}%`, top: `${8 + i * 18.5}%` }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15 + i * 0.1, type: 'spring', stiffness: 260, damping: 15 }}
              >
                {isNext && (
                  <motion.span
                    className="mb-1 rounded-full bg-white px-3 py-0.5 font-display text-sm font-bold text-ink shadow"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    Main!
                  </motion.span>
                )}
                <motion.button
                  type="button"
                  data-testid={`stage-${i + 1}`}
                  aria-label={`Tahap ${i + 1}${unlocked ? '' : ' (terkunci)'}`}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    if (!unlocked) {
                      sound.wrong();
                      setLockedMsg(true);
                      speech.speak('Selesaikan tahap sebelumnya dulu, ya!');
                      window.setTimeout(() => setLockedMsg(false), 2200);
                      return;
                    }
                    sound.click();
                    startStage(worldId, i);
                  }}
                  className={`relative flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-white font-display text-5xl font-bold sm:h-28 sm:w-28 ${
                    isNext ? 'animate-ring' : ''
                  }`}
                  style={{
                    background: unlocked
                      ? prog?.completed
                        ? 'linear-gradient(180deg,#6FF0C4,#2FCB94)'
                        : `linear-gradient(180deg,#fff,${t.accent})`
                      : 'linear-gradient(180deg,#E9E4F5,#C9C2DE)',
                    color: unlocked ? (prog?.completed ? '#fff' : '#3B2E5A') : '#8F86A8',
                    boxShadow: '0 7px 0 0 rgba(59,46,90,.25), 0 14px 24px -10px rgba(59,46,90,.5)',
                    textShadow: prog?.completed ? '0 3px 0 rgba(0,0,0,.15)' : undefined,
                  }}
                >
                  {unlocked ? i + 1 : <LockIcon size={50} />}
                </motion.button>
                <div className="mt-1 rounded-full bg-white/80 px-2 py-0.5">
                  <StarRow stars={prog?.stars ?? 0} size={20} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
