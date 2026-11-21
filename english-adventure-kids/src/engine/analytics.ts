import { TOPICS } from '../content/topics';
import { SKILLS, type Skill, type TopicId } from '../content/types';
import { VOCAB_BY_ID } from '../content/vocabulary';
import { WORLDS } from '../content/worlds';
import type { ProgressState } from '../store/model';
import { isMastered, isWeak, masteryLevel, recentAccuracy, type MasteryLevel } from './mastery';
import { currentStreak, nextStage, totalStars, worldStars } from './progress';
import { dayKey, lastNDays, pct } from './util';

/** Parent-facing analytics. Everything is computed from the stored learning record. */

export type Rating = 'Sangat baik' | 'Baik' | 'Berkembang' | 'Perlu latihan' | 'Belum ada data';

export function rate(accuracy: number | null, minAttempts = true): Rating {
  if (accuracy === null || !minAttempts) return 'Belum ada data';
  if (accuracy >= 85) return 'Sangat baik';
  if (accuracy >= 70) return 'Baik';
  if (accuracy >= 50) return 'Berkembang';
  return 'Perlu latihan';
}

export interface SkillSummary {
  skill: Skill;
  label: string;
  correct: number;
  wrong: number;
  accuracy: number | null;
  rating: Rating;
  note?: string;
}

const SKILL_LABEL: Record<Skill, string> = { listening: 'Listening (mendengar)', speaking: 'Speaking (berbicara)', reading: 'Reading (membaca)', writing: 'Writing (mengeja/menulis)' };

export function skillSummaries(state: ProgressState): SkillSummary[] {
  return SKILLS.map((skill) => {
    if (skill === 'speaking') {
      const { tries, recognised } = state.speaking;
      const checked = state.settings.speechCheck;
      return {
        skill,
        label: SKILL_LABEL[skill],
        correct: recognised,
        wrong: 0,
        accuracy: checked && tries ? pct(recognised, tries) : null,
        rating: tries === 0 ? 'Belum ada data' : tries < 10 ? 'Berkembang' : checked ? rate(pct(recognised, tries)) : 'Baik',
        note: checked ? `${tries} kali berlatih, ${recognised} dikenali` : `${tries} kali berlatih (pengecekan otomatis nonaktif)`,
      };
    }
    const { correct, wrong } = state.skills[skill];
    const n = correct + wrong;
    const accuracy = n ? pct(correct, n) : null;
    return { skill, label: SKILL_LABEL[skill], correct, wrong, accuracy, rating: rate(accuracy, n >= 3) };
  });
}

export interface TopicSummary {
  topic: TopicId;
  title: string;
  attempts: number;
  accuracy: number | null;
  counts: Record<MasteryLevel, number>;
  total: number;
}

export function topicSummaries(state: ProgressState): TopicSummary[] {
  const map = new Map<TopicId, TopicSummary & { correct: number }>();
  for (const v of Object.values(VOCAB_BY_ID)) {
    const t = map.get(v.topic) ?? { topic: v.topic, title: TOPICS[v.topic].titleId, attempts: 0, correct: 0, accuracy: null, counts: { new: 0, learning: 0, weak: 0, mastered: 0 }, total: 0 };
    const s = state.words[v.id];
    t.total++;
    t.counts[masteryLevel(s)]++;
    if (s) {
      t.attempts += s.correct + s.wrong;
      t.correct += s.correct;
    }
    map.set(v.topic, t);
  }
  return [...map.values()].map(({ correct, ...t }) => ({ ...t, accuracy: t.attempts ? pct(correct, t.attempts) : null }));
}

export function difficultWords(state: ProgressState, limit = 12) {
  return Object.entries(state.words)
    .filter(([id, s]) => VOCAB_BY_ID[id] && (isWeak(s) || (s.correct + s.wrong >= 3 && s.correct / (s.correct + s.wrong) < 0.6)))
    .sort((a, b) => recentAccuracy(a[1]) - recentAccuracy(b[1]))
    .slice(0, limit)
    .map(([id, s]) => ({ id, word: VOCAB_BY_ID[id].word, translation: VOCAB_BY_ID[id].translation, topic: TOPICS[VOCAB_BY_ID[id].topic].titleId, accuracy: pct(s.correct, s.correct + s.wrong) }));
}

export interface Overview {
  totalSeconds: number;
  wordsLearned: number;
  wordsMastered: number;
  stars: number;
  xp: number;
  learningDays: number;
  streak: number;
  stagesDone: number;
}

export function overview(state: ProgressState): Overview {
  const words = Object.entries(state.words).filter(([id]) => VOCAB_BY_ID[id] && VOCAB_BY_ID[id].topic !== 'alphabet');
  return {
    totalSeconds: Object.values(state.days).reduce((a, d) => a + d.seconds, 0),
    wordsLearned: words.length,
    wordsMastered: words.filter(([, s]) => isMastered(s)).length,
    stars: totalStars(state),
    xp: state.xp,
    learningDays: Object.values(state.days).filter((d) => d.games > 0 || d.seconds > 0).length,
    streak: currentStreak(state),
    stagesDone: Object.values(state.stages).filter((s) => s.completed).length,
  };
}

export function worldSummaries(state: ProgressState) {
  return WORLDS.map((w) => ({ id: w.id, name: w.name, emoji: w.emoji, ...worldStars(state, w) }));
}

export function dailyHistory(state: ProgressState, days = 14, today = dayKey()) {
  return lastNDays(today, days).map((date) => {
    const d = state.days[date];
    return { date, minutes: Math.round((d?.seconds ?? 0) / 60), correct: d?.correct ?? 0, wrong: d?.wrong ?? 0, xp: d?.xp ?? 0, games: d?.games ?? 0, newWords: d?.newWords ?? 0 };
  });
}

export interface WeeklyReport {
  minutes: number;
  activeDays: number;
  vocabLearned: number;
  stages: number;
  skills: Record<Skill, { accuracy: number | null; rating: Rating }>;
  speakingTries: number;
  strongest: string | null;
  needsPractice: string | null;
}

export function weeklyReport(state: ProgressState, today = dayKey()): WeeklyReport {
  const week = lastNDays(today, 7);
  const logs = week.map((d) => state.days[d]).filter(Boolean);
  const skillTotals = Object.fromEntries(SKILLS.map((s) => [s, [0, 0]])) as Record<Skill, [number, number]>;
  for (const l of logs) for (const s of SKILLS) {
    const v = l!.bySkill?.[s];
    if (v) {
      skillTotals[s][0] += v[0];
      skillTotals[s][1] += v[1];
    }
  }
  const speakingTries = logs.reduce((a, l) => a + (l!.speakingTries ?? 0), 0);
  const skills = Object.fromEntries(
    SKILLS.map((s) => {
      if (s === 'speaking') return [s, { accuracy: null, rating: (speakingTries === 0 ? 'Belum ada data' : speakingTries >= 10 ? 'Baik' : 'Berkembang') as Rating }];
      const [c, w] = skillTotals[s];
      const acc = c + w ? pct(c, c + w) : null;
      return [s, { accuracy: acc, rating: rate(acc, c + w >= 3) }];
    }),
  ) as WeeklyReport['skills'];

  // Topic strength this week, from words practised this week.
  const weekStart = week[0];
  const byTopic = new Map<TopicId, [number, number]>();
  for (const [id, s] of Object.entries(state.words)) {
    const v = VOCAB_BY_ID[id];
    if (!v || s.lastSeen.slice(0, 10) < weekStart) continue;
    const t = byTopic.get(v.topic) ?? [0, 0];
    t[0] += s.correct;
    t[1] += s.wrong;
    byTopic.set(v.topic, t);
  }
  const ranked = [...byTopic.entries()].filter(([, [c, w]]) => c + w >= 4).map(([t, [c, w]]) => ({ t, acc: c / (c + w) })).sort((a, b) => b.acc - a.acc);
  const strongest = ranked[0] ? TOPICS[ranked[0].t].titleId : null;
  const weakest = ranked.length > 1 && ranked[ranked.length - 1].acc < 0.85 ? TOPICS[ranked[ranked.length - 1].t].titleId : null;

  return {
    minutes: Math.round(logs.reduce((a, l) => a + l!.seconds, 0) / 60),
    activeDays: logs.filter((l) => l!.games > 0).length,
    vocabLearned: Object.values(state.words).filter((s) => s.introducedOn >= weekStart).length,
    stages: logs.reduce((a, l) => a + l!.stages, 0),
    skills,
    speakingTries,
    strongest,
    needsPractice: weakest,
  };
}

const HOME_TIPS: Partial<Record<TopicId, string>> = {
  colors: 'Main "Find something red!" — minta anak mencari benda berwarna di rumah.',
  numbers: 'Hitung benda bersama dalam bahasa Inggris (anak tangga, buah, mainan).',
  animals: 'Tirukan suara hewan lalu sebut namanya: "It is a cow!"',
  fruits: 'Saat makan buah, tanyakan "What is this?" dan jawab "It is a banana."',
  vegetables: 'Ajak anak menyebut sayuran saat memasak atau belanja.',
  body: 'Main "Simon says: touch your nose!"',
  clothes: 'Saat berpakaian, sebut nama baju: "Put on your socks!"',
  family: 'Lihat foto keluarga: "This is my mum."',
  food: 'Saat makan: "I like rice!" — ajak anak membuat kalimat suka.',
  school: 'Tunjuk isi tas sekolah dan sebut namanya.',
  toys: 'Saat bermain: "I have a ball." — giliran menyebut mainan.',
  house: 'Tur rumah: tunjuk pintu, kasur, sofa dan sebut namanya.',
  weather: 'Setiap pagi lihat langit: "It is sunny!"',
  actions: 'Main tebak gerakan: "Jump! Run! Clap!"',
  alphabet: 'Nyanyikan lagu ABC dan cari huruf di kemasan makanan.',
  greetings: 'Biasakan "Good morning", "Thank you", "Good night" setiap hari.',
  prepositions: 'Sembunyikan mainan: "Where is the ball? It is under the table!"',
  shapes: 'Cari bentuk di rumah: jam (circle), pintu (rectangle).',
};

export function recommendations(state: ProgressState): string[] {
  const out: string[] = [];
  const nxt = nextStage(state);
  const ov = overview(state);
  const hard = difficultWords(state, 5);
  const week = weeklyReport(state);
  const skills = skillSummaries(state);

  if (!ov.stagesDone) out.push('Mulai dari World 1 (Alphabet Kingdom). Dampingi anak pada sesi pertama untuk menjelaskan cara bermain.');
  if (nxt) {
    const w = WORLDS.find((x) => x.id === nxt.worldId)!;
    out.push(`Materi berikutnya: "${nxt.title}" di ${w.name} — ${nxt.objective}`);
  }
  if (hard.length) out.push(`Kata yang masih sulit: ${hard.map((h) => `${h.word} (${h.translation})`).join(', ')}. Gunakan tombol "Review" di halaman anak; kata ini otomatis muncul lebih sering.`);
  const listening = skills.find((s) => s.skill === 'listening');
  if (listening?.accuracy !== null && listening?.accuracy !== undefined && listening.accuracy < 70)
    out.push('Akurasi listening masih berkembang. Coba pelankan suara di Pengaturan dan dengarkan ulang bersama anak.');
  if (state.speaking.tries < 5) out.push('Ajak anak lebih sering memakai tombol 🎤 dan menirukan kata. Pujilah usahanya, bukan kesempurnaan pengucapan.');
  if (week.activeDays < 3) out.push('Target ideal: 10–15 menit per hari. Sesi singkat tapi rutin lebih efektif daripada sesi panjang sesekali.');
  else if (week.minutes / Math.max(1, week.activeDays) > 25) out.push('Sesi harian sudah panjang. Untuk anak 6 tahun, 10–15 menit per sesi sudah cukup — sisakan waktu bermain di luar layar.');
  const weakTopic = topicSummaries(state).filter((t) => t.counts.weak > 0).sort((a, b) => b.counts.weak - a.counts.weak)[0];
  const tipTopic = weakTopic?.topic ?? (nxt ? WORLDS.find((w) => w.id === nxt.worldId)?.topics[0] : undefined);
  if (tipTopic && HOME_TIPS[tipTopic]) out.push(`Aktivitas di rumah (${TOPICS[tipTopic].titleId}): ${HOME_TIPS[tipTopic]}`);
  return out;
}

export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} menit`;
  return `${Math.floor(m / 60)} jam ${m % 60} menit`;
}
