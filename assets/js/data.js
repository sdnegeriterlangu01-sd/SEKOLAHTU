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
    gasApiUrl: "", // Isi dengan URL Google Apps Script Web App jika aktif
    isCloudMode: false,
    // --- Periodik Tahun Ajaran ---
    tahunAjaranAktif: "",   // diisi otomatis (mis. "2026/2027")
    daftarTahunAjaran: [],
    // --- Kalender Libur (kolom abu-abu pada rekap absensi; hari Minggu otomatis) ---
    // Lengkapi libur nasional/cuti bersama sesuai SKB 3 Menteri di menu Pengaturan.
    hariLibur: [
        { tanggal: "2026-08-17", ket: "HUT Kemerdekaan RI" },
        { tanggal: "2026-12-25", ket: "Hari Raya Natal" },
        { tanggal: "2027-01-01", ket: "Tahun Baru Masehi" },
        { tanggal: "2027-05-01", ket: "Hari Buruh Internasional" },
        { tanggal: "2027-06-01", ket: "Hari Lahir Pancasila" },
        { tanggal: "2027-08-17", ket: "HUT Kemerdekaan RI" },
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
        nik: "3374011205130001",
        tempatLahir: "Semarang",
        tanggalLahir: "2014-05-12",
        jk: "Laki-laki",
        kelas: "5",
        namaOrtu: "Bambang Pratama",
        pekerjaanOrtu: "Wiraswasta",
        noHp: "081234567891",
        alamat: "Jl. Melati No. 12, RT 02/RW 04, Cempaka Indah",
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
        nik: "3374015609140003",
        tempatLahir: "Solo",
        tanggalLahir: "2014-09-16",
        jk: "Perempuan",
        kelas: "5",
        namaOrtu: "Muhammad Halim",
        pekerjaanOrtu: "Pegawai Negeri Sipil (PNS)",
        noHp: "081398765432",
        alamat: "Jl. Anggrek Raya Blok B/4, Cempaka Indah",
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
        nik: "3374020301150002",
        tempatLahir: "Semarang",
        tanggalLahir: "2015-01-03",
        jk: "Laki-laki",
        kelas: "4",
        namaOrtu: "Danang Wijaya",
        pekerjaanOrtu: "Karyawan Swasta",
        noHp: "082155667788",
        alamat: "Perumahan Cempaka Asri No. 18",
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
        nik: "3374016708150005",
        tempatLahir: "Demak",
        tanggalLahir: "2015-08-27",
        jk: "Perempuan",
        kelas: "4",
        namaOrtu: "Agus Santosa",
        pekerjaanOrtu: "Petani / Pedagang",
        noHp: "085712345678",
        alamat: "Desa Karangsari RT 01/RW 02",
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
        nik: "3374011403160004",
        tempatLahir: "Semarang",
        tanggalLahir: "2016-03-14",
        jk: "Laki-laki",
        kelas: "3",
        namaOrtu: "Farhan Hakim",
        pekerjaanOrtu: "Guru",
        noHp: "081299887766",
        alamat: "Jl. Dahlia IV No. 7, Cempaka Indah",
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
        nik: "3374026511170001",
        tempatLahir: "Kudus",
        tanggalLahir: "2017-11-25",
        jk: "Perempuan",
        kelas: "2",
        namaOrtu: "Dodi Kirana",
        pekerjaanOrtu: "Wiraswasta",
        noHp: "081322446688",
        alamat: "Jl. Pahlawan No. 89, Cempaka Indah",
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
        nik: "3374011808180002",
        tempatLahir: "Semarang",
        tanggalLahir: "2018-08-18",
        jk: "Laki-laki",
        kelas: "1",
        namaOrtu: "Rudi Pratama",
        pekerjaanOrtu: "Karyawan BUMN",
        noHp: "085233669911",
        alamat: "Pondok Hijau Residence Kav. 14",
        berkas: {
            kk: { uploaded: true, filename: "0199988776_KK_2026.pdf", date: "2026-03-10", url: "https://drive.google.com/file/d/sample-kk-kenzo/view" },
            akta: { uploaded: true, filename: "0199988776_AKTA_2026.pdf", date: "2026-03-10", url: "https://drive.google.com/file/d/sample-akta-kenzo/view" },
            kip: { uploaded: false, filename: null, date: null, url: null },
            foto: { uploaded: false, filename: null, date: null, url: null }
        }
    },
    {
        nisn: "0123344556",
        nis: "20230005",
        nama: "Nabila Syakira Ramadhani",
        nik: "3374015007130007",
        tempatLahir: "Semarang",
        tanggalLahir: "2013-07-10",
        jk: "Perempuan",
        kelas: "6",
        namaOrtu: "Irwan Ramadhani",
        pekerjaanOrtu: "Arsitek",
        noHp: "081267890123",
        alamat: "Jl. Flamboyan Indah No. 5",
        berkas: {
            kk: { uploaded: true, filename: "0123344556_KK_2026.pdf", date: "2026-01-20", url: "https://drive.google.com/file/d/sample-kk-nabila/view" },
            akta: { uploaded: true, filename: "0123344556_AKTA_2026.pdf", date: "2026-01-20", url: "https://drive.google.com/file/d/sample-akta-nabila/view" },
            kip: { uploaded: false, filename: null, date: null, url: null },
            foto: { uploaded: true, filename: "0123344556_FOTO_3x4.jpg", date: "2026-01-20", url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80" }
        }
    }
];

// Data Tenaga Pendidik & Kependidikan (Tendik / Guru)
const SEED_TENDIK = [
    { nip: "19690808 199201 2 002", nama: "Aisah Suciati, S.Pd.SD., M.Pd.", jabatan: "Kepala Sekolah", jk: "Perempuan", statusKepegawaian: "PNS" },
    { nip: "19750314 199802 2 001", nama: "Sri Wahyuni, S.Pd.SD", jabatan: "Guru Kelas 6", jk: "Perempuan", statusKepegawaian: "PNS" },
    { nip: "19820820 200604 1 008", nama: "Budi Hartono, S.Pd.", jabatan: "Guru Kelas 5", jk: "Laki-laki", statusKepegawaian: "PNS" },
    { nip: "19890115 201101 2 012", nama: "Endang Susilowati, S.Pd.", jabatan: "Guru Kelas 4", jk: "Perempuan", statusKepegawaian: "PNS" },
    { nip: "19920409 201902 2 005", nama: "Nurul Aini, S.Pd.", jabatan: "Guru Kelas 3", jk: "Perempuan", statusKepegawaian: "PPPK" },
    { nip: "19941128 202203 1 003", nama: "Rizky Fauzan, S.Pd.", jabatan: "Guru Kelas 2", jk: "Laki-laki", statusKepegawaian: "PPPK" },
    { nip: "19960719 202301 2 009", nama: "Dewi Kurniasih, S.Pd.", jabatan: "Guru Kelas 1", jk: "Perempuan", statusKepegawaian: "PPPK" },
    { nip: "19850904 201001 1 015", nama: "Agus Triyono, S.Pd.Jas", jabatan: "Guru PJOK", jk: "Laki-laki", statusKepegawaian: "PNS" },
    { nip: "19910214 201708 2 004", nama: "Siti Fatimah, S.Pd.I", jabatan: "Guru PAI & Budi Pekerti", jk: "Perempuan", statusKepegawaian: "PNS" },
    { nip: "19930811 202012 1 002", nama: "Hendra Wijaya, S.Kom.", jabatan: "Pengelola TU & Operator Sekolah", jk: "Laki-laki", statusKepegawaian: "Honorer" }
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
        HISTORI_BULANAN: "sim_tas_histori_bulanan"
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
    },

    isCloudConfigured() {
        const fixed = window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.GAS_API_URL;
        if (fixed) return true;
        try {
            const c = JSON.parse(localStorage.getItem(this.KEYS.CONFIG)) || {};
            return !!(c.isCloudMode && c.gasApiUrl);
        } catch (e) { return false; }
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
        if (!cfg.tahunAjaranAktif) cfg.tahunAjaranAktif = Util.defaultTahunAjaran();
        if (!Array.isArray(cfg.daftarTahunAjaran) || cfg.daftarTahunAjaran.length === 0) {
            cfg.daftarTahunAjaran = [cfg.tahunAjaranAktif];
        }
        if (!Array.isArray(cfg.hariLibur)) cfg.hariLibur = DEFAULT_SCHOOL_CONFIG.hariLibur;
        return cfg;
    },

    saveConfig(cfg) {
        localStorage.setItem(this.KEYS.CONFIG, JSON.stringify(cfg));
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
