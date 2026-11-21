import { useRef, useState, type ReactNode } from 'react';
import { englishVoices, speak, ttsAvailable } from '../audio/speech';
import { recognitionSupported } from '../audio/recognition';
import { IconButton, Modal, ProgressBar } from '../components/ui';
import { VOCAB } from '../content/vocabulary';
import { LEVELS } from '../content/worlds';
import {
  dailyHistory,
  difficultWords,
  formatDuration,
  overview,
  recommendations,
  skillSummaries,
  topicSummaries,
  weeklyReport,
  worldSummaries,
  type Rating,
} from '../engine/analytics';
import { masteryLevel } from '../engine/mastery';
import { dayKey } from '../engine/util';
import { navigate } from '../router';
import { actions } from '../store/actions';
import type { ProgressState } from '../store/model';
import { getState, hasSaveError, useProgress } from '../store/store';

type Tab = 'summary' | 'weekly' | 'words' | 'settings';

const RATING_STYLE: Record<Rating, string> = {
  'Sangat baik': 'bg-green-100 text-green-800',
  Baik: 'bg-sky-100 text-sky-800',
  Berkembang: 'bg-yellow-100 text-yellow-800',
  'Perlu latihan': 'bg-orange-100 text-orange-800',
  'Belum ada data': 'bg-slate-100 text-slate-500',
};

function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

const shortDate = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

/** Single-series bar chart: minutes learned per day. Hover/tap a bar for details; table view available. */
function HistoryChart({ state }: { state: ProgressState }) {
  const data = dailyHistory(state, 14);
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(5, ...data.map((d) => d.minutes));
  const today = dayKey();
  const maxIdx = data.reduce((bi, d, i) => (d.minutes > data[bi].minutes ? i : bi), 0);

  return (
    <Section
      title="Menit belajar per hari (14 hari)"
      right={
        <button type="button" className="text-sm font-semibold text-ocean" onClick={() => setTable(!table)}>
          {table ? 'Lihat grafik' : 'Lihat tabel'}
        </button>
      }
    >
      {table ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1">Tanggal</th>
              <th>Menit</th>
              <th>Benar</th>
              <th>Salah</th>
              <th>Kata baru</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.date} className="border-t border-slate-100">
                <td className="py-1">{shortDate(d.date)}</td>
                <td>{d.minutes}</td>
                <td>{d.correct}</td>
                <td>{d.wrong}</td>
                <td>{d.newWords}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          <div className="flex h-40 items-end gap-[2px] border-b border-slate-200" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => {
              const h = (d.minutes / max) * 100;
              const showLabel = d.minutes > 0 && (i === maxIdx || d.date === today);
              return (
                <button
                  type="button"
                  key={d.date}
                  className="relative flex h-full flex-1 items-end justify-center"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onClick={() => setHover(i)}
                  aria-label={`${shortDate(d.date)}: ${d.minutes} menit`}
                >
                  {showLabel && (
                    <span className="absolute text-[10px] font-semibold text-slate-600" style={{ bottom: `calc(${h}% + 2px)` }}>
                      {d.minutes}
                    </span>
                  )}
                  <span
                    className="w-full max-w-[22px] rounded-t-[4px]"
                    style={{ height: `${d.minutes ? Math.max(h, 3) : 0}%`, background: '#1899d6', opacity: hover === null || hover === i ? 1 : 0.55 }}
                  />
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>{shortDate(data[0].date)}</span>
            <span>Hari ini</span>
          </div>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg"
              style={{ left: `${Math.min(70, Math.max(0, (hover / data.length) * 100 - 10))}%` }}
            >
              <p className="font-bold">{shortDate(data[hover].date)}</p>
              <p>{data[hover].minutes} menit · {data[hover].games} sesi</p>
              <p>
                {data[hover].correct} benar · {data[hover].wrong} salah
              </p>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

function Summary({ state }: { state: ProgressState }) {
  const ov = overview(state);
  const skills = skillSummaries(state);
  const worlds = worldSummaries(state);
  const hard = difficultWords(state);
  const recs = recommendations(state);
  const nonLetterTotal = VOCAB.filter((v) => v.topic !== 'alphabet').length;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Total waktu belajar" value={formatDuration(ov.totalSeconds)} sub={`${ov.learningDays} hari belajar`} />
        <Tile label="Kosakata dikuasai" value={ov.wordsMastered} sub={`${ov.wordsLearned} dipelajari dari ${nonLetterTotal}`} />
        <Tile label="Stage selesai" value={ov.stagesDone} sub={`⭐ ${ov.stars} bintang · ${ov.xp} XP`} />
        <Tile label="Hari berturut-turut" value={`🔥 ${ov.streak}`} />
      </div>

      <Section title="Kemampuan bahasa">
        <ul className="flex flex-col gap-3">
          {skills.map((s) => (
            <li key={s.skill}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold">{s.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RATING_STYLE[s.rating]}`}>{s.rating}</span>
              </div>
              <ProgressBar value={(s.accuracy ?? 0) / 100} height="h-2.5" className="mt-1" color="bg-ocean" />
              <p className="mt-0.5 text-xs text-slate-400">
                {s.note ?? (s.accuracy === null ? 'Belum ada jawaban' : `Akurasi ${s.accuracy}% · ${s.correct} benar, ${s.wrong} salah (percobaan pertama)`)}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Rekomendasi">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
          {recs.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </Section>

      <Section title="Materi yang masih sulit">
        {hard.length ? (
          <div className="flex flex-wrap gap-2">
            {hard.map((h) => (
              <button key={h.id} type="button" onClick={() => speak(h.word)} className="rounded-full bg-orange-50 px-3 py-1 text-sm">
                <b>{h.word}</b> <span className="text-slate-500">({h.translation}) · {h.accuracy}%</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Belum ada kata yang sulit. 👍</p>
        )}
      </Section>

      <HistoryChart state={state} />

      <Section title="Progress setiap World">
        <ul className="flex flex-col gap-2">
          {worlds.map((w) => (
            <li key={w.id} className="flex items-center gap-2 text-sm">
              <span className="emoji w-7 text-xl">{w.emoji}</span>
              <span className="w-36 shrink-0 truncate font-semibold">{w.name}</span>
              <ProgressBar value={w.done / w.total} height="h-2.5" color="bg-grass" />
              <span className="w-16 shrink-0 text-right text-xs text-slate-500">
                {w.done}/{w.total} · ⭐{w.stars}
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Weekly({ state }: { state: ProgressState }) {
  const r = weeklyReport(state);
  const row = (label: string, value: ReactNode) => (
    <li className="flex justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="text-slate-600">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </li>
  );
  const acc = (s: keyof typeof r.skills) => (r.skills[s].accuracy !== null ? `${r.skills[s].accuracy}% · ${r.skills[s].rating}` : r.skills[s].rating);
  return (
    <div className="flex flex-col gap-4">
      <Section title="MINGGU INI (7 hari terakhir)">
        <ul className="text-sm">
          {row('Waktu belajar', `${r.minutes} menit di ${r.activeDays} hari`)}
          {row('Vocabulary learned', `${r.vocabLearned} words`)}
          {row('Stage dimainkan', r.stages)}
          {row('Listening accuracy', acc('listening'))}
          {row('Reading progress', acc('reading'))}
          {row('Writing (spelling)', acc('writing'))}
          {row('Speaking progress', `${r.skills.speaking.rating} (${r.speakingTries} kali berlatih)`)}
          {row('Strongest topic', r.strongest ?? 'Belum cukup data')}
          {row('Need more practice', r.needsPractice ?? 'Belum ada')}
        </ul>
      </Section>
      <Section title="Saran latihan untuk orang tua">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
          {recommendations(state).map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </Section>
      <Section title="Tentang kurikulum">
        <ul className="flex flex-col gap-2 text-sm">
          {LEVELS.map((l) => (
            <li key={l.id}>
              <b>{l.name}</b> ({l.available ? 'tersedia' : 'segera hadir'}) — {l.goal}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Kurikulum disusun mengacu pada cakupan kemampuan Cambridge English Qualifications for Young Learners. Aplikasi ini bukan produk resmi Cambridge dan tidak memuat materi ujian Cambridge.
        </p>
      </Section>
    </div>
  );
}

const LEVEL_CHIP = { new: 'bg-slate-100 text-slate-500', learning: 'bg-sky-100 text-sky-800', weak: 'bg-orange-100 text-orange-800', mastered: 'bg-green-100 text-green-800' };
const LEVEL_LABEL = { new: 'baru', learning: 'belajar', weak: 'sulit', mastered: 'dikuasai' };

function Words({ state }: { state: ProgressState }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-500">
        Status kata: <b>dikuasai</b> = dijawab benar di minimal 3 hari berbeda (spaced repetition); <b>sulit</b> = akurasi terbaru di bawah 60%.
      </p>
      {topicSummaries(state).map((t) => (
        <section key={t.topic} className="rounded-2xl bg-white p-3 shadow-sm">
          <button type="button" className="flex w-full items-center justify-between gap-2" onClick={() => setOpen(open === t.topic ? null : t.topic)}>
            <span className="font-bold">{t.title}</span>
            <span className="flex flex-wrap justify-end gap-1 text-xs">
              <span className={`rounded-full px-2 ${LEVEL_CHIP.mastered}`}>{t.counts.mastered} dikuasai</span>
              {t.counts.weak > 0 && <span className={`rounded-full px-2 ${LEVEL_CHIP.weak}`}>{t.counts.weak} sulit</span>}
              <span className="rounded-full bg-slate-100 px-2 text-slate-500">{t.total} kata</span>
            </span>
          </button>
          {open === t.topic && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {VOCAB.filter((v) => v.topic === t.topic).map((v) => {
                const lv = masteryLevel(state.words[v.id]);
                return (
                  <li key={v.id}>
                    <button type="button" onClick={() => speak(v.word)} className={`rounded-full px-3 py-1 text-sm ${LEVEL_CHIP[lv]}`} title={v.translation}>
                      {v.word} <span className="opacity-70">· {LEVEL_LABEL[lv]}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange, disabled }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-start justify-between gap-3 py-2 ${disabled ? 'opacity-50' : ''}`}>
      <span>
        <span className="block font-semibold">{label}</span>
        {desc && <span className="block text-xs text-slate-500">{desc}</span>}
      </span>
      <input type="checkbox" className="mt-1 h-6 w-6 accent-ocean" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function SettingsTab({ state }: { state: ProgressState }) {
  const s = state.settings;
  const voices = englishVoices();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `english-adventure-backup-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="flex flex-col gap-4">
      <Section title="Profil anak">
        <label className="text-sm font-semibold text-slate-500" htmlFor="pname">
          Nama panggilan
        </label>
        <input
          id="pname"
          value={state.childName}
          maxLength={20}
          onChange={(e) => actions.updateProfile({ childName: e.target.value })}
          className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2 outline-none focus:border-ocean"
        />
      </Section>

      <Section title="Audio">
        <label className="block text-sm font-semibold" htmlFor="rate">
          Kecepatan suara: {s.speechRate <= 0.7 ? 'Lambat' : s.speechRate >= 0.95 ? 'Normal' : 'Sedang'} ({s.speechRate.toFixed(2)}×)
        </label>
        <input id="rate" type="range" min={0.6} max={1} step={0.05} value={s.speechRate} onChange={(e) => actions.updateSettings({ speechRate: Number(e.target.value) })} className="w-full accent-ocean" />
        <label className="mt-3 block text-sm font-semibold" htmlFor="voice">
          Suara (diutamakan British English)
        </label>
        {ttsAvailable() && voices.length ? (
          <select
            id="voice"
            value={s.voiceURI ?? ''}
            onChange={(e) => actions.updateSettings({ voiceURI: e.target.value || null })}
            className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2"
          >
            <option value="">Otomatis (en-GB terbaik yang tersedia)</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-orange-700">Perangkat ini tidak menyediakan suara bahasa Inggris (text-to-speech). Coba Chrome/Safari terbaru atau pasang suara English (UK) di pengaturan perangkat.</p>
        )}
        <button type="button" className="btn btn-blue mt-3 !py-2 text-base" onClick={() => speak('Hello! What colour is it? It is red.')}>
          🔊 Tes suara
        </button>
        <Toggle label="Efek suara" checked={s.sfx} onChange={(v) => actions.updateSettings({ sfx: v })} />
        <Toggle
          label="Cek pengucapan otomatis"
          desc={
            recognitionSupported()
              ? 'Memakai pengenalan suara browser. Catatan privasi: pada sebagian browser (mis. Chrome) audio diproses di server penyedia browser. Jika nonaktif, suara anak hanya direkam di perangkat untuk diputar ulang.'
              : 'Browser ini tidak mendukung pengenalan suara. Anak tetap bisa berlatih dengan rekam & dengar ulang.'
          }
          checked={s.speechCheck}
          disabled={!recognitionSupported()}
          onChange={(v) => actions.updateSettings({ speechCheck: v })}
        />
        <Toggle label="Tampilkan terjemahan Indonesia" desc="Arti kata ditampilkan kecil di kartu belajar." checked={s.showTranslation} onChange={(v) => actions.updateSettings({ showTranslation: v })} />
      </Section>

      <Section title="PIN orang tua">
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            value={newPin}
            maxLength={4}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
            placeholder="PIN baru (4 angka)"
            className="flex-1 rounded-xl border-2 border-slate-200 px-3 py-2"
          />
          <button
            type="button"
            className="btn btn-blue !py-2 text-base"
            disabled={newPin.length !== 4}
            onClick={() => {
              actions.setPin(newPin);
              setNewPin('');
              setMsg('PIN berhasil diganti.');
            }}
          >
            Simpan
          </button>
        </div>
      </Section>

      <Section title="Data & cadangan">
        <p className="mb-3 text-sm text-slate-500">
          Progres tersimpan otomatis di perangkat ini (tanpa akun dan tanpa internet). Membersihkan data browser akan menghapusnya, jadi simpan cadangan secara berkala.
        </p>
        {hasSaveError() && <p className="mb-2 text-sm font-semibold text-berry">Peringatan: penyimpanan perangkat penuh atau diblokir. Progres mungkin tidak tersimpan.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-green !py-2 text-base" onClick={exportBackup}>
            ⬇️ Unduh cadangan
          </button>
          <button type="button" className="btn btn-white !py-2 text-base" onClick={() => fileRef.current?.click()}>
            ⬆️ Pulihkan
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setMsg(actions.importBackup(await f.text()) ? 'Cadangan berhasil dipulihkan.' : 'File cadangan tidak valid.');
              e.target.value = '';
            }}
          />
          <button type="button" className="btn btn-pink !py-2 text-base" onClick={() => setConfirmReset(true)}>
            Hapus progres
          </button>
        </div>
      </Section>

      <Section title="Keamanan anak">
        <ul className="list-disc pl-5 text-sm text-slate-600">
          <li>Tanpa iklan, tanpa pembelian, tanpa chat, tanpa media sosial, tanpa tautan keluar.</li>
          <li>Hanya nama panggilan yang disimpan, di perangkat ini saja.</li>
          <li>Rekaman suara latihan hanya diputar ulang di perangkat dan tidak disimpan.</li>
        </ul>
      </Section>

      {msg && (
        <Modal onClose={() => setMsg(null)}>
          <p className="mb-4 text-center font-semibold">{msg}</p>
          <button type="button" className="btn btn-blue w-full" onClick={() => setMsg(null)}>
            OK
          </button>
        </Modal>
      )}
      {confirmReset && (
        <Modal onClose={() => setConfirmReset(false)}>
          <p className="text-lg font-bold">Hapus semua progres?</p>
          <p className="mt-1 text-sm text-slate-500">Bintang, XP, dan riwayat belajar akan dihapus. Pengaturan dan PIN tetap. Tindakan ini tidak bisa dibatalkan.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" className="btn btn-white flex-1" onClick={() => setConfirmReset(false)}>
              Batal
            </button>
            <button
              type="button"
              className="btn btn-pink flex-1"
              onClick={() => {
                actions.resetProgress();
                setConfirmReset(false);
                setMsg('Progres sudah dihapus.');
              }}
            >
              Hapus
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function ParentDashboard() {
  const state = useProgress();
  const [tab, setTab] = useState<Tab>('summary');
  const tabs: Array<[Tab, string]> = [
    ['summary', 'Ringkasan'],
    ['weekly', 'Laporan mingguan'],
    ['words', 'Kosakata'],
    ['settings', 'Pengaturan'],
  ];
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 pb-12">
        <header className="flex items-center gap-3">
          <IconButton label="Kembali ke halaman anak" onClick={() => navigate({ name: 'home' })}>
            ⬅️
          </IconButton>
          <div>
            <h1 className="text-2xl font-bold">Dashboard Orang Tua</h1>
            <p className="text-sm text-slate-500">
              {state.avatar} {state.childName || 'Anak'} · Pre A1 Starters
            </p>
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-sm">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold ${tab === id ? 'bg-ocean text-white' : 'text-slate-500'}`}
            >
              {label}
            </button>
          ))}
        </nav>
        {tab === 'summary' && <Summary state={state} />}
        {tab === 'weekly' && <Weekly state={state} />}
        {tab === 'words' && <Words state={state} />}
        {tab === 'settings' && <SettingsTab state={state} />}
      </div>
    </div>
  );
}
