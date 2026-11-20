import { motion } from 'framer-motion';
import { Gift, Map, Play, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { speech } from '../audio/speech';
import { Character, type DanceMove } from '../components/characters/Character';
import { BigButton } from '../components/ui/Button';
import { Counter } from '../components/ui/Counters';
import { Logo } from '../components/ui/Logo';
import { SceneBackground } from '../components/ui/SceneBackground';
import { SpeechBubble } from '../components/ui/SpeechBubble';
import { SoundToggle, TopBar } from '../components/ui/TopBar';
import { hasAnyProgress, nextStage, totalStars } from '../game/progress';
import { getWorld } from '../game/worlds';
import { useIsWide } from '../hooks/useIsWide';
import { useGame } from '../state/GameContext';

export function HomeScreen() {
  const { state, navigate, startStage } = useGame();
  const { save } = state;
  const stars = totalStars(save);
  const next = nextStage(save);
  const started = hasAnyProgress(save);
  const wide = useIsWide();
  const [danceKey, setDanceKey] = useState(0);
  const [dancing, setDancing] = useState(false);

  const greet = started ? 'Halo lagi, Teman! Ayo lanjut berpetualang!' : 'Halo, Teman! Aku Pando. Ayo berpetualang!';

  const dance = () => {
    setDanceKey((k) => k + 1);
    setDancing(true);
    speech.speak('Yeay!');
    window.setTimeout(() => setDancing(false), 1400);
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <SceneBackground scene="home" />
      <TopBar
        left={
          <>
            <Counter kind="star" value={stars} testId="home-stars" />
            <Counter kind="coin" value={save.coins} testId="home-coins" />
          </>
        }
        right={<SoundToggle />}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-between gap-2 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mt-1">
          <Logo small />
        </div>

        <div className="flex w-full flex-col items-center">
          <SpeechBubble tail="bottom" className="mb-2 max-w-sm text-center">
            {greet}
          </SpeechBubble>
          <div className="flex items-end justify-center">
            <Character id="foxy" size={wide ? 130 : 84} mood="idle" className="-mr-2 hidden xs:inline-block" />
            <Character
              id="pando"
              size={wide ? 250 : 170}
              mood="happy"
              accessory={save.equippedAccessory}
              dance={dancing ? (save.selectedDance as DanceMove) : null}
              danceKey={danceKey}
              onClick={dance}
              title="Pando — sentuh aku!"
            />
            <Character id="mimi" size={wide ? 130 : 84} mood="idle" className="-ml-2 hidden xs:inline-block" />
          </div>
          <span className="-mt-1 rounded-full bg-white/70 px-3 py-0.5 font-display text-sm text-ink/70">Sentuh Pando!</span>
        </div>

        <div className="flex w-full max-w-md flex-col gap-4 md:max-w-lg">
          {started && next && (
            <BigButton
              size="xl"
              color="mint"
              className="w-full"
              onClick={() => startStage(next.worldId, next.stage)}
              testId="continue-button"
            >
              <Play size={34} fill="currentColor" />
              <span className="flex flex-col items-start leading-tight">
                Lanjutkan
                <span className="text-base font-semibold opacity-80">
                  {getWorld(next.worldId).name} · Tahap {next.stage + 1}
                </span>
              </span>
            </BigButton>
          )}
          <BigButton
            size={started ? 'lg' : 'xl'}
            color={started ? 'sun' : 'mint'}
            className="w-full"
            onClick={() => navigate('map')}
            testId="start-button"
          >
            <Map size={32} /> {started ? 'Peta Petualangan' : 'Mulai Petualangan'}
          </BigButton>
          <motion.div className="w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <BigButton size="md" color="pink" className="w-full" onClick={() => navigate('collection')} testId="collection-button">
              <Gift size={28} /> Hadiahku
            </BigButton>
          </motion.div>
          <button
            type="button"
            onClick={() => navigate('parent')}
            className="mx-auto flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-1.5 font-display text-sm font-semibold text-ink/70"
            data-testid="parent-button"
          >
            <ShieldCheck size={16} /> Untuk Orang Tua
          </button>
        </div>
      </main>
    </div>
  );
}
