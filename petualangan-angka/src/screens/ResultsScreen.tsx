import { animate, motion } from 'framer-motion';
import { ArrowRight, LayoutGrid, Map, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { speech } from '../audio/speech';
import { Character } from '../components/characters/Character';
import { BigButton } from '../components/ui/Button';
import { Confetti } from '../components/ui/Confetti';
import { Counter, StarRow } from '../components/ui/Counters';
import { CoinIcon } from '../components/ui/Icons';
import { Modal } from '../components/ui/Modal';
import { SceneBackground } from '../components/ui/SceneBackground';
import { TopBar } from '../components/ui/TopBar';
import { WorldEmblem } from '../components/ui/WorldEmblem';
import { resultMessage, spellNumbers } from '../game/language';
import { DANCES, getBadge } from '../game/rewards';
import { MAX_SCORE, QUESTIONS_PER_STAGE } from '../game/scoring';
import { getWorld, STAGES_PER_WORLD } from '../game/worlds';
import { useGame } from '../state/GameContext';

export function ResultsScreen() {
  const { state, navigate, startStage, markWorldCelebrated } = useGame();
  // Keep the last result while this screen animates out (the store clears it when a new stage starts).
  const kept = useRef(state.lastResult);
  if (state.lastResult) kept.current = state.lastResult;
  const r = kept.current;
  const [shownScore, setShownScore] = useState(0);
  const [coinsShown, setCoinsShown] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const flown = useRef(false);

  useEffect(() => {
    if (!r && state.screen === 'results') navigate('home');
  }, [r, state.screen, navigate]);

  useEffect(() => {
    if (!r) return;
    const controls = animate(0, r.score, { duration: 1.2, delay: 0.4, onUpdate: (v) => setShownScore(Math.round(v)) });
    const timers: number[] = [];
    if (r.passed) timers.push(window.setTimeout(() => sound.levelComplete(), 200));
    for (let i = 0; i < r.stars; i++) timers.push(window.setTimeout(() => sound.star(i), 650 + i * 350));
    timers.push(window.setTimeout(() => speech.speak(spellNumbers(resultMessage(r.stars))), 900));
    if (r.worldCompleted && !state.save.celebratedWorlds.includes(r.worldId)) {
      timers.push(
        window.setTimeout(() => {
          setCelebrate(true);
          sound.fanfare();
          speech.speak('Hore! Kamu menyelesaikan satu dunia!');
        }, 2600),
      );
    }
    return () => {
      controls.stop();
      timers.forEach((t) => window.clearTimeout(t));
    };
    // Runs once per finished stage.
  }, [r]);

  if (!r) return null;
  const world = getWorld(r.worldId);
  const nextWorld = r.unlockedWorld ? getWorld(r.unlockedWorld) : null;
  const hasNextStage = r.stage + 1 < STAGES_PER_WORLD;
  const coinsBefore = state.save.coins - r.coinsEarned;

  const onContinue = () => {
    if (!r.passed) return startStage(r.worldId, r.stage);
    if (hasNextStage) return startStage(r.worldId, r.stage + 1);
    navigate('map');
  };

  const closeCelebration = () => {
    markWorldCelebrated(r.worldId);
    setCelebrate(false);
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <SceneBackground scene={world.theme} />
      {r.passed && <Confetti count={70} />}

      <TopBar right={<Counter kind="coin" value={coinsShown ?? coinsBefore} testId="results-coins" />} />

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-4 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <motion.div
          initial={{ scale: 0.6, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="relative mt-10 flex w-full flex-col items-center gap-3 rounded-5xl bg-cream/95 px-5 pb-6 pt-16 text-center shadow-soft"
          data-testid="results-card"
        >
          <div className="absolute -top-16 left-1/2 -translate-x-1/2">
            <Character id={world.guide} mood={r.passed ? 'happy' : 'encourage'} size={120} accessory={world.guide === 'pando' ? state.save.equippedAccessory : null} />
          </div>
          <div className="font-display text-base font-semibold text-ink/60">
            {world.name} · Tahap {r.stage + 1}
          </div>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl" data-testid="results-message">
            {resultMessage(r.stars)}
          </h1>
          <StarRow stars={r.stars} size={64} animate />

          <div className="grid w-full grid-cols-2 gap-3">
            <div className="rounded-3xl bg-white p-3 shadow-pop-sm">
              <div className="font-display text-sm font-semibold text-ink/60">Skor</div>
              <div className="font-display text-4xl font-bold text-grape" data-testid="results-score">
                {shownScore}
                <span className="text-xl text-ink/40">/{MAX_SCORE}</span>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-3 shadow-pop-sm">
              <div className="font-display text-sm font-semibold text-ink/60">Jawaban Benar</div>
              <div className="font-display text-4xl font-bold text-mint" data-testid="results-correct">
                {r.correct}
                <span className="text-xl text-ink/40">/{QUESTIONS_PER_STAGE}</span>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.6, type: 'spring' }}
            onAnimationComplete={() => {
              if (flown.current) return;
              flown.current = true;
              flyCoins(Math.min(10, Math.max(3, Math.round(r.coinsEarned / 4))), () => setCoinsShown(state.save.coins));
            }}
            className="flex items-center gap-2 rounded-full bg-sun/30 px-5 py-2 font-display text-2xl font-bold text-ink"
            data-coin-source="true"
          >
            <CoinIcon size={36} /> +{r.coinsEarned} koin
          </motion.div>

          {!r.passed && (
            <p className="font-display text-lg text-ink/70">Jawab benar 3 soal untuk membuka tahap berikutnya. Ayo coba lagi!</p>
          )}

          {(r.newBadges.length > 0 || r.newDances.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.1 }}
              className="w-full rounded-3xl bg-grape/10 p-3"
            >
              <div className="font-display text-lg font-bold text-grape">Hadiah Baru!</div>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                {r.newBadges.map((id) => {
                  const b = getBadge(id);
                  return b ? (
                    <span key={id} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 font-display text-base font-semibold text-ink shadow">
                      <span className="text-xl">{b.emoji}</span> {b.name}
                    </span>
                  ) : null;
                })}
                {r.newDances.map((id) => (
                  <span key={id} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 font-display text-base font-semibold text-ink shadow">
                    💃 Gerakan: {DANCES.find((d) => d.id === id)?.name}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        <div className="flex w-full flex-col gap-3">
          <BigButton color="mint" size="xl" className="w-full" onClick={onContinue} testId="results-continue">
            {r.passed ? (
              <>
                {hasNextStage ? 'Lanjut' : 'Ke Peta'} <ArrowRight size={32} strokeWidth={3} />
              </>
            ) : (
              <>
                <RotateCcw size={30} strokeWidth={3} /> Coba Lagi
              </>
            )}
          </BigButton>
          <div className="grid grid-cols-2 gap-3">
            {r.passed ? (
              <BigButton color="white" size="md" onClick={() => startStage(r.worldId, r.stage)} testId="results-retry">
                <RotateCcw size={24} /> Ulangi
              </BigButton>
            ) : (
              <BigButton color="white" size="md" onClick={() => navigate('map')}>
                <Map size={24} /> Peta
              </BigButton>
            )}
            <BigButton color="white" size="md" onClick={() => navigate('levels', r.worldId)} testId="results-levels">
              <LayoutGrid size={24} /> Tahap
            </BigButton>
          </div>
        </div>
      </main>

      <Modal open={celebrate}>
        <Confetti count={90} burstKey={2} />
        <div className="flex flex-col items-center gap-3" data-testid="world-complete">
          <div className="flex items-end">
            <Character id="foxy" mood="happy" size={70} />
            <Character id="pando" mood="happy" size={100} accessory={state.save.equippedAccessory} />
            <Character id="bubu" mood="happy" size={70} />
          </div>
          <h2 className="font-display text-3xl font-bold text-ink">Hore! Dunia Selesai!</h2>
          <p className="font-display text-lg text-ink/80">Kamu menyelesaikan {world.name}!</p>
          {nextWorld ? (
            <div className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-pop-sm">
              <WorldEmblem theme={nextWorld.theme} size={64} />
              <div className="text-left">
                <div className="font-display text-sm font-semibold text-mint">Dunia baru terbuka!</div>
                <div className="font-display text-2xl font-bold text-ink">{nextWorld.name}</div>
              </div>
            </div>
          ) : (
            <p className="font-display text-xl font-bold text-grape">Kamu Juara Angka! 🏆</p>
          )}
          <BigButton color="mint" size="lg" className="w-full" onClick={closeCelebration} testId="celebration-ok">
            Yeay!
          </BigButton>
        </div>
      </Modal>
    </div>
  );
}

/** Animate coin icons flying from the reward chip into the header counter. */
function flyCoins(count: number, onDone: () => void) {
  const target = document.querySelector('[data-coin-target]')?.getBoundingClientRect();
  const source = document.querySelector('[data-coin-source]')?.getBoundingClientRect();
  if (!target || !source) return onDone();
  const layer = document.createElement('div');
  layer.className = 'pointer-events-none fixed inset-0 z-[60]';
  document.body.appendChild(layer);
  let landed = 0;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'coin-fly';
    const sx = source.left + source.width / 2 - 14 + (Math.random() - 0.5) * 60;
    const sy = source.top + source.height / 2 - 14;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    el.style.setProperty('--dx', `${target.left + 20 - sx}px`);
    el.style.setProperty('--dy', `${target.top + 6 - sy}px`);
    el.style.animationDelay = `${i * 0.08}s`;
    el.addEventListener('animationend', () => {
      landed++;
      sound.coin();
      if (landed === count) {
        layer.remove();
        onDone();
      }
    });
    layer.appendChild(el);
  }
  // Safety net in case animations are disabled.
  window.setTimeout(() => {
    if (layer.isConnected) {
      layer.remove();
      onDone();
    }
  }, 3000);
}
