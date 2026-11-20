import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Lightbulb, RotateCcw, Volume2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { speech } from '../audio/speech';
import { Character } from '../components/characters/Character';
import { AnswerButtons } from '../components/game/AnswerButtons';
import { EquationDisplay } from '../components/game/EquationDisplay';
import { Explanation } from '../components/game/Explanation';
import { HintPanel } from '../components/game/HintPanel';
import { QuestionVisual } from '../components/game/QuestionVisual';
import { BigButton, IconButton } from '../components/ui/Button';
import { Confetti } from '../components/ui/Confetti';
import { StarIcon } from '../components/ui/Icons';
import { Modal } from '../components/ui/Modal';
import { SceneBackground } from '../components/ui/SceneBackground';
import { SpeechBubble } from '../components/ui/SpeechBubble';
import { SoundToggle, TopBar } from '../components/ui/TopBar';
import { MSG, randomMessage } from '../game/language';
import { generateStage } from '../game/questionGenerator';
import { defaultRng } from '../game/random';
import type { Choice, Mood } from '../game/types';
import { getWorld } from '../game/worlds';
import { useIsWide } from '../hooks/useIsWide';
import { useGame } from '../state/GameContext';

type Phase = 'answering' | 'correct' | 'wrong';
/** true = right on first try, false = needed another try, undefined = not answered yet */
type Outcome = boolean | undefined;

export function GameplayScreen() {
  const { state, navigate, recordAttempt, finishStage } = useGame();
  const { worldId, stage, playId, save } = state;
  const world = getWorld(worldId);
  // A fresh set of questions every time a stage starts.
  const questions = useMemo(() => generateStage(worldId, stage, defaultRng), [worldId, stage, playId]);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [outcomes, setOutcomes] = useState<Outcome[]>(() => questions.map(() => undefined));
  const [wrongValues, setWrongValues] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [hintOpen, setHintOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const wide = useIsWide();

  // Synchronous guards: ignore double taps and taps on a sheet that is sliding away.
  const phaseRef = useRef<Phase>('answering');
  const indexRef = useRef(0);
  const setPhaseNow = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const q = questions[index];
  const firstTry = outcomes[index] === undefined;
  const mood: Mood = phase === 'correct' ? 'happy' : phase === 'wrong' ? 'encourage' : 'idle';

  // Read the question aloud when it appears.
  useEffect(() => {
    const t = window.setTimeout(() => speech.speak(q.speech), 450);
    return () => {
      window.clearTimeout(t);
      speech.stop();
    };
  }, [q]);

  const pick = (choice: Choice) => {
    if (phaseRef.current !== 'answering' || indexRef.current !== index) return;
    if (choice.value === q.answer) {
      sound.correct();
      const msg = firstTry ? randomMessage(defaultRng, MSG.correct) : randomMessage(defaultRng, MSG.retrySuccess);
      if (firstTry) {
        recordAttempt(q.category, true);
        setOutcomes((o) => o.map((v, i) => (i === index ? true : v)));
      }
      setMessage(msg);
      setPhaseNow('correct');
      setBurst((b) => b + 1);
      window.setTimeout(() => sound.star(0), 250);
      speech.speak(msg);
    } else {
      sound.wrong();
      if (firstTry) {
        recordAttempt(q.category, false);
        setOutcomes((o) => o.map((v, i) => (i === index ? false : v)));
      }
      setWrongValues((w) => [...w, choice.value]);
      const msg = randomMessage(defaultRng, MSG.wrong);
      setMessage(msg);
      setPhaseNow('wrong');
      speech.speak(msg);
    }
  };

  const next = () => {
    if (phaseRef.current !== 'correct' || indexRef.current !== index) return;
    speech.stop();
    if (index + 1 >= questions.length) {
      phaseRef.current = 'answering';
      indexRef.current = -1; // stage finished: ignore any further taps
      const correct = outcomes.filter((o) => o === true).length;
      finishStage(correct);
      return;
    }
    indexRef.current = index + 1;
    setIndex(index + 1);
    setPhaseNow('answering');
    setWrongValues([]);
    setHintOpen(false);
  };

  const tryAgain = () => {
    if (phaseRef.current !== 'wrong' || indexRef.current !== index) return;
    speech.stop();
    setPhaseNow('answering');
  };

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      <SceneBackground scene={world.theme} />

      <TopBar
        left={
          <IconButton label="Keluar" onClick={() => setExitOpen(true)} testId="exit-stage">
            <X size={30} strokeWidth={3} />
          </IconButton>
        }
        center={<ProgressTrack outcomes={outcomes} index={index} />}
        right={<SoundToggle />}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 md:justify-center md:gap-6 md:pb-10">
        <div className="flex items-center gap-2">
          <Character id={q.presenter} mood={phase === 'answering' ? 'talk' : mood} size={wide ? 120 : 84} accessory={q.presenter === 'pando' ? save.equippedAccessory : null} />
          <SpeechBubble className="flex flex-1 items-center gap-2 text-xl sm:text-2xl" key={q.id}>
            <span className="flex-1" data-testid="instruction">
              {q.instruction}
            </span>
            <button
              type="button"
              aria-label="Dengarkan soal"
              onClick={() => speech.speak(q.speech)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-grape/15 text-grape"
            >
              <Volume2 size={26} />
            </button>
          </SpeechBubble>
        </div>

        <motion.section
          key={q.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col items-center gap-3 rounded-5xl bg-white/55 p-3 shadow-soft backdrop-blur-sm sm:p-5"
          data-testid="question-card"
          data-kind={q.kind}
        >
          {q.story && <Story text={q.story} />}
          {q.visual && <QuestionVisual visual={q.visual} qid={q.id} />}
          {q.equation && <EquationDisplay equation={q.equation} reveal={phase === 'correct' ? q.answer : undefined} />}
          {q.kind === 'biggest' && (
            <p className="font-display text-2xl font-semibold text-ink">Pilih angka yang paling besar!</p>
          )}
        </motion.section>

        <AnimatePresence>{hintOpen && phase === 'answering' && <HintPanel question={q} />}</AnimatePresence>

        <div className="mt-auto flex flex-col gap-4 pt-2 md:mt-4">
          <div className="flex justify-center">
            <button
              type="button"
              data-testid="hint-button"
              onClick={() => {
                sound.click();
                setHintOpen((h) => !h);
              }}
              disabled={phase !== 'answering'}
              className="flex items-center gap-2 rounded-full bg-white/90 px-5 py-2 font-display text-lg font-semibold text-ink shadow-soft disabled:opacity-40"
            >
              <Lightbulb className="text-[#E0A100]" fill={hintOpen ? '#FFE066' : 'none'} /> Petunjuk
            </button>
          </div>
          <AnswerButtons
            key={q.id}
            choices={q.choices}
            disabledValues={wrongValues}
            correctValue={phase === 'correct' ? q.answer : null}
            locked={phase !== 'answering'}
            onPick={pick}
            debugAnswer={import.meta.env.DEV ? q.answer : undefined}
          />
        </div>
      </main>

      {/* Feedback sheet */}
      <AnimatePresence>
        {phase !== 'answering' && (
          <motion.div
            key={`${q.id}-${phase}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%', opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-30 max-h-[85dvh] overflow-y-auto rounded-t-5xl px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-soft"
            style={{ background: phase === 'correct' ? '#E6FFF4' : '#FFF4E3' }}
            data-testid={phase === 'correct' ? 'feedback-correct' : 'feedback-wrong'}
          >
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-3">
              <div className="flex w-full items-center gap-3">
                <Character id={q.presenter} mood={mood} size={78} accessory={q.presenter === 'pando' ? save.equippedAccessory : null} />
                <div className="flex-1">
                  <p className="font-display text-2xl font-bold text-ink sm:text-3xl">{message}</p>
                  {phase === 'correct' && (
                    <div className="mt-1 flex items-center gap-1 font-display text-lg font-semibold text-[#1E9E72]">
                      {outcomes[index] === true ? (
                        <>
                          <StarIcon size={26} /> +20 poin
                        </>
                      ) : (
                        'Kamu tidak menyerah. Hebat!'
                      )}
                    </div>
                  )}
                </div>
              </div>
              {phase === 'wrong' && <Explanation data={q.explanation} key={`${q.id}-${wrongValues.length}`} />}
              {phase === 'correct' ? (
                <BigButton color="mint" size="xl" className="w-full max-w-md" onClick={next} testId="next-button">
                  {index + 1 >= questions.length ? 'Lihat Hasil' : 'Lanjut'} <ArrowRight size={32} strokeWidth={3} />
                </BigButton>
              ) : (
                <BigButton color="orange" size="xl" className="w-full max-w-md" onClick={tryAgain} testId="retry-question">
                  <RotateCcw size={30} strokeWidth={3} /> Coba Lagi
                </BigButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'correct' && <Confetti count={28} burstKey={burst} />}
      {phase === 'correct' && outcomes[index] === true && <FlyingStar key={burst} />}

      <Modal open={exitOpen} onBackdrop={() => setExitOpen(false)}>
        <div className="flex flex-col items-center gap-4">
          <Character id="pando" mood="encourage" size={110} accessory={save.equippedAccessory} />
          <p className="font-display text-2xl font-bold text-ink">Mau berhenti dulu?</p>
          <p className="font-display text-lg text-ink/70">Petualanganmu belum selesai, lho!</p>
          <div className="grid w-full grid-cols-2 gap-3">
            <BigButton color="white" size="md" onClick={() => navigate('levels')} testId="confirm-exit">
              Keluar
            </BigButton>
            <BigButton color="mint" size="md" onClick={() => setExitOpen(false)}>
              Main Lagi
            </BigButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Story({ text }: { text: string }) {
  const parts = text.split(/(\d+)/);
  return (
    <p className="text-center font-display text-xl font-semibold leading-snug text-ink sm:text-2xl" data-testid="story">
      {parts.map((p, i) =>
        /^\d+$/.test(p) ? (
          <span key={i} className="mx-0.5 inline-block rounded-xl bg-sun px-2 font-bold text-ink shadow-pop-sm">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}

function ProgressTrack({ outcomes, index }: { outcomes: Outcome[]; index: number }) {
  return (
    <div className="flex flex-col items-center gap-1" data-testid="progress">
      <div className="flex items-center gap-1.5 rounded-full bg-white/85 p-1.5 shadow-soft">
        {outcomes.map((o, i) => (
          <motion.div
            key={i}
            animate={{ scale: i === index ? [1, 1.15, 1] : 1 }}
            transition={{ repeat: i === index ? Infinity : 0, duration: 1.2 }}
            className="flex h-8 w-8 items-center justify-center rounded-full sm:h-10 sm:w-10"
            style={{
              background: o === true ? '#FFF3B0' : o === false ? '#FFE0C2' : i === index ? '#D9CCFF' : '#EEEAF7',
              border: i === index ? '3px solid #8E6CF0' : '3px solid transparent',
            }}
          >
            {o === true ? (
              <StarIcon size={24} />
            ) : o === false ? (
              <span className="font-display text-lg font-bold text-tangerine">✓</span>
            ) : (
              <span className="font-display text-sm font-bold text-ink/50">{i + 1}</span>
            )}
          </motion.div>
        ))}
      </div>
      <span className="rounded-full bg-white/70 px-2 font-display text-sm font-bold text-ink" data-testid="question-counter">
        Soal {index + 1} dari {outcomes.length}
      </span>
    </div>
  );
}

function FlyingStar() {
  return (
    <motion.div
      className="pointer-events-none fixed left-1/2 top-1/2 z-50"
      initial={{ x: '-50%', y: 0, scale: 0.5, opacity: 1 }}
      animate={{ y: '-45vh', scale: [0.5, 2, 0.6], opacity: [1, 1, 0], rotate: 360 }}
      transition={{ duration: 1.1, ease: 'easeInOut' }}
    >
      <StarIcon size={56} />
    </motion.div>
  );
}
