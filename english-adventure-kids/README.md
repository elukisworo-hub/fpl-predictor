# English Adventure Kids

Aplikasi belajar bahasa Inggris interaktif untuk anak usia ±6 tahun. Kurikulumnya mengacu pada cakupan kemampuan Cambridge English Qualifications for Young Learners (Pre A1 Starters). Ini bukan produk resmi Cambridge.

Aplikasi berjalan sepenuhnya di browser: tanpa akun, tanpa backend, tanpa iklan. Progres tersimpan di perangkat. Internet hanya dibutuhkan untuk memuat halaman; mode offline penuh (PWA) belum dibuat.

## Menjalankan

```bash
cd english-adventure-kids
npm install
npm run dev          # buka http://localhost:5173 (juga bisa dibuka dari tablet/HP di jaringan yang sama)
```

Build produksi (folder `dist/` bisa di-hosting statis di mana saja, misalnya Netlify, Vercel, atau GitHub Pages):

```bash
npm run build
npm run preview
```

### Terbit otomatis ke GitHub Pages

Workflow `.github/workflows/deploy-kids-app.yml` menguji, mem-build, dan menerbitkan aplikasi setiap ada perubahan di folder ini pada branch `main`. Alamatnya: `https://elukisworo-hub.github.io/fpl-predictor/`.

Pengaturan sekali saja: di GitHub buka **Settings → Pages → Build and deployment → Source**, lalu pilih **GitHub Actions**. Workflow juga bisa dijalankan manual dari tab **Actions** (tombol *Run workflow*).

Pengujian:

```bash
npm test             # unit test engine & konten (Vitest)
npm run build && npm run e2e   # uji end-to-end di Chromium (Playwright), screenshot ke e2e/screens/
```

## Isi aplikasi (status saat ini)

| Bagian | Status |
|---|---|
| Pre A1 Starters: 10 world, 65 stage, 211 kosakata + 26 huruf, 6 cerita | Bisa dimainkan |
| A1 Movers, A2 Flyers | Tampil terkunci, materi belum dibuat |
| Alur stage: Learn → Practice → Play → Challenge → Reward | Berfungsi |
| Mini game: Listen & Choose, Picture Matching, Drag & Drop spelling, What's Missing, Find the Colour, Count & Answer, Complete the Sentence, Q&A, Speaking, Story Time, Listening (instruksi & preposisi) | Berfungsi |
| Bintang (maks. 3), XP, bonus konsistensi, misi harian, 14 badge, streak tanpa hukuman | Berfungsi |
| Adaptive learning + spaced repetition (Leitner) dan sesi Review | Berfungsi |
| Dashboard orang tua dengan PIN: analitik, laporan mingguan, rekomendasi, kosakata, pengaturan, backup/restore | Berfungsi |

## Audio

- Pengucapan memakai text-to-speech (Web Speech API) yang otomatis memilih suara **British English (en-GB)** jika tersedia di perangkat. Kecepatan dan pilihan suara bisa diatur di dashboard orang tua.
- Kualitas suara bergantung pada perangkat. Chrome/Android dan Safari/iOS umumnya punya suara en-GB; di desktop Linux sering tidak ada.
- Rekaman native speaker bisa ditambahkan tanpa mengubah logika: isi field `audio` pada kata di `src/content/vocabulary.ts`, atau panggil `registerAudio(teks, url)`.
- Latihan berbicara secara bawaan merekam suara anak **di perangkat** lalu memutarnya ulang berdampingan dengan contoh. Pengecekan pengucapan otomatis (SpeechRecognition) harus diaktifkan orang tua, karena sebagian browser memproses audionya di server penyedia browser.

## Struktur kode

```
src/
  content/   Data kurikulum: vocabulary.ts, worlds.ts (world, stage, level), stories.ts, topics.ts, types.ts
  engine/    Logika murni (teruji): generator soal adaptif, mastery & spaced repetition,
             unlock/bintang/XP, misi, badge, analitik orang tua, pencocokan ucapan
  store/     Model progres, penyimpanan localStorage, actions
  audio/     TTS, efek suara (WebAudio), speech recognition, perekam
  games/     Komponen mini game
  screens/   Home/dashboard anak, peta world, pemutar stage, badge, PIN, dashboard orang tua
```

UI hanya memanggil `store/actions.ts`; actions memanggil fungsi engine murni; konten dibaca dari `content/`.

## Menambah materi

- **Kata baru**: tambah baris di daftar topik pada `src/content/vocabulary.ts`, misalnya `['lion', 'singa', '🦁']`. Contoh kalimat, artikel, dan jamak dibuat otomatis, atau bisa ditulis sendiri.
- **Stage baru**: tambah entri di `src/content/worlds.ts` dengan judul, daftar kata (`ids('animals', 0, 5)`), jenis game Play, dan tujuan belajar.
- **Cerita baru**: tambah di `src/content/stories.ts`, lalu rujuk dengan `storyId` pada stage.
- **Level Movers/Flyers**: buat world baru dengan `level: 'movers'` lalu set `available: true` di `LEVELS`.

Unit test memeriksa konten secara otomatis: id unik, gambar tidak kembar dalam satu topik, semua stage menghasilkan soal valid, dan jumlah kosakata minimal 200.

## Aturan pedagogi yang diterapkan

- Jawaban salah tidak pernah dihukum. Anak mendengar "Let's try again!", opsi yang salah memudar, dan setelah 2 kali salah jawaban benar diberi petunjuk. Skor hanya menghitung percobaan pertama.
- Menyelesaikan stage selalu memberi minimal 1 bintang. Latihan berbicara tidak memengaruhi bintang.
- Kata yang sering salah muncul lebih sering, dengan pilihan jawaban lebih sedikit dan petunjuk ejaan. Kata yang sudah dikuasai mendapat lebih banyak pilihan dan tanpa petunjuk.
- Status "dikuasai" berarti kata dijawab benar di minimal 3 hari berbeda (spaced repetition).
- Streak hanya ditampilkan positif. Tidak ada pesan "streak hilang"; anak yang kembali disambut "Welcome back!".

## Keamanan anak & privasi

- Tanpa iklan, pembelian, chat, media sosial, atau tautan keluar.
- Data hanya berupa nama panggilan (opsional) dan progres belajar, disimpan di `localStorage` perangkat.
- Area orang tua dilindungi PIN 4 angka. PIN dibuat setelah soal perkalian, berfungsi sebagai gerbang anak, bukan keamanan akun.
- Data browser yang dibersihkan akan menghapus progres. Gunakan **Unduh cadangan** di dashboard orang tua.
