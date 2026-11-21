import { useEffect, useState } from 'react';
import { setSfxEnabled } from './audio/sfx';
import { configureSpeech } from './audio/speech';
import { STAGE_BY_ID } from './content/worlds';
import { isStageUnlocked } from './engine/progress';
import { navigate, useRoute } from './router';
import { Badges } from './screens/Badges';
import { Home } from './screens/Home';
import { ParentDashboard } from './screens/ParentDashboard';
import { ParentGate } from './screens/ParentGate';
import { StagePlayer } from './screens/StagePlayer';
import { WorldScreen } from './screens/WorldScreen';
import { requestPersistentStorage, useProgress } from './store/store';

export default function App() {
  const route = useRoute();
  const state = useProgress();
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    configureSpeech({ rate: state.settings.speechRate, voiceURI: state.settings.voiceURI });
    setSfxEnabled(state.settings.sfx);
  }, [state.settings.speechRate, state.settings.voiceURI, state.settings.sfx]);

  useEffect(() => requestPersistentStorage(), []);

  // Leaving the parent area locks it again.
  useEffect(() => {
    if (route.name !== 'parent') setParentUnlocked(false);
  }, [route.name]);

  if (!state.onboarded && route.name !== 'parent') return <Home />;

  switch (route.name) {
    case 'home':
      return <Home />;
    case 'world':
      return <WorldScreen worldId={route.worldId} />;
    case 'stage': {
      const stage = STAGE_BY_ID[route.stageId];
      if (!stage || !isStageUnlocked(state, stage.id)) {
        queueMicrotask(() => navigate({ name: 'home' }, true));
        return null;
      }
      return <StagePlayer key={`${stage.id}-${replay}`} mode={{ kind: 'stage', stage }} onReplay={() => setReplay((n) => n + 1)} />;
    }
    case 'review':
      return <StagePlayer key={`review-${replay}`} mode={{ kind: 'review' }} onReplay={() => setReplay((n) => n + 1)} />;
    case 'badges':
      return <Badges />;
    case 'parent':
      return parentUnlocked ? <ParentDashboard /> : <ParentGate onUnlock={() => setParentUnlocked(true)} />;
  }
}
