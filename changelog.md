# Changelog & Riwayat Versi SEKOLAHTU
Semua catatan perubahan dan pembaruan sistem administrasi tata usaha sekolah dasar (SEKOLAHTU).

## [v3.1.0] - 2026-10-24

### Penyempurnaan Antarmuka (UI/UX), Fitur Dark Mode, Interactive Onboarding Tour, Profil Tendik, dan Optimalisasi Resolusi Layar Standar 1366x768px
- **Custom Dropdown & Pop-up Modal Tahun Ajaran Baru (`index.html` & `assets/js/modul-import.js`):**
  - Dropdown selektor Tahun Ajaran di header kini didesain serasi dengan tema header dan dilengkapi popover menu custom.
  - Mengganti fungsi `prompt()` bawaan browser dengan modal dialog pop-up bertema SEKOLAHTU (`#modal-tambah-ta`) untuk pengisian tahun ajaran baru dengan validasi format otomatis (`YYYY/YYYY`).
- **Watermark Toga Wisuda pada Hero Banner Dasbor (`index.html`):**
  - Mengganti ikon gedung sekolah (`fa-school`) pada latar belakang Hero Banner Dasbor menjadi ikon topi toga wisuda kelulusan (`fa-graduation-cap`).
- **Indikator Status Online / Offline yang Ringkas (`index.html` & `assets/js/app.js`):**
  - Menyederhanakan redaksi status koneksi cloud: menampilkan **"Online"** saat mode cloud aktif dengan pulsing dot hijau, dan **"Offline"** saat nonaktif (mode lokal).
- **Redesign Tombol Sakelar Toggle On/Off Mode Cloud (`index.html` & `assets/js/app.js`):**
  - Memperbarui komponen toggle di halaman Pengaturan menjadi *segmented switch pill* modern berpenampilan elegan dengan indikator warna tematik (emerald untuk Online dan slate untuk Offline).
- **Optimalisasi Skala Layar Monitor Standar 1366x768px (`assets/css/style.css`):**
  - Mengatasi tampilan yang terlalu besar pada monitor laptop resolusi 1366x768px (skala 100% browser) melalui media query khusus:
    - Penyesuaian proporsi skala teks root (13.5px).
    - Lebar sidebar dibuat lebih kompak (256px / `w-64`) untuk memberikan ruang horizontal lebih lega bagi tabel dan kartu konten.
    - Penyesuaian padding kartu metrik dasbor, hero banner, header, dan padding sel tabel agar pas dilihat dan nyaman digunakan pada layar standar sekolah.
    - Pembatasan tinggi maksimal modal pop-up (`max-h-[88vh]`) agar tidak meluap dari viewport 768px.
- **Fitur Dark Mode & Light Mode Terintegrasi Penuh (`index.html`, `assets/css/style.css`, `assets/js/app.js`):**
  - Tombol sakelar mode tampilan ditempatkan di header sebelah kiri box element "Online", memuat teks dinamis **"Gelap"** (dengan ikon bulan sabit) atau **"Terang"** (dengan ikon matahari).
  - Dilengkapi sistem warna gelap komprehensif pada body, sidebar, header, glass card, modal, formulir input, dan tabel dengan persistensi di `localStorage` (`sekolahtu_theme`).
- **Foto Profil Akun di Header & Halaman Profil Pengguna (`index.html`, `assets/js/app.js`, `assets/js/security.js`, `assets/js/auth.js`):**
  - Menambahkan kartu profil di pojok kanan atas header yang menampilkan foto profil pengguna (atau inisial avatar), nama akun, dan peran (Admin, Guru, Kepala Sekolah, dll.).
  - Navigasi sekali klik menuju halaman profil mandiri (`#view-profile`) yang memuat data lengkap kepegawaian bersumber dari master data Tendik (`DataStore.getTendik()`), mencakup NIP, NUPTK, jabatan, status kepegawaian, ijazah terakhir, jurusan, kontak, serta ringkasan hak akses peran.
- **Interactive Onboarding Tour (Panduan untuk Staf) Berbasis Driver.js (`index.html`, `assets/css/style.css`, `assets/js/app.js`):**
  - Pemasangan pustaka Driver.js via CDN jsDelivr tanpa proses build/npm.
  - Penambahan tombol **'Panduan untuk Staf'** pada Welcome Hero Banner di halaman Dasbor.
  - Implementasi walkthrough interaktif gamifikasi dengan efek spotlight gelap dan popover berbalut tema SEKOLAHTU serta tombol aksi berbahasa Indonesia: **'Sebelumnya'**, **'Lanjutkan'**, dan **'Selesai'**.
- **Penyempurnaan UI/UX Evaluasi Lanjutan (Revisi 4 Poin Penting):**
  - **Penyelarasan Margin & Lebar Sidebar:** Menyinkronkan selector media query `#main-sidebar` (sebelumnya `#app-sidebar`) agar lebar sidebar (256px) konsisten dengan padding kontainer utama (`lg:pl-72`), menuntaskan masalah overlap 32px yang memotong teks nama sekolah pada header.
  - **Eliminasi Overflow Border-Left Nav Link:** Mengganti styling `.nav-link.active` dari `border-left: 4px` berkurva menjadi pill active state modern bergradien biru elektrik (`#1e3a8a` ke `#2563eb`) dengan shadow lembut yang rapi dan presisi di dalam kontainer.
  - **Penanganan Stacking Context & Overlay Tour:** Mengonfigurasi `z-index` mutlak pada `.driver-overlay` (`99998`) dan popover (`100000`), serta memastikan `#main-sidebar` dan `#app-top-header` otomatis berada di bawah overlay saat langkah tur berfokus pada konten utama, dan terangkat secara presisi saat elemen navigasi sedang disorot.
  - **Presisi Dimensi Sorotan Judul Dasbor:** Mengubah `#dashboard-hero-title` menjadi `inline-block w-fit` dengan konfigurasi `stagePadding: 8` dan `stageRadius: 10` pada Driver.js sehingga spotlight membungkus teks judul secara proporsional.
  - **Pembaruan Skema Dark Mode Premium:** Mengadopsi palet obsidian navy modern (`#0a0f1d` dan `#111a2e`) dengan border tipis elegan `rgba(255, 255, 255, 0.08)`, kontras teks optimal, dan elevasi shadow natural pada kartu metrik dasbor serta formulir.
  - **Ekspansi Langkah Walkthrough Navbar Sisi Kiri:** Memperluas urutan langkah "Panduan untuk Staf" (17 langkah terarah) yang memandu staf melintasi seluruh menu di sidebar kiri (GTK, Jadwal, Berkas Digital, PIP, Surat & Penomoran, Cetak Otomatis, Scan QR, dan Presensi).
- **Sinkronisasi Versi Seluruh Modul (`index.html`, `permohonan.html`, `verifikasi.html`, `backend/Code.gs`, `backend/Panduan_Deploy_GAS.md`):**
  - Peningkatan versi resmi sistem ke **v3.1.0**.

---

## [v3.0.0] - 2026-10-23

### Transformasi Identitas & Rebranding Resmi: SEKOLAHTU
- **Nama Aplikasi:** **SEKOLAHTU**
- **Akronim Resmi:** *Solusi Elektronik Kelola Administrasi & Harmonisasi Tata Usaha*
- **Tagline:** *"Kemudahan Pengelolaan Tata Usaha Sekolah dalam Satu Sentuhan"*
- **Pembaruan Menyeluruh Seluruh Antarmuka (UI/UX) & Komponen Sistem:**
  - **Header & Sidebar Brand (`index.html`):** Pembaruan logo brand menjadi **SEKOLAHTU**, badge versi naik ke **v3.0.0**, serta subheader dinamis memuat kepanjangan akronim resmi.
  - **Banner Hero Dasbor (`index.html` & `assets/js/app.js`):** Menampilkan sapaan *"Selamat Datang di SEKOLAHTU"* beserta penegasan tagline *"Kemudahan Pengelolaan Tata Usaha Sekolah dalam Satu Sentuhan"*.
  - **Login Overlay Modal (`index.html`):** Menampilkan identitas baru SEKOLAHTU beserta akronim dan tagline resmi sekolah.
  - **Portal Layanan Mandiri Publik (`permohonan.html`):** Penyesuaian nama aplikasi, tombol navigasi *"Masuk SEKOLAHTU"*, serta footer resmi v3.0.0.
  - **Portal Validasi Dokumen Resmi (`verifikasi.html`):** Penyempurnaan kop validasi keabsahan surat resmi Pangkalan Data SEKOLAHTU dan pengenalan otomatis URL verifikasi.
  - **Format Cadangan & Ekspor Data (`assets/js/data.js` & `assets/js/app.js`):** File cadangan lokal kini dinamai `SEKOLAHTU_backup_[tanggal].json` dengan dukungan kompatibilitas mundur penuh (*backward compatibility*) untuk memulihkan cadangan versi sebelumnya.
  - **Format Berkas Impor Siswa (`assets/js/modul-import.js`):** Template unduh berkas otomatis bernama `Template_Impor_Siswa_SEKOLAHTU.xlsx` dan `.csv`.
  - **Pesan Pengingat WhatsApp Wali Murid (`assets/js/modul-berkas.js`):** Redaksi notifikasi pengingat kelengkapan berkas diselaraskan dengan nama sistem SEKOLAHTU.
  - **Backend REST API Google Apps Script (`backend/Code.gs` & `backend/Panduan_Deploy_GAS.md`):** Pembaruan identitas backend API ke versi 3.0.0, pendukung folder Google Drive `/SEKOLAHTU/` dengan fallback mulus ke direktori `/SIM-TAS/` lama tanpa risiko data hilang.

---

## [v2.9.0] - 2026-10-23

### Sinkronisasi Otomatis Seluruh Dropdown Kelas / Rombel Siswa (1A, 3A, dll.) dan Perbaikan Redaksi Surat Mutasi Masuk

- **Perbaikan Redaksi Paragraf Surat Keterangan Bersedia Menerima / Mutasi Masuk (`assets/js/modul-cetak.js`):**
  - Menghapus penyebutan kelas angka romawi yang tidak nyambung pada kalimat persetujuan mutasi masuk:
    - *Sebelum:* `... di SD Negeri Terlangu 01 pada IV ( Empat ) Tahun Ajaran 2026/2027, yang bersangkutan berasal dari:`
    - *Sesudah:* `... di SD Negeri Terlangu 01 pada Tahun Ajaran 2026/2027, yang bersangkutan berasal dari:`
  - Informasi kelas yang dituju tetap tertera lengkap dan terstruktur pada tabel identitas calon siswa ("Kelas yang Dituju: IV ( Empat )").
  - Menampilkan rombel lengkap (`s.rombel || s.kelas`) pada pemilih siswa cetak surat.

- **Sinkronisasi Otomatis Seluruh Dropdown Kelas dari Data Siswa (`assets/js/data.js`, `assets/js/app.js`, `assets/js/modul-berkas.js`, `assets/js/modul-absensi.js`, `assets/js/modul-jadwal.js`, `assets/js/modul-pip.js`, `assets/js/modul-presensi.js`, `assets/js/modul-import.js`, `assets/js/auth.js`, `permohonan.html`):**
  - Mengoptimalkan `DataStore.getRombels()` agar menormalisasi nama rombel dan mengekstrak daftar rombel unik terurut secara natural (misal: `1A`, `1B`, `2`, `3A`, `4`, `5`, `6`).
  - Menghubungkan seluruh menu dropdown kelas di semua modul aplikasi agar mengikuti data rombel hasil impor maupun penambahan siswa:
    1. **Filter Berkas Siswa (`#filter-kelas-berkas`):** Mengikuti daftar rombel siswa aktif.
    2. **Modal Tambah Siswa Manual (`#tambah-kelas`):** Otomatis menyajikan pilihan rombel yang ada di database.
    3. **Filter Presensi Siswa (`#absensi-kelas`):** Menyajikan pilihan rombel siswa secara dinamis.
    4. **Jadwal Pelajaran (`#jadwal-select-kelas`, `#jadwal-form-rombel`):** Sinkron dengan rombel aktif beserta fase kurikulum.
    5. **Filter PIP (`#pip-filter-kelas-penerima`):** Sinkron dengan rombel aktif.
    6. **Rekap Presensi Bulanan (`#rs-kelas`):** Sinkron dengan rombel aktif.
    7. **Modal Impor Data Siswa (`#imp-kelas-default`):** Dropdown kelas default bila rombel kosong terisi dinamis.
    8. **Manajemen Akun Guru (`#new-user-guru-kelas`, `#edit-user-guru-kelas`):** Tersinkronisasi saat tambah dan edit akun guru.
    9. **Portal Permohonan Mandiri Publik (`#req-manual-kelas`, `#req-mutasi-kelas` di `permohonan.html`):** Tersinkronisasi langsung dengan master rombel sekolah.
  - Menambahkan controller terpusat `App.syncAllKelasDropdowns()` yang otomatis dipanggil saat startup, setelah impor Excel Dapodik, setelah penambahan siswa, dan saat pergantian tahun ajaran aktif.
  - Memperbaiki logika filter pencocokan rombel (*class matcher*) di seluruh modul agar tidak salah mencocokkan rombel berhuruf (seperti `1A` dengan `1B`).

---

## [v2.8.0] - 2026-10-23

### Template Surat Mutasi Masuk, Integrasi Permohonan Siswa Pindahan, Kolom Ijazah & Jurusan Tendik, Status PPPK PW, Pembersihan Role TU/Kiosk, dan Perbaikan Constraint Supabase

- **Pemisahan Tugas Tambahan Pramuka (`assets/js/modul-tendik.js`, `assets/js/data.js`):**
  - Memisahkan opsi tugas tambahan *"Pramuka Siaga / Penggalang"* menjadi dua tugas mandiri: **"Pembina Pramuka Siaga"** dan **"Pembina Pramuka Penggalang"** pada preset pilihan penugasan maupun filter direktori tendik.

- **Data Ijazah & Jurusan pada Menu Tendik (`assets/js/modul-tendik.js`, `assets/js/data.js`, `assets/js/api.js`, `backend/Code.gs`):**
  - Menambahkan kolom **Ijazah Terakhir** dengan pilihan jenjang pendidikan lengkap: `SD`, `SMP`, `MA/SMA/SMK`, `D1`, `D2`, `D3`, `D4`, `S1`, `S2`, `S3`.
  - Menambahkan kolom **Jurusan** (contoh: *PGSD*, *Manajemen Pendidikan*, *Teknik Informatika*, dll.).
  - Menampilkan badge Ijazah & Jurusan pada Kartu Grid Tendik, kolom baru pada Tabel Tendik, serta menyertakannya pada cetakan Direktori Pegawai Sekolah (`printDirectory`).
  - Menyelaraskan penyimpanan data Ijazah dan Jurusan pada `DataStore`, `ApiClient.saveTendik`, serta kolom baru spreadsheet `DB_Tendik` di backend Google Apps Script (`backend/Code.gs`).

- **Pembersihan Role `tu` dan `kiosk` (`assets/js/security.js`, `assets/js/auth.js`, `index.html`, `assets/js/modul-vue.js`, `supabase/schema.sql`):**
  - Menghapus opsi role `tu` ("Tenaga Administrasi") dan `kiosk` ("Terminal Scan Presensi") dari modal pembuatan dan edit akun pengguna (`#new-user-role` dan `#edit-user-role`).
  - Menghapus `tu` dan `kiosk` dari `ACL.ROLES`, `ACL.ACTIONS`, dan `ACL.ROUTES` pada `security.js`.
  - Menjaga *backward-compatibility* di mana sesi login atau token yang masih memuat role `tu` secara otomatis dipetakan ke role `admin` tanpa kehilangan hak akses.
  - Memperbarui daftar pengguna demo (`DEMO_USERS`), default redirect login, dan pengabaian timer idle kiosk.

- **Penyelarasan Menu Dropdown Template Surat (`permohonan.html`, `index.html`, `assets/js/modul-cetak.js`):**
  - Menyelaraskan secara 100% opsi template surat antara portal layanan mandiri publik `permohonan.html` dengan menu Cetak Surat di `index.html`:
    1. Surat Keterangan Aktif Belajar (Umum) (`aktif`)
    2. Surat Keterangan Aktif Belajar dan Rekomendasi Pencairan Dana PIP (`pip_pencairan`)
    3. Surat Keterangan Pindah Sekolah (Mutasi Keluar) (`mutasi`)
    4. Surat Keterangan Bersedia Menerima Siswa Pindah / Mutasi (`bersedia_menerima`)
    5. Surat Rekomendasi Siswa (Lomba / Beasiswa / Berprestasi) (`rekomendasi`)
    6. Surat Keterangan Kelakuan Baik Siswa (`kelakuan`)

- **Template Surat Keterangan Bersedia Menerima Siswa Pindah / Mutasi pada Portal Publik (`permohonan.html`):**
  - Menambahkan formulir data calon siswa pindahan masuk (`#box-mutasi-masuk-form`) yang muncul otomatis saat orang tua memilih jenis surat *"Surat Keterangan Bersedia Menerima Siswa Pindah / Mutasi"*.
  - Menyediakan input lengkap untuk:
    - **Identitas Siswa:** Nama Lengkap, NISN, Tempat Lahir, Tanggal Lahir, Kelas yang Dituju.
    - **Sekolah Asal:** Nama Sekolah Asal, NPSN Sekolah Asal, Alamat Sekolah Asal.
    - **Orang Tua / Domisili:** Nama Orang Tua / Wali, Alamat Domisili.
  - Mengotomatiskan validasi tanpa mewajibkan NISN terdaftar di database internal SDN Terlangu 01 karena siswa berasal dari sekolah luar.

- **Integrasi Otomatis Cetak Surat Bersedia Menerima dari Permohonan Online (`assets/js/modul-cetak.js`, `assets/js/modul-surat.js`):**
  - Pada menu Cetak Surat, saat memilih template *"Surat Keterangan Bersedia Menerima Siswa Pindah / Mutasi"*, sistem otomatis mengambil data siswa dan sekolah asal dari inputan permohonan online (`DataStore.getPermohonanSurat`).
  - Menyediakan dropdown pemilihan berkas permohonan online (`#cetak-select-permohonan-mutasi`) serta formulir preview yang dapat diedit langsung.
  - Menyusun layout resmi Surat Bersedia Menerima lengkap dengan Kop Resmi Pemkab Brebes / Dinas Dikpora, identitas siswa, pernyataan tegas **BERSEDIA MENERIMA**, data sekolah asal, tanda tangan Kepala Sekolah, dan stempel QR-Code verifikasi publik.
  - Menghubungkan tombol "Proses" di tabel permohonan (`ModulSurat.prosesPermohonan`) langsung ke template `bersedia_menerima` dengan data terisi penuh.

- **Status Kepegawaian "PPPK PW" & Penyesuaian Golongan/Jabatan (`assets/js/modul-tendik.js`, `assets/js/data.js`):**
  - Menambahkan status kepegawaian baru **"PPPK PW"** pada filter status dan opsi modal penambahan/pengeditan data tendik.
  - Mengubah label kolom form modal edit dari *"Golongan / Pangkat"* menjadi **"Golongan / Jabatan"** (beserta header tabel kompak) agar mencakup jenjang jabatan fungsional PPPK/PPPK PW.

- **Solusi Error Pembuatan Akun Baru Supabase (`supabase/schema.sql`, `assets/js/auth.js`):**
  - Mengatasi error PostgreSQL: `Gagal: new row for relation "profiles" violates check constraint "profiles_role_check"`.
  - Memperbarui definisi `CHECK (role IN (...))` pada `supabase/schema.sql` untuk mencakup seluruh 11 peran aktif (`admin`, `kepsek`, `perpustakaan`, `penjaga`, `guru`, `guru_kelas`, `guru_pjok`, `guru_pai`, `guru_inggris`, `guru_seni`, `guru_mapel`) serta menghapus `tu` dan `kiosk`.
  - Menyediakan skrip migrasi SQL siap eksekusi di Supabase SQL Editor (`ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check; ...`).
  - Memperbarui trigger `handle_new_user` agar menggunakan default role `'admin'` yang valid.
  - Menambahkan penanganan pesan error yang informatif dan ramah pengguna di `assets/js/auth.js` jika terdapat inkonsistensi constraint database remote.

---

## [v2.7.0] - 2026-10-23

### Modul Baru Data Guru & Tendik, Foto Profil, Pemisahan Status PNS/PPPK & Golongan, Role Tenaga Perpustakaan & Penjaga Sekolah, serta Tombol Pintas Dinamis Dashboard

- **Perbaikan Golongan/Pangkat vs Status Kepegawaian PNS & PPPK (`assets/js/modul-presensi.js`, `assets/js/api.js`, `backend/Code.gs`, `assets/js/app.js`):**
  - Mengatasi bug saat mengubah status kepegawaian dari PNS ke PPPK yang menyebabkan kolom Gol/Jabatan ikut berubah menjadi string `"PPPK"` dan tidak dapat diubah kembali ke jenjang golongan sebenarnya (misal: `"IX / Guru Kelas"`).
  - Memisahkan secara tegas dan mandiri kolom `GOLONGAN` (kolom 4) dan `STATUS_KEPEGAWAIAN` (kolom 5) pada struktur tabel `DB_Tendik` di Google Sheets, backend Google Apps Script (`backend/Code.gs`), serta sinkronisasi API lokal (`assets/js/api.js`).
  - Menambahkan mekanisme *self-healing* pemulihan data otomatis (`App.cleanupCorruptedTendikData`) pada saat inisialisasi aplikasi untuk memulihkan data profil guru/tendik di LocalStorage yang sempat tersimpan dengan nilai golongan cacat.
  - Memperbarui dialog form Kartu ID QR pada Modul Presensi agar status kepegawaian dan rincian pangkat/golongan tersimpan ke field masing-masing tanpa saling menimpa.

- **Pembaruan Hak Akses & Peran Pengguna (RBAC Overhaul) (`assets/js/security.js`, `assets/js/auth.js`, `index.html`):**
  - Mengubah penamaan peran **Tata Usaha (TU)** menjadi **Tenaga Administrasi** di seluruh antarmuka, daftar pengguna, dan badge sistem (tetap mempertahankan backward-compatibility kunci role internal `tu` dan alias `tenaga_administrasi`).
  - Menambahkan 2 peran baru ke dalam sistem:
    - **Tenaga Perpustakaan (`perpustakaan`):** Dibatasi hanya dapat mengakses menu *Bangkas Digital Siswa*, *Program PIP Siswa*, *Scan Absensi Datang/Pulang*, dan *Rekap Absensi Saya*.
    - **Penjaga Sekolah (`penjaga`):** Dibatasi secara ketat hanya dapat mengakses *Scan Absensi Datang/Pulang* dan *Rekap Absensi Saya*.
  - Menyesuaikan routing `ACL.ROUTES` dan aksi `ACL.ACTIONS` agar pengguna dengan peran penjaga dan perpustakaan dicegah mengakses data atau menu di luar wewenangnya (termasuk filter tab pada menu Presensi).
  - Menambahkan akun uji demo untuk Tenaga Administrasi (`tu / tu123`), Tenaga Perpustakaan (`perpus / perpus123`), dan Penjaga Sekolah (`penjaga / penjaga123`) pada `Auth.DEMO_USERS`.

- **Tombol Pintas (Quick-Actions) Dashboard Menyesuaikan Peran (`assets/js/modul-vue.js` & `assets/js/app.js`):**
  - Merombak bilah tombol aksi cepat pada hero banner dashboard beranda agar dinamis secara reaktif (`computed`) berdasarkan peran akun yang sedang aktif:
    - **Penjaga Sekolah:** Tombol *Scan Absensi Datang/Pulang* dan *Rekap Absensi Saya*.
    - **Tenaga Perpustakaan:** Tombol *Bangkas Digital Siswa*, *Program PIP Siswa*, *Scan Absensi Datang/Pulang*, dan *Rekap Absensi Saya*.
    - **Guru:** Tombol *Input Presensi Hari Ini*, *Rekap Absensi Bulanan*, *Presensi Datang/Pulang Saya*, dan *Berkas Siswa*.
    - **Kepala Sekolah:** Tombol *Data Guru & Tendik*, *Rekap Presensi Guru & Tendik*, *Rekap Absensi Siswa*, *Buku Register Surat SRIKANDI*, dan *Cetak Surat Keterangan*.
    - **Tenaga Administrasi & Administrator:** Tombol *Data Guru & Tendik*, *Tambah Siswa Baru*, *Terbitkan Nomor Surat*, *Cetak Surat Keterangan*, *Input Presensi Harian*, dan *Scan Absensi Datang/Pulang*.

- **Menu Baru "Data Guru & Tendik" (`assets/js/modul-tendik.js`, `index.html`):**
  - Mengembangkan modul aplikasi mandiri `ModulTendik` yang terhubung langsung ke basis data `DB_Tendik`.
  - Dilengkapi ringkasan statistik (Total Guru/Tendik, Jumlah PNS, PPPK, Honorer/PTT/GTT, Penugasan Tambahan, dan Foto Terlampir).
  - Menyediakan filter cepat (Status Kepegawaian, Tugas Tambahan, dan Pencarian Teks Multifield), sakelar mode tampilan Kartu Grid Modern vs Tabel Kompak, serta fitur Cetak Direktori Pegawai Sekolah.
  - **Dukungan Foto Profil & Tombol Unggah Foto:**
    - Panel pratinjau avatar interaktif dengan inisial nama otomatis jika belum memiliki foto.
    - Tombol unggah foto profil lokal dengan kompresi instan sisi peramban (HTML5 Canvas ke DataURL Base64) agar ringan dan hemat ruang penyimpanan.
  - **Sinkronisasi Jabatan dari Manajemen Akun:**
    - Tombol *"Ambil dari Akun"* untuk mendeteksi dan menyelaraskan jabatan pokok tendik secara otomatis berdasarkan data akun login pengguna di Manajemen Akun (RBAC).

- **Pengelolaan Tugas Tambahan Guru & Tendik:**
  - Menyediakan dropdown pilihan preset tugas tambahan resmi:
    1. *Kepala Sekolah*
    2. *Bendahara BOS*
    3. *Pembina Pramuka Siaga / Penggalang*
    4. *Pembina Drum Band*
    5. *Tugas Tambahan Lainnya...* (menampilkan kotak teks input khusus untuk tugas kustom, seperti Operator Dapodik, Koordinator UKS, dll.).
  - Data tugas tambahan tersimpan langsung ke kolom `TUGAS_TAMBAHAN` pada database `DB_Tendik` dan tampil rapi pada badge profil guru/tendik.

---

## [v2.6.3] - 2026-10-23

### Dinamisasi Tahun Ajaran Cetak Surat, Tombol Hapus Pengajuan Ortu, Perbaikan Nomor Terbit SRIKANDI & Stepper Tracking Responsif
- **Dinamisasi Tahun Ajaran pada Menu Cetak Surat (`index.html` & `assets/js/modul-cetak.js`):**
  - Menambahkan elemen selektor dropdown Tahun Ajaran (`cetak-select-ta`) pada panel kontrol modul cetak surat mandiri (`view-cetak-controls`).
  - Menghapus teks statis/hardcoded `"2025/2026"` pada badan naskah Surat Keterangan Aktif Belajar, Surat Rekomendasi Pencairan PIP, Rekomendasi Siswa, dan Kelakuan Baik, menggantikannya dengan nilai dinamis `getTahunAjaranSurat()` yang sinkron dengan data periodik siswa atau tahun ajaran aktif sistem.
  - Menambahkan metode `ModulCetak.populateTASelect()` untuk mengisi daftar pilihan tahun ajaran secara otomatis dari `DataStore.getTAList()`.
- **Tombol Hapus pada Tab Pengajuan Ortu di Menu Penomoran Surat (`assets/js/modul-surat.js`, `assets/js/api.js`, `backend/Code.gs`):**
  - Menambahkan tombol aksi Hapus (`fa-trash`, `bg-rose-600`) pada kolom Tindakan di tabel Pengajuan Surat Mandiri Orang Tua.
  - Mengimplementasikan fungsi `ModulSurat.deletePermohonan(id)` dengan dialog konfirmasi penghapusan demi keamanan data.
  - Menambahkan endpoint backend `deletePermohonanSurat` pada Google Apps Script (`backend/Code.gs`), fallback lokal dan pemetaan sinkronisasi di [`assets/js/api.js`](assets/js/api.js), serta hak akses otorisasi RBAC staf TU dan Admin pada [`assets/js/security.js`](assets/js/security.js).
- **Perbaikan Pemotongan Nomor Surat Terbit SRIKANDI (Bug Angka "421"):**
  - Memperbaiki kesalahan ekspresi reguler (regex) `[^\s\.]+` pada fungsi backend `handleGetPermohonanSurat` dan `handleTrackPermohonanSurat` di [`backend/Code.gs`](backend/Code.gs) serta pada [`permohonan.html`](permohonan.html) dan [`assets/js/modul-surat.js`](assets/js/modul-surat.js).
  - Regex kini mempertahankan tanda titik dan garis miring (`421.2/...` atau `041.2/...`) tanpa memotong string nomor surat dinas menjadi angka `421` semata.
  - Menyematkan fungsi *self-healing* pemulihan data otomatis (`cleanupTruncatedNomorSurat`) saat aplikasi dimuat untuk memperbaiki nomor registrasi lama yang sempat tersimpan cacat di memori lokal.
- **Pembaruan Stepper Tracking Resi Responsif & Ikon Centang Dinamis (`permohonan.html`):**
  - Mengganti elemen lingkaran nomor statis pada stepper pelacakan resi dengan sistem perenderan dinamis `setStepState()`.
  - Tanda centang hijau (`fa-check`) kini tampil responsif pada setiap tahapan yang telah dilalui (Terkirim, Verifikasi TU, Disetujui, dan Siap Diambil), tidak lagi mandek di tahapan 1.
  - Menyelaraskan status visual stepper dan catatan petugas secara akurat terhadap 5 status verifikasi TU di admin: *Menunggu Verifikasi TU*, *Disetujui TU*, *Siap Diambil*, *Selesai / Diterima*, dan *Ditolak*.
  - Meningkatkan algoritma penelusuran resi untuk membandingkan stempel waktu (*timestamp*) dan memprioritaskan data status paling mutakhir antara cache lokal dan Google Sheets.

---

## [v2.6.2] - 2026-10-22

### Integrasi Konfigurasi Supabase & GAS di Menu Pengaturan, Sakelar On/Off Cloud & Penyelarasan Backend
- **Konfigurasi Supabase & GAS di Menu Pengaturan Sistem (`index.html` & `assets/js/app.js`):**
  - Menambahkan panel konfigurasi mandiri untuk `Supabase Project URL` (`cfg-supabase-url`) dan `Supabase Anon Key` (`cfg-supabase-anon-key`) lengkap dengan tombol tampilkan/sembunyikan kunci (ikon mata).
  - Menambahkan tombol interaktif **"Uji Koneksi Supabase"** (`ApiClient.testSupabaseConnection`) untuk menguji akses endpoint Supabase Cloud Auth secara langsung dari browser pengguna dengan umpan balik status instan.
  - Menambahkan tombol pemulihan konfigurasi rekomendasi default **"Reset ke Nilai Default"** (`App.resetConfigDefaults`) untuk mengisi ulang parameter Supabase dan GAS URL bawaan dalam 1-klik.
- **Tombol Interaktif On / Off Mode Cloud vs Mode Lokal:**
  - Menyediakan kartu visual status dinamis (`cfg-cloud-mode-card`) dengan sakelar tombol (toggle switch) responsif untuk memilih mode operasi: **Mode Cloud (On)** vs **Mode Lokal (Off / Offline Demo)**.
  - Memperbaiki logika `ApiClient.isCloudActive()` dan `Auth.usesSupabase()` agar sepenuhnya menghormati preferensi sakelar pengguna, sehingga sistem dapat digunakan secara mandiri dan offline tanpa ketergantungan koneksi cloud saat dimatikan.
  - Menjadikan badge indikator status cloud di header bar atas (`cloud-status-badge`) interaktif dan dapat diklik untuk membuka menu Pengaturan secara cepat.
- **Penyelarasan Backend Google Apps Script (`backend/Code.gs` v2.6.2):**
  - Menyematkan konstanta default bawaan `DEFAULT_SUPABASE_URL`, `DEFAULT_SUPABASE_ANON_KEY`, dan `DEFAULT_GAS_API_URL` di sisi backend Apps Script.
  - Menambahkan fungsi helper `getBackendConfig()` dengan hierarki fallback cerdas (`ScriptProperties` &rarr; tab `Config` &rarr; konstanta bawaan).
  - Menyelaraskan fungsi `setupDatabaseAndFolders` untuk menginisialisasi parameter konfigurasi Supabase dan GAS URL ke tab `Config` spreadsheet dan `ScriptProperties`.
  - Menyelaraskan API handler `handleGetConfig` dan `handleSaveConfig` untuk menerima dan menyimpan kredensial Supabase & GAS dari antarmuka Web UI ke `ScriptProperties`.
  - Memperbarui respon endpoint status `doGet` untuk memuat informasi kesiapan koneksi Supabase dan versi backend `2.6.2`.
- **Pembaruan Panduan Deploy Backend (`Panduan_Deploy_GAS.md`):**
  - Memperbarui panduan penerapan GAS ke versi v2.6.2 dengan penjelasan inisialisasi otomatis parameter Supabase dan GAS URL.

---

## [v2.6.1] - 2026-10-22

### Perbaikan Responsif Dropdown Template Surat, Kop Surat Mutasi & Harmonisasi Template Persuratan
- **Perbaikan Tata Letak Dropdown Pilihan Template Surat:**
  - Memperbaiki sintaks tag HTML `<select id="cetak-jenis-surat">` pada [`index.html`](index.html) serta menambahkan kelas `w-full max-w-full font-medium` dan kontainer `min-w-0`.
  - Mengatasi kendala dropdown yang melebar dan meluap (*overflow*) melewati batas kolom kontrol ke area kanvas pratinjau surat (sesuai *Screenshot 2026-10-22 230552.png*).
- **Kop Surat Kedinasan Lengkap pada Surat Keterangan Pindah / Mutasi:**
  - Menyematkan kop surat resmi instansi (`renderKopHtml`) pada template Surat Keterangan Pindah Sekolah (Mutasi), lengkap dengan Logo Kabupaten Brebes, hierarki dinas, kontak sekolah, garis pembatas ganda (*double border*), serta stiker QR Code verifikasi dokumen elektronik.
- **Pemulihan Penuh Template Surat Keterangan Aktif Belajar (Umum):**
  - Mengembalikan opsi *Surat Keterangan Aktif Belajar (Umum)* sebagai template standar mandiri pada dropdown cetak dan form permohonan mandiri dengan judul resmi **"SURAT KETERANGAN AKTIF BELAJAR"**.
- **Harmonisasi Template Surat Keterangan & Rekomendasi Pencairan PIP:**
  - Menetapkan judul resmi naskah dinas menjadi: **"SURAT KETERANGAN AKTIF BELAJAR DAN REKOMENDASI PENCAIRAN DANA PIP"** (menghilangkan kata "SURAT" kedua yang redundan) dengan tetap menginjeksi data lengkap SK PIP siswa (Nomor SK, Tanggal SK, Tahap, Nomor Rekening, Virtual Account).
- **Penyelarasan API `ModulCetak.onSelectTemplate`:**
  - Menambahkan metode `ModulCetak.onSelectTemplate` dan pemetaan ID elemen dropdown pada [`assets/js/modul-cetak.js`](assets/js/modul-cetak.js) dan [`assets/js/modul-surat.js`](assets/js/modul-surat.js), memastikan tombol cetak pintasan dari modul PIP maupun agenda TU langsung mengaktifkan template bersangkutan secara instan.

---

## [v2.6.0] - 2026-10-22

### Pembaruan Format Cetak Persuratan, OCR KTA Pramuka, Status Multi-Opsi PIP & Penomoran Otomatis Tertinggi
- **Format Tanggal Lahir Indonesia Lengkap (Full Date) pada Cetak Surat:**
  - Mengonversi format tanggal lahir siswa di seluruh template cetak surat dinas dan permohonan mandiri menjadi format tanggal penuh resmi Indonesia (contoh: *15 Agustus 2012*).
- **Penyederhanaan Tabel Identitas Siswa pada Body Surat:**
  - Menghapus baris NIK, Pekerjaan Orang Tua, dan Alamat Tempat Tinggal pada tabel keterangan siswa di body surat dinas standar agar lebih ringkas, fokus, dan rapi sesuai tata naskah dinas.
- **Konsolidasi Format Surat Keterangan PIP:**
  - Menghapus opsi terpisah *Surat Keterangan Aktif Belajar (Persyaratan PIP)* yang redundan.
  - Memperbarui format *Surat Rekomendasi Pencairan Dana PIP* menjadi: **"SURAT KETERANGAN AKTIF BELAJAR DAN SURAT REKOMENDASI PENCAIRAN DANA PIP"**.
  - Menyertakan data validasi SK PIP otomatis dari database penerima PIP (Nomor SK, Tanggal SK PIP, Tahap, Nomor Rekening, dan Virtual Account).
- **Modal Pop-Up & Dropdown Status Siswa Penerima PIP:**
  - Mengganti tombol status biner pada tabel Siswa Penerima SK PIP dengan tombol/modal interaktif yang menyediakan 4 pilihan status: **Belum Cair**, **Sudah Cair**, **Belum Aktivasi**, dan **Sudah Aktivasi**.
  - Menyelaraskan filter status dasbor dan tabel PIP untuk menyaring ke-4 status tersebut secara akurat.
- **Generator Penomoran Surat Otomatis Berdasarkan Nomor Tertinggi Terakhir:**
  - Penomoran surat keluar otomatis (`getNextNomorSuratKeluar` dan `saveSuratKeluar`) kini memindai seluruh data nomor surat keluar pada tahun bersangkutan baik dari field `noUrut` maupun hasil ekstraksi regex string nomor surat resmi untuk menemukan nomor urut tertinggi (`maxNo`) dan otomatis melanjutkan ke nomor berikutnya (`maxNo + 1`), mencegah nomor tumpang tindih.
- **Kode Klasifikasi Surat Baru: 428 - Kepramukaan:**
  - Menambahkan kode klasifikasi dinas `428 - Kepramukaan` pada seluruh opsi penomoran surat keluar dan pencatatan arsip SRIKANDI.
- **Status Kepegawaian & Gol/Jabatan pada Kartu ID Presensi QR Tendik:**
  - Menambahkan opsi status kepegawaian (PNS, PPPK, PPPK PW, PTT, GTT) dan kolom input *Gol/Jabatan* (contoh: *Penata Muda / IIIa* atau *IX / Guru Kelas* atau *IX / Guru PAI*).
  - Tampilan kartu ID QR interaktif dan lembar cetak fisik kini menyajikan lencana status dan keterangan jabatan/golongan secara jelas.
  - Menyelaraskan data bawaan (seed) tendik dan template unduhan Excel.
- **Bangkas Siswa Digital: Unggah Berkas & OCR KTA Pramuka:**
  - Menambahkan tombol unggah berkas KTA Pramuka pada modul Bangkas Digital Siswa.
  - Menambahkan kapabilitas OCR Tesseract.js khusus KTA Pramuka untuk mendeteksi Nomor Tanda Anggota (NTA) secara otomatis dengan diff view pembanding data dan 1-klik sinkronisasi ke database siswa.
- **Format Baku Surat Keterangan Pindah Sekolah (Mutasi):**
  - Menerapkan format baku resmi Surat Keterangan Pindah Sekolah sesuai layout kedinasan:
    - 12 kotak NSS di sudut kanan atas (`1 0 1 0 3 2 9 1 6 0 5 2`).
    - Format kelas dalam angka Romawi dan teks huruf (contoh: *V ( Lima )*).
    - Identitas permohonan orang tua/wali serta sekolah tujuan dan alasan mutasi.
    - Garis potong bertanda gunting (`✂`).
    - Slip konfirmasi penerimaan siswa oleh sekolah tujuan dengan 12 kotak kosong NSS dan kolom pengesahan kepala sekolah penerima.
- **Penyelarasan Backend Google Apps Script (GAS v2.6.0):**
  - Algoritma penomoran nomor surat tertinggi diterapkan pada `handleGetNextNomorSuratKeluar`.
  - Penyelarasan penyimpanan metadata siswa untuk nomor NTA Pramuka dan berkas KTA.

---

## [v2.5.4] - 2026-10-22

### Pemisahan Role Guru Mapel & Penyempurnaan Cetak Presensi
- **Pemisahan Role Guru Mapel di Manajemen Akun Pengguna:**
  - Memisahkan opsi pendaftaran dan edit akun pengguna guru secara spesifik: Guru Kelas, Guru Mapel PJOK, Guru Mapel PAI (Pendidikan Agama Islam), Guru Mapel Bahasa Inggris, Guru Mapel Seni Budaya, dan Guru Mapel Lainnya.
  - Tampilan daftar akun kini menyajikan lencana (badge) peran terpisah yang jelas dan berwarna (misal: *Guru Mapel PJOK*, *Guru Mapel PAI*, *Guru Kelas 1*), tidak lagi digabung menjadi satu kategori umum.
  - Menambahkan akun demo bawaan untuk `guru_pjok` dan `guru_pai` dengan kredensial instan.
- **Header & TTD Cetak Rekap Siswa Bulanan Otomatis:**
  - Header lembar cetak absensi bulanan siswa kini dinamis menyesuaikan peran guru yang sedang login atau dipilih di toolbar (misal: *ABSENSI GURU MAPEL PJOK*, *ABSENSI GURU MAPEL PAI*, atau *ABSENSI GURU KELAS*).
  - Data nama lengkap guru dan NIP pada blok tanda tangan (kiri bawah) kini terisi secara otomatis dari database profil/tendik (menggantikan baris titik-titik kosong `(........)`).
  - Menyediakan selector dinamis *"Guru / TTD Absen"* pada toolbar rekap siswa bulanan sehingga Admin/TU dapat memilih dan mengganti penandatangan antara Guru Kelas maupun Guru Mapel terkait.
- **Standar Format Kehadiran Penuh ("-") Rekap Siswa Bulanan:**
  - Jika siswa atau seluruh kelas hadir penuh (nilai Sakit = 0, Izin = 0, Alpa = 0), kolom `S`, `I`, `A`, dan `JML` kini diisi garis strip `"-"` sesuai standar baku buku absensi sekolah dasar, baik pada tampilan tabel interaktif, berkas ekspor CSV, maupun lembar cetak PDF.
- **Pengosongan Baris Paraf Rekap Guru & Tendik untuk Tanda Tangan Basah:**
  - Mengosongkan baris tanda paraf pada rekap kehadiran guru & tendik (menghapus tanda centang otomatis `✓`) agar lembar cetak siap untuk tanda tangan / paraf basah manual menggunakan pena saat diprint.

---

## [v2.5.3] - 2026-10-22

### Perbaikan Responsif Header Permohonan Mandiri & Sinkronisasi Realisasi PIP
- **Responsivitas Header Portal Permohonan Mandiri (`permohonan.html`):**
  - Mengatasi teks judul sekolah yang terpotong pada tampilan ponsel pintar (lebar layar sempit ~393px seperti iPhone 16).
  - Menyembunyikan badge `LAYANAN MANDIRI` secara dinamis pada layar kecil (`hidden sm:inline-block`) agar judul `SDN TERLANGU 01` dan tombol navigasi `Sistem TU` memiliki ruang yang lega, rapi, dan tidak saling tumpang tindih.
  - Memperpendek placeholder kotak input NISN (`Contoh: 0134567890`) agar teks contoh tidak terpotong di dalam form input pada layar ponsel.
- **Penyelarasan Kartu Statistik "Sudah Cair" Modul PIP (`index.html` & `assets/js/modul-pip.js`):**
  - Memperbaiki ketidaksesuaian penamaan ID elemen HTML (`pip-stat-total-cair` diselaraskan menjadi `pip-stat-sudah-cair`) serta menambahkan selector fallback ganda pada fungsi `renderDasbor`.
  - Mengatasi kendala angka kartu "Sudah Cair" yang sempat macet di nilai `0`, sehingga kini secara akurat menampilkan jumlah siswa yang telah mencairkan dana (70 siswa / 74% realisasi).
- **Peningkatan Rincian Fitur Smart Audit DB Siswa (`assets/js/modul-pip.js`):**
  - Mengembangkan keluaran fungsi `runSmartAudit()` agar tidak hanya menampilkan angka rekapitulasi, tetapi juga menyajikan dialog interaktif berisi rincian lengkap siswa usulan PIP yang belum tercatat pada Database Siswa Sekolah (Dapodik) beserta petunjuk solusinya.

---

## [v2.5.2] - 2026-10-22

### Revisi Modul PIP & Alur Penomoran Surat Permohonan Mandiri
- **Tata Letak Tombol Impor PIP:**
  - Menghapus tombol impor global di header atas modul PIP (yang sebelumnya tampil redundan di semua subtab) dan menambahkan tombol impor Excel mandiri langsung di dalam kartu tab **Siswa Penerima SK PIP** (berdampingan dengan tombol *Unduh Format Contoh*), sehingga simetris dengan tab **Data Pengusulan**.
- **Kolom `UPDATED_AT` Database PIP & Sinkronisasi Dasbor Real-Time:**
  - Menambahkan kolom `UPDATED_AT` pada header tabel Google Sheets `DB_PIP_Pengusulan` (kolom 29) dan `DB_PIP_Penerima` (kolom 23) pada [`backend/Code.gs`](backend/Code.gs).
  - Menyertakan nilai timestamp `updatedAt` otomatis saat impor baris di [`assets/js/modul-pip.js`](assets/js/modul-pip.js) dan [`assets/js/api.js`](assets/js/api.js).
  - Memperbaiki `Sync.pull` pada [`assets/js/api.js`](assets/js/api.js) agar respon bertipe objek (`res.data.pengusulan` dan `res.data.penerima`) langsung tersimpan ke *DataStore* lokal, sehingga data yang baru diimpor langsung muncul di dasbor & tabel analitik PIP seketika tanpa perlu muat ulang manual.
- **Alur Penomoran Surat Permohonan "Siap Diambil":**
  - Memperbarui fungsi `updateStatusPermohonan` pada [`assets/js/modul-surat.js`](assets/js/modul-surat.js): saat status permohonan diubah menjadi **"Siap Diambil"**, sistem secara otomatis memeriksa agenda surat keluar (`DB_SuratKeluar`). Jika belum terdaftar, nomor resmi baru langsung ditarik dari generator nomor dinas SRIKANDI (`getNextNomorSuratKeluar`) dan otomatis dibukukan ke tabel agenda surat keluar (`saveSuratKeluar`).
  - Menghapus nomor registrasi dummy/hardcoded (`421.2/001/SD/2026`) pada pelacakan resi [`permohonan.html`](permohonan.html), menggantikannya dengan pembacaan langsung dari nomor surat dinas yang sah atau arahan langsung ke ruang TU dengan nomor tiket.

---

## [v2.5.1] - 2026-10-22

### Dashboard Hero Banner & Navigasi Sidebar (Revisi Layout)
- **Pemisahan Tombol Aksi Cepat Mandiri:**
  - Mengganti tombol dropdown tunggal *"Aksi Cepat"* pada banner utama Dashboard hero menjadi tombol-tombol aksi pintasan mandiri yang terpisah dan langsung terpampang di bawah teks *"Selamat Datang di SIM-TAS-SD"*.
  - Desain tombol menggunakan *glassmorphism* modern (`bg-white/10 hover:bg-white/20 border-white/20 shadow-sm`), ikon beraksen kontras tinggi, serta perilaku otomatis menyesuaikan hak akses pengguna (*role-aware* untuk Admin, TU, Guru, Kepala Sekolah, dan Kiosk Presensi).
- **Scrollbar Navigasi Menu Sidebar:**
  - Menghapus pembungkus statis tanpa batas tinggi pada sidebar navigasi dan menetapkan kontainer `<nav id="vue-sidebar-nav">` sebagai elemen fleksibel mandiri (`flex-1 min-h-0 overflow-y-auto`).
  - Menambahkan *styling* scrollbar modern ramping (*custom thin scrollbar*) pada [`assets/css/style.css`](assets/css/style.css), memastikan seluruh daftar menu dapat digulir secara mulus tanpa terpotong pada layar beresolusi sedang, laptop, maupun perangkat tablet/ponsel.

### Layanan Mandiri Permohonan Surat Online (Bebas Login & Real-Time Cloud)
- **Akses Publik 100% Bebas Token Login (*Zero Auth Barrier*):**
  - Pengecualian verifikasi token Supabase untuk aksi publik `submitPermohonanSurat`, `trackPermohonanSurat`, dan `verifyStudentPublic` pada backend [`backend/Code.gs`](backend/Code.gs) dan API frontend [`assets/js/api.js`](assets/js/api.js), sehingga orang tua siswa dapat mengajukan surat dan melacak resi dari perangkat mana pun tanpa akun login staf.
- **Pencarian Real-Time Langsung ke Cloud:**
  - Fungsi pelacakan resi pada [`permohonan.html`](permohonan.html) kini langsung menanyakan pangkalan data Google Sheets (`DB_PermohonanSurat`) via API Google Apps Script, mengatasi kendala isolasi *localStorage* antar-perangkat (laptop ke HP).
- **Smart Matching Pencarian Resi:**
  - Mendukung pencarian resi yang fleksibel: kode resi lengkap (`REQ-2026-0001` atau `REQ-2026-001`), tanpa tanda hubung (`REQ20260001`), nomor urut 3-4 digit (`0001`, `001`, atau `1`), nomor NISN siswa (10 digit), maupun nomor WhatsApp pemohon.
- **Alur Penerbitan Surat & Nomor Registrasi SRIKANDI:**
  - Status permohonan yang disetujui dapat langsung dicetak dari tab Pengajuan Ortu pada menu Penomoran dan Surat.
  - Setelah surat dicetak, status permohonan otomatis beralih menjadi **"Siap Diambil"**, nomor surat resmi diambil dari agenda surat keluar atas nama siswa, dan dicatat pada data permohonan dengan pesan:
    `Surat Anda telah selesai diterbitkan dengan Nomor Registrasi SRIKANDI: {noSurat}.`
- **Pengecekan Data Siswa Online & Fallback Input Manual:**
  - Pengecekan NISN siswa di portal mandiri memverifikasi langsung ke data siswa Google Sheets (`TAB_SISWA`) via endpoint `verifyStudentPublic`. Jika NISN siswa baru belum tercatat di sistem, tersedia formulir instan pengisian nama dan kelas siswa.
- **Dukungan HTTP GET pada `doGet(e)`:**
  - Memungkinkan pengecekan resi dan verifikasi siswa publik langsung via tautan URL browser atau protokol HTTP GET tanpa kendala CORS/preflight.
- **Auto-create Tab & Normalisasi Tanggal:**
  - Google Apps Script otomatis membuat tab `DB_PermohonanSurat` dengan struktur kolom lengkap jika belum tersedia, serta menormalisasi objek Date ke format standar `yyyy-MM-dd HH:mm:ss`.

---

## [v2.5.0] - 2026-10-21

### Modul PIP Kemendikbud & Penyelarasan Kolom Database
- **Struktur Kolom Database Google Sheets Sesuai Format Impor:**
  - Menyelaraskan struktur header tabel `DB_PIP_Pengusulan` (28 kolom resmi Dapodik/Puslapdik 2026: *No, Nama Murid, NIK, Valid Dukcapil, NISN, Valid NISN, Tempat Lahir, Tanggal Lahir, Umur, Jenis Kelamin, Nama Ibu, Pekerjaan Ibu, Nama Ayah, Pekerjaan Ayah, Jenjang, Kelas, Rombel, Semester ID, Desil, Bank, Status Tabungan, flag_drop, keterangan_flag, Fase ID, Nama Fase, Role, Status SK, SK Atas Nama*) persis sama dengan file format contoh impor.
  - Menyelaraskan struktur header tabel `DB_PIP_Penerima` (22 kolom resmi SK Puslapdik 2026: *No, nomenklatur, kelas, rombel, nama_pd, nama_ibu_kandung, nama_ayah, tanggal_lahir, tempat_lahir, nisn, nik, JK, nominal, no_rekening, virtual_acc, Tahap, status_cair, No Rekening / Virtual ACC, Nama Pengusul, confirmation_text, nomor_sk, tanggal_sk*) persis sama dengan file format contoh impor.
  - Standardisasi nama file unduhan format contoh:
    - Pengusulan: `format_pengusulan_pip_{tahun}.xlsx`
    - Penerimaan: `format_penerimaan_pip_{tahun}.xlsx`
- **Jadwal Pelajaran — Tombol 1-Klik Hapus Seluruh Jadwal Rombel Kelas:**
  - Menambahkan tombol interaktif **"Hapus Semua Jadwal Kelas"** pada toolbar jadwal pelajaran sekolah (`#view-jadwal`).
  - Dilengkapi dialog konfirmasi keamanan untuk mencegah ketidaksengajaan penghapusan, otomatis membersihkan slot jadwal kelas terpilih di `DataStore`, serta menyinkronkan penghapusan ke cloud backend (`clearJadwalKelas`).
- **Verifikasi Dokumen Surat Keluar — Dual-Layer Verification (Laptop ke HP):**
  - QR code pada lembar cetak surat menyematkan nomor surat bersih dan payload ringkas terenkripsi (`?no=...&d=...`). Saat dipindai kamera HP/Google Lens, dokumen langsung terverifikasi sah seketika tanpa kendala isolasi `localStorage` antar-perangkat.
  - Endpoint publik `verifySuratKeluar` pada [`backend/Code.gs`](backend/Code.gs) bebas token login staf TU.
- **Mapping Profil Akun Guru & Perbaikan Format Jam Mengajar:**
  - Menghubungkan pemetaan peran akun saat buat/edit akun (`tipeGuru` & `kelasGuru`) dengan persistensi `sim_tas_user_mappings` di `localStorage`.
  - Memperbaiki parser waktu mengajar hari ini pada dashboard guru (`formatJamMenit`) menampilkan format rapi (contoh: `07:00 - 07:35 WIB`).
- **Hero Banner Dashboard:**
  - Memindahkan tombol **"Aksi Cepat"** beserta dropdown pintasan peran langsung ke bawah kalimat sambutan hero banner dashboard beranda.

---

## [v2.4.0] - 2026-10-21

- **Penyelarasan Field WhatsApp:** Menyelaraskan dual alias `namaPemohon`/`namaOrtu` dan `noWhatsApp`/`hpOrtu`/`noHp` pada form pengajuan mandiri, tabel agenda TU, API gateway, dan backend Apps Script.
- **Format Contoh Excel & Tombol Impor Modul PIP:** Fitur unduh format contoh dan impor data Excel langsung pada header masing-masing tab PIP dengan SheetJS.
- **Perbaikan Penyimpanan & Preset Kurikulum Merdeka Jadwal Pelajaran:** Mengatasi ketidakcocokan identifikasi kelas, menyelaraskan field alias, dan update instan ke `DataStore.saveJadwalAll`.
- **Dynamic Rombel Dropdown:** Mengganti daftar kelas statis pada modul Jadwal dan PIP dengan data dinamis dari master rombel siswa aktif (`DataStore.getRombels()`).
- **Sinkronisasi Kalender Hari Libur Nasional & Cuti Bersama:** Integrasi data hari libur nasional resmi bersumber dari `https://husniadil.com/calendar/{Tahun}/` (SKB 3 Menteri).

---

## [v2.3.0] - 2026-10-21

- **Navigasi Sub-Tab Native:** Pemisahan kontainer DOM `view-surat-masuk` dan `view-surat-permohonan`, serta transisi sub-tab ke kontrol native yang sinkron dengan badge hitung permohonan pending ortu.
- **Portal Layanan Mandiri Permohonan Surat Online (`permohonan.html`):** Pelacakan resi cerdas multi-layer (LocalStorage + Cloud Apps Script), Bypass Auth portal publik, dan Stepper Status Progres.
- **Backend Apps Script (GAS v2.3.0):** Endpoint `trackPermohonanSurat` untuk pencarian status berkas berbasis kode resi, NISN, atau no HP.

---

## [v2.2.0] - 2026-10-21

- **Penambahan 4 Database Sheet Baru:**
  1. `DB_JadwalPelajaran`
  2. `DB_PIP_Pengusulan`
  3. `DB_PIP_Penerima`
  4. `DB_PermohonanSurat`
- **Action Handlers doPost GAS:**
  - Jadwal: `getJadwal`, `saveJadwal`, `deleteJadwal`
  - PIP: `getPIP`, `savePIP`, `updatePIPStatus`, `importPIP`
  - Permohonan Surat Mandiri: `getPermohonanSurat`, `submitPermohonanSurat`, `updatePermohonanSurat`
  - Siswa: `updateStudentPhone`, `updateStudentFields`
- **Inisialisasi Otomatis:** Memperbarui `setupDatabaseAndFolders()` untuk inisialisasi otomatis tab baru dan header kolom terkait.

---

## [v2.1.0] - 2026-10-20

- **Konfigurasi Profil Sekolah:** Endpoint API `getConfig` dan `saveConfig` untuk sinkronisasi konfigurasi profil sekolah dan identitas Kepala Sekolah ke tab `Config` spreadsheet.
- **Dukungan Auto-create Tab Config:** Pemetaan fleksibel nama kolom konfigurasi dan persistensi dinamis.

---

## [v2.0.0] - 2026-10-19

- **Autentikasi Supabase & RBAC Multi-Role:** Integrasi token auth Supabase & 5 peran (Admin, Guru, TU, Kepsek, Kiosk).
- **Presensi & Backup:** Sinkronisasi presensi tendik & siswa, backup Drive, dan manajemen arsip surat.

---

## [v1.5.1] - 2026-10-20

- **Modul Cetak Surat Mandiri:** Sinkronisasi identitas Kepala Sekolah ke seluruh template cetak, perbaikan interaksi mode penomoran, ruang tanda tangan & stempel basah (75px).
- **Portal Verifikasi Dokumen Dinamis ([`verifikasi.html`](verifikasi.html)):** Deteksi cerdas format surat kedinasan vs siswa.
- **Optimasi Mobile Ergonomics:** Header bebas overflow pada layar $\le 393px$, dashboard grid 2x2.

---

## [v1.5.0] - 2026-10-20

- **Presensi Tendik:** Dual lookup matching (NIP & Nama Bersih), toggle rekap tendik akun guru.
- **Navigasi Modular Vue 3:** Perbaikan sidebar nav berbasis peran pengguna.
- **Manajemen Penugasan Guru:** Deteksi cerdas guru kelas vs guru mapel, modal edit akun pengguna.

---

## [v1.4.1] & Versi Terdahulu

- Pembaruan skema RBAC Supabase dan optimasi modul pencadangan Google Apps Script.
- Penambahan kartu ID QR otomatis dan format cetak surat dinas standar SRIKANDI.
