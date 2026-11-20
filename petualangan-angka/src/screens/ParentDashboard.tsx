import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Brain, Minus, Music, Plus, RotateCcw, ShieldCheck, Volume2, Mic } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { BigButton, IconButton } from '../components/ui/Button';
import { StarRow } from '../components/ui/Counters';
import { Modal } from '../components/ui/Modal';
import { TopBar } from '../components/ui/TopBar';
import { WorldEmblem } from '../components/ui/WorldEmblem';
import { completedStageCount, totalStars, worldCompletedStages, worldStars } from '../game/progress';
import type { Category } from '../game/types';
import { getWorld, MAX_STARS, STAGES_PER_WORLD, TOTAL_STAGES, WORLDS } from '../game/worlds';
import { useGame } from '../state/GameContext';
import { speech } from '../audio/speech';

/** Simple adult gate: a multiplication question young children can't answer yet. */
function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const puzzle = useMemo(() => {
    const a = 3 + Math.floor(Math.random() * 6);
    const b = 4 + Math.floor(Math.random() * 5);
    const answer = a * b;
    const opts = new Set<number>([answer]);
    while (opts.size < 4) opts.add(answer + (Math.floor(Math.random() * 9) - 4) * (Math.random() > 0.5 ? 1 : 2));
    return { a, b, answer, options: [...opts].filter((n) => n > 0).sort(() => Math.random() - 0.5) };
  }, []);
  const [error, setError] = useState(false);
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#F4F1FB] p-4">
      <div className="w-full max-w-sm rounded-4xl bg-white p-6 text-center shadow-soft" data-testid="parent-gate">
        <ShieldCheck className="mx-auto text-grape" size={44} />
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">Khusus Orang Tua</h1>
        <p className="mt-1 text-ink/70">Jawab pertanyaan ini untuk masuk:</p>
        <p className="my-4 font-display text-4xl font-bold text-ink">
          {puzzle.a} × {puzzle.b} = ?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {puzzle.options.map((o) => (
            <button
              key={o}
              type="button"
              data-testid={`gate-${o}`}
              onClick={() => (o === puzzle.answer ? onPass() : setError(true))}
              className="rounded-2xl border-2 border-ink/10 bg-[#F7F5FC] py-3 font-display text-2xl font-bold text-ink active:scale-95"
            >
              {o}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-bubblegum">Jawaban belum tepat.</p>}
        <button type="button" onClick={onCancel} className="mt-5 font-display text-base font-semibold text-ink/60 underline">
          Kembali ke permainan
        </button>
      </div>
    </div>
  );
}

const CATEGORY_META: Record<Category, { label: string; icon: ReactNode; color: string }> = {
  addition: { label: 'Penjumlahan', icon: <Plus size={20} strokeWidth={3} />, color: '#FF8A3D' },
  subtraction: { label: 'Pengurangan', icon: <Minus size={20} strokeWidth={3} />, color: '#B07A4F' },
  word: { label: 'Soal Cerita', icon: <BookOpen size={20} />, color: '#FF6FA5' },
  logic: { label: 'Logika', icon: <Brain size={20} />, color: '#8E6CF0' },
};

function pct(correct: number, attempted: number): number | null {
  return attempted ? Math.round((correct / attempted) * 100) : null;
}

export function ParentDashboard() {
  const { state, navigate, setSetting, resetProgress } = useGame();
  const [unlocked, setUnlocked] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const { save } = state;

  if (!unlocked) return <ParentGate onPass={() => setUnlocked(true)} onCancel={() => navigate('home')} />;

  const stats = save.stats;
  const totalAttempted = Object.values(stats).reduce((s, c) => s + c.attempted, 0);
  const totalCorrect = Object.values(stats).reduce((s, c) => s + c.correct, 0);
  const accuracy = pct(totalCorrect, totalAttempted);
  const done = completedStageCount(save);
  const stars = totalStars(save);
  const fmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-[100dvh] bg-[#F4F1FB] pb-10">
      <div className="sticky top-0 z-20 bg-[#F4F1FB]/90 backdrop-blur">
        <TopBar
          left={
            <IconButton label="Kembali" onClick={() => navigate('home')} testId="parent-back">
              <ArrowLeft size={28} strokeWidth={3} />
            </IconButton>
          }
          center={<h1 className="font-display text-2xl font-bold text-ink">Dasbor Orang Tua</h1>}
        />
      </div>
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4" data-testid="parent-dashboard">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Tahap selesai" value={`${done}/${TOTAL_STAGES}`} testId="stat-stages" />
          <Stat label="Bintang" value={`${stars}/${MAX_STARS}`} />
          <Stat label="Akurasi" value={accuracy === null ? '–' : `${accuracy}%`} testId="stat-accuracy" />
          <Stat label="Soal dijawab" value={String(totalAttempted)} />
        </section>

        <Card title="Kemampuan per Topik" subtitle="Dihitung dari jawaban pertama di setiap soal.">
          <div className="flex flex-col gap-3">
            {(Object.keys(CATEGORY_META) as Category[]).map((k) => {
              const s = stats[k];
              const p = pct(s.correct, s.attempted);
              const meta = CATEGORY_META[k];
              return (
                <div key={k} data-testid={`perf-${k}`}>
                  <div className="mb-1 flex items-center justify-between font-display text-base font-semibold text-ink">
                    <span className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ background: meta.color }}>
                        {meta.icon}
                      </span>
                      {meta.label}
                    </span>
                    <span className="text-ink/70">
                      {p === null ? 'Belum ada data' : `${p}% · ${s.correct}/${s.attempted} benar`}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-ink/10">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: meta.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${p ?? 0}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Perkembangan Belajar">
          <div className="flex flex-col gap-2">
            {WORLDS.map((w) => {
              const c = worldCompletedStages(save, w.id);
              return (
                <div key={w.id} className="flex items-center gap-3">
                  <WorldEmblem theme={w.theme} size={40} locked={c === 0 && w.id !== 1} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 font-display text-sm font-semibold text-ink">
                      <span className="truncate">
                        {w.id}. {w.name}
                      </span>
                      <span className="shrink-0 text-ink/70">
                        {c}/{STAGES_PER_WORLD} tahap · ★ {worldStars(save, w.id)}
                      </span>
                    </div>
                    <div className="text-xs text-ink/60">{w.topic}</div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink/10">
                      <div className="h-full rounded-full bg-mint" style={{ width: `${(c / STAGES_PER_WORLD) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Tahap Terakhir Dimainkan">
          {save.history.length === 0 ? (
            <p className="text-ink/60">Belum ada tahap yang dimainkan.</p>
          ) : (
            <ul className="divide-y divide-ink/10" data-testid="history-list">
              {save.history.slice(0, 10).map((h, i) => (
                <li key={i} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-display text-base font-semibold text-ink">
                      {getWorld(h.worldId).name} · Tahap {h.stage + 1}
                    </div>
                    <div className="text-sm text-ink/60">
                      {fmt.format(new Date(h.date))} · {h.correct}/5 benar · {h.passed ? 'Lulus' : 'Perlu diulang'}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-display text-lg font-bold text-grape">{h.score}</span>
                    <StarRow stars={h.stars} size={16} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Pengaturan">
          <div className="flex flex-col gap-2">
            <Toggle icon={<Volume2 size={20} />} label="Efek suara" on={save.settings.sound} onChange={(v) => setSetting('sound', v)} />
            <Toggle icon={<Music size={20} />} label="Musik latar" on={save.settings.music} onChange={(v) => setSetting('music', v)} />
            <Toggle
              icon={<Mic size={20} />}
              label={`Suara pembaca soal${speech.isSupported() ? '' : ' (tidak didukung perangkat)'}`}
              on={save.settings.voice}
              onChange={(v) => setSetting('voice', v)}
            />
          </div>
        </Card>

        <Card title="Tentang Permainan">
          <ul className="list-disc space-y-1 pl-5 text-ink/80">
            <li>Setiap tahap berisi 5 soal. Jawaban benar pada percobaan pertama bernilai 20 poin.</li>
            <li>5 benar = 3 bintang, 4 benar = 2 bintang, 3 benar = 1 bintang. Minimal 3 benar untuk lanjut.</li>
            <li>Jika salah, anak melihat penjelasan bergambar lalu boleh mencoba lagi. Tidak ada batas waktu.</li>
            <li>Semua data tersimpan di perangkat ini saja. Tidak ada iklan, akun, atau tautan keluar.</li>
          </ul>
        </Card>

        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          className="mx-auto flex items-center gap-2 rounded-full px-4 py-2 font-display font-semibold text-bubblegum"
          data-testid="reset-progress"
        >
          <RotateCcw size={18} /> Hapus semua kemajuan
        </button>
      </main>

      <Modal open={confirmReset} onBackdrop={() => setConfirmReset(false)}>
        <h2 className="font-display text-2xl font-bold text-ink">Hapus semua kemajuan?</h2>
        <p className="mt-2 text-ink/70">Bintang, koin, hadiah, dan statistik akan dihapus. Tindakan ini tidak bisa dibatalkan.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <BigButton color="white" size="md" onClick={() => setConfirmReset(false)}>
            Batal
          </BigButton>
          <BigButton
            color="pink"
            size="md"
            testId="confirm-reset"
            onClick={() => {
              resetProgress();
              setConfirmReset(false);
            }}
          >
            Hapus
          </BigButton>
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft" data-testid={testId}>
      <div className="font-display text-sm font-semibold text-ink/60">{label}</div>
      <div className="font-display text-3xl font-bold text-ink">{value}</div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-4xl bg-white p-5 shadow-soft">
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      {subtitle && <p className="mb-3 text-sm text-ink/60">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Toggle({ icon, label, on, onChange }: { icon: ReactNode; label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex items-center justify-between rounded-2xl bg-[#F7F5FC] px-4 py-3"
    >
      <span className="flex items-center gap-2 font-display text-base font-semibold text-ink">
        {icon} {label}
      </span>
      <span className={`relative h-7 w-12 rounded-full transition-colors ${on ? 'bg-mint' : 'bg-ink/20'}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[1.4rem]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}
