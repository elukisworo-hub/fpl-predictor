import { motion } from 'framer-motion';
import { ArrowLeft, Check, Lock } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { sound } from '../audio/sound';
import { speech } from '../audio/speech';
import { Character, type DanceMove } from '../components/characters/Character';
import { IconButton } from '../components/ui/Button';
import { Counter } from '../components/ui/Counters';
import { CoinIcon, StarIcon } from '../components/ui/Icons';
import { SceneBackground } from '../components/ui/SceneBackground';
import { TopBar } from '../components/ui/TopBar';
import { totalStars } from '../game/progress';
import { ACCESSORIES, BADGES, DANCES } from '../game/rewards';
import { useGame } from '../state/GameContext';

type Tab = 'accessories' | 'badges' | 'dances';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'accessories', label: 'Aksesoris' },
  { id: 'badges', label: 'Lencana' },
  { id: 'dances', label: 'Gerakan' },
];

export function CollectionScreen() {
  const { state, navigate, buyAccessory, equipAccessory, selectDance } = useGame();
  const { save } = state;
  const [tab, setTab] = useState<Tab>('accessories');
  const [preview, setPreview] = useState<string | null>(save.equippedAccessory);
  const [danceKey, setDanceKey] = useState(0);
  const [dance, setDance] = useState<DanceMove | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const stars = totalStars(save);

  const showToast = (msg: string) => {
    setToast(msg);
    speech.speak(msg);
    window.setTimeout(() => setToast(null), 2000);
  };

  const playDance = (id: DanceMove) => {
    setDance(id);
    setDanceKey((k) => k + 1);
    window.setTimeout(() => setDance(null), 1400);
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <SceneBackground scene="castle" />
      <TopBar
        left={
          <IconButton label="Kembali" onClick={() => navigate('home')} testId="collection-back">
            <ArrowLeft size={28} strokeWidth={3} />
          </IconButton>
        }
        center={<h1 className="logo-letter font-display text-3xl font-bold text-white">Hadiahku</h1>}
        right={<Counter kind="coin" value={save.coins} testId="collection-coins" />}
      />

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-3 px-4 pb-8">
        <div className="flex flex-col items-center">
          <Character id="pando" size={150} mood="happy" accessory={preview} dance={dance} danceKey={danceKey} />
        </div>

        <div className="flex w-full rounded-full bg-white/80 p-1.5 shadow-soft" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              data-testid={`tab-${t.id}`}
              onClick={() => {
                sound.click();
                setTab(t.id);
              }}
              className={`flex-1 rounded-full py-2.5 font-display text-lg font-bold transition-colors ${
                tab === t.id ? 'bg-grape text-white shadow-pop-sm' : 'text-ink/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'accessories' && (
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
            <ItemCard
              selected={save.equippedAccessory === null}
              onClick={() => {
                sound.click();
                equipAccessory(null);
                setPreview(null);
              }}
              title="Tanpa Aksesoris"
            >
              <Character id="pando" size={70} still />
            </ItemCard>
            {ACCESSORIES.map((a) => {
              const owned = save.ownedAccessories.includes(a.id);
              const affordable = save.coins >= a.cost;
              return (
                <ItemCard
                  key={a.id}
                  testId={`acc-${a.id}`}
                  selected={save.equippedAccessory === a.id}
                  title={a.name}
                  onClick={() => {
                    setPreview(a.id);
                    if (owned) {
                      sound.click();
                      equipAccessory(a.id);
                    } else if (affordable) {
                      sound.coin();
                      buyAccessory(a.id);
                      showToast(`Hore! Kamu dapat ${a.name}!`);
                    } else {
                      sound.wrong();
                      showToast(`Kumpulkan ${a.cost - save.coins} koin lagi, ya!`);
                    }
                  }}
                  footer={
                    owned ? (
                      <span className="font-display text-sm font-bold text-mint">{save.equippedAccessory === a.id ? 'Dipakai' : 'Milikmu'}</span>
                    ) : (
                      <span className={`flex items-center gap-1 font-display text-base font-bold ${affordable ? 'text-ink' : 'text-ink/40'}`}>
                        <CoinIcon size={20} /> {a.cost}
                      </span>
                    )
                  }
                >
                  <Character id="pando" size={70} accessory={a.id} still />
                </ItemCard>
              );
            })}
          </div>
        )}

        {tab === 'badges' && (
          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3" data-testid="badge-grid">
            {BADGES.map((b) => {
              const earned = save.badges.includes(b.id);
              return (
                <div
                  key={b.id}
                  className={`flex flex-col items-center gap-1 rounded-4xl p-3 text-center shadow-soft ${earned ? 'bg-white' : 'bg-white/55'}`}
                >
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full text-4xl"
                    style={{
                      background: earned ? 'radial-gradient(circle at 35% 30%, #FFF3B0, #FFC93C)' : '#E4DDF5',
                      filter: earned ? undefined : 'grayscale(1)',
                      opacity: earned ? 1 : 0.6,
                      boxShadow: earned ? '0 4px 0 #E0A100' : undefined,
                    }}
                  >
                    {earned ? b.emoji : <Lock className="text-ink/40" />}
                  </div>
                  <div className="font-display text-base font-bold leading-tight text-ink">{b.name}</div>
                  <div className="text-xs text-ink/60">{b.description}</div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'dances' && (
          <div className="grid w-full grid-cols-2 gap-3">
            {DANCES.map((d) => {
              const open = stars >= d.stars;
              return (
                <ItemCard
                  key={d.id}
                  testId={`dance-${d.id}`}
                  selected={save.selectedDance === d.id}
                  title={d.name}
                  onClick={() => {
                    if (!open) {
                      sound.wrong();
                      showToast(`Kumpulkan ${d.stars} bintang untuk membuka!`);
                      return;
                    }
                    sound.click();
                    selectDance(d.id);
                    playDance(d.id);
                  }}
                  footer={
                    open ? (
                      <span className="font-display text-sm font-bold text-mint">{save.selectedDance === d.id ? 'Dipilih' : 'Terbuka'}</span>
                    ) : (
                      <span className="flex items-center gap-1 font-display text-base font-bold text-ink/50">
                        <StarIcon size={18} /> {d.stars}
                      </span>
                    )
                  }
                >
                  <div className="text-4xl" style={{ filter: open ? undefined : 'grayscale(1)', opacity: open ? 1 : 0.5 }}>
                    {{ bounce: '🦘', wiggle: '💃', spin: '🌀', flip: '🤸' }[d.id]}
                  </div>
                </ItemCard>
              );
            })}
            <p className="col-span-2 text-center font-display text-base text-ink/70">
              Gerakan terpilih dimainkan saat kamu menyentuh Pando di beranda.
            </p>
          </div>
        )}
      </main>

      {toast && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed inset-x-4 bottom-6 z-40 mx-auto w-fit max-w-full rounded-full bg-white px-5 py-3 text-center font-display text-lg font-semibold text-ink shadow-soft"
        >
          {toast}
        </motion.div>
      )}
    </div>
  );
}

function ItemCard({
  children,
  title,
  selected,
  onClick,
  footer,
  testId,
}: {
  children: ReactNode;
  title: string;
  selected: boolean;
  onClick: () => void;
  footer?: ReactNode;
  testId?: string;
}) {
  return (
    <motion.button
      type="button"
      data-testid={testId}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 rounded-4xl bg-white p-3 shadow-soft ${selected ? 'ring-4 ring-mint' : ''}`}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-mint text-white">
          <Check size={16} strokeWidth={4} />
        </span>
      )}
      <div className="flex h-24 items-center justify-center">{children}</div>
      <div className="font-display text-base font-bold leading-tight text-ink">{title}</div>
      {footer}
    </motion.button>
  );
}
