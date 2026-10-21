# SIM-TAS-SD
### Sistem Informasi Manajemen Tata Usaha Administrasi Sekolah Dasar Terpadu
> **Paperless • Lightweight • Zero-Cost • Supabase RBAC • Google Sheets & Drive Cloud**

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
  /SIM-TAS/
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
  - Diterbitkan otomatis untuk seluruh guru & tendik, dapat diunduh per kartu, dicetak lembar A4, dan disimpan langsung ke Google Drive `/SIM-TAS/QR_Tendik/`.

### 💾 6. Pencadangan Sistem (Backup & Restore)
- **Cadangan Cloud Otomatis ke Google Drive:** Snapshot seluruh tabel Sheets ke file `.json` berstempel waktu di folder `/SIM-TAS/Backup/`.
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

## 5. Catatan Rilis & Riwayat Versi (Release Notes / Version History)

### 🚀 Versi 2.5.0 (21 Oktober 2026)
* **Jadwal Pelajaran — Tombol 1-Klik Hapus Seluruh Jadwal Rombel Kelas:**
  - Menambahkan tombol interaktif **"Hapus Semua Jadwal Kelas"** pada toolbar jadwal pelajaran sekolah (`#view-jadwal`).
  - Dilengkapi dialog konfirmasi keamanan untuk mencegah ketidaksengajaan penghapusan, otomatis membersihkan slot jadwal kelas terpilih di `DataStore`, serta menyinkronkan penghapusan ke cloud backend (`clearJadwalKelas`).
* **Verifikasi Dokumen Surat Keluar — QR Code Tautan Online, Validasi Register Otomatis, & Sinkronisasi Lintas Perangkat (Laptop ke HP):**
  - Mengatasi kendala verifikasi pada smartphone (*"nomor surat tidak ditemukan"* saat diperiksa di HP): menerapkan arsitektur *Dual-Layer Verification* yang andal:
    1. **Payload Mandiri Instan (QR Code Offline / Standalone Fallback):** QR code pada lembar cetak ([`assets/js/modul-cetak.js`](assets/js/modul-cetak.js)) menyematkan nomor surat bersih dan payload ringkas terenkripsi (`?no=...&d=...`). Saat dipindai kamera HP/Google Lens, dokumen langsung terverifikasi sah seketika tanpa kendala isolasi `localStorage` antar-perangkat, sekaligus otomatis menyematkan arsip surat tersebut ke penyimpanan lokal smartphone.
    2. **Pangkalan Data Cloud Live (Google Apps Script API Publik):** Menambahkan *endpoint* publik `verifySuratKeluar` pada [`backend/Code.gs`](backend/Code.gs) yang dapat diakses bebas tanpa token login staf TU, sehingga pengecekan manual nomor surat pada browser HP langsung menanyakan Buku Register cloud Google Sheets dan otomatis mencatat cache lokal.
    3. **Indikator Progres Interaktif:** Menambahkan indikator visual elegan (*"Sedang Memeriksa Keabsahan Dokumen..."*) pada portal verifikasi ([`verifikasi.html`](verifikasi.html)) saat sistem menghubungkan pangkalan data cloud.
* **Modul PIP Kemendikbud — Penyelarasan Format Pengusulan PIP (28 Kolom Resmi):**
  - Menyelaraskan struktur tabel database, template unduh contoh (`data pengusulan PIP SDN Terlangu 01_2026.xlsx`), dan parser impor SheetJS sesuai spesifikasi resmi Puslapdik/Dapodik 2026 (No, Nama Murid, NIK, Valid Dukcapil, NISN, Valid NISN, Tempat/Tanggal Lahir, Umur, JK, Orang Tua, Jenjang, Kelas, Rombel, Semester ID, Desil, Bank, Status Tabungan, Fase, Role, Status SK, SK Atas Nama).
  - Pada tab **Data Penerima PIP**, menghapus tombol impor di samping tombol *Unduh Format Contoh*, sehingga tata letak toolbar bersih dan impor terpusat pada tombol impor utama di atas.
* **Modul PIP Kemendikbud — Penyelarasan Format Penerima SK PIP (22 Kolom Resmi):**
  - Menyesuaikan template unduh contoh (`data siswa SDN Terlangu 01 penerima pip tahun 2026.xlsx`), tabel display, dan parser impor data penerima dengan struktur lengkap: Nomenklatur Sekolah, Kelas, Rombel, Nama PD, Orang Tua, TTL, NISN, NIK, JK, Nominal Bantuan (Rp 450.000), No Rekening, Virtual Account, Tahap Penyaluran, Status Pencairan, Nama Pengusul, Nomor SK, dan Tanggal SK.
* **Mapping Profil Akun Guru & Perbaikan Format Jam Jadwal Mengajar:**
  - Menghubungkan pemetaan peran akun saat buat/edit akun (`tipeGuru` & `kelasGuru`) dengan persistensi `sim_tas_user_mappings` di `localStorage`, mencegah penimpaan keliru dari tendik bawaan.
  - Filter kartu statistik dan target siswa di dashboard guru kini presisi menghitung jumlah siswa kelas binaan yang dimapping.
  - Memperbaiki parser waktu mengajar hari ini pada dashboard guru (`formatJamMenit`) sehingga tidak lagi menampilkan string epoch mentah (`Sat Dec 30 1899...`), melainkan rentang jam rapi (contoh: `07:00 - 07:35 WIB`).
* **Label Menu Sidebar & Penguncian Dropdown Absensi Kelas:**
  - Menu sidebar otomatis beradaptasi menampilkan **"Absensi Kelas {kelas}"** sesuai kelas binaan yang dimapping saat pembuatan akun guru.
  - Dropdown tingkat kelas pada form absensi harian (`#absensi-kelas`) dan rekapitulasi bulanan siswa (`#rs-kelas`) otomatis dikunci (*disabled / read-only*) khusus pada kelas binaan guru tersebut.
* **Hero Banner Dashboard — Reposisi Tombol Aksi Cepat & Menu Pintasan:**
  - Menghapus 2 tombol lama (*"Kelola Berkas Siswa"* dan *"Cetak Surat Mandiri (<5 Detik)"*) pada hero banner dashboard beranda.
  - Memindahkan tombol **"Aksi Cepat"** beserta dropdown pintasan peran (*Role-Aware Quick Actions*) dari header navigasi atas langsung ke bawah kalimat sambutan hero banner dashboard beranda.
* **Pembaruan Nomor Versi Aplikasi (v2.5.0):**
  - Mengubah nomor versi aplikasi menjadi **v2.5.0** secara menyeluruh pada `index.html`, `assets/js/app.js`, `assets/js/modul-jadwal.js`, `assets/js/modul-pip.js`, `verifikasi.html`, `permohonan.html`, `backend/Code.gs`, `backend/Panduan_Deploy_GAS.md`, dan `README.md`.

### 🚀 Versi 2.4.0 (21 Oktober 2026)
* **Perbaikan Nomor WhatsApp Pemohon pada Layanan Mandiri Permohonan Surat Online:**
  - Menyelaraskan dual alias parameter `namaPemohon` / `namaOrtu` dan `noWhatsApp` / `hpOrtu` / `noHp` pada form pengajuan mandiri (`permohonan.html`), tabel agenda tata usaha (`assets/js/modul-surat.js`), API gateway (`assets/js/api.js`), dan backend Apps Script (`backend/Code.gs`).
  - Mengatasi kendala nomor WhatsApp orang tua tampil tanda strip (`-`) pada tabel dashboard permohonan surat tata usaha, sehingga staf TU kini dapat langsung menghubungi nomor WhatsApp pemohon atau mengirimkan notifikasi surat selesai dengan satu klik (`sendWhatsAppPermohonan`).
* **Format Contoh Excel & Tombol Impor Terintegrasi pada Modul PIP Kemendikbud:**
  - Menyediakan fitur **Unduh Format Contoh (Excel)** pada tab **Data Pengusulan (Desil)** dan tab **Siswa Penerima SK PIP** berbasis SheetJS (`.xlsx`) lengkap dengan struktur kolom baku Puslapdik Kemendikbud 2026 dan baris data sampel riil.
  - Menyediakan tombol **Impor Data Excel** langsung pada header masing-masing tab yang terhubung dengan parser cerdas pendeteksi alias kolom otomatis (NISN, Nama Siswa, Kelas, Desil Kemiskinan, Status SK, Nomor SK, Nomor Rekening SimPel BRI, dan Status Pencairan).
  - Menyelaraskan ID tabel dan penghitung siswa (`table-pip-pengusulan-body` dan `table-pip-penerima-body`) dengan header kolom yang presisi dan informatif.
* **Perbaikan Penyimpanan & Preset Kurikulum Merdeka Modul Jadwal Pelajaran:**
  - Memperbaiki bug grid jadwal pelajaran kosong setelah klik tombol *"Preset Merdeka"* atau simpan manual slot jadwal.
  - Mengatasi ketidakcocokan identifikasi kelas (antara format `"Kelas 1"` dan angka `"1"`), menyelaraskan field dual alias (`kelas` dan `rombel`, `guru` dan `namaGuru`), serta melakukan update instan ke `DataStore.saveJadwalAll` sebelum dan sesudah sinkronisasi API/Cloud Apps Script.
  - Mengoptimalkan pembagian mata pelajaran Kurikulum Merdeka berdasarkan jenjang kelas (Fase A/B/C: IPAS otomatis aktif untuk kelas 3 ke atas).
* **Dynamic Rombel Dropdown pada Modul Jadwal Pelajaran:**
  - Mengganti daftar kelas statis (*hardcoded*) pada dropdown selektor kelas jadwal (`#jadwal-select-kelas`) dan modal tambah/edit slot (`#jadwal-form-rombel`) dengan data dinamis yang ditarik langsung dari master rombel siswa aktif (`DataStore.getRombels()`).
  - Tetap menyertakan penanda fase kurikulum `(Fase A/B/C)` di samping nama kelas (contoh: *Kelas 1 (Fase A)*, *Kelas 4 (Fase B)*, *Kelas 6 (Fase C)*).
* **Dynamic Rombel Dropdown pada Modul PIP Tab Data Penerima SK:**
  - Mengganti pilihan kelas statis pada filter pencarian penerima SK PIP (`#pip-filter-kelas-penerima`) dengan data dinamis dari master rombel siswa aktif (`DataStore.getRombels()`).
  - Mendukung filter pencocokan nama kelas fleksibel baik berupa angka maupun format teks dengan nama rombel.
* **Sinkronisasi Kalender Hari Libur Nasional, Hari Minggu, & Cuti Bersama:**
  - Mengintegrasikan data hari libur nasional resmi, hari Minggu, dan cuti bersama bersumber langsung dari `https://husniadil.com/calendar/{Tahun}/` (SKB 3 Menteri resmi 2025, 2026, dan 2027) ke dalam master database sekolah (`DEFAULT_SCHOOL_CONFIG.hariLibur`).
  - Mengaktifkan pendeteksian hari libur pada modul absensi siswa (`ModulAbsensi.renderPresensiInputTable`) berupa banner penanda hari libur resmi, serta pada matriks presensi tendik (`ModulPresensi.libur()` dan `hariBulan()`).
  - Menyediakan fungsi sinkronisasi kalender live `syncKalenderHusniAdil(year)` dan endpoint GAS `getCalendarHolidays`.
* **Optimasi QR Code Dokumen & Portal Verifikasi Keabsahan Surat:**
  - Memperbarui tautan verifikasi pada QR Code lembar cetak surat keluar (`assets/js/modul-cetak.js`) menjadi hanya menyertakan nomor surat resmi (`verifikasi.html?no=...`) tanpa parameter NISN (`&nisn=...`).
  - Mengoptimalkan logika pencarian verifikasi (`verifikasi.html`) dengan normalisasi alfanumerik (`norm(s)`), pencarian lintas database agenda surat keluar (`DB_SuratKeluar`), buku register cetak (`SEED_SURAT_KELUAR`), dan permohonan surat terbit (`DB_PermohonanSurat`), sehingga pemindaian barcode fisik melalui kamera smartphone / Google Lens selalu valid dan presisi.
* **Pembaruan Nomor Versi Aplikasi (v2.4.0):**
  - Memperbarui seluruh penanda versi pada seluruh berkas sistem: `index.html` (sidebar badge & footer), `assets/js/app.js`, `assets/js/modul-jadwal.js`, `assets/js/modul-pip.js`, `backend/Code.gs`, `backend/Panduan_Deploy_GAS.md`, dan `README.md`.

### 🚀 Versi 2.3.0 (21 Oktober 2026)
* **Perbaikan Navigasi Seluruh Sub-Tab (Jadwal, PIP, Surat SRIKANDI):**
  - **Modul Jadwal Pelajaran:** Pengaktifan tombol preset Kurikulum Merdeka, cetak A4 Landscape kedinasan, kartu saku (pocket card), serta normalisasi modal editor slot jadwal.
  - **Modul PIP Kemendikbud:** Penataan class `.pip-tab-content` dan `.pip-subtab-btn` sehingga sub-tab Dasbor Analitik, Data Pengusulan Desil, dan Penerima SK PIP berganti secara bersih tanpa penumpukan tabel.
  - **Modul Surat SRIKANDI:** Pemisahan kontainer DOM `view-surat-masuk` dan `view-surat-permohonan`, serta transisi sub-tab ke kontrol native yang sinkron dengan badge hitung permohonan pending ortu.
* **Portal Layanan Mandiri Permohonan Surat Online (`permohonan.html`):**
  - **Pelacakan Resi Cerdas (Smart Receipt Tracking):** Tombol "Lacak Sekarang" pada tanda terima berhasil otomatis memindahkan kode resi ke form pelacakan dan langsung mengeksekusi pencarian multi-layer (LocalStorage + Cloud Apps Script).
  - **Bypass Auth untuk Portal Publik:** Pengecualian verifikasi token login staf pada aksi publik `submitPermohonanSurat` dan `trackPermohonanSurat` di frontend dan backend Apps Script, sehingga orang tua siswa dapat mengajukan surat dan melacak resi tanpa akun login.
  - **Stepper Status Progres:** Pelacakan interaktif real-time dengan tahapan Menunggu Tinjauan, Sedang Diproses TU, hingga Siap Diambil di Sekolah.
* **Backend Google Apps Script (GAS v2.3.0):**
  - Endpoint baru `trackPermohonanSurat` untuk pencarian status berkas berbasis kode resi, NISN, atau no HP.
  - Standardisasi response tiket dan sinkronisasi versi `2.3.0`.

### 🚀 Versi 1.5.1 (20 Oktober 2026)
* **Modul Cetak Surat Mandiri & Format Cetak Resmi:**
  - **Sinkronisasi Identitas Kepala Sekolah:** Sinkronisasi dinamis nama (`Aisah Suciati, S.Pd.SD., M.Pd.`) dan NIP (`19690808 199201 2 002`) dari Pengaturan Sistem, LocalStorage, dan Cloud Google Sheets (`Config`) ke seluruh template cetak surat (PDF/cetak langsung via HP maupun PC).
  - **Perbaikan Interaksi Mode Penomoran:** Mengaktifkan tombol *Nomor Terbit*, *Nomor Baru*, dan *Ketik Manual* secara responsif pada perangkat mobile (HP) dan desktop.
  - **Dukungan Tanda Tangan & Stempel Basah:** Menghapus opsi checkbox tanda tangan/stempel digital dan menyediakan ruang kosong terukur (75px) pada lembar surat agar siap dibubuhi tanda tangan kepala sekolah serta cap stempel basah fisik.
  - **QR Code Terbuka untuk Scanner Kamera HP:** URL barcode verifikasi kini mengarah langsung ke domain publik online GitHub Pages (`https://sdnegeriterlangu01-sd.github.io/SIM-TAS-SD/verifikasi.html`), sehingga dapat langsung dipindai menggunakan aplikasi kamera smartphone biasa / Google Lens tanpa membuka web sistem terlebih dahulu.
* **Portal Verifikasi Dokumen Dinamis ([`verifikasi.html`](verifikasi.html)):**
  - **Deteksi Cerdas Format Surat:** Menyesuaikan data yang tampil berdasarkan jenis surat (Format Kedinasan: Penerima, Jabatan, Perihal, Dasar Surat; Format Siswa: Nama Siswa, NISN, Kelas, Wali).
  - **Refinemen Validasi:** Menghapus penyebutan "NIS/NISN" pada penelusuran nomor surat dinas dan memperbaiki pesan status keabsahan dokumen tidak terdaftar.
* **Optimasi Desain Responsif & Ergonomi Mobile (Smartphone / Tablet):**
  - **Header Navigasi Bebas Overflow:** Menata ulang tata letak header atas (`#app-top-header`) pada viewport mobile (lebar $\le 393px$ seperti iPhone 16) dengan *truncation* nama sekolah cerdas, selektor tahun ajaran ringkas, badge status cloud minimalis, dan tombol aksi cepat ikonik agar tidak saling bertumpuk maupun terpotong.
  - **Dashboard Grid 2x2:** Mengubah kartu metrik utama dashboard menjadi kisi 2 kolom (`grid-cols-2`) dengan padding dan tipografi proporsional, sehingga 4 kartu statistik utama langsung terlihat rapi di layar atas tanpa perlu menggulir (*scrolling*) panjang.
  - **Banner Hero & Tombol Akses Cepat:** Menyesuaikan ukuran teks, spasi, dan tata letak tombol pada banner sambutan beranda agar nyaman disentuh (*touch-friendly*) di smartphone.
  - **Responsif Pratinjau Surat & Notifikasi Toast:** Pratinjau dokumen surat resmi kini menyesuaikan padding layar kecil, dan notifikasi toast mengambang secara adaptif di area aman bawah layar HP.
* **Backend Google Apps Script (GAS v2.1.0):**
  - Penambahan endpoint `getConfig` dan `saveConfig` untuk persistensi konfigurasi sekolah dan identitas kepala sekolah ke tab `Config` spreadsheet secara terpusat.

### 📌 Versi 1.5.0 (20 Oktober 2026)
* **Presensi & Rekap Guru/Tendik:**
  - **Dual Lookup Matching:** Menambahkan pencocokan ganda berbasis NIP bersih dan Nama Bersih (otomatis mengabaikan gelar akademik) sehingga catatan scan barcode datang/pulang selalu terpetakan akurat ke tabel rekap bulanan.
  - **Toggle Rekap Tendik Akun Guru:** Menambahkan tombol alih *"Tampilkan Semua Guru & Tendik"* di tab Presensi Saya agar guru dapat beralih antara melihat presensi mandiri dan rekap sekolah.
* **Navigasi Modular Vue 3 (Sidebar Nav):**
  - Mengatasi kendala menu samping kosong dengan menghubungkan filter `mainMenuItems` dan `settingsMenuItems` secara reaktif ke `store.role`.
* **Dashboard & Manajemen Penugasan Guru Dinamis:**
  - Deteksi cerdas guru kelas (Kelas 1–6) dan guru mata pelajaran (PJOK, PAI, dll.) dari master kepegawaian.
  - Kartu statistik, target rombel, kehadiran harian, dan label profil samping menyesuaikan penugasan guru secara otomatis.
  - Menambahkan fitur **"Edit Akun Pengguna"** pada modal Admin untuk memodifikasi peran, tipe guru, kelas mengajar, dan status keaktifan akun.
* **Portal Verifikasi Keabsahan Dokumen & QR Surat Dinamis:**
  - URL QR Code pada modul cetak surat kini memuat payload mandiri (`?d=...`) sehingga dokumen dapat diverifikasi secara independen dari perangkat manapun (termasuk smartphone luar jaringan lokal).
  - Merombak [`verifikasi.html`](verifikasi.html) menjadi portal interaktif dinamis yang dilengkapi **Pemindai Kamera QR (HTML5-QRCode)** dan pencarian nomor surat manual.

### 📌 Versi 1.4.1
* Pembaruan skema RBAC Supabase dan optimasi modul pencadangan Google Apps Script.
* Penambahan kartu ID QR otomatis dan perbaikan format cetak surat dinas standar SRIKANDI.

---

## 6. Lisensi
Didistribusikan secara bebas & gratis untuk seluruh satuan pendidikan Sekolah Dasar di Indonesia.
