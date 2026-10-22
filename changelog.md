# Changelog & Riwayat Versi SIM-TAS-SD
Semua catatan perubahan dan pembaruan sistem informasi manajemen tata usaha administrasi sekolah dasar (SIM-TAS-SD).

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
