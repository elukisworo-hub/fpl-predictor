import { useEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../audio/sfx';
import { speak, stopSpeech } from '../audio/speech';
import { MascotSays, Owl, type Mood } from '../components/Mascot';
import { Confetti, Modal, ProgressBar, Stars } from '../components/ui';
import type { StageDef } from '../content/types';
import { WORLD_BY_ID } from '../content/worlds';
import type { Badge } from '../engine/badges';
import { buildReview, buildStage } from '../engine/generator';
import { isStageUnlocked, nextStage, type SessionOutcome } from '../engine/progress';
import type { AnswerResult, Phase, Question, Step } from '../engine/questions';
import { ChoiceGame } from '../games/ChoiceGame';
import { DialogueCards, IntroCard, LearnCards, StoryReader } from '../games/LearnSteps';
import { MatchGame } from '../games/MatchGame';
import { MissingGame } from '../games/MissingGame';
import { SpeakGame } from '../games/SpeakGame';
import { SpellGame } from '../games/SpellGame';
import type { Feedback } from '../games/types';
import { navigate } from '../router';
import { actions } from '../store/actions';
import { getState } from '../store/store';

/** Adds study time every 10 s while the page is visible and the child has interacted recently. */
function useStudyTimer(active: boolean) {
  const lastInteraction = useRef(Date.now());
  useEffect(() => {
    if (!active) return;
    const touch = () => (lastInteraction.current = Date.now());
    window.addEventListener('pointerdown', touch);
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - lastInteraction.current < 90_000) actions.addTime(10);
    }, 10_000);
    return () => {
      clearInterval(id);
      window.removeEventListener('pointerdown', touch);
    };
  }, [active]);
}

const PHASE_SPEECH: Record<string, string> = {
  learn: "Let's learn!",
  practice: 'Practice time!',
  play: "Let's play a game!",
  challenge: 'Challenge time! You can do it!',
};

function defaultFeedback(step: Step | undefined): Feedback {
  if (!step) return { mood: 'happy', text: "You're doing great!" };
  switch (step.type) {
    case 'learn': return { mood: 'wave', text: 'Tap the picture to hear it!' };
    case 'story': return { mood: 'happy', text: 'Listen to the story!' };
    case 'dialogue': return { mood: 'wave', text: 'Listen and say it with me!' };
    case 'intro': return { mood: 'cheer', text: 'You can do it!' };
    case 'question': {
      const q = step.q;
      if (q.kind === 'speak') return { mood: 'happy', text: 'Listen, then say it!' };
      if (q.kind === 'spell') return { mood: 'think', text: 'Put the letters in order!' };
      if (q.kind === 'match') return { mood: 'think', text: 'Find the pairs!' };
      if (q.kind === 'missing') return { mood: 'think', text: 'Look carefully!' };
      return { mood: 'happy', text: q.prompt };
    }
  }
}

function QuestionView({ q, onDone, feedback }: { q: Question; onDone: (r: AnswerResult[]) => void; feedback: (f: Feedback) => void }) {
  switch (q.kind) {
    case 'choice': return <ChoiceGame key={q.id} q={q} onDone={onDone} feedback={feedback} />;
    case 'spell': return <SpellGame key={q.id} q={q} onDone={onDone} feedback={feedback} />;
    case 'match': return <MatchGame key={q.id} q={q} onDone={onDone} feedback={feedback} />;
    case 'missing': return <MissingGame key={q.id} q={q} onDone={onDone} feedback={feedback} />;
    case 'speak': return <SpeakGame key={q.id} q={q} onDone={onDone} feedback={feedback} />;
  }
}

type Mode = { kind: 'stage'; stage: StageDef } | { kind: 'review' };

export function StagePlayer({ mode, onReplay }: { mode: Mode; onReplay?: () => void }) {
  const phases = useMemo<Phase[] | null>(
    () => (mode.kind === 'stage' ? buildStage(mode.stage, getState()) : buildReview(getState())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode.kind === 'stage' ? mode.stage.id : 'review'],
  );
  const [pi, setPi] = useState(0);
  const [si, setSi] = useState(0);
  const [splash, setSplash] = useState<Phase | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [result, setResult] = useState<(SessionOutcome & { badges: Badge[] }) | null>(null);
  const score = useRef({ correct: 0, total: 0 });
  const started = useRef(Date.now());

  useStudyTimer(!result && !!phases);
  useEffect(() => () => stopSpeech(), []);

  const totalSteps = phases?.reduce((a, p) => a + p.steps.length, 0) ?? 1;
  const doneSteps = (phases?.slice(0, pi).reduce((a, p) => a + p.steps.length, 0) ?? 0) + si;
  const phase = phases?.[pi];
  const step = phase?.steps[si];

  const showSplash = (p: Phase) => {
    setSplash(p);
    void speak(mode.kind === 'review' && p.id === 'practice' ? "Let's review!" : PHASE_SPEECH[p.id]);
    setTimeout(() => setSplash(null), 1400);
  };

  useEffect(() => {
    if (phases?.[0] && phases[0].id !== 'learn') showSplash(phases[0]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!phases) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
        <MascotSays text="Learn some words first, then come back to review!" mood="think" sub="Belum ada cukup kata untuk diulang. Mainkan beberapa stage dulu." />
        <button type="button" className="btn btn-green text-2xl" onClick={() => navigate({ name: 'home' })}>
          OK <span className="emoji">👍</span>
        </button>
      </div>
    );
  }

  const advance = () => {
    setFeedback(null);
    if (!phase) return;
    if (si + 1 < phase.steps.length) {
      setSi(si + 1);
      return;
    }
    if (pi + 1 < phases.length) {
      setPi(pi + 1);
      setSi(0);
      showSplash(phases[pi + 1]);
      return;
    }
    finish();
  };

  const finish = () => {
    const seconds = Math.min(1800, Math.round((Date.now() - started.current) / 1000));
    const out = actions.finishSession({
      kind: mode.kind,
      stageId: mode.kind === 'stage' ? mode.stage.id : undefined,
      correct: score.current.correct,
      total: score.current.total,
      seconds,
    });
    setResult(out);
    sfx.fanfare();
    setTimeout(() => void speak(out.stars === 3 ? 'Amazing! Three stars!' : out.stars === 2 ? 'Great job! Two stars!' : 'Well done! You finished!'), 400);
  };

  const onQuestionDone = (q: Question) => (results: AnswerResult[]) => {
    if (q.scored) {
      for (const r of results) {
        actions.answer(r.vocabIds, q.skill, r.correct);
        score.current.total++;
        if (r.correct) score.current.correct++;
      }
    }
    advance();
  };

  if (result) return <RewardScreen mode={mode} result={result} onReplay={onReplay} />;

  const fb = feedback ?? defaultFeedback(step);
  const title = mode.kind === 'stage' ? mode.stage.title : 'Review';

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-4 pt-3">
      <header className="flex items-center gap-3">
        <button type="button" aria-label="Close" onClick={() => setConfirmExit(true)} className="flex h-11 w-11 items-center justify-center rounded-xl text-3xl text-slate-400 hover:bg-white">
          ✕
        </button>
        <ProgressBar value={doneSteps / totalSteps} />
      </header>
      <div className="mt-2 flex items-center justify-center gap-2">
        {phases.map((p, k) => (
          <span
            key={p.id}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${k === pi ? 'bg-ocean text-white' : k < pi ? 'bg-grass/20 text-grassdark' : 'bg-white text-slate-400'}`}
          >
            <span className="emoji">{k < pi ? '✅' : p.icon}</span>
            <span className="hidden sm:inline">{p.title}</span>
          </span>
        ))}
      </div>
      <p className="mt-1 text-center text-xs font-medium text-slate-400">{title}</p>

      <main className="flex flex-1 flex-col justify-center py-2 sm:py-4">
        {step?.type === 'learn' && <LearnCards key={`${pi}-${si}`} vocabIds={step.vocabIds} onDone={advance} />}
        {step?.type === 'dialogue' && <DialogueCards key={`${pi}-${si}`} items={step.items} onDone={advance} />}
        {step?.type === 'story' && <StoryReader key={`${pi}-${si}`} storyId={step.storyId} onDone={advance} />}
        {step?.type === 'intro' && <IntroCard key={`${pi}-${si}`} {...step} onDone={advance} />}
        {step?.type === 'question' && (
          <>
            <QuestionView q={step.q} onDone={onQuestionDone(step.q)} feedback={setFeedback} />
            {step.q.kind === 'choice' && <p className="mt-4 text-center text-xs text-slate-400">{step.q.hint}</p>}
          </>
        )}
      </main>

      <footer className="pointer-events-none flex justify-start">
        <div className="pointer-events-auto origin-bottom-left scale-[.8] sm:scale-100">
          <MascotSays text={fb.text} mood={fb.mood as Mood} size={72} />
        </div>
      </footer>

      {splash && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <div className="flex animate-pop flex-col items-center gap-2">
            <span className="emoji text-8xl">{splash.icon}</span>
            <p className="text-5xl font-bold text-ocean">{mode.kind === 'review' && splash.id === 'practice' ? 'Review!' : `${splash.title}!`}</p>
          </div>
        </div>
      )}

      {confirmExit && (
        <Modal onClose={() => setConfirmExit(false)}>
          <div className="flex flex-col items-center gap-4 text-center">
            <Owl mood="think" size={90} />
            <p className="text-2xl font-bold">Stop playing?</p>
            <p className="text-sm text-slate-500">Jawaban yang sudah dikerjakan tetap tersimpan, tetapi stage ini belum dihitung selesai.</p>
            <div className="flex w-full gap-3">
              <button type="button" className="btn btn-white flex-1" onClick={() => navigate(mode.kind === 'stage' ? { name: 'world', worldId: mode.stage.worldId } : { name: 'home' })}>
                Stop
              </button>
              <button type="button" className="btn btn-green flex-1" onClick={() => setConfirmExit(false)}>
                Keep playing
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RewardScreen({ mode, result, onReplay }: { mode: Mode; result: SessionOutcome & { badges: Badge[] }; onReplay?: () => void }) {
  const state = result.state;
  const upcoming = nextStage(state);
  const nextInWorld =
    mode.kind === 'stage' && upcoming && isStageUnlocked(state, upcoming.id) ? upcoming : null;
  const message = result.stars === 3 ? 'Amazing!' : result.stars === 2 ? 'Great job!' : 'Well done!';

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
      <Confetti />
      <Owl mood="cheer" size={140} className="animate-bob" />
      <h1 className="text-5xl font-bold text-tangerine">{message}</h1>
      <Stars count={result.stars} size={64} animate />
      <div className="card flex w-full flex-col gap-2 p-5">
        <p className="text-3xl font-bold text-grape">
          <span className="emoji">⚡</span> +{result.xp} XP
        </p>
        {result.firstClear && mode.kind === 'stage' && <p className="font-semibold text-grassdark">Stage complete! Bonus XP</p>}
        {result.newBest && <p className="font-semibold text-ocean">New best score!</p>}
        {result.consistencyBonus && <p className="font-semibold text-tangerine">🔥 Bonus for learning again today!</p>}
      </div>

      {result.unlockedWorld && (
        <div className="card w-full animate-pop bg-yellow-50 p-4">
          <p className="text-sm font-semibold text-slate-500">New world unlocked!</p>
          <p className="text-2xl font-bold">
            <span className="emoji">{result.unlockedWorld.emoji}</span> {result.unlockedWorld.name}
          </p>
        </div>
      )}

      {result.badges.length > 0 && (
        <div className="card w-full p-4">
          <p className="mb-2 text-sm font-semibold text-slate-500">New badge!</p>
          <div className="flex flex-wrap justify-center gap-3">
            {result.badges.map((b) => (
              <div key={b.id} className="flex animate-pop flex-col items-center">
                <span className="emoji text-5xl">{b.icon}</span>
                <span className="text-sm font-semibold">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex w-full flex-col gap-3">
        {nextInWorld && (
          <button type="button" className="btn btn-green text-2xl" onClick={() => navigate({ name: 'stage', stageId: nextInWorld.id }, true)} data-testid="next-stage">
            Next stage <span className="emoji">➡️</span>
          </button>
        )}
        <div className="flex gap-3">
          {onReplay && (
            <button type="button" className="btn btn-white flex-1" onClick={onReplay}>
              <span className="emoji">🔁</span> Again
            </button>
          )}
          <button
            type="button"
            className="btn btn-blue flex-1"
            data-testid="to-map"
            onClick={() => navigate(mode.kind === 'stage' ? { name: 'world', worldId: WORLD_BY_ID[mode.stage.worldId].id } : { name: 'home' })}
          >
            <span className="emoji">🗺️</span> Map
          </button>
        </div>
      </div>
    </div>
  );
}
