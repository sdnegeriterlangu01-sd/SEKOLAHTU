/* ==========================================================================
   SIM-TAS-SD: SISTEM INFORMASI MANAJEMEN TATA USAHA SEKOLAH DASAR
   Initial Master Seed Data & LocalStorage Management (Fallback & Demo Mode)
   ========================================================================== */

const DEFAULT_SCHOOL_CONFIG = {
    namaSekolah: "SD NEGERI TERLANGU 01",
    npsn: "20326713",
    statusSekolah: "Negeri",
    akreditasi: "B",
    alamat: "Jl. Raya Terlangu, Desa Terlangu",
    kecamatan: "Kecamatan Brebes",
    kabupatenKota: "Kabupaten Brebes",
    provinsi: "Jawa Tengah",
    kodePos: "52219",
    telepon: "-",
    email: "sdnterlangu01@gmail.com",
    website: "", // Kosong secara default jika belum ada website resmi
    namaKepalaSekolah: "Aisah Suciati, S.Pd.SD., M.Pd.",
    nipKepalaSekolah: "19690808 199201 2 002",
    pangkatGolongan: "Pembina / IV-a",
    supabaseUrl: (typeof window !== "undefined" && window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.SUPABASE_URL) ? window.SIMTAS_CONFIG.SUPABASE_URL : "https://wesuxejtpquzqkojpvpg.supabase.co",
    supabaseAnonKey: (typeof window !== "undefined" && window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.SUPABASE_ANON_KEY) ? window.SIMTAS_CONFIG.SUPABASE_ANON_KEY : "sb_publishable_fz1vTJMm99C7PPNsCKjS_g_dt2DfhVa",
    gasApiUrl: (typeof window !== "undefined" && window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.GAS_API_URL) ? window.SIMTAS_CONFIG.GAS_API_URL : "https://script.google.com/macros/s/AKfycby8iGSmXP0R6ytEtzWLCcrp7FZQVQQFORaS1KqCsKuNEXrAQ9-JnAZtmkz0mSITSaFM/exec",
    isCloudMode: true,
    // --- Periodik Tahun Ajaran ---
    tahunAjaranAktif: "",   // diisi otomatis (mis. "2026/2027")
    daftarTahunAjaran: [],
    // --- Kalender Libur Nasional & Cuti Bersama (Sumber: https://husniadil.com/calendar/{Tahun}/ sesuai SKB 3 Menteri) ---
    hariLibur: [
        // 2025
        { tanggal: "2025-01-01", ket: "Tahun Baru Masehi" },
        { tanggal: "2025-01-27", ket: "Isra' Mi'raj Nabi Muhammad SAW" },
        { tanggal: "2025-01-28", ket: "Cuti Bersama Imlek" },
        { tanggal: "2025-01-29", ket: "Tahun Baru Imlek 2576 Kongzili" },
        { tanggal: "2025-03-28", ket: "Cuti Bersama Nyepi" },
        { tanggal: "2025-03-29", ket: "Hari Raya Nyepi Tahun Baru Saka 1947" },
        { tanggal: "2025-03-31", ket: "Hari Raya Idul Fitri 1446 H" },
        { tanggal: "2025-04-01", ket: "Hari Raya Idul Fitri 1446 H" },
        { tanggal: "2025-04-02", ket: "Cuti Bersama Idul Fitri" },
        { tanggal: "2025-04-03", ket: "Cuti Bersama Idul Fitri" },
        { tanggal: "2025-04-04", ket: "Cuti Bersama Idul Fitri" },
        { tanggal: "2025-04-07", ket: "Cuti Bersama Idul Fitri" },
        { tanggal: "2025-04-18", ket: "Wafat Yesus Kristus (Jumat Agung)" },
        { tanggal: "2025-04-20", ket: "Kebangkitan Yesus Kristus (Paskah)" },
        { tanggal: "2025-05-01", ket: "Hari Buruh Internasional" },
        { tanggal: "2025-05-12", ket: "Hari Raya Waisak 2569 BE" },
        { tanggal: "2025-05-13", ket: "Cuti Bersama Waisak" },
        { tanggal: "2025-05-29", ket: "Kenaikan Yesus Kristus" },
        { tanggal: "2025-05-30", ket: "Cuti Bersama Kenaikan Yesus Kristus" },
        { tanggal: "2025-06-01", ket: "Hari Lahir Pancasila" },
        { tanggal: "2025-06-06", ket: "Hari Raya Idul Adha 1446 H" },
        { tanggal: "2025-06-09", ket: "Cuti Bersama Idul Adha" },
        { tanggal: "2025-06-27", ket: "Tahun Baru Islam 1447 H" },
        { tanggal: "2025-08-17", ket: "Hari Kemerdekaan Republik Indonesia" },
        { tanggal: "2025-08-18", ket: "Cuti Bersama Kemerdekaan Republik Indonesia" },
        { tanggal: "2025-09-05", ket: "Maulid Nabi Muhammad SAW" },
        { tanggal: "2025-12-25", ket: "Hari Raya Natal" },
        { tanggal: "2025-12-26", ket: "Cuti Bersama Natal" },
        // 2026
        { tanggal: "2026-01-01", ket: "Tahun Baru Masehi" },
        { tanggal: "2026-01-16", ket: "Isra' Mi'raj Nabi Muhammad SAW" },
        { tanggal: "2026-02-16", ket: "Cuti Bersama Imlek" },
        { tanggal: "2026-02-17", ket: "Tahun Baru Imlek 2577 Kongzili" },
        { tanggal: "2026-03-18", ket: "Cuti Bersama Nyepi" },
        { tanggal: "2026-03-19", ket: "Hari Raya Nyepi Tahun Baru Saka 1948" },
        { tanggal: "2026-03-20", ket: "Cuti Bersama Idul Fitri" },
        { tanggal: "2026-03-21", ket: "Hari Raya Idul Fitri 1447 H" },
        { tanggal: "2026-03-22", ket: "Hari Raya Idul Fitri 1447 H" },
        { tanggal: "2026-03-23", ket: "Cuti Bersama Idul Fitri" },
        { tanggal: "2026-03-24", ket: "Cuti Bersama Idul Fitri" },
        { tanggal: "2026-04-03", ket: "Wafat Yesus Kristus (Jumat Agung)" },
        { tanggal: "2026-04-05", ket: "Kebangkitan Yesus Kristus (Paskah)" },
        { tanggal: "2026-05-01", ket: "Hari Buruh Internasional" },
        { tanggal: "2026-05-14", ket: "Kenaikan Yesus Kristus" },
        { tanggal: "2026-05-15", ket: "Cuti Bersama Kenaikan Yesus Kristus" },
        { tanggal: "2026-05-27", ket: "Hari Raya Idul Adha 1447 H" },
        { tanggal: "2026-05-28", ket: "Cuti Bersama Idul Adha" },
        { tanggal: "2026-05-31", ket: "Hari Raya Waisak 2570 BE" },
        { tanggal: "2026-06-01", ket: "Hari Lahir Pancasila" },
        { tanggal: "2026-06-16", ket: "Tahun Baru Islam 1448 H" },
        { tanggal: "2026-08-17", ket: "Hari Kemerdekaan Republik Indonesia" },
        { tanggal: "2026-08-25", ket: "Maulid Nabi Muhammad SAW" },
        { tanggal: "2026-12-24", ket: "Cuti Bersama Natal" },
        { tanggal: "2026-12-25", ket: "Hari Raya Natal" },
        // 2027
        { tanggal: "2027-01-01", ket: "Tahun Baru Masehi" },
        { tanggal: "2027-02-05", ket: "Isra' Mi'raj Nabi Muhammad SAW" },
        { tanggal: "2027-02-06", ket: "Tahun Baru Imlek 2578 Kongzili" },
        { tanggal: "2027-03-09", ket: "Hari Raya Nyepi Tahun Baru Saka 1949" },
        { tanggal: "2027-03-10", ket: "Hari Raya Idul Fitri 1448 H" },
        { tanggal: "2027-03-11", ket: "Hari Raya Idul Fitri 1448 H" },
        { tanggal: "2027-03-26", ket: "Wafat Yesus Kristus (Jumat Agung)" },
        { tanggal: "2027-03-28", ket: "Kebangkitan Yesus Kristus (Paskah)" },
        { tanggal: "2027-05-01", ket: "Hari Buruh Internasional" },
        { tanggal: "2027-05-06", ket: "Kenaikan Yesus Kristus" },
        { tanggal: "2027-05-17", ket: "Hari Raya Idul Adha 1448 H" },
        { tanggal: "2027-05-20", ket: "Hari Raya Waisak 2571 BE" },
        { tanggal: "2027-06-01", ket: "Hari Lahir Pancasila" },
        { tanggal: "2027-06-06", ket: "Tahun Baru Islam 1449 H" },
        { tanggal: "2027-08-15", ket: "Maulid Nabi Muhammad SAW" },
        { tanggal: "2027-08-17", ket: "Hari Kemerdekaan Republik Indonesia" },
        { tanggal: "2027-12-25", ket: "Hari Raya Natal" }
    ],
    scanMinGapMenit: 30     // jarak minimal scan datang -> pulang
};

// Klasifikasi Arsip Baku Surat Dinas Pendidikan (Adopsi SRIKANDI / Permendikbudristek)
const KODE_KLASIFIKASI_SURAT = [
    { kode: "421", nama: "Pendidikan Dasar & Kebudayaan Umum" },
    { kode: "421.2", nama: "Administrasi Sekolah Dasar (SD)" },
    { kode: "421.3", nama: "Kurikulum, Pembelajaran & Ujian" },
    { kode: "421.7", nama: "Kesiswaan, Ekstrakurikuler & Prestasi" },
    { kode: "428", nama: "Kepramukaan" },
    { kode: "800", nama: "Kepegawaian Guru & Tenaga Kependidikan" },
    { kode: "005", nama: "Undangan Pertemuan / Rapat Dinas / Komite" },
    { kode: "090", nama: "Perjalanan Dinas (SPPD) & Tugas Guru" },
    { kode: "900", nama: "Keuangan, Anggaran & Dana BOS" },
    { kode: "020", nama: "Peralatan, Sarana Prasarana & Aset Sekolah" }
];

// Data Pokok Siswa Contoh Realistis
const SEED_SISWA = [
    {
        nisn: "0134567890",
        nis: "20240101",
        nama: "Ahmad Rayhan Pratama",
        nik: "3329091205140001",
        noKk: "3329091204080002",
        tglTerbitKk: "15 Januari 2021",
        tempatLahir: "Brebes",
        tanggalLahir: "2014-05-12",
        jk: "Laki-laki",
        kelas: "5",
        namaOrtu: "Bambang Pratama",
        pekerjaanOrtu: "Wiraswasta",
        noHp: "081234567891",
        alamat: "Jl. Raya Terlangu RT 02/RW 01, Terlangu",
        berkas: {
            kk: { uploaded: true, filename: "0134567890_KK_2026.pdf", date: "2026-02-10", url: "https://drive.google.com/file/d/sample-kk-ahmad/view" },
            akta: { uploaded: true, filename: "0134567890_AKTA_2026.pdf", date: "2026-02-10", url: "https://drive.google.com/file/d/sample-akta-ahmad/view" },
            kip: { uploaded: true, filename: "0134567890_KIP_2026.pdf", date: "2026-02-12", url: "https://drive.google.com/file/d/sample-kip-ahmad/view" },
            foto: { uploaded: true, filename: "0134567890_FOTO_3x4.jpg", date: "2026-02-10", url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80" }
        }
    },
    {
        nisn: "0142345678",
        nis: "20240102",
        nama: "Siti Nur Haliza",
        nik: "3329095609140003",
        noKk: "3329091204080005",
        tglTerbitKk: "20 Februari 2020",
        tempatLahir: "Brebes",
        tanggalLahir: "2014-09-16",
        jk: "Perempuan",
        kelas: "5",
        namaOrtu: "Muhammad Halim",
        pekerjaanOrtu: "Pegawai Negeri Sipil (PNS)",
        noHp: "081398765432",
        alamat: "Desa Terlangu RT 03/RW 01, Terlangu",
        berkas: {
            kk: { uploaded: true, filename: "0142345678_KK_2026.pdf", date: "2026-01-15", url: "https://drive.google.com/file/d/sample-kk-siti/view" },
            akta: { uploaded: true, filename: "0142345678_AKTA_2026.pdf", date: "2026-01-15", url: "https://drive.google.com/file/d/sample-akta-siti/view" },
            kip: { uploaded: false, filename: null, date: null, url: null },
            foto: { uploaded: true, filename: "0142345678_FOTO_3x4.jpg", date: "2026-01-15", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80" }
        }
    },
    {
        nisn: "0151122334",
        nis: "20250115",
        nama: "Bima Arya Wijaya",
        nik: "3329090301150002",
        noKk: "3329091005120008",
        tglTerbitKk: "08 Mei 2022",
        tempatLahir: "Brebes",
        tanggalLahir: "2015-01-03",
        jk: "Laki-laki",
        kelas: "4",
        namaOrtu: "Danang Wijaya",
        pekerjaanOrtu: "Karyawan Swasta",
        noHp: "082155667788",
        alamat: "Dukuh Sigempol RT 01/RW 03, Terlangu",
        berkas: {
            kk: { uploaded: true, filename: "0151122334_KK_2026.pdf", date: "2026-03-01", url: "https://drive.google.com/file/d/sample-kk-bima/view" },
            akta: { uploaded: true, filename: "0151122334_AKTA_2026.pdf", date: "2026-03-01", url: "https://drive.google.com/file/d/sample-akta-bima/view" },
            kip: { uploaded: false, filename: null, date: null, url: null },
            foto: { uploaded: true, filename: "0151122334_FOTO_3x4.jpg", date: "2026-03-01", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80" }
        }
    },
    {
        nisn: "0169876543",
        nis: "20250201",
        nama: "Dewi Lestari Putri",
        nik: "3329096708150005",
        noKk: "3329091508110003",
        tglTerbitKk: "12 Agustus 2019",
        tempatLahir: "Brebes",
        tanggalLahir: "2015-08-27",
        jk: "Perempuan",
        kelas: "4",
        namaOrtu: "Agus Santosa",
        pekerjaanOrtu: "Petani / Buruh",
        noHp: "085712345678",
        alamat: "Desa Terlangu RT 04/RW 02, Brebes",
        berkas: {
            kk: { uploaded: true, filename: "0169876543_KK_2026.pdf", date: "2026-02-20", url: "https://drive.google.com/file/d/sample-kk-dewi/view" },
            akta: { uploaded: false, filename: null, date: null, url: null },
            kip: { uploaded: true, filename: "0169876543_KIP_2026.pdf", date: "2026-02-20", url: "https://drive.google.com/file/d/sample-kip-dewi/view" },
            foto: { uploaded: true, filename: "0169876543_FOTO_3x4.jpg", date: "2026-02-20", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80" }
        }
    },
    {
        nisn: "0172233445",
        nis: "20260010",
        nama: "Muhammad Faiz Al-Fatih",
        nik: "3329091403160004",
        noKk: "3329092209140001",
        tglTerbitKk: "10 September 2021",
        tempatLahir: "Brebes",
        tanggalLahir: "2016-03-14",
        jk: "Laki-laki",
        kelas: "3",
        namaOrtu: "Farhan Hakim",
        pekerjaanOrtu: "Guru",
        noHp: "081299887766",
        alamat: "Jl. Pemuda No. 12, Terlangu",
        berkas: {
            kk: { uploaded: true, filename: "0172233445_KK_2026.pdf", date: "2026-01-05", url: "https://drive.google.com/file/d/sample-kk-faiz/view" },
            akta: { uploaded: true, filename: "0172233445_AKTA_2026.pdf", date: "2026-01-05", url: "https://drive.google.com/file/d/sample-akta-faiz/view" },
            kip: { uploaded: false, filename: null, date: null, url: null },
            foto: { uploaded: true, filename: "0172233445_FOTO_3x4.jpg", date: "2026-01-05", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80" }
        }
    },
    {
        nisn: "0185566778",
        nis: "20260025",
        nama: "Zahra Anindya Kirana",
        nik: "3329096511170001",
        noKk: "3329090104160007",
        tglTerbitKk: "18 Oktober 2022",
        tempatLahir: "Brebes",
        tanggalLahir: "2017-11-25",
        jk: "Perempuan",
        kelas: "2",
        namaOrtu: "Dodi Kirana",
        pekerjaanOrtu: "Wiraswasta",
        noHp: "081322446688",
        alamat: "Desa Terlangu RT 01/RW 01",
        berkas: {
            kk: { uploaded: true, filename: "0185566778_KK_2026.pdf", date: "2026-02-18", url: "https://drive.google.com/file/d/sample-kk-zahra/view" },
            akta: { uploaded: true, filename: "0185566778_AKTA_2026.pdf", date: "2026-02-18", url: "https://drive.google.com/file/d/sample-akta-zahra/view" },
            kip: { uploaded: true, filename: "0185566778_KIP_2026.pdf", date: "2026-02-18", url: "https://drive.google.com/file/d/sample-kip-zahra/view" },
            foto: { uploaded: true, filename: "0185566778_FOTO_3x4.jpg", date: "2026-02-18", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80" }
        }
    },
    {
        nisn: "0199988776",
        nis: "20260040",
        nama: "Kenzo Rafandra Pratama",
        nik: "3329091808180002",
        noKk: "",
        tglTerbitKk: "",
        tempatLahir: "Brebes",
        tanggalLahir: "2018-08-18",
        jk: "Laki-laki",
        kelas: "1",
        namaOrtu: "Rudi Pratama",
        pekerjaanOrtu: "Karyawan BUMN",
        noHp: "085233669911",
        alamat: "Desa Terlangu RT 05/RW 02",
        berkas: {
            kk: { uploaded: false, filename: null, date: null, url: null },
            akta: { uploaded: true, filename: "0199988776_AKTA_2026.pdf", date: "2026-03-10", url: "https://drive.google.com/file/d/sample-akta-kenzo/view" },
            kip: { uploaded: false, filename: null, date: null, url: null },
            foto: { uploaded: false, filename: null, date: null, url: null }
        }
    },
    {
        nisn: "0123344556",
        nis: "20230005",
        nama: "Nabila Syakira Ramadhani",
        nik: "3329095007130007",
        noKk: "3329091402100004",
        tglTerbitKk: "05 Maret 2021",
        tempatLahir: "Brebes",
        tanggalLahir: "2013-07-10",
        jk: "Perempuan",
        kelas: "6",
        namaOrtu: "Irwan Ramadhani",
        pekerjaanOrtu: "Arsitek",
        noHp: "081267890123",
        alamat: "Jl. Flamboyan Terlangu No. 5",
        berkas: {
            kk: { uploaded: true, filename: "0123344556_KK_2026.pdf", date: "2026-01-20", url: "https://drive.google.com/file/d/sample-kk-nabila/view" },
            akta: { uploaded: true, filename: "0123344556_AKTA_2026.pdf", date: "2026-01-20", url: "https://drive.google.com/file/d/sample-akta-nabila/view" },
            kip: { uploaded: false, filename: null, date: null, url: null },
            foto: { uploaded: true, filename: "0123344556_FOTO_3x4.jpg", date: "2026-01-20", url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80" }
        }
    }
];

// Seed Matriks Jadwal Pelajaran (Senin s/d Sabtu, Jam 1-8 per kelas)
const SEED_JADWAL = [
    // Kelas 1 (Guru: Dewi Kurniasih, S.Pd.)
    { id: "JDW-1-SEN-1", kelas: "1", hari: "Senin", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Upacara Bendera", guru: "Dewi Kurniasih, S.Pd.", nip: "19960719 202301 2 009" },
    { id: "JDW-1-SEN-2", kelas: "1", hari: "Senin", jamKe: 2, waktuMulai: "07:35", waktuSelesai: "08:10", mapel: "Pendidikan Pancasila", guru: "Dewi Kurniasih, S.Pd.", nip: "19960719 202301 2 009" },
    { id: "JDW-1-SEN-3", kelas: "1", hari: "Senin", jamKe: 3, waktuMulai: "08:10", waktuSelesai: "08:45", mapel: "Bahasa Indonesia", guru: "Dewi Kurniasih, S.Pd.", nip: "19960719 202301 2 009" },
    { id: "JDW-1-SEN-4", kelas: "1", hari: "Senin", jamKe: 4, waktuMulai: "09:05", waktuSelesai: "09:40", mapel: "Bahasa Indonesia", guru: "Dewi Kurniasih, S.Pd.", nip: "19960719 202301 2 009" },
    { id: "JDW-1-SEN-5", kelas: "1", hari: "Senin", jamKe: 5, waktuMulai: "09:40", waktuSelesai: "10:15", mapel: "Matematika", guru: "Dewi Kurniasih, S.Pd.", nip: "19960719 202301 2 009" },
    { id: "JDW-1-SEL-1", kelas: "1", hari: "Selasa", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Pendidikan Agama Islam", guru: "Siti Fatimah, S.Pd.I", nip: "19910214 201708 2 004" },
    { id: "JDW-1-SEL-2", kelas: "1", hari: "Selasa", jamKe: 2, waktuMulai: "07:35", waktuSelesai: "08:10", mapel: "Pendidikan Agama Islam", guru: "Siti Fatimah, S.Pd.I", nip: "19910214 201708 2 004" },
    { id: "JDW-1-SEL-3", kelas: "1", hari: "Selasa", jamKe: 3, waktuMulai: "08:10", waktuSelesai: "08:45", mapel: "Bahasa Indonesia", guru: "Dewi Kurniasih, S.Pd.", nip: "19960719 202301 2 009" },
    { id: "JDW-1-RAB-1", kelas: "1", hari: "Rabu", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "PJOK", guru: "Agus Triyono, S.Pd.Jas", nip: "19850904 201001 1 015" },
    { id: "JDW-1-RAB-2", kelas: "1", hari: "Rabu", jamKe: 2, waktuMulai: "07:35", waktuSelesai: "08:10", mapel: "PJOK", guru: "Agus Triyono, S.Pd.Jas", nip: "19850904 201001 1 015" },
    { id: "JDW-1-KAM-1", kelas: "1", hari: "Kamis", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Matematika", guru: "Dewi Kurniasih, S.Pd.", nip: "19960719 202301 2 009" },
    { id: "JDW-1-JUM-1", kelas: "1", hari: "Jumat", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Senam Pagi & Kebersihan", guru: "Dewi Kurniasih, S.Pd.", nip: "19960719 202301 2 009" },
    { id: "JDW-1-SAB-1", kelas: "1", hari: "Sabtu", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Pramuka Siaga / Seni Budaya", guru: "Dewi Kurniasih, S.Pd.", nip: "19960719 202301 2 009" },

    // Kelas 4 (Guru: Endang Susilowati, S.Pd.)
    { id: "JDW-4-SEN-1", kelas: "4", hari: "Senin", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Upacara Bendera", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },
    { id: "JDW-4-SEN-2", kelas: "4", hari: "Senin", jamKe: 2, waktuMulai: "07:35", waktuSelesai: "08:10", mapel: "Bahasa Indonesia", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },
    { id: "JDW-4-SEN-3", kelas: "4", hari: "Senin", jamKe: 3, waktuMulai: "08:10", waktuSelesai: "08:45", mapel: "Bahasa Indonesia", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },
    { id: "JDW-4-SEN-4", kelas: "4", hari: "Senin", jamKe: 4, waktuMulai: "09:05", waktuSelesai: "09:40", mapel: "IPAS (Ilmu Pengetahuan Alam & Sosial)", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },
    { id: "JDW-4-SEN-5", kelas: "4", hari: "Senin", jamKe: 5, waktuMulai: "09:40", waktuSelesai: "10:15", mapel: "IPAS", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },
    { id: "JDW-4-SEL-1", kelas: "4", hari: "Selasa", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Matematika", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },
    { id: "JDW-4-SEL-2", kelas: "4", hari: "Selasa", jamKe: 2, waktuMulai: "07:35", waktuSelesai: "08:10", mapel: "Matematika", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },
    { id: "JDW-4-SEL-3", kelas: "4", hari: "Selasa", jamKe: 3, waktuMulai: "08:10", waktuSelesai: "08:45", mapel: "Pendidikan Agama Islam", guru: "Siti Fatimah, S.Pd.I", nip: "19910214 201708 2 004" },
    { id: "JDW-4-SEL-4", kelas: "4", hari: "Selasa", jamKe: 4, waktuMulai: "09:05", waktuSelesai: "09:40", mapel: "Pendidikan Agama Islam", guru: "Siti Fatimah, S.Pd.I", nip: "19910214 201708 2 004" },
    { id: "JDW-4-RAB-1", kelas: "4", hari: "Rabu", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "PJOK", guru: "Agus Triyono, S.Pd.Jas", nip: "19850904 201001 1 015" },
    { id: "JDW-4-RAB-2", kelas: "4", hari: "Rabu", jamKe: 2, waktuMulai: "07:35", waktuSelesai: "08:10", mapel: "PJOK", guru: "Agus Triyono, S.Pd.Jas", nip: "19850904 201001 1 015" },
    { id: "JDW-4-RAB-3", kelas: "4", hari: "Rabu", jamKe: 3, waktuMulai: "08:10", waktuSelesai: "08:45", mapel: "Bahasa Jawa", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },
    { id: "JDW-4-KAM-1", kelas: "4", hari: "Kamis", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Pendidikan Pancasila", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },
    { id: "JDW-4-KAM-2", kelas: "4", hari: "Kamis", jamKe: 2, waktuMulai: "07:35", waktuSelesai: "08:10", mapel: "Seni Rupa / Budaya", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },
    { id: "JDW-4-JUM-1", kelas: "4", hari: "Jumat", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Senam Kesegaran Jasmani & Dhuha", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },
    { id: "JDW-4-JUM-2", kelas: "4", hari: "Jumat", jamKe: 2, waktuMulai: "07:35", waktuSelesai: "08:10", mapel: "Projek P5 (Kearifan Lokal)", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },
    { id: "JDW-4-SAB-1", kelas: "4", hari: "Sabtu", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Bahasa Inggris", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },
    { id: "JDW-4-SAB-2", kelas: "4", hari: "Sabtu", jamKe: 2, waktuMulai: "07:35", waktuSelesai: "08:10", mapel: "Pramuka Penggalang", guru: "Endang Susilowati, S.Pd.", nip: "19890115 201101 2 012" },

    // Kelas 5 (Guru: Budi Hartono, S.Pd.)
    { id: "JDW-5-SEN-1", kelas: "5", hari: "Senin", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Upacara Bendera", guru: "Budi Hartono, S.Pd.", nip: "19820820 200604 1 008" },
    { id: "JDW-5-SEN-2", kelas: "5", hari: "Senin", jamKe: 2, waktuMulai: "07:35", waktuSelesai: "08:10", mapel: "Matematika", guru: "Budi Hartono, S.Pd.", nip: "19820820 200604 1 008" },
    { id: "JDW-5-SEN-3", kelas: "5", hari: "Senin", jamKe: 3, waktuMulai: "08:10", waktuSelesai: "08:45", mapel: "Matematika", guru: "Budi Hartono, S.Pd.", nip: "19820820 200604 1 008" },
    { id: "JDW-5-SEN-4", kelas: "5", hari: "Senin", jamKe: 4, waktuMulai: "09:05", waktuSelesai: "09:40", mapel: "IPAS", guru: "Budi Hartono, S.Pd.", nip: "19820820 200604 1 008" },
    { id: "JDW-5-SEL-1", kelas: "5", hari: "Selasa", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Bahasa Indonesia", guru: "Budi Hartono, S.Pd.", nip: "19820820 200604 1 008" },
    { id: "JDW-5-SEL-2", kelas: "5", hari: "Selasa", jamKe: 2, waktuMulai: "07:35", waktuSelesai: "08:10", mapel: "Bahasa Indonesia", guru: "Budi Hartono, S.Pd.", nip: "19820820 200604 1 008" },
    { id: "JDW-5-RAB-1", kelas: "5", hari: "Rabu", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Pendidikan Agama Islam", guru: "Siti Fatimah, S.Pd.I", nip: "19910214 201708 2 004" },
    { id: "JDW-5-RAB-2", kelas: "5", hari: "Rabu", jamKe: 2, waktuMulai: "07:35", waktuSelesai: "08:10", mapel: "Pendidikan Agama Islam", guru: "Siti Fatimah, S.Pd.I", nip: "19910214 201708 2 004" },
    { id: "JDW-5-KAM-1", kelas: "5", hari: "Kamis", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "PJOK", guru: "Agus Triyono, S.Pd.Jas", nip: "19850904 201001 1 015" },
    { id: "JDW-5-KAM-2", kelas: "5", hari: "Kamis", jamKe: 2, waktuMulai: "07:35", waktuSelesai: "08:10", mapel: "PJOK", guru: "Agus Triyono, S.Pd.Jas", nip: "19850904 201001 1 015" },
    { id: "JDW-5-JUM-1", kelas: "5", hari: "Jumat", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "P5 & Pembiasaan Karakter", guru: "Budi Hartono, S.Pd.", nip: "19820820 200604 1 008" },
    { id: "JDW-5-SAB-1", kelas: "5", hari: "Sabtu", jamKe: 1, waktuMulai: "07:00", waktuSelesai: "07:35", mapel: "Pramuka / Ekstrakurikuler", guru: "Budi Hartono, S.Pd.", nip: "19820820 200604 1 008" }
];

// Seed Data Pengusulan PIP (Sesuai format Dapodik/Puslapdik 2026 SDN Terlangu 01)
const SEED_PIP_PENGUSULAN = [
    {
        nisn: "0169876543",
        nama: "Dewi Lestari Putri",
        kelas: "4",
        namaFase: "Fase B",
        desil: 1,
        skAtasNama: "Dewi Lestari Putri (Siswa)",
        statusSK: "Sudah SK",
        tahunUsulan: "2026",
        catatanDapodik: "Pemegang KIP Aktif / Desil 1 (Sangat Miskin Ekstrem)"
    },
    {
        nisn: "0134567890",
        nama: "Ahmad Rayhan Pratama",
        kelas: "5",
        namaFase: "Fase C",
        desil: 2,
        skAtasNama: "Ahmad Rayhan Pratama (Siswa)",
        statusSK: "Sudah SK",
        tahunUsulan: "2026",
        catatanDapodik: "Padan DTKS Kemensos - Desil 2"
    },
    {
        nisn: "0185566778",
        nama: "Zahra Anindya Kirana",
        kelas: "2",
        namaFase: "Fase A",
        desil: 2,
        skAtasNama: "Zahra Anindya Kirana (Siswa)",
        statusSK: "Sudah SK",
        tahunUsulan: "2026",
        catatanDapodik: "KIP Jenjang SD - Desil 2"
    },
    {
        nisn: "0151122334",
        nama: "Bima Arya Wijaya",
        kelas: "4",
        namaFase: "Fase B",
        desil: 3,
        skAtasNama: "Bima Arya Wijaya (Siswa)",
        statusSK: "Sudah SK",
        tahunUsulan: "2026",
        catatanDapodik: "P3KE Desil 3 / Usulan Sekolah"
    },
    {
        nisn: "0142345678",
        nama: "Siti Nur Haliza",
        kelas: "5",
        namaFase: "Fase C",
        desil: 4,
        skAtasNama: "Siti Nur Haliza (Siswa)",
        statusSK: "Sudah SK",
        tahunUsulan: "2026",
        catatanDapodik: "P3KE Desil 4 (Prioritas 1)"
    },
    {
        nisn: "0199988776",
        nama: "Kenzo Rafandra Pratama",
        kelas: "1",
        namaFase: "Fase A",
        desil: 5,
        skAtasNama: "Rudi Pratama (Orang Tua)",
        statusSK: "Belum Masuk SK",
        tahunUsulan: "2026",
        catatanDapodik: "Rentan Miskin - Menunggu Validasi Kuota Tambahan"
    },
    {
        nisn: "0172233445",
        nama: "Muhammad Faiz Al-Fatih",
        kelas: "3",
        namaFase: "Fase B",
        desil: 6,
        skAtasNama: "Farhan Hakim (Orang Tua)",
        statusSK: "Belum Masuk SK",
        tahunUsulan: "2026",
        catatanDapodik: "Rentan Miskin Desil 6"
    },
    {
        nisn: "0123344556",
        nama: "Nabila Syakira Ramadhani",
        kelas: "6",
        namaFase: "Fase C",
        desil: 8,
        skAtasNama: "Nabila Syakira Ramadhani (Siswa)",
        statusSK: "Belum Masuk SK",
        tahunUsulan: "2026",
        catatanDapodik: "Keluarga Menengah - Rekomendasi Verifikasi Faktual"
    }
];

// Seed Data Siswa Penerima PIP (Sesuai SK Kemendikbud 2026 SDN Terlangu 01)
const SEED_PIP_PENERIMA = [
    {
        nisn: "0169876543",
        nama: "Dewi Lestari Putri",
        kelas: "4",
        nomorSK: "0345/P3KE/PIP/2026",
        tahap: "Tahap 1",
        nominal: 450000,
        bankPenyalur: "BRI",
        nomorRekening: "0109-01-045678-50-2",
        statusRekening: "Sudah Aktivasi",
        statusCair: "Sudah Cair",
        tanggalCair: "2026-03-12",
        tahunAnggaran: "2026"
    },
    {
        nisn: "0134567890",
        nama: "Ahmad Rayhan Pratama",
        kelas: "5",
        nomorSK: "0345/P3KE/PIP/2026",
        tahap: "Tahap 1",
        nominal: 450000,
        bankPenyalur: "BRI",
        nomorRekening: "0109-01-045679-50-8",
        statusRekening: "Sudah Aktivasi",
        statusCair: "Belum Cair",
        tanggalCair: "-",
        tahunAnggaran: "2026"
    },
    {
        nisn: "0185566778",
        nama: "Zahra Anindya Kirana",
        kelas: "2",
        nomorSK: "0588/P3KE/PIP/2026",
        tahap: "Tahap 2",
        nominal: 450000,
        bankPenyalur: "BRI",
        nomorRekening: "0109-01-089123-50-1",
        statusRekening: "Sudah Aktivasi",
        statusCair: "Sudah Cair",
        tanggalCair: "2026-04-05",
        tahunAnggaran: "2026"
    },
    {
        nisn: "0151122334",
        nama: "Bima Arya Wijaya",
        kelas: "4",
        nomorSK: "0588/P3KE/PIP/2026",
        tahap: "Tahap 2",
        nominal: 450000,
        bankPenyalur: "BRI",
        nomorRekening: "0109-01-089124-50-7",
        statusRekening: "Belum Aktivasi",
        statusCair: "Belum Cair",
        tanggalCair: "-",
        tahunAnggaran: "2026"
    },
    {
        nisn: "0142345678",
        nama: "Siti Nur Haliza",
        kelas: "5",
        nomorSK: "0790/P3KE/PIP/2026",
        tahap: "Tahap 3",
        nominal: 450000,
        bankPenyalur: "BRI",
        nomorRekening: "0109-01-098765-50-3",
        statusRekening: "Sudah Aktivasi",
        statusCair: "Belum Cair",
        tanggalCair: "-",
        tahunAnggaran: "2026"
    }
];

// Seed Data Permohonan Surat Online Orang Tua (Layanan Mandiri Publik)
const SEED_PERMOHONAN_SURAT = [
    {
        id: "REQ-2026-0001",
        tanggalMasuk: "2026-10-18 09:15",
        nisn: "0169876543",
        nama: "Dewi Lestari Putri",
        kelas: "4",
        jenisSurat: "Surat Pengantar / Rekomendasi Pencairan PIP Bank BRI",
        keperluan: "Pencairan dana PIP di Bank BRI Unit Jatibarang / Brebes",
        namaPemohon: "Agus Santosa",
        hubunganPemohon: "Ayah Kandung",
        noWhatsApp: "085712345678",
        status: "Menunggu", // Menunggu, Diproses, Selesai, Ditolak
        nomorSuratTerbit: "",
        keteranganTindak: ""
    },
    {
        id: "REQ-2026-0002",
        tanggalMasuk: "2026-10-19 14:30",
        nisn: "0172233445",
        nama: "Muhammad Faiz Al-Fatih",
        kelas: "3",
        jenisSurat: "Surat Keterangan Aktif Belajar",
        keperluan: "Persyaratan perpanjangan BPJS Kesehatan PBI Balai Desa Terlangu",
        namaPemohon: "Farhan Hakim",
        hubunganPemohon: "Ayah Kandung",
        noWhatsApp: "081299887766",
        status: "Disetujui",
        nomorSuratTerbit: "421.2/015/SD/2026",
        keteranganTindak: "Surat sudah dicetak, siap diambil di ruang TU"
    }
];

// Data Tenaga Pendidik & Kependidikan (Tendik / Guru)
const SEED_TENDIK = [
    { nip: "19690808 199201 2 002", nama: "Aisah Suciati, S.Pd.SD., M.Pd.", jabatan: "Kepala Sekolah", jk: "Perempuan", statusKepegawaian: "PNS", golJabatan: "Pembina / IVa / Kepala Sekolah" },
    { nip: "19750314 199802 2 001", nama: "Sri Wahyuni, S.Pd.SD", jabatan: "Guru Kelas 6", jk: "Perempuan", statusKepegawaian: "PNS", golJabatan: "Penata Tk.I / IIId / Guru Kelas" },
    { nip: "19820820 200604 1 008", nama: "Budi Hartono, S.Pd.", jabatan: "Guru Kelas 5", jk: "Laki-laki", statusKepegawaian: "PNS", golJabatan: "Penata / IIIc / Guru Kelas" },
    { nip: "19890115 201101 2 012", nama: "Endang Susilowati, S.Pd.", jabatan: "Guru Kelas 4", jk: "Perempuan", statusKepegawaian: "PNS", golJabatan: "Penata Muda Tk.I / IIIb / Guru Kelas" },
    { nip: "19920409 201902 2 005", nama: "Nurul Aini, S.Pd.", jabatan: "Guru Kelas 3", jk: "Perempuan", statusKepegawaian: "PPPK", golJabatan: "IX / Guru Kelas" },
    { nip: "19941128 202203 1 003", nama: "Rizky Fauzan, S.Pd.", jabatan: "Guru Kelas 2", jk: "Laki-laki", statusKepegawaian: "PPPK", golJabatan: "IX / Guru Kelas" },
    { nip: "19960719 202301 2 009", nama: "Dewi Kurniasih, S.Pd.", jabatan: "Guru Kelas 1", jk: "Perempuan", statusKepegawaian: "PPPK", golJabatan: "IX / Guru Kelas" },
    { nip: "19850904 201001 1 015", nama: "Agus Triyono, S.Pd.Jas", jabatan: "Guru PJOK", jk: "Laki-laki", statusKepegawaian: "PNS", golJabatan: "Penata Muda / IIIa / Guru PJOK" },
    { nip: "19910214 201708 2 004", nama: "Siti Fatimah, S.Pd.I", jabatan: "Guru PAI & Budi Pekerti", jk: "Perempuan", statusKepegawaian: "PNS", golJabatan: "Penata Muda / IIIa atau IX / Guru PAI" },
    { nip: "19930811 202012 1 002", nama: "Hendra Wijaya, S.Kom.", jabatan: "Pengelola TU & Operator Sekolah", jk: "Laki-laki", statusKepegawaian: "PTT", golJabatan: "PTT / Pengelola TU" }
];

// Data Surat Keluar (SRIKANDI Auto-Numbering Seed)
const SEED_SURAT_KELUAR = [
    {
        id: "SK-2026-001",
        nomorSurat: "421.2/001/SD/2026",
        kodeKlasifikasi: "421.2",
        noUrut: 1,
        tahun: 2026,
        tanggalSurat: "2026-01-05",
        tujuan: "Korwilcam Bidang Pendidikan Kec. Cempaka Indah",
        perihal: "Laporan Awal Semester Genap Tahun Ajaran 2025/2026",
        pengonsep: "Hendra Wijaya, S.Kom. (TU)",
        penandatangan: "Drs. H. Mulyono Santoso, M.Pd.",
        keterangan: "Laporan rutin diserahkan fisik dan softcopy",
        fileDriveUrl: "https://drive.google.com/file/d/sample-surat-keluar-001/view"
    },
    {
        id: "SK-2026-002",
        nomorSurat: "005/002/SD/2026",
        kodeKlasifikasi: "005",
        noUrut: 2,
        tahun: 2026,
        tanggalSurat: "2026-01-12",
        tujuan: "Orang Tua / Wali Murid Kelas 1 - 6",
        perihal: "Undangan Rapat Pleno Komite & Sosialisasi Program Sekolah",
        pengonsep: "Sri Wahyuni, S.Pd.SD",
        penandatangan: "Drs. H. Mulyono Santoso, M.Pd.",
        keterangan: "Disampaikan via pesan WA broadcast dan surat cetak",
        fileDriveUrl: "https://drive.google.com/file/d/sample-surat-keluar-002/view"
    },
    {
        id: "SK-2026-003",
        nomorSurat: "421.7/003/SD/2026",
        kodeKlasifikasi: "421.7",
        noUrut: 3,
        tahun: 2026,
        tanggalSurat: "2026-02-02",
        tujuan: "Kepala Dinas Kepemudaan dan Olahraga Kota",
        perihal: "Pendaftaran Kontingen O2SN Tingkat Kecamatan Cempaka Indah",
        pengonsep: "Agus Triyono, S.Pd.Jas",
        penandatangan: "Drs. H. Mulyono Santoso, M.Pd.",
        keterangan: "Cabang Atletik dan Bulutangkis",
        fileDriveUrl: "https://drive.google.com/file/d/sample-surat-keluar-003/view"
    },
    {
        id: "SK-2026-004",
        nomorSurat: "421.2/004/SD/2026",
        kodeKlasifikasi: "421.2",
        noUrut: 4,
        tahun: 2026,
        tanggalSurat: "2026-02-14",
        tujuan: "Orang Tua Siswa (Ahmad Rayhan Pratama)",
        perihal: "Surat Keterangan Aktif Belajar untuk Pengajuan PIP",
        pengonsep: "Hendra Wijaya, S.Kom. (TU)",
        penandatangan: "Drs. H. Mulyono Santoso, M.Pd.",
        keterangan: "Diterbitkan via Modul Cetak Mandiri",
        fileDriveUrl: "https://drive.google.com/file/d/sample-surat-keluar-004/view"
    }
];

// Data Surat Masuk Seed
const SEED_SURAT_MASUK = [
    {
        id: "SM-2026-001",
        noAgenda: "SM/2026/001",
        noSuratAsli: "420/124/DISDIK/2026",
        tglSurat: "2026-01-03",
        tglTerima: "2026-01-04",
        pengirim: "Dinas Pendidikan Kota Administrasi Pendidikan",
        perihal: "Pedoman Kalender Pendidikan & Asesmen Sumatif Akhir Jenjang 2026",
        disposisiKe: "Drs. H. Mulyono Santoso, M.Pd.",
        instruksiDisposisi: "Tindak lanjuti bersama dewan guru dan koordinasikan dengan Kurikulum.",
        fileScanUrl: "https://drive.google.com/file/d/sample-surat-masuk-001/view",
        status: "Selesai Disposisi"
    },
    {
        id: "SM-2026-002",
        noAgenda: "SM/2026/002",
        noSuratAsli: "440/087/PKM-CI/2026",
        tglSurat: "2026-01-20",
        tglTerima: "2026-01-21",
        pengirim: "UPTD Puskesmas Cempaka Indah",
        perihal: "Pemberitahuan Pelaksanaan Bulan Imunisasi Anak Sekolah (BIAS) & Skrining Gigi",
        disposisiKe: "Guru UKS / Guru Kelas 1 & 2",
        instruksiDisposisi: "Siapkan data siswa sasaran dan ruang UKS pada tgl 28 Januari 2026.",
        fileScanUrl: "https://drive.google.com/file/d/sample-surat-masuk-002/view",
        status: "Selesai Disposisi"
    },
    {
        id: "SM-2026-003",
        noAgenda: "SM/2026/003",
        noSuratAsli: "005/014/KORWIL/2026",
        tglSurat: "2026-02-18",
        tglTerima: "2026-02-19",
        pengirim: "Korwilcam Bidang Pendidikan Kec. Cempaka Indah",
        perihal: "Undangan Rapat Koordinasi Kepala Sekolah Persiapan ANBK 2026",
        disposisiKe: "Drs. H. Mulyono Santoso, M.Pd.",
        instruksiDisposisi: "Kepala Sekolah menghadiri langsung pada tgl 24 Februari 2026.",
        fileScanUrl: "https://drive.google.com/file/d/sample-surat-masuk-003/view",
        status: "Menunggu Pelaksanaan"
    }
];

// Data Presensi Harian Seed (Hari Ini & Historis untuk Grafik)
const generateSeedAbsensi = () => {
    const today = new Date().toISOString().split('T')[0];
    const absensiList = [];

    // Hari ini untuk siswa
    const sampleStatuses = ["Hadir", "Hadir", "Hadir", "Izin", "Hadir", "Sakit", "Hadir", "Hadir"];
    SEED_SISWA.forEach((s, idx) => {
        absensiList.push({
            id: `ABS-${today}-SISWA-${s.nisn}`,
            tanggal: today,
            kategori: "Siswa",
            kelas: s.kelas,
            nisnNip: s.nisn,
            nama: s.nama,
            status: sampleStatuses[idx % sampleStatuses.length],
            keterangan: sampleStatuses[idx % sampleStatuses.length] === "Sakit" ? "Demam & flu" : (sampleStatuses[idx % sampleStatuses.length] === "Izin" ? "Acara keluarga" : "Tepat waktu"),
            timestamp: `${today} 07:15:00`
        });
    });

    // Hari ini untuk tendik
    SEED_TENDIK.forEach((t, idx) => {
        absensiList.push({
            id: `ABS-${today}-TENDIK-${t.nip.replace(/\s+/g, '')}`,
            tanggal: today,
            kategori: "Tendik",
            kelas: "-",
            nisnNip: t.nip,
            nama: t.nama,
            status: idx === 3 ? "Izin" : "Hadir",
            keterangan: idx === 3 ? "Diklat daring Kemdikbud" : "Hadir mengajar",
            timestamp: `${today} 06:45:00`
        });
    });

    return absensiList;
};

// Histori Absensi 6 Bulan Terakhir untuk Chart Tren
const SEED_HISTORI_BULANAN = [
    { bulan: "Nov 2025", hadir: 96.2, sakit: 2.1, izin: 1.2, alpa: 0.5 },
    { bulan: "Des 2025", hadir: 97.4, sakit: 1.5, izin: 0.8, alpa: 0.3 },
    { bulan: "Jan 2026", hadir: 95.8, sakit: 2.4, izin: 1.3, alpa: 0.5 },
    { bulan: "Feb 2026", hadir: 96.9, sakit: 1.8, izin: 1.0, alpa: 0.3 },
    { bulan: "Mar 2026", hadir: 97.8, sakit: 1.2, izin: 0.7, alpa: 0.3 },
    { bulan: "Okt 2026", hadir: 98.1, sakit: 1.1, izin: 0.6, alpa: 0.2 }
];

// Data Repository Manager
const DataStore = {
    KEYS: {
        CONFIG: "sim_tas_config",
        SISWA: "sim_tas_siswa",          // SEMUA tahun ajaran (tiap record punya field tahunAjaran)
        TENDIK: "sim_tas_tendik",
        SURAT_KELUAR: "sim_tas_surat_keluar",
        SURAT_MASUK: "sim_tas_surat_masuk",
        ABSENSI: "sim_tas_absensi",
        ABSENSI_TENDIK: "sim_tas_absensi_tendik",
        ABSENSI_SISWA_BULAN: "sim_tas_absensi_siswa_bulan",
        HISTORI_BULANAN: "sim_tas_histori_bulanan",
        JADWAL: "sim_tas_jadwal",
        PIP_PENGUSULAN: "sim_tas_pip_pengusulan",
        PIP_PENERIMA: "sim_tas_pip_penerima",
        PERMOHONAN_SURAT: "sim_tas_permohonan_surat"
    },

    init() {
        if (!localStorage.getItem(this.KEYS.CONFIG)) {
            localStorage.setItem(this.KEYS.CONFIG, JSON.stringify(DEFAULT_SCHOOL_CONFIG));
        } else {
            // Migrasi otomatis jika data di browser masih menggunakan data demo awal
            try {
                let current = JSON.parse(localStorage.getItem(this.KEYS.CONFIG));
                let changed = false;
                if (current && (current.namaSekolah === "SD NEGERI 01 MERDEKA BELAJAR" || current.npsn === "20104523")) {
                    current = {
                        ...DEFAULT_SCHOOL_CONFIG,
                        ...current,
                        namaSekolah: "SD NEGERI TERLANGU 01",
                        npsn: "20326713",
                        kabupatenKota: "Kabupaten Brebes",
                        alamat: current.alamat.includes("Cempaka") ? "Jl. Raya Terlangu, Desa Terlangu" : current.alamat,
                        website: current.website === "https://sdn01merdeka.sch.id" ? "" : (current.website || "")
                    };
                    changed = true;
                }
                // Migrasi Kepala Sekolah aktif jika masih menggunakan nama lama
                if (current && (current.namaKepalaSekolah === "Drs. H. Mulyono Santoso, M.Pd." || current.nipKepalaSekolah === "19680512 199303 1 004")) {
                    current.namaKepalaSekolah = "Aisah Suciati, S.Pd.SD., M.Pd.";
                    current.nipKepalaSekolah = "19690808 199201 2 002";
                    current.pangkatGolongan = "Pembina / IV-a";
                    changed = true;
                }
                if (changed) {
                    localStorage.setItem(this.KEYS.CONFIG, JSON.stringify(current));
                }

                // Cek migrasi tendik kepala sekolah jika ada di localStorage
                const tendikList = JSON.parse(localStorage.getItem(this.KEYS.TENDIK) || "[]");
                if (Array.isArray(tendikList) && tendikList.length > 0) {
                    let tendikChanged = false;
                    tendikList.forEach(t => {
                        if (t.nama === "Drs. H. Mulyono Santoso, M.Pd." || t.nip === "19680512 199303 1 004" || t.jabatan === "Kepala Sekolah") {
                            t.nama = "Aisah Suciati, S.Pd.SD., M.Pd.";
                            t.nip = "19690808 199201 2 002";
                            t.jk = "Perempuan";
                            tendikChanged = true;
                        }
                    });
                    if (tendikChanged) {
                        localStorage.setItem(this.KEYS.TENDIK, JSON.stringify(tendikList));
                    }
                }
            } catch (err) {
                console.warn("Config migration check skipped", err);
            }
        }
        // Mode cloud: jangan menyemai data contoh (data asli datang dari Google Sheets setelah login)
        const cloud = this.isCloudConfigured();
        const seed = (key, demo, empty = []) => {
            if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(cloud ? empty : demo));
        };
        seed(this.KEYS.SISWA, SEED_SISWA);
        this.migratePeriodik();
        seed(this.KEYS.TENDIK, SEED_TENDIK);
        seed(this.KEYS.SURAT_KELUAR, SEED_SURAT_KELUAR);
        seed(this.KEYS.SURAT_MASUK, SEED_SURAT_MASUK);
        if (!localStorage.getItem(this.KEYS.ABSENSI)) {
            localStorage.setItem(this.KEYS.ABSENSI, JSON.stringify(cloud ? [] : generateSeedAbsensi()));
        }
        seed(this.KEYS.HISTORI_BULANAN, SEED_HISTORI_BULANAN);
        seed(this.KEYS.JADWAL, SEED_JADWAL);
        seed(this.KEYS.PIP_PENGUSULAN, SEED_PIP_PENGUSULAN);
        seed(this.KEYS.PIP_PENERIMA, SEED_PIP_PENERIMA);
        seed(this.KEYS.PERMOHONAN_SURAT, SEED_PERMOHONAN_SURAT);
    },

    isCloudConfigured() {
        const c = this.getConfig();
        return !!(c.isCloudMode && c.gasApiUrl);
    },

    // Hapus cache data (kecuali pengaturan) - dipanggil saat logout di mode cloud
    clearCache() {
        Object.entries(this.KEYS).forEach(([name, key]) => {
            if (name === "CONFIG") return;
            localStorage.setItem(key, JSON.stringify(name === "HISTORI_BULANAN" ? SEED_HISTORI_BULANAN : []));
        });
    },

    getConfig() {
        let stored = null;
        try { stored = JSON.parse(localStorage.getItem(this.KEYS.CONFIG)); } catch (e) { stored = null; }
        const cfg = { ...DEFAULT_SCHOOL_CONFIG, ...(stored || {}) };
        if (!cfg.supabaseUrl && typeof window !== "undefined" && window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.SUPABASE_URL) {
            cfg.supabaseUrl = window.SIMTAS_CONFIG.SUPABASE_URL;
        }
        if (!cfg.supabaseAnonKey && typeof window !== "undefined" && window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.SUPABASE_ANON_KEY) {
            cfg.supabaseAnonKey = window.SIMTAS_CONFIG.SUPABASE_ANON_KEY;
        }
        if (!cfg.gasApiUrl && typeof window !== "undefined" && window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.GAS_API_URL) {
            cfg.gasApiUrl = window.SIMTAS_CONFIG.GAS_API_URL;
        }
        if (typeof cfg.isCloudMode === "undefined") {
            cfg.isCloudMode = !!(cfg.gasApiUrl);
        }
        if (!cfg.tahunAjaranAktif) cfg.tahunAjaranAktif = Util.defaultTahunAjaran();
        if (!Array.isArray(cfg.daftarTahunAjaran) || cfg.daftarTahunAjaran.length === 0) {
            cfg.daftarTahunAjaran = [cfg.tahunAjaranAktif];
        }
        if (!Array.isArray(cfg.hariLibur) || cfg.hariLibur.length <= 10) {
            // Gabungkan libur default lengkap dari husniadil.com jika data tersimpan masih versi lama
            const mapTgl = new Map();
            DEFAULT_SCHOOL_CONFIG.hariLibur.forEach(h => mapTgl.set(h.tanggal, h));
            (cfg.hariLibur || []).forEach(h => mapTgl.set(h.tanggal, h));
            cfg.hariLibur = Array.from(mapTgl.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        }
        return cfg;
    },

    saveConfig(cfg) {
        localStorage.setItem(this.KEYS.CONFIG, JSON.stringify(cfg));
    },

    async syncHolidaysFromHusniAdil(year) {
        year = year || new Date().getFullYear();
        try {
            const res = await ApiClient.request("getCalendarHolidays", { year });
            if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                const cfg = this.getConfig();
                const mapTgl = new Map();
                (cfg.hariLibur || []).forEach(h => mapTgl.set(h.tanggal, h));
                res.data.forEach(h => {
                    const tgl = h.tanggal || h.date;
                    const ket = h.ket || h.name;
                    if (tgl && ket) mapTgl.set(tgl, { tanggal: tgl, ket });
                });
                cfg.hariLibur = Array.from(mapTgl.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
                this.saveConfig(cfg);
                return { success: true, count: res.data.length, data: cfg.hariLibur };
            }
        } catch (e) {
            console.warn("syncHolidaysFromHusniAdil error:", e);
        }
        return { success: false, message: "Gagal menyinkronkan libur dari husniadil.com" };
    },

    // ================= PERIODIK TAHUN AJARAN =================
    getActiveTA() { return this.getConfig().tahunAjaranAktif; },

    setActiveTA(ta) {
        const cfg = this.getConfig();
        cfg.tahunAjaranAktif = ta;
        if (!cfg.daftarTahunAjaran.includes(ta)) cfg.daftarTahunAjaran.push(ta);
        this.saveConfig(cfg);
    },

    // Daftar TA = konfigurasi + semua TA yang muncul pada data siswa, terurut
    getTAList() {
        const set = new Set(this.getConfig().daftarTahunAjaran);
        this.getSiswaAll().forEach(s => { if (s.tahunAjaran) set.add(s.tahunAjaran); });
        return Array.from(set).sort();
    },

    addTA(ta) {
        const cfg = this.getConfig();
        if (!cfg.daftarTahunAjaran.includes(ta)) cfg.daftarTahunAjaran.push(ta);
        this.saveConfig(cfg);
    },

    // Record lama (tanpa tahunAjaran/rombel) dimigrasikan ke TA aktif
    migratePeriodik() {
        const all = this.getSiswaAll();
        let changed = false;
        const ta = this.getActiveTA();
        all.forEach(s => {
            if (!s.tahunAjaran) { s.tahunAjaran = ta; changed = true; }
            if (!s.rombel && s.kelas) { s.rombel = String(s.kelas); changed = true; }
        });
        if (changed) this.saveSiswaAll(all);
    },

    // SEMUA tahun ajaran
    getSiswaAll() {
        try { return JSON.parse(localStorage.getItem(this.KEYS.SISWA)) || []; } catch (e) { return []; }
    },

    saveSiswaAll(list) {
        localStorage.setItem(this.KEYS.SISWA, JSON.stringify(list));
    },

    // Siswa pada tahun ajaran tertentu (default: TA aktif). Modul lama memakai ini tanpa perubahan.
    getSiswa(ta) {
        const target = ta || this.getActiveTA();
        return this.getSiswaAll().filter(s => (s.tahunAjaran || target) === target);
    },

    // Simpan daftar siswa HANYA untuk TA tertentu; TA lain tidak tersentuh
    saveSiswa(list, ta) {
        const target = ta || this.getActiveTA();
        const others = this.getSiswaAll().filter(s => (s.tahunAjaran || target) !== target);
        list.forEach(s => { s.tahunAjaran = target; });
        this.saveSiswaAll(list.concat(others));
    },

    // Daftar rombel unik yang ada di data siswa (mis. "Kelas 1", "Kelas 2", "Kelas 5A", dst.)
    getRombels(ta) {
        const students = this.getSiswa(ta);
        const set = new Set();
        students.forEach(s => {
            const r = String(s.rombel || s.kelas || "").trim();
            if (r) set.add(r);
        });
        if (set.size === 0) {
            return ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"];
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b, "id", { numeric: true, sensitivity: 'base' }));
    },

    getTendik() {
        try { return JSON.parse(localStorage.getItem(this.KEYS.TENDIK)) || []; } catch (e) { return []; }
    },

    saveTendik(list) {
        localStorage.setItem(this.KEYS.TENDIK, JSON.stringify(list));
    },

    getAbsensiTendik() {
        try { return JSON.parse(localStorage.getItem(this.KEYS.ABSENSI_TENDIK)) || []; } catch (e) { return []; }
    },

    saveAbsensiTendik(list) {
        localStorage.setItem(this.KEYS.ABSENSI_TENDIK, JSON.stringify(list));
    },

    getAbsensiSiswaBulan() {
        try { return JSON.parse(localStorage.getItem(this.KEYS.ABSENSI_SISWA_BULAN)) || []; } catch (e) { return []; }
    },

    saveAbsensiSiswaBulan(list) {
        localStorage.setItem(this.KEYS.ABSENSI_SISWA_BULAN, JSON.stringify(list));
    },


    getSuratKeluar() {
        return JSON.parse(localStorage.getItem(this.KEYS.SURAT_KELUAR)) || [];
    },

    saveSuratKeluar(list) {
        localStorage.setItem(this.KEYS.SURAT_KELUAR, JSON.stringify(list));
    },

    getSuratMasuk() {
        return JSON.parse(localStorage.getItem(this.KEYS.SURAT_MASUK)) || [];
    },

    saveSuratMasuk(list) {
        localStorage.setItem(this.KEYS.SURAT_MASUK, JSON.stringify(list));
    },

    getAbsensi() {
        return JSON.parse(localStorage.getItem(this.KEYS.ABSENSI)) || [];
    },

    saveAbsensi(list) {
        localStorage.setItem(this.KEYS.ABSENSI, JSON.stringify(list));
    },

    getHistoriBulanan() {
        return JSON.parse(localStorage.getItem(this.KEYS.HISTORI_BULANAN)) || SEED_HISTORI_BULANAN;
    },

    // ================= MODUL JADWAL PELAJARAN =================
    getJadwalAll() {
        try { return JSON.parse(localStorage.getItem(this.KEYS.JADWAL)) || []; } catch (e) { return []; }
    },

    saveJadwalAll(list) {
        localStorage.setItem(this.KEYS.JADWAL, JSON.stringify(list));
    },

    getJadwal(kelas, ta) {
        const list = this.getJadwalAll();
        const normK = k => String(k || "").toLowerCase().replace(/kelas\s*/i, "").trim();
        const targetK = normK(kelas);

        return list.map(j => ({
            ...j,
            kelas: j.kelas || j.rombel || "1",
            rombel: j.rombel || j.kelas || "1",
            guru: j.guru || j.namaGuru || "",
            namaGuru: j.namaGuru || j.guru || "",
            jamKe: Number(j.jamKe) || 1
        })).filter(j => {
            if (kelas && kelas !== "Semua") {
                const kItem = normK(j.kelas || j.rombel);
                if (kItem !== targetK && String(j.kelas || j.rombel).trim() !== String(kelas).trim()) {
                    const num1 = kItem.match(/\d+/)?.[0];
                    const num2 = targetK.match(/\d+/)?.[0];
                    if (!num1 || !num2 || num1 !== num2) return false;
                }
            }
            if (ta && j.tahunAjaran && j.tahunAjaran !== ta) return false;
            return true;
        });
    },

    saveJadwal(list) {
        this.saveJadwalAll(list);
    },

    // ================= MODUL PIP (PENGUSULAN & PENERIMA) =================
    getPIPPengusulan() {
        try { return JSON.parse(localStorage.getItem(this.KEYS.PIP_PENGUSULAN)) || []; } catch (e) { return []; }
    },

    savePIPPengusulan(list) {
        localStorage.setItem(this.KEYS.PIP_PENGUSULAN, JSON.stringify(list));
    },

    getPIPPenerima() {
        try { return JSON.parse(localStorage.getItem(this.KEYS.PIP_PENERIMA)) || []; } catch (e) { return []; }
    },

    savePIPPenerima(list) {
        localStorage.setItem(this.KEYS.PIP_PENERIMA, JSON.stringify(list));
    },

    // ================= MODUL PERMOHONAN SURAT ONLINE ORTU =================
    getPermohonanSurat() {
        try { return JSON.parse(localStorage.getItem(this.KEYS.PERMOHONAN_SURAT)) || []; } catch (e) { return []; }
    },

    savePermohonanSurat(list) {
        localStorage.setItem(this.KEYS.PERMOHONAN_SURAT, JSON.stringify(list));
    },

    // ================= PEMBARUAN FIELD SISWA (NO HP ORTU, KK, DLL) =================
    updateStudentField(nisn, fields = {}) {
        const all = this.getSiswaAll();
        const student = all.find(s => s.nisn === nisn);
        if (student) {
            Object.assign(student, fields);
            this.saveSiswaAll(all);
            return { success: true, student };
        }
        return { success: false, message: "Siswa tidak ditemukan" };
    },

    resetToDefault() {
        Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
        this.init();
    },

    // ================= BACKUP LOKAL (JSON) =================
    exportAll() {
        const dump = { _app: "SIM-TAS-SD", _versi: 2, _dibuat: new Date().toISOString(), data: {} };
        Object.entries(this.KEYS).forEach(([name, key]) => {
            if (name === "CONFIG") return; // konfigurasi (URL/endpoint) tidak ikut dibackup
            dump.data[key] = JSON.parse(localStorage.getItem(key) || "null");
        });
        const cfg = this.getConfig();
        dump.data.tahunAjaranAktif = cfg.tahunAjaranAktif;
        dump.data.daftarTahunAjaran = cfg.daftarTahunAjaran;
        dump.data.hariLibur = cfg.hariLibur;
        return dump;
    },

    importAll(dump) {
        if (!dump || dump._app !== "SIM-TAS-SD" || !dump.data) throw new Error("Berkas bukan backup SIM-TAS-SD yang valid.");
        Object.entries(this.KEYS).forEach(([name, key]) => {
            if (name === "CONFIG") return;
            if (dump.data[key] != null) localStorage.setItem(key, JSON.stringify(Sec.cleanDeep(dump.data[key])));
        });
        const cfg = this.getConfig();
        if (dump.data.tahunAjaranAktif) cfg.tahunAjaranAktif = dump.data.tahunAjaranAktif;
        if (dump.data.daftarTahunAjaran) cfg.daftarTahunAjaran = dump.data.daftarTahunAjaran;
        if (dump.data.hariLibur) cfg.hariLibur = dump.data.hariLibur;
        this.saveConfig(cfg);
        this.migratePeriodik();
    }
};

// Auto-run init
DataStore.init();
