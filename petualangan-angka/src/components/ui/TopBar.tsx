import { Volume2, VolumeX } from 'lucide-react';
import type { ReactNode } from 'react';
import { useGame } from '../../state/GameContext';
import { IconButton } from './Button';

export function SoundToggle({ size = 52 }: { size?: number }) {
  const { state, setSetting } = useGame();
  const on = state.save.settings.sound;
  return (
    <IconButton
      label={on ? 'Matikan suara' : 'Nyalakan suara'}
      onClick={() => setSetting('sound', !on)}
      size={size}
      color={on ? 'white' : 'pink'}
      testId="sound-toggle"
    >
      {on ? <Volume2 size={size * 0.5} strokeWidth={2.6} /> : <VolumeX size={size * 0.5} strokeWidth={2.6} />}
    </IconButton>
  );
}

/** Safe-area aware header row. */
export function TopBar({ left, center, right }: { left?: ReactNode; center?: ReactNode; right?: ReactNode }) {
  return (
    <header className="relative z-20 flex items-center justify-between gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex min-w-0 items-center gap-2">{left}</div>
      {center && <div className="flex min-w-0 flex-1 justify-center">{center}</div>}
      <div className="flex items-center gap-2">{right}</div>
    </header>
  );
}
