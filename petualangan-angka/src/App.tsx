import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { ComponentType } from 'react';
import { CollectionScreen } from './screens/CollectionScreen';
import { GameplayScreen } from './screens/GameplayScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LevelSelectScreen } from './screens/LevelSelectScreen';
import { ParentDashboard } from './screens/ParentDashboard';
import { ResultsScreen } from './screens/ResultsScreen';
import { SplashScreen } from './screens/SplashScreen';
import { WorldMapScreen } from './screens/WorldMapScreen';
import { GameProvider, useGame, type Screen } from './state/GameContext';

const SCREENS: Record<Screen, ComponentType> = {
  splash: SplashScreen,
  home: HomeScreen,
  map: WorldMapScreen,
  levels: LevelSelectScreen,
  play: GameplayScreen,
  results: ResultsScreen,
  parent: ParentDashboard,
  collection: CollectionScreen,
};

function Router() {
  const { state } = useGame();
  const Current = SCREENS[state.screen];
  // Gameplay remounts for every new attempt so state starts clean.
  const key = state.screen === 'play' ? `play-${state.playId}` : state.screen === 'levels' ? `levels-${state.worldId}` : state.screen;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={key}
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.01, y: -8 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="min-h-[100dvh]"
      >
        <Current />
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <GameProvider>
        <Router />
      </GameProvider>
    </MotionConfig>
  );
}
