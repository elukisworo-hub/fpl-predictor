import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { sound } from '../audio/sound';
import { speech } from '../audio/speech';
import { Character } from '../components/characters/Character';
import { BigButton } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { SceneBackground } from '../components/ui/SceneBackground';
import { useGame } from '../state/GameContext';

export function SplashScreen() {
  const { navigate, state } = useGame();
  const start = () => {
    sound.unlock();
    speech.speak('Selamat datang di Petualangan Angka!');
    navigate('home');
  };
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4">
      <SceneBackground scene="home" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <Logo />
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="rounded-full bg-white/85 px-5 py-2 text-center font-display text-xl font-semibold text-ink shadow-soft sm:text-2xl"
        >
          Belajar Berhitung, Sambil Berpetualang!
        </motion.p>
        <div className="mt-2 flex items-end justify-center gap-0 sm:gap-3">
          {(['foxy', 'bubu', 'pando', 'mimi'] as const).map((id, i) => (
            <motion.div
              key={id}
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 180, damping: 14 }}
            >
              <Character id={id} size={id === 'pando' ? 118 : 86} mood={i % 2 ? 'idle' : 'happy'} accessory={id === 'pando' ? state.save.equippedAccessory : null} />
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: 'spring' }}>
          <BigButton size="xl" color="mint" onClick={start} className="animate-breathe min-w-[14rem]" testId="play-button" silent>
            <Play size={36} fill="currentColor" /> Main!
          </BigButton>
        </motion.div>
      </div>
    </div>
  );
}
