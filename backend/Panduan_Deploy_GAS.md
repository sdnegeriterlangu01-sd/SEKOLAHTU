# Panduan Deploy Backend Google Apps Script (Zero-Cost & Free)
## SEKOLAHTU (Solusi Elektronik Kelola Administrasi & Harmonisasi Tata Usaha) v3.3.4
> **"Kemudahan Pengelolaan Tata Usaha Sekolah dalam Satu Sentuhan"**

Dokumen ini memandu Anda dalam melakukan setup backend Google Apps Script (GAS), Google Sheets, dan Google Drive secara 100% gratis tanpa biaya server/domain apapun.

---

### Langkah 1: Buat Google Spreadsheet Baru
1. Buka [Google Sheets](https://sheets.new) di peramban web Anda.
2. Beri nama spreadsheet: `DATABASE_SEKOLAHTU` (atau `DATABASE_SIM_TAS_SD` jika melanjutkan database lama).
3. Anda tidak perlu membuat tab secara manual, script akan menginisialisasinya secara otomatis.

---

### Langkah 2: Pasang Kode Apps Script
1. Di dalam Google Spreadsheet, klik menu **Ekstensi** > **Apps Script** (`Extensions` > `Apps Script`).
2. Hapus semua kode default di file `Code.gs`.
3. Buka file [`backend/Code.gs`](./Code.gs), salin semua kodenya, dan tempelkan ke editor Apps Script.
4. Klik tombol **Simpan** (ikon disket) atau tekan `Ctrl + S`.

---

### Langkah 3: Inisialisasi Database & Folder Drive Otomatis
1. Pada dropdown fungsi di sebelah tombol "Debug", pilih fungsi **`setupDatabaseAndFolders`**.
2. Klik tombol **Jalankan** (`Run`).
3. Dialog *Otorisasi Diperlukan* akan muncul:
   - Klik **Tinjau Izin** (`Review Permissions`).
   - Pilih akun Google Anda.
   - Klik **Lanjutan** (`Advanced`) di kiri bawah.
   - Klik **Buka Untitled project (tidak aman)** (`Go to Untitled project (unsafe)`).
   - Klik **Izinkan** (`Allow`).
4. Script akan otomatis:
   - Membuat tab tabel lengkap: `DB_Siswa`, `DB_Tendik`, `DB_SuratKeluar`, `DB_SuratMasuk`, `DB_Absensi`, `DB_AbsensiTendik`, `DB_AbsensiSiswaBulan`, `Config`, `DB_JadwalPelajaran`, `DB_PIP_Pengusulan`, `DB_PIP_Penerima`, dan `DB_PermohonanSurat`.
   - Menginisialisasi parameter default `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GAS_API_URL`, dan `IS_CLOUD_MODE` di tab `Config` dan Script Properties.
   - Membuat struktur folder terorganisir di Google Drive:
     ```
     My Drive /
     └── SEKOLAHTU /   (atau SIM-TAS / untuk instalasi sebelumnya)
         ├── Berkas_Siswa /
         ├── Surat_Masuk /
         ├── Surat_Keluar_PDF /
         ├── Template_Surat /
         ├── QR_Tendik /
         └── Backup /
     ```

---

### Langkah 4: Parameter Supabase & Google Apps Script
Kini backend `Code.gs` telah dilengkapi konstanta bawaan untuk URL Supabase dan GAS API. Anda juga dapat mengubah atau menyesuaikannya langsung dari menu **Pengaturan Sistem** pada aplikasi web `index.html` (tersimpan ke `Config` & `Script Properties`).
Jika ingin mengatur properti script secara manual di Apps Script:
1. Di editor Apps Script, klik menu **Pengaturan Project** (ikon roda gigi di menu samping kiri).
2. Gulir ke bawah ke bagian **Properti Script** (`Script Properties`).
3. Masukkan / periksa nilai:
   - Properti: `SUPABASE_URL` | Nilai: URL project Supabase Anda (misal `https://wesuxejtpquzqkojpvpg.supabase.co`)
   - Properti: `SUPABASE_ANON_KEY` | Nilai: Anon public key Supabase Anda
   - Properti: `GAS_API_URL` | Nilai: Web App URL hasil deployment Anda
4. Klik **Simpan properti script**.

---

### Langkah 5: Publikasikan sebagai Web App (Penerapan Baru atau Update Versi)
1. Di pojok kanan atas Apps Script:
   - **Jika baru pertama kali:** Klik **Terapkan** > **Penerapan Baru** (`Deploy` > `New deployment`), pilih jenis **Aplikasi Web** (`Web app`).
   - **Jika memperbarui kode (Update v3.3.4):** Klik **Terapkan** > **Kelola Penerapan** (`Deploy` > `Manage deployments`), klik ikon pensil (Edit), pilih **Versi: Versi Baru** (`New version`), lalu klik **Terapkan** (`Deploy`).
2. Konfigurasikan:
   - **Deskripsi**: `SEKOLAHTU Production API v3.3.4 (Normalisasi Jam Jadwal Google Sheets, Monitoring Dashboard & Dark Mode Harmonization)`
   - **Jalankan sebagai**: `Saya (emailanda@gmail.com)`
   - **Siapa yang memiliki akses**: `Semua orang` (**Anyone**) *(Penting agar aplikasi frontend dapat berinteraksi tanpa kendala).*
3. Klik **Terapkan** (`Deploy`).
4. Salin **URL Aplikasi Web** yang muncul (formatnya: `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Langkah 6: Hubungkan ke Frontend SEKOLAHTU
1. Buka file `assets/js/config.js` di direktori proyek Anda.
2. Tempelkan URL Web App pada konstanta `GAS_API_URL`.
3. Buka aplikasi web `index.html`, masuk ke menu **Pengaturan Sistem**, lalu klik **Uji Koneksi API** untuk memastikan status cloud telah aktif (berwarna hijau).
