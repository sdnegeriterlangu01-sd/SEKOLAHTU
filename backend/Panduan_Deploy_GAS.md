# Panduan Deploy Backend Google Apps Script (Zero-Cost & Free)
## SIM-TAS-SD (Sistem Informasi Manajemen Tata Usaha Administrasi Sekolah Dasar) v2.0

Dokumen ini memandu Anda dalam melakukan setup backend Google Apps Script (GAS), Google Sheets, dan Google Drive secara 100% gratis tanpa biaya server/domain apapun.

---

### Langkah 1: Buat Google Spreadsheet Baru
1. Buka [Google Sheets](https://sheets.new) di peramban web Anda.
2. Beri nama spreadsheet: `DATABASE_SIM_TAS_SD`.
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
   - Membuat tab tabel lengkap: `DB_Siswa`, `DB_Tendik`, `DB_SuratKeluar`, `DB_SuratMasuk`, `DB_Absensi`, `DB_AbsensiTendik`, `DB_AbsensiSiswaBulan`, dan `Config`.
   - Membuat struktur folder terorganisir di Google Drive:
     ```
     My Drive /
     └── SIM-TAS /
         ├── Berkas_Siswa /
         ├── Surat_Masuk /
         ├── Surat_Keluar_PDF /
         ├── Template_Surat /
         ├── QR_Tendik /
         └── Backup /
     ```

---

### Langkah 4: Atur Parameter Supabase (Opsional tapi Direkomendasikan)
Untuk mengaktifkan verifikasi token Zero Trust di sisi server:
1. Di editor Apps Script, klik menu **Pengaturan Project** (ikon roda gigi di menu samping kiri).
2. Gulir ke bawah ke bagian **Properti Script** (`Script Properties`).
3. Klik **Tambahkan properti script** dan masukkan:
   - Properti: `SUPABASE_URL` | Nilai: URL project Supabase Anda (misal `https://xyzcompany.supabase.co`)
   - Properti: `SUPABASE_ANON_KEY` | Nilai: Anon public key Supabase Anda
4. Klik **Simpan properti script**.

---

### Langkah 5: Publikasikan sebagai Web App
1. Di pojok kanan atas Apps Script, klik tombol **Terapkan** > **Penerapan Baru** (`Deploy` > `New deployment`).
2. Klik ikon gerigi (Pilih jenis penerapan) > pilih **Aplikasi Web** (`Web app`).
3. Konfigurasikan:
   - **Deskripsi**: `SIM-TAS-SD Production API v2`
   - **Jalankan sebagai**: `Saya (emailanda@gmail.com)`
   - **Siapa yang memiliki akses**: `Siapa saja` (**Anyone**) *(Penting agar aplikasi frontend dapat berinteraksi tanpa kendala).*
4. Klik **Terapkan** (`Deploy`).
5. Salin **URL Aplikasi Web** yang muncul (formatnya: `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Langkah 6: Hubungkan ke Frontend SIM-TAS-SD
1. Buka file `assets/js/config.js` di direktori proyek SIM-TAS-SD Anda.
2. Tempelkan URL Web App pada konstanta `GAS_API_URL`.
3. Buka aplikasi web `index.html`, masuk ke menu **Pengaturan Sistem**, lalu klik **Uji Koneksi API** untuk memastikan status cloud telah aktif (berwarna hijau).
