# Prediksi Poin FPL (Streamlit)

Aplikasi web untuk memprediksi poin (xP) pemain Fantasy Premier League, menyusun tim, merencanakan transfer, dan memberi saran chip. Data diambil langsung dari API resmi FPL dan diperbarui otomatis tiap 3 jam.

## Isi folder

| Berkas | Fungsi |
|---|---|
| `app.py` | Tampilan aplikasi (lima tab) |
| `fpl/fetch.py` | Mengambil data dari API FPL, termasuk skuad lewat ID tim |
| `fpl/model.py` | Model prediksi xP dan uji mundurnya |
| `fpl/optimize.py` | Susunan terbaik, skuad optimal, rencana transfer, saran chip |
| `requirements.txt` | Daftar pustaka Python yang dibutuhkan |

## Cara memasang di Streamlit Community Cloud (gratis)

1. Buat akun di https://github.com kalau belum punya.
2. Buat repositori baru: tombol **New**, beri nama misalnya `fpl-predictor`, pilih **Public**, lalu **Create repository**.
3. Di halaman repositori, pilih **uploading an existing file**. Seret **isi** folder ini (bukan foldernya) ke sana: `app.py`, `requirements.txt`, `README.md`, folder `fpl`, dan folder `.streamlit`. Tekan **Commit changes**.
   Folder `.streamlit` sering tersembunyi di komputer. Kalau tidak ikut terunggah, aplikasi tetap jalan; hanya warna temanya yang berbeda.
4. Buka https://share.streamlit.io dan masuk dengan akun GitHub.
5. Tekan **Create app**, pilih **Deploy a public app from GitHub**, lalu isi:
   - Repository: `nama-akun/fpl-predictor`
   - Branch: `main`
   - Main file path: `app.py`
6. Tekan **Deploy**. Pemasangan pertama memakan beberapa menit. Setelah selesai kamu mendapat alamat `https://....streamlit.app` yang bisa dibagikan.

## Cara pakai

- **Impor tim**: isi ID tim FPL di bilah samping. ID tim adalah angka di alamat halaman Points, `fantasy.premierleague.com/entry/ANGKA/event/...`.
- **Tautan pribadi**: setelah impor, alamat aplikasi berubah menjadi `...?team=ANGKA`. Simpan alamat itu supaya skuadmu langsung termuat saat dibuka lagi.
- Jumlah transfer gratis tidak tersedia di data publik FPL, jadi isi sendiri di tab Tim Saya.

## Menjalankan di komputer sendiri

```bash
pip install -r requirements.txt
```

```bash
streamlit run app.py
```

## Catatan

- Pembukaan pertama setelah data kedaluwarsa butuh sekitar satu menit karena riwayat ratusan pemain diunduh ulang.
- Aplikasi gratis di Streamlit Cloud "tidur" kalau lama tidak dibuka; pengunjung pertama perlu menekan tombol untuk membangunkannya.
- Bukan produk resmi Premier League.
