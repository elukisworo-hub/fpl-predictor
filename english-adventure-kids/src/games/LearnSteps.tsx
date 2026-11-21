import { useEffect, useState } from 'react';
import { sfx } from '../audio/sfx';
import { speak, speakSequence, stopSpeech } from '../audio/speech';
import { Owl } from '../components/Mascot';
import { PictureView } from '../components/PictureView';
import { SpeakerButton } from '../components/ui';
import { STORY_BY_ID } from '../content/stories';
import type { QAItem } from '../content/types';
import { VOCAB_BY_ID } from '../content/vocabulary';
import { actions } from '../store/actions';
import { useProgress } from '../store/store';

function Nav({ i, n, onPrev, onNext, nextLabel = 'Next' }: { i: number; n: number; onPrev: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="flex w-full max-w-md items-center justify-between gap-3">
      <button type="button" onClick={onPrev} disabled={i === 0} className="btn btn-white shrink-0 !px-4 text-2xl" aria-label="Previous">
        ⬅️
      </button>
      <div className="flex min-w-0 flex-wrap justify-center gap-1.5">
        {Array.from({ length: n }, (_, k) => (
          <span key={k} className={`h-3 w-3 rounded-full ${k === i ? 'bg-ocean' : k < i ? 'bg-grass' : 'bg-slate-200'}`} />
        ))}
      </div>
      <button type="button" onClick={onNext} className="btn btn-green shrink-0 !px-4 text-xl sm:!px-6 sm:text-2xl" data-testid="next">
        {nextLabel} <span className="emoji">➡️</span>
      </button>
    </div>
  );
}

/** Flash cards that introduce new words with picture, sound and a model sentence. */
export function LearnCards({ vocabIds, onDone }: { vocabIds: string[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const { settings } = useProgress();
  const item = VOCAB_BY_ID[vocabIds[i]];
  const isLetter = item.picture.kind === 'letter';

  useEffect(() => {
    actions.seen([item.id]);
    const t = setTimeout(() => {
      void speakSequence(isLetter ? [item.word, item.example] : [item.word, item.example], 400);
    }, 250);
    return () => {
      clearTimeout(t);
      stopSpeech();
    };
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => {
    sfx.tap();
    if (i < vocabIds.length - 1) setI(i + 1);
    else onDone();
  };

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-5">
      <h2 className="text-2xl font-bold sm:text-3xl">New word!</h2>
      <button
        type="button"
        key={item.id}
        onClick={() => speak(item.word)}
        className="card flex w-full max-w-sm animate-pop flex-col items-center gap-2 px-6 py-4 sm:gap-3 sm:py-6"
        aria-label={`Hear ${item.word}`}
      >
        <div className="flex h-32 items-center justify-center sm:h-44">
          <PictureView picture={item.picture} size={isLetter ? 120 : 130} />
        </div>
        {!isLetter && <p className="text-4xl font-bold text-ocean sm:text-5xl">{item.word}</p>}
        <p className="text-center text-xl font-medium text-slate-600">{item.example}</p>
        {settings.showTranslation && <p className="text-sm font-medium text-slate-400">🇮🇩 {item.translation}</p>}
      </button>
      <div className="flex gap-3">
        <SpeakerButton text={item.word} label="Hear the word" />
        <button type="button" onClick={() => speak(item.example)} className="btn btn-purple !rounded-full text-lg" aria-label="Hear the sentence">
          <span className="emoji">💬</span> Sentence
        </button>
      </div>
      <Nav i={i} n={vocabIds.length} onPrev={() => setI(Math.max(0, i - 1))} onNext={next} nextLabel={i === vocabIds.length - 1 ? "Let's play" : 'Next'} />
    </div>
  );
}

/** Question/answer cards for conversation stages ("What is your name?" → "My name is ..."). */
export function DialogueCards({ items, onDone }: { items: QAItem[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const item = items[i];
  useEffect(() => {
    const t = setTimeout(() => void speakSequence([item.question, item.answer], 500), 250);
    return () => {
      clearTimeout(t);
      stopSpeech();
    };
  }, [item]);
  return (
    <div className="flex flex-col items-center gap-5">
      <h2 className="text-2xl font-bold sm:text-3xl">Let's talk!</h2>
      <div className="flex w-full max-w-md animate-pop flex-col gap-4" key={i}>
        <div className="flex items-end gap-2">
          <Owl size={70} mood="wave" />
          <button type="button" onClick={() => speak(item.question)} className="card flex-1 px-4 py-3 text-left text-2xl font-semibold">
            {item.question} <span className="emoji">🔊</span>
          </button>
        </div>
        <div className="flex items-end justify-end gap-2">
          <button type="button" onClick={() => speak(item.answer)} className="card flex-1 bg-green-50 px-4 py-3 text-right text-2xl font-semibold text-grassdark">
            <span className="emoji">🔊</span> {item.answer}
          </button>
          <span className="emoji text-6xl">🧒</span>
        </div>
        <p className="text-center text-sm text-slate-400">🇮🇩 {item.translation}</p>
      </div>
      <Nav i={i} n={items.length} onPrev={() => setI(Math.max(0, i - 1))} onNext={() => (i < items.length - 1 ? setI(i + 1) : onDone())} nextLabel={i === items.length - 1 ? "Let's play" : 'Next'} />
    </div>
  );
}

/** Picture story, read aloud page by page. Every word can be tapped to hear it. */
export function StoryReader({ storyId, onDone }: { storyId: string; onDone: () => void }) {
  const story = STORY_BY_ID[storyId];
  const [i, setI] = useState(-1);
  const page = i >= 0 ? story.pages[i] : null;

  useEffect(() => {
    const t = setTimeout(() => void speak(page ? page.text : `Story time! ${story.title}`), 300);
    return () => {
      clearTimeout(t);
      stopSpeech();
    };
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!page) {
    return (
      <div className="flex flex-col items-center gap-5">
        <h2 className="text-2xl font-bold sm:text-3xl">Story Time!</h2>
        <div className="card flex w-full max-w-sm animate-pop flex-col items-center gap-3 p-8">
          <span className="emoji text-8xl">{story.cover}</span>
          <p className="text-center text-3xl font-bold text-grape">{story.title}</p>
        </div>
        <button type="button" className="btn btn-green text-2xl" onClick={() => setI(0)} data-testid="next">
          Read <span className="emoji">📖</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <h2 className="text-xl font-bold text-grape">{story.title}</h2>
      <div key={i} className="card flex w-full max-w-lg animate-pop flex-col items-center gap-4 p-6">
        <span className="emoji text-8xl tracking-widest">{page.scene}</span>
        <p className="text-center text-3xl font-semibold leading-relaxed">
          {page.text.split(' ').map((w, k) => (
            <button key={k} type="button" className="mx-0.5 rounded-lg px-0.5 hover:bg-yellow-100 active:bg-yellow-200" onClick={() => speak(w.replace(/[^A-Za-z']/g, ''))}>
              {w}
            </button>
          ))}
        </p>
        <SpeakerButton text={page.text} size="md" label="Read again" />
      </div>
      <Nav i={i} n={story.pages.length} onPrev={() => setI(Math.max(0, i - 1))} onNext={() => (i < story.pages.length - 1 ? setI(i + 1) : onDone())} nextLabel={i === story.pages.length - 1 ? 'Questions' : 'Next'} />
    </div>
  );
}

export function IntroCard({ title, text, emoji, onDone }: { title: string; text: string; emoji: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => void speak(`${title} ${text}`), 300);
    return () => clearTimeout(t);
  }, [title, text]);
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="card flex w-full max-w-sm animate-pop flex-col items-center gap-3 p-8">
        <span className="emoji text-8xl">{emoji}</span>
        <p className="text-3xl font-bold text-tangerine">{title}</p>
        <p className="text-center text-xl">{text}</p>
      </div>
      <button type="button" className="btn btn-green text-2xl" onClick={onDone} data-testid="next">
        Let's go! <span className="emoji">🚀</span>
      </button>
    </div>
  );
}
