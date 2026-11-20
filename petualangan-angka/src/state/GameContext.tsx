import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { sound } from '../audio/sound';
import { speech } from '../audio/speech';
import { applyStageResult, createDefaultSave, recordAttempt } from '../game/progress';
import { ACCESSORIES } from '../game/rewards';
import { clearSave, loadSave, writeSave } from '../game/storage';
import type { Category, SaveData, StageResult } from '../game/types';

export type Screen = 'splash' | 'home' | 'map' | 'levels' | 'play' | 'results' | 'parent' | 'collection';

export interface GameState {
  screen: Screen;
  worldId: number;
  stage: number;
  /** Increments every time a stage starts so gameplay always remounts fresh. */
  playId: number;
  save: SaveData;
  lastResult: StageResult | null;
}

type Action =
  | { type: 'NAVIGATE'; screen: Screen; worldId?: number }
  | { type: 'START_STAGE'; worldId: number; stage: number }
  | { type: 'RECORD_ATTEMPT'; category: Category; correct: boolean }
  | { type: 'FINISH_STAGE'; correct: number }
  | { type: 'SET_SETTING'; key: keyof SaveData['settings']; value: boolean }
  | { type: 'BUY_ACCESSORY'; id: string }
  | { type: 'EQUIP_ACCESSORY'; id: string | null }
  | { type: 'SELECT_DANCE'; id: string }
  | { type: 'MARK_WORLD_CELEBRATED'; worldId: number }
  | { type: 'RESET_PROGRESS' };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, screen: action.screen, worldId: action.worldId ?? state.worldId };
    case 'START_STAGE':
      return {
        ...state,
        screen: 'play',
        worldId: action.worldId,
        stage: action.stage,
        playId: state.playId + 1,
        lastResult: null,
      };
    case 'RECORD_ATTEMPT':
      return { ...state, save: recordAttempt(state.save, action.category, action.correct) };
    case 'FINISH_STAGE': {
      const { save, result } = applyStageResult(state.save, {
        worldId: state.worldId,
        stage: state.stage,
        correct: action.correct,
      });
      return { ...state, save, lastResult: result, screen: 'results' };
    }
    case 'SET_SETTING':
      return {
        ...state,
        save: { ...state.save, settings: { ...state.save.settings, [action.key]: action.value } },
      };
    case 'BUY_ACCESSORY': {
      const acc = ACCESSORIES.find((a) => a.id === action.id);
      if (!acc || state.save.ownedAccessories.includes(acc.id) || state.save.coins < acc.cost) return state;
      return {
        ...state,
        save: {
          ...state.save,
          coins: state.save.coins - acc.cost,
          ownedAccessories: [...state.save.ownedAccessories, acc.id],
          equippedAccessory: acc.id,
        },
      };
    }
    case 'EQUIP_ACCESSORY':
      if (action.id !== null && !state.save.ownedAccessories.includes(action.id)) return state;
      return { ...state, save: { ...state.save, equippedAccessory: action.id } };
    case 'SELECT_DANCE':
      return { ...state, save: { ...state.save, selectedDance: action.id } };
    case 'MARK_WORLD_CELEBRATED':
      if (state.save.celebratedWorlds.includes(action.worldId)) return state;
      return {
        ...state,
        save: { ...state.save, celebratedWorlds: [...state.save.celebratedWorlds, action.worldId] },
      };
    case 'RESET_PROGRESS': {
      const fresh = createDefaultSave();
      return { ...state, save: { ...fresh, settings: state.save.settings }, lastResult: null, worldId: 1, stage: 0 };
    }
  }
}

interface GameApi {
  state: GameState;
  navigate: (screen: Screen, worldId?: number) => void;
  startStage: (worldId: number, stage: number) => void;
  recordAttempt: (category: Category, correct: boolean) => void;
  finishStage: (correct: number) => void;
  setSetting: (key: keyof SaveData['settings'], value: boolean) => void;
  buyAccessory: (id: string) => void;
  equipAccessory: (id: string | null) => void;
  selectDance: (id: string) => void;
  markWorldCelebrated: (worldId: number) => void;
  resetProgress: () => void;
}

const GameContext = createContext<GameApi | null>(null);

function init(): GameState {
  return { screen: 'splash', worldId: 1, stage: 0, playId: 0, save: loadSave(), lastResult: null };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  // Persist every change of the save data.
  useEffect(() => {
    writeSave(state.save);
  }, [state.save]);

  // Keep audio engines in sync with preferences.
  const { sound: soundOn, music, voice } = state.save.settings;
  useEffect(() => {
    sound.setSoundEnabled(soundOn);
    sound.setMusicEnabled(music);
    speech.setEnabled(soundOn && voice);
  }, [soundOn, music, voice]);

  const navigate = useCallback((screen: Screen, worldId?: number) => {
    speech.stop();
    dispatch({ type: 'NAVIGATE', screen, worldId });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, []);
  const startStage = useCallback((worldId: number, stage: number) => {
    speech.stop();
    dispatch({ type: 'START_STAGE', worldId, stage });
  }, []);
  const recordAttemptCb = useCallback(
    (category: Category, correct: boolean) => dispatch({ type: 'RECORD_ATTEMPT', category, correct }),
    [],
  );
  const finishStage = useCallback((correct: number) => dispatch({ type: 'FINISH_STAGE', correct }), []);
  const setSetting = useCallback(
    (key: keyof SaveData['settings'], value: boolean) => dispatch({ type: 'SET_SETTING', key, value }),
    [],
  );
  const buyAccessory = useCallback((id: string) => dispatch({ type: 'BUY_ACCESSORY', id }), []);
  const equipAccessory = useCallback((id: string | null) => dispatch({ type: 'EQUIP_ACCESSORY', id }), []);
  const selectDance = useCallback((id: string) => dispatch({ type: 'SELECT_DANCE', id }), []);
  const markWorldCelebrated = useCallback(
    (worldId: number) => dispatch({ type: 'MARK_WORLD_CELEBRATED', worldId }),
    [],
  );
  const resetProgress = useCallback(() => {
    clearSave();
    dispatch({ type: 'RESET_PROGRESS' });
  }, []);

  const api = useMemo<GameApi>(
    () => ({
      state,
      navigate,
      startStage,
      recordAttempt: recordAttemptCb,
      finishStage,
      setSetting,
      buyAccessory,
      equipAccessory,
      selectDance,
      markWorldCelebrated,
      resetProgress,
    }),
    [
      state,
      navigate,
      startStage,
      recordAttemptCb,
      finishStage,
      setSetting,
      buyAccessory,
      equipAccessory,
      selectDance,
      markWorldCelebrated,
      resetProgress,
    ],
  );

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
