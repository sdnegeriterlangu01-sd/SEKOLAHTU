# SEKOLAHTU
### Solusi Elektronik Kelola Administrasi & Harmonisasi Tata Usaha Sekolah Dasar
> **"Kemudahan Pengelolaan Tata Usaha Sekolah dalam Satu Sentuhan"**
> *Paperless • Lightweight • Zero-Cost • Supabase RBAC • Google Sheets & Drive Cloud*

---

## 1. Pendahuluan & Latar Belakang (Assess)

Administrasi Sekolah Dasar umumnya masih dikelola secara konvensional, manual, dan terfragmentasi (terpisah-pisah), yang menimbulkan permasalahan krusial:
- **Berkas Pokok Siswa Fisik Rusak/Hilang:** Berkas penting seperti scan Kartu Keluarga (KK), Akta Kelahiran, dan KIP/PKH tercecer saat dibutuhkan untuk validasi Dapodik atau PIP.
- **Input Manual Berulang:** Memasukkan ratusan data siswa satu per satu sangat melelahkan dan rawan salah ketik.
- **Riwayat Data Hilang Saat Naik Kelas / Ganti Tahun Ajaran:** Tanpa sistem periodik tahun ajaran, data rombel siswa tertimpa setiap tahun.
- **Nomor Surat Ganda (*Double Numbering*):** Penomoran surat manual di buku agenda fisik sering tumpang tindih.
- **Presensi Manual Lambat & Tidak Real-Time:** Guru dan staf TU merekap absensi bulanan secara manual menjelang penyerahan laporan.
- **Keamanan Data & Risiko Kebocoran:** Tidak ada pembatasan hak akses berbasis peran (RBAC) pada komputer tata usaha bersama.

### Tujuan Inovasi:
Membangun platform tata usaha sekolah dasar terpadu yang **ringan (lightweight)**, **tanpa kertas (paperless)**, **100% bebas biaya langganan/server (zero-cost)**, memiliki keamanan autentikasi **Supabase RBAC**, serta memangkas waktu pelayanan surat menyurat dan pengarsipan hingga **>90% (< 5 detik)**.

---

## 2. Arsitektur & Spesifikasi Teknologi (STEM)

```
[ Frontend: GitHub Pages (HTML5 + TailwindCSS + Vanilla JS) ]
          │
          ├── (Supabase REST API /auth/v1 & /rest/v1) ──────► [ Supabase DB: profiles & RBAC Auth ]
          │
          └── (Fetch HTTPS POST membawa Bearer Token) ──────► [ Google Apps Script Backend (Web App) ]
                                                                      │
                                                      ┌───────────────┴───────────────┐
                                                      ▼                               ▼
                                              [ Google Sheets ]               [ Google Drive ]
                                           (Database Multi-Tab)          (Storage Berkas, QR & Backup)
```

- **Frontend (User Interface):** HTML5, Vanilla JavaScript (ES6+), TailwindCSS via CDN, FontAwesome 6, Chart.js. Library SheetJS dan Html5-QRCode dimuat secara *on-demand* sehingga initial load time tetap ultra-cepat (< 3 detik). Dideploy gratis di **GitHub Pages**.
- **Autentikasi & RBAC:** **Supabase Auth** + tabel `public.profiles` dengan Row Level Security (RLS). Mendukung 5 peran akun: `admin`, `kepsek`, `tu`, `guru`, `kiosk`.
- **Backend REST API:** **Google Apps Script (GAS)** terpublikasi sebagai Web App (*Execute as: Me, Access: Anyone*) dengan validasi token Supabase (Zero Trust).
- **Database (Sheets Multi-Tab):**
  - `DB_Siswa`: Master data siswa + Dapodik + tautan berkas digital
  - `DB_Tendik`: Data Guru & Tenaga Kependidikan + tautan QR Drive
  - `DB_SuratKeluar`: Buku agenda penomoran surat keluar (klasifikasi baku SRIKANDI)
  - `DB_SuratMasuk`: Buku agenda surat masuk + disposisi kepala sekolah
  - `DB_Absensi`: Catatan presensi harian
  - `DB_AbsensiTendik`: Log presensi scan QR datang & pulang tendik
  - `DB_AbsensiSiswaBulan`: Matriks absensi siswa bulanan per kelas
  - `Config`: Identitas sekolah, kop surat, dan kalender hari libur
- **Penyimpanan Berkas (Google Drive):**
  ```
  /SEKOLAHTU/ (atau /SIM-TAS/ untuk instalasi lama)
  ├── Berkas_Siswa/       (Scan KK, Akta, KIP, Foto)
  ├── Surat_Masuk/        (Scan fisik surat masuk)
  ├── Surat_Keluar_PDF/   (PDF surat yang diterbitkan)
  ├── Template_Surat/     (Template dokumen Google Docs)
  ├── QR_Tendik/          (Kartu QR presensi guru & tendik)
  └── Backup/             (Snapshot JSON otomatis database)
  ```

---

## 3. Modul & Fitur Utama

### 📥 1. Impor Data Siswa Massal & Periodik Tahun Ajaran (Dapodik Compatible)
- **Impor Langsung dari Excel / CSV:** Tidak perlu ketik manual satu per satu. Mendukung format tabel Dapodik (24 kolom: No, Nama, NIPD, JK, NISN, Tempat Lahir, Tgl Lahir, NIK, Agama, Alamat, RT/RW, Dusun, Kelurahan, Kecamatan, Kode Pos, Data Ayah [Nama, Thn Lahir, Pendidikan, Pekerjaan], Data Ibu [Nama, Thn Lahir, Pendidikan, Pekerjaan], Rombel Saat Ini).
- **Pengenalan Kolom Otomatis (Alias Matching):** Header 1 baris atau 2 baris dikenali secara otomatis meskipun urutan kolom berbeda.
- **Periodik Tahun Ajaran:** Mendukung perpindahan tahun ajaran (contoh `2025/2026`, `2026/2027`). Rombel saat ini disimpan per tahun ajaran sehingga histori kelas siswa dari tahun ke tahun tetap utuh.
- **Mode Impor Cerdas:** Opsi perbarui data jika NISN sudah ada atau lewati baris yang sudah terdaftar.

### 🔐 2. Autentikasi Supabase & Hak Akses Berbasis Peran (RBAC)
- **5 Peran Pengguna:**
  1. `admin`: Hak penuh kelola pengguna, ubah setelan, impor data, dan pencadangan.
  2. `kepsek`: Pemantauan dasbor, penerbitan disposisi surat masuk, dan persetujuan surat keluar.
  3. `tu`: Tata usaha penuh (pengarsipan berkas, penomoran surat SRIKANDI, cetak surat instan, absensi).
  4. `guru`: Pengisian presensi siswa bulanan dan unduh kartu ID.
  5. `kiosk`: Mode terminal scan presensi mandiri (tanpa timeout logout).
- **Keamanan Tingkat Tinggi:**
  - Token Bearer Supabase diverifikasi ulang di server Apps Script pada setiap transaksi.
  - Sanitasi anti-XSS (`Sec.cleanDeep`), sanitasi formula injection CSV (`Sec.sanitizeFormula`).
  - Pencegahan Brute Force otomatis (lockout 60 detik jika gagal 5 kali).
  - Timeout sesi otomatis saat tidak ada aktivitas pengguna.
  - Penyimpanan sesi di `sessionStorage` (otomatis terhapus saat tab ditutup).
  - Mode Demo lokal otomatis jika Supabase belum dikonfigurasi.

### ✉️ 3. Penomoran Surat SRIKANDI (Anti Double-Numbering)
- **Surat Keluar:** Penomoran otomatis berbasis klasifikasi dinas (contoh: `421.2/001/SD/2026`). Tombol penerbitan dilengkapi proteksi anti-spam submit dan lock atomic sehingga nomor surat tidak akan macet atau terbit ganda.
- **Surat Masuk:** Pencatatan nomor agenda otomatis, tanggal terima, unggah scan fisik, dan disposisi instruksi Kepala Sekolah.

### 🖨️ 4. Cetak Surat Otomatis (< 5 Detik)
- Penerbitan Surat Keterangan Aktif Belajar, Mutasi, dan Rekomendasi secara instan dengan pratinjau WYSIWYG A4.
- Injeksi otomatis seluruh data siswa tanpa ketik ulang.
- Tanda tangan digital & QR-Code verifikasi dokumen publik yang terhubung ke `verifikasi.html`.

### ⏱️ 5. Presensi Digital Tendik & Siswa (Scan Barcode/QR)
- **Scan Barcode/QR Tendik:**
  - Pemindaian kartu ID via kamera HP/Laptop maupun USB Barcode Scanner fisik.
  - Scan pertama di hari yang sama mencatat **Jam Datang**, scan berikutnya mencatat **Jam Pulang**.
  - Dilengkapi pencegahan scan ganda dalam rentang waktu singkat (< 15 menit).
- **Rekapitulasi Bulanan Guru & Tendik:**
  - Format grid bulanan tanggal 1-31 dengan kolom Datang dan Pulang serta total S, I, A sesuai format dinas.
  - Hari Minggu dan tanggal libur nasional otomatis berwarna abu-abu.
- **Rekapitulasi Bulanan Siswa:**
  - Matriks bulanan per kelas dengan penanda status Hadir, S, I, A.
- **Generator Kartu ID QR Otomatis:**
  - Diterbitkan otomatis untuk seluruh guru & tendik, dapat diunduh per kartu, dicetak lembar A4, dan disimpan langsung ke Google Drive `/SEKOLAHTU/QR_Tendik/`.

### 💾 6. Pencadangan Sistem (Backup & Restore)
- **Cadangan Cloud Otomatis ke Google Drive:** Snapshot seluruh tabel Sheets ke file `.json` berstempel waktu di folder `/SEKOLAHTU/Backup/`.
- **Cadangan Lokal Portable:** Unduh snapshot basis data lokal browser kapan saja ke file `.json` dan pulihkan kembali dalam 1 klik.

---

## 4. Cara Penggunaan & Konfigurasi

### Mode Uji Coba Cepat (Mode Demo Lokal)
Buka file `index.html` langsung di peramban web.
Akun uji coba demo:
- `admin` / `admin123` (Administrator)
- `tu` / `tu123` (Staf Tata Usaha)
- `guru` / `guru123` (Guru Kelas)
- `kepsek` / `kepsek123` (Kepala Sekolah)
- `kiosk` / `kiosk123` (Terminal Scan)

### Konfigurasi Cloud Penuh (Supabase + Google Apps Script)
1. **Atur Supabase:**
   - Buat proyek gratis di [supabase.com](https://supabase.com).
   - Masuk ke **SQL Editor**, buka file [`supabase/schema.sql`](supabase/schema.sql), lalu jalankan query tersebut untuk membuat tabel `profiles`, RLS, dan trigger.
   - Buka **Project Settings** > **API**, salin **Project URL** dan **anon public key**.
   - Buka file `assets/js/config.js` dan isi `SUPABASE_URL` serta `SUPABASE_ANON_KEY`.
2. **Atur Google Apps Script:**
   - Ikuti panduan lengkap di [`backend/Panduan_Deploy_GAS.md`](backend/Panduan_Deploy_GAS.md).
   - Salin URL Web App yang dihasilkan dan tempelkan di file `assets/js/config.js` pada baris `GAS_API_URL` (atau atur via menu Pengaturan Sistem di aplikasi).

---

## 5. Catatan Rilis & Riwayat Versi (Changelog)

Seluruh riwayat versi dan catatan rilis terdokumentasi secara lengkap dan terpusat pada file [`changelog.md`](changelog.md).

---

## 6. Lisensi
Didistribusikan secara bebas & gratis untuk seluruh satuan pendidikan Sekolah Dasar di Indonesia.
