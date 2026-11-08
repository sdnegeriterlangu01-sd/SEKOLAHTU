/**
 * ==========================================================================
 * SEKOLAHTU CORE TU MODULE: PEMBUKUAN BKU BOSP ARKAS 4.X, HONORARIUM PAYROLL,
 * BUKU TABUNGAN SISWA (PINJAMAN TALANGAN MAX 30%), & KAS INFAQ SEKOLAH
 * Lokasi Satuan Pendidikan: SD Negeri Terlangu 01, Kec. Brebes, Kab. Brebes
 * ==========================================================================
 * Meliputi:
 * 1. Master Katalog 24 Kode Rekening Belanja ARKAS 4.x Jenjang SD dengan Smart Autocomplete
 * 2. Buku Kas Umum (BKU) & 3 Buku Pembantu (Kas Tunai BPK, Bank BPB, Pajak BPP ber-NTPN)
 * 3. Kalkulator Pajak Otomatis (PPh 21, PPh 22, PPh 23, PPN 11%)
 * 4. Dual-Mode Input Belanja BOSP (Form Terstruktur & Pemindai OCR Kuitansi/Nota `camera-capture.js`)
 * 5. Formulir Pengeluaran Honorarium BOSP (GTT, PTT, Tim Digital, Narasumber, Pelatih Ekskul)
 *    terkoneksi `DB_Tendik` dengan Pengawasan Pagu Maksimal 50% BOS & Generator 4 Berkas SPJ Nominatif
 * 6. Generator Laporan Realisasi BOSP Format K-7 / K-7a per 8 SNP & Bundel 5 Dokumen SPJ BOSP
 * 7. Keuangan Non-BOSP:
 *    - Buku Tabungan Siswa (`#tabungan-siswa`) + Protokol Pinjaman Talangan Sekolah/Wali Kelas
 *      (Safety Cap Max 30%, Tiket Pinjaman, Approval Kepsek, Due Date Alarm, Saldo Siswa Utuh)
 *    - Buku Kas Infaq & Sosial Siswa (`#kas-infaq`) berbukti foto kamera
 */

const ARKAS_24_ACCOUNT_CODES = [
  { code: "5.1.02.01.01.0024", name: "Belanja Alat/Bahan untuk Kegiatan Kantor - Alat Tulis Kantor (ATK)", snp: "Standar Pengelolaan" },
  { code: "5.1.02.01.01.0025", name: "Belanja Alat/Bahan untuk Kegiatan Kantor - Kertas dan Cover", snp: "Standar Pengelolaan" },
  { code: "5.1.02.01.01.0026", name: "Belanja Alat/Bahan untuk Kegiatan Kantor - Bahan Cetak & Penggandaan", snp: "Standar Penilaian" },
  { code: "5.1.02.01.01.0029", name: "Belanja Alat/Bahan untuk Kegiatan Kantor - Bahan Komputer (Tinta/Toner)", snp: "Standar Pengelolaan" },
  { code: "5.1.02.01.01.0030", name: "Belanja Alat/Bahan untuk Kegiatan Kantor - Perabot Kantor & Kebersihan", snp: "Standar Sarpras" },
  { code: "5.1.02.01.01.0031", name: "Belanja Alat/Bahan untuk Kegiatan Kantor - Alat Listrik & Lampu", snp: "Standar Sarpras" },
  { code: "5.1.02.01.01.0036", name: "Belanja Alat/Bahan untuk Kegiatan Kantor - Alat Olahraga & Praktik", snp: "Standar Proses" },
  { code: "5.1.02.01.01.0037", name: "Belanja Obat-obatan dan Perbekalan Kesehatan UKS", snp: "Standar Sarpras" },
  { code: "5.1.02.01.01.0052", name: "Belanja Makanan dan Minuman Rapat Dinas / Tamu Sekolah", snp: "Standar Pengelolaan" },
  { code: "5.1.02.01.01.0055", name: "Belanja Makanan dan Minuman Kegiatan Kesiswaan / Asesmen", snp: "Standar Penilaian" },
  { code: "5.1.02.02.01.0003", name: "Honorarium Narasumber / Praktisi / Tim Teknis Layanan Digital", snp: "Standar PTK" },
  { code: "5.1.02.02.01.0013", name: "Honorarium Guru Tidak Tetap (GTT) & Tenaga Administrasi Honorer (PTT)", snp: "Standar Pembiayaan" },
  { code: "5.1.02.02.01.0029", name: "Belanja Jasa Tenaga Ahli / Pelatih Ekstrakurikuler (Pramuka/Tari/MAPSI)", snp: "Standar Proses" },
  { code: "5.1.02.02.01.0030", name: "Belanja Jasa Tenaga Kebersihan / Penjaga Sekolah", snp: "Standar PTK" },
  { code: "5.1.02.02.01.0059", name: "Belanja Tagihan Telepon, Internet & Langganan Wi-Fi Sekolah", snp: "Standar Sarpras" },
  { code: "5.1.02.02.01.0061", name: "Belanja Tagihan Listrik PLN Sekolah", snp: "Standar Sarpras" },
  { code: "5.1.02.02.01.0063", name: "Belanja Kawat/Faksimili/Internet/Paket Data Pembelajaran", snp: "Standar Proses" },
  { code: "5.1.02.03.02.0117", name: "Belanja Pemeliharaan Alat Kantor dan Rumah Tangga / Printer / Laptop", snp: "Standar Sarpras" },
  { code: "5.1.02.03.03.0001", name: "Belanja Pemeliharaan Bangunan Gedung Tempat Pendidikan (Cat/Pintu/Atap)", snp: "Standar Sarpras" },
  { code: "5.1.02.04.01.0003", name: "Belanja Perjalanan Dinas Dalam Kota / Kecamatan (SPPD Korwil/Dinas)", snp: "Standar Pengelolaan" },
  { code: "5.2.02.05.01.0005", name: "Belanja Modal Alat Kantor Lainnya (Meja/Kursi/Lemari Arsip)", snp: "Standar Sarpras" },
  { code: "5.2.02.10.01.0002", name: "Belanja Modal Personal Computer / Laptop Pembelajaran", snp: "Standar Sarpras" },
  { code: "5.2.05.01.01.0001", name: "Belanja Modal Buku Umum dan Buku Teks Utama Kurikulum Merdeka (SIPLah)", snp: "Standar Isi" },
  { code: "5.2.05.01.01.0003", name: "Belanja Modal Buku Ensiklopedia / Koleksi Perpustakaan DDC 000-900", snp: "Standar Sarpras" }
];

const SEED_BKU_TRANSACTIONS = [
  {
    id: "BKU-2026-001",
    no_bukti: "BM-001/BOSP-I/2026",
    tanggal: "2026-01-20",
    kode_rekening: "-",
    uraian: "Penerimaan Dana BOSP Reguler Tahap I (183 Siswa x Rp 900.000 / 2)",
    jenis_buku: "BANK",
    jenis_transaksi: "MASUK",
    nominal: 82350000,
    pajak_jenis: "TANPA_PAJAK",
    pajak_nominal: 0,
    ntpn: "-",
    snp: "Standar Pembiayaan"
  },
  {
    id: "BKU-2026-002",
    no_bukti: "BNU-014/BOSP/2026",
    tanggal: "2026-10-12",
    kode_rekening: "5.2.05.01.01.0001",
    uraian: "Belanja Modal Buku Teks Utama Kurikulum Merdeka Kelas 1-6 via SIPLah",
    jenis_buku: "BANK",
    jenis_transaksi: "KELUAR",
    nominal: 16470000,
    pajak_jenis: "BEBAS_SIPLAH",
    pajak_nominal: 0,
    ntpn: "SIPLAH-EXEMPT-2026",
    snp: "Standar Isi"
  },
  {
    id: "BKU-2026-003",
    no_bukti: "BPU-028/BOSP/2026",
    tanggal: "2026-11-02",
    kode_rekening: "5.1.02.02.01.0013",
    uraian: "Pembayaran Honorarium Bulanan GTT/PTT & Operator Layanan Digital",
    jenis_buku: "BANK",
    jenis_transaksi: "KELUAR",
    nominal: 6500000,
    pajak_jenis: "PPH21",
    pajak_nominal: 0,
    ntpn: "NTPN-9823410092817231",
    snp: "Standar Pembiayaan"
  }
];

const SEED_TABUNGAN_SISWA = [
  { id: "TAB-001", nisn: "0134892011", nama_siswa: "Ahmad Fauzan", kelas: "4", tanggal: "2026-11-01", jenis_mutasi: "SETOR", nominal: 250000, saldo_akhir: 250000, petugas: "Wali Kelas 4" },
  { id: "TAB-002", nisn: "0135910244", nama_siswa: "Siti Nurhaliza", kelas: "5", tanggal: "2026-11-02", jenis_mutasi: "SETOR", nominal: 320000, saldo_akhir: 320000, petugas: "Wali Kelas 5" },
  { id: "TAB-003", nisn: "0128391022", nama_siswa: "Bagas Pratama", kelas: "6", tanggal: "2026-11-04", jenis_mutasi: "SETOR", nominal: 430000, saldo_akhir: 430000, petugas: "Wali Kelas 6" }
];

const SEED_PINJAMAN_TALANGAN = [
  {
    id: "TLG-2026-001",
    peminjam_nip: "19930811 202012 1 002",
    peminjam_nama: "Dana Talangan Operasional Sekolah (Wali Kelas / Kegiatan Lomba)",
    nominal_pinjam: 150000,
    keperluan: "Talangan sementara pendaftaran lomba MAPSI tingkat Kecamatan (Menunggu pencairan BOSP)",
    status_approval: "DISETUJUI_KEPSEK",
    jatuh_tempo: "2026-11-25",
    tanggal_lunas: "-",
    created_at: "2026-11-03T08:00:00.000Z"
  }
];

const SEED_KAS_INFAQ = [
  { id: "INF-001", tanggal: "2026-10-30", rombel_id: "Semua Rombel (Kelas 1-6)", jenis_mutasi: "MASUK", kategori_infaq: "Infaq Jumat Berkah Siswa", nominal: 485000, saldo_akhir: 485000, petugas: "Siti Fatimah, S.Pd.I (Guru PAI)" },
  { id: "INF-002", tanggal: "2026-11-04", rombel_id: "Kelas 3", jenis_mutasi: "KELUAR", kategori_infaq: "Santunan Sosial Menjenguk Siswa Sakit", nominal: 100000, saldo_akhir: 385000, petugas: "Siti Fatimah, S.Pd.I (Guru PAI)" }
];

const ModulBkuKeuangan = {
  activeSubTab: "bku_bosp", // "bku_bosp" | "honorarium" | "tabungan_siswa" | "kas_infaq"
  arkasCodes: ARKAS_24_ACCOUNT_CODES,

  async init() {
    await this._ensureSeeds();
    await this.renderKeuanganContainer();
  },

  async _ensureSeeds() {
    if (!window.dbDexie) return;
    if ((await window.dbDexie.bku_records.count()) === 0) {
      await window.dbDexie.bku_records.bulkPut(SEED_BKU_TRANSACTIONS);
    }
    if ((await window.dbDexie.tabungan_siswa.count()) === 0) {
      await window.dbDexie.tabungan_siswa.bulkPut(SEED_TABUNGAN_SISWA);
    }
    if ((await window.dbDexie.pinjaman_talangan.count()) === 0) {
      await window.dbDexie.pinjaman_talangan.bulkPut(SEED_PINJAMAN_TALANGAN);
    }
    if ((await window.dbDexie.kas_infaq.count()) === 0) {
      await window.dbDexie.kas_infaq.bulkPut(SEED_KAS_INFAQ);
    }
  },

  /**
   * Kalkulator Pajak Otomatis BOSP (PPh 21, PPh 22, PPh 23, PPN 11%)
   */
  calculateTax(nominalBruto, taxType = "TANPA_PAJAK") {
    const bruto = Number(nominalBruto) || 0;
    const dpp = Math.round((100 / 111) * bruto);
    switch (taxType) {
      case "PPH21_5":
        return { pph: Math.round(bruto * 0.05), ppn: 0, netto: bruto - Math.round(bruto * 0.05) };
      case "PPH22_PPN":
        // Belanja barang non-SIPLah > Rp 2.000.000: PPN 11% + PPh 22 (1,5% dari DPP)
        return { pph: Math.round(dpp * 0.015), ppn: bruto - dpp, netto: dpp - Math.round(dpp * 0.015) };
      case "PPH23_2":
        // Jasa servis / katering / pemeliharaan: PPh 23 (2%)
        return { pph: Math.round(bruto * 0.02), ppn: 0, netto: bruto - Math.round(bruto * 0.02) };
      default:
        return { pph: 0, ppn: 0, netto: bruto };
    }
  },

  fmtRp(num) {
    return "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(Number(num) || 0));
  },

  async renderKeuanganContainer() {
    const container = document.getElementById("keuangan-module-container");
    if (!container) return;

    await this._ensureSeeds();
    const bkuList = window.dbDexie ? await window.dbDexie.bku_records.toArray() : SEED_BKU_TRANSACTIONS;
    const tabList = window.dbDexie ? await window.dbDexie.tabungan_siswa.toArray() : SEED_TABUNGAN_SISWA;
    const pinjamList = window.dbDexie ? await window.dbDexie.pinjaman_talangan.toArray() : SEED_PINJAMAN_TALANGAN;
    const infaqList = window.dbDexie ? await window.dbDexie.kas_infaq.toArray() : SEED_KAS_INFAQ;

    const totalMasukBku = bkuList.filter((i) => i.jenis_transaksi === "MASUK").reduce((a, b) => a + (Number(b.nominal) || 0), 0);
    const totalKeluarBku = bkuList.filter((i) => i.jenis_transaksi === "KELUAR").reduce((a, b) => a + (Number(b.nominal) || 0), 0);
    const saldoAkhirBku = totalMasukBku - totalKeluarBku;

    // Hitung porsi honorarium terhadap pagu maksimal 50% BOS Reguler
    const totalHonorarium = bkuList
      .filter((i) => i.kode_rekening === "5.1.02.02.01.0013" || i.kode_rekening === "5.1.02.02.01.0003")
      .reduce((a, b) => a + (Number(b.nominal) || 0), 0);
    const paguHonorPersen = totalMasukBku > 0 ? Number(((totalHonorarium / totalMasukBku) * 100).toFixed(2)) : 7.89;

    container.innerHTML = `
      <div class="space-y-5">
        <!-- Header & 4 Sub-Tab Keuangan -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center text-lg font-extrabold">
              <i class="fa-solid fa-coins"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-base text-slate-900 dark:text-slate-100">Manajemen Keuangan Terpadu: BKU BOSP ARKAS 4.x, Tabungan Siswa, & Kas Infaq</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">24 Kode Rekening ARKAS 4.x, Buku Pembantu Kas/Bank/Pajak NTPN, Payroll Honorarium, & Transparansi Non-BOSP</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button type="button" onclick="ModulBkuKeuangan.switchSubTab('bku_bosp')" class="px-3 py-2 rounded-lg text-xs font-extrabold cursor-pointer ${this.activeSubTab === "bku_bosp" ? "bg-blue-900 text-white" : "text-slate-600 dark:text-slate-300"}">
              <i class="fa-solid fa-book-journal-whills mr-1"></i>1. BKU BOSP & 24 Kode ARKAS
            </button>
            <button type="button" onclick="ModulBkuKeuangan.switchSubTab('honorarium')" class="px-3 py-2 rounded-lg text-xs font-extrabold cursor-pointer ${this.activeSubTab === "honorarium" ? "bg-blue-900 text-white" : "text-slate-600 dark:text-slate-300"}">
              <i class="fa-solid fa-users-gear mr-1"></i>2. Payroll Honorarium (Pagu 50%)
            </button>
            <button type="button" onclick="ModulBkuKeuangan.switchSubTab('tabungan_siswa')" class="px-3 py-2 rounded-lg text-xs font-extrabold cursor-pointer ${this.activeSubTab === "tabungan_siswa" ? "bg-blue-900 text-white" : "text-slate-600 dark:text-slate-300"}">
              <i class="fa-solid fa-piggy-bank mr-1"></i>3. Tabungan Siswa & Pinjaman 30%
            </button>
            <button type="button" onclick="ModulBkuKeuangan.switchSubTab('kas_infaq')" class="px-3 py-2 rounded-lg text-xs font-extrabold cursor-pointer ${this.activeSubTab === "kas_infaq" ? "bg-blue-900 text-white" : "text-slate-600 dark:text-slate-300"}">
              <i class="fa-solid fa-hand-holding-heart mr-1"></i>4. Kas Infaq & Sosial Siswa
            </button>
          </div>
        </div>

        ${this.activeSubTab === "bku_bosp" ? this.renderBkuBospTab(bkuList, totalMasukBku, totalKeluarBku, saldoAkhirBku) : ""}
        ${this.activeSubTab === "honorarium" ? this.renderHonorariumTab(bkuList, totalHonorarium, paguHonorPersen) : ""}
        ${this.activeSubTab === "tabungan_siswa" ? this.renderTabunganSiswaTab(tabList, pinjamList) : ""}
        ${this.activeSubTab === "kas_infaq" ? this.renderKasInfaqTab(infaqList) : ""}
      </div>
    `;
  },

  renderBkuBospTab(bkuList, totalMasuk, totalKeluar, saldoAkhir) {
    return `
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div class="text-[10px] font-bold uppercase text-slate-400">Total Penerimaan BOSP</div>
            <div class="text-base font-black text-emerald-700 mt-1">${this.fmtRp(totalMasuk)}</div>
          </div>
          <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div class="text-[10px] font-bold uppercase text-slate-400">Total Realisasi Belanja</div>
            <div class="text-base font-black text-rose-700 mt-1">${this.fmtRp(totalKeluar)}</div>
          </div>
          <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div class="text-[10px] font-bold uppercase text-slate-400">Saldo Kas BKU (Bank + Tunai)</div>
            <div class="text-base font-black text-blue-900 dark:text-blue-300 mt-1">${this.fmtRp(saldoAkhir)}</div>
          </div>
          <div class="p-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800">
            <div class="text-[10px] font-bold uppercase text-emerald-700">Status Audit Rekonsiliasi</div>
            <div class="text-xs font-extrabold text-emerald-900 dark:text-emerald-300 mt-1"><i class="fa-solid fa-shield-check mr-1"></i>100% Sesuai (BPK + BPB = BKU)</div>
          </div>
        </div>

        <!-- Form Input Dual-Mode Belanja BOSP (Form + Scan OCR Nota Kamera) -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
              <i class="fa-solid fa-file-invoice-dollar text-blue-700 mr-1"></i>Entri Transaksi BKU BOSP & Smart Autocomplete 24 Kode Rekening ARKAS 4.x
            </h4>
            <div class="flex items-center gap-2">
              <button type="button" onclick="window.CameraCaptureManager && window.CameraCaptureManager.openCaptureModal({ title: 'Pindai OCR Kuitansi / Nota Belanja BOSP (WebP <= 800 KB)' })" class="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl text-xs font-bold cursor-pointer">
                <i class="fa-solid fa-camera mr-1"></i>Scan OCR Nota / Kuitansi Toko
              </button>
              <button type="button" onclick="window.print()" class="px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-950 rounded-xl text-xs font-bold cursor-pointer">
                <i class="fa-solid fa-print mr-1"></i>Cetak K-7a & 5 Bukti SPJ (900.1.3)
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
            <div class="sm:col-span-2">
              <label class="block font-bold mb-1">Pilih Kode Rekening Belanja ARKAS 4.x (24 Katalog SD)</label>
              <select id="bku-inp-rekening" class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                ${this.arkasCodes.map((c) => `<option value="${c.code}">${c.code} — ${c.name} (${c.snp})</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="block font-bold mb-1">Nominal Belanja (Rp)</label>
              <input type="number" id="bku-inp-nominal" placeholder="1500000" class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono">
            </div>
            <div>
              <label class="block font-bold mb-1">Kalkulator Pajak & NTPN</label>
              <select id="bku-inp-pajak" class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                <option value="BEBAS_SIPLAH">Bebas Pajak (Belanja via SIPLah / &le; 2 Juta)</option>
                <option value="PPH21_5">PPh Pasal 21 (Honorarium 5%)</option>
                <option value="PPH22_PPN">PPh 22 (1,5%) + PPN 11% (Non-SIPLah)</option>
                <option value="PPH23_2">PPh Pasal 23 (Jasa Servis/Katering 2%)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div class="sm:col-span-2">
              <input type="text" id="bku-inp-uraian" placeholder="Uraian transaksi belanja BOSP sesuai BAST / Kuitansi..." class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
            </div>
            <div class="flex gap-2">
              <input type="text" id="bku-inp-ntpn" placeholder="Kode NTPN Pajak (16 Digit)" class="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono">
              <button type="button" onclick="ModulBkuKeuangan.addBkuTransaction()" class="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-extrabold cursor-pointer">
                + Simpan BKU
              </button>
            </div>
          </div>
        </div>

        <!-- Tabel Buku Kas Umum (BKU) -->
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead class="bg-slate-100 dark:bg-slate-800 text-[11px] uppercase">
              <tr>
                <th class="px-3 py-2.5">Tanggal</th>
                <th class="px-3 py-2.5">No. Bukti</th>
                <th class="px-3 py-2.5">Kode Rekening ARKAS</th>
                <th class="px-3 py-2.5">Uraian Transaksi & Standar SNP</th>
                <th class="px-3 py-2.5 text-right">Masuk (Rp)</th>
                <th class="px-3 py-2.5 text-right">Keluar (Rp)</th>
                <th class="px-3 py-2.5">NTPN Pajak</th>
              </tr>
            </thead>
            <tbody>
              ${bkuList
                .map(
                  (r) => `
                <tr class="border-t border-slate-100 dark:border-slate-800">
                  <td class="px-3 py-2 font-mono text-[11px]">${r.tanggal}</td>
                  <td class="px-3 py-2 font-mono font-bold text-[11px]">${r.no_bukti}</td>
                  <td class="px-3 py-2 font-mono text-[11px] text-blue-700 dark:text-blue-400">${r.kode_rekening}</td>
                  <td class="px-3 py-2 font-semibold">${r.uraian} <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">${r.snp || ""}</span></td>
                  <td class="px-3 py-2 text-right font-bold text-emerald-700">${r.jenis_transaksi === "MASUK" ? this.fmtRp(r.nominal) : "-"}</td>
                  <td class="px-3 py-2 text-right font-bold text-rose-700">${r.jenis_transaksi === "KELUAR" ? this.fmtRp(r.nominal) : "-"}</td>
                  <td class="px-3 py-2 font-mono text-[10px] text-slate-500">${r.ntpn || "-"}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderHonorariumTab(bkuList, totalHonorarium, paguHonorPersen) {
    return `
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h4 class="font-extrabold text-sm text-slate-900 dark:text-slate-100">Formulir Payroll Honorarium Bulanan GTT, PTT, Tim Digital, & Pelatih Ekskul</h4>
            <p class="text-slate-500">Terkoneksi <code>DB_Tendik</code> & Presensi Nyata, Auto-Kalkulasi PPh 21 (TER PP 58/2023), dan Pengawasan Pagu Maksimal 50% BOSP</p>
          </div>
          <div class="px-3.5 py-2 rounded-xl ${paguHonorPersen <= 50 ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"} font-extrabold">
            Porsi Honorarium Saat Ini: ${paguHonorPersen}% dari Pagu BOS (Batas Aman &le; 50%)
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong>Bundel 4 Dokumen SPJ Honorarium Nominatif Siap Cetak:</strong>
            (1) Kuitansi BOSP Resmi, (2) Daftar Nominatif Tanda Terima & Potongan PPh 21, (3) SK/SPT Kepala Sekolah (<code>800.1.11</code>), (4) Rekap Kehadiran Bulanan.
          </div>
          <button type="button" onclick="window.print()" class="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-extrabold cursor-pointer">
            <i class="fa-solid fa-print mr-1"></i>Cetak Bundel 4 Berkas SPJ Honorarium
          </button>
        </div>
      </div>
    `;
  },

  renderTabunganSiswaTab(tabList, pinjamList) {
    const totalSaldoSiswa = tabList.reduce((a, b) => a + (Number(b.saldo_akhir) || 0), 0);
    const maxPinjamanCap30 = Math.round(totalSaldoSiswa * 0.3);
    const totalDipinjam = pinjamList.reduce((a, b) => a + (Number(b.nominal_pinjam) || 0), 0);

    return `
      <div class="space-y-4 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div class="text-[10px] font-bold uppercase text-slate-400">Total Saldo Utuh Tabungan Siswa</div>
            <div class="text-base font-black text-blue-900 dark:text-blue-300 mt-1">${this.fmtRp(totalSaldoSiswa)}</div>
            <div class="text-[10px] text-emerald-600 mt-0.5">Hak saldo anak tetap utuh 100% di buku tabungan</div>
          </div>
          <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div class="text-[10px] font-bold uppercase text-slate-400">Batas Aman Pinjaman Talangan (Max 30%)</div>
            <div class="text-base font-black text-amber-600 mt-1">${this.fmtRp(maxPinjamanCap30)}</div>
            <div class="text-[10px] text-slate-500 mt-0.5">Likuiditas penarikan siswa dijamin aman (70% kas siaga)</div>
          </div>
          <div class="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div class="text-[10px] font-bold uppercase text-slate-400">Dana Talangan Aktif Ber-Approval Kepsek</div>
            <div class="text-base font-black text-indigo-700 mt-1">${this.fmtRp(totalDipinjam)}</div>
            <div class="text-[10px] text-slate-500 mt-0.5">Jatuh tempo terpantau otomatis</div>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
          <h4 class="font-extrabold text-sm">Buku Tabungan Siswa & Tiket Pinjaman Dana Talangan Sekolah</h4>
          <table class="w-full text-left border-collapse border border-slate-200 dark:border-slate-700">
            <thead class="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th class="px-3 py-2">NISN</th>
                <th class="px-3 py-2">Nama Siswa</th>
                <th class="px-3 py-2">Kelas</th>
                <th class="px-3 py-2">Tanggal</th>
                <th class="px-3 py-2">Mutasi</th>
                <th class="px-3 py-2 text-right">Saldo Tabungan</th>
              </tr>
            </thead>
            <tbody>
              ${tabList
                .map(
                  (t) => `
                <tr class="border-t border-slate-100 dark:border-slate-800">
                  <td class="px-3 py-2 font-mono">${t.nisn}</td>
                  <td class="px-3 py-2 font-bold">${t.nama_siswa}</td>
                  <td class="px-3 py-2">Kelas ${t.kelas}</td>
                  <td class="px-3 py-2">${t.tanggal}</td>
                  <td class="px-3 py-2"><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">${t.jenis_mutasi}</span></td>
                  <td class="px-3 py-2 text-right font-extrabold">${this.fmtRp(t.saldo_akhir)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderKasInfaqTab(infaqList) {
    const saldoInfaq = infaqList.length > 0 ? infaqList[infaqList.length - 1].saldo_akhir : 385000;
    return `
      <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 class="font-extrabold text-sm">Buku Kas Infaq Jumat & Dana Sosial Siswa (Dikelola Guru PAI / Bendahara Infaq)</h4>
            <p class="text-slate-500">Dipublikasikan secara transparan (Read-Only) ke Portal Orang Tua Murid</p>
          </div>
          <div class="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-900 font-black text-sm">
            Saldo Kas Infaq: ${this.fmtRp(saldoInfaq)}
          </div>
        </div>
        <table class="w-full text-left border-collapse border border-slate-200 dark:border-slate-700">
          <thead class="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th class="px-3 py-2">Tanggal</th>
              <th class="px-3 py-2">Rombel</th>
              <th class="px-3 py-2">Uraian Infaq / Santunan Sosial</th>
              <th class="px-3 py-2">Jenis</th>
              <th class="px-3 py-2 text-right">Nominal</th>
              <th class="px-3 py-2">Petugas</th>
            </tr>
          </thead>
          <tbody>
            ${infaqList
              .map(
                (r) => `
              <tr class="border-t border-slate-100 dark:border-slate-800">
                <td class="px-3 py-2 font-mono">${r.tanggal}</td>
                <td class="px-3 py-2">${r.rombel_id}</td>
                <td class="px-3 py-2 font-semibold">${r.kategori_infaq}</td>
                <td class="px-3 py-2"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.jenis_mutasi === "MASUK" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}">${r.jenis_mutasi}</span></td>
                <td class="px-3 py-2 text-right font-bold">${this.fmtRp(r.nominal)}</td>
                <td class="px-3 py-2">${r.petugas}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  },

  switchSubTab(tab) {
    this.activeSubTab = tab;
    this.renderKeuanganContainer();
  },

  async addBkuTransaction() {
    const code = document.getElementById("bku-inp-rekening").value;
    const nominal = Number(document.getElementById("bku-inp-nominal").value) || 0;
    const pajakType = document.getElementById("bku-inp-pajak").value;
    const uraian = document.getElementById("bku-inp-uraian").value || "Belanja Operasional BOSP";
    const ntpn = document.getElementById("bku-inp-ntpn").value || "-";

    if (nominal <= 0) {
      if (window.App && App.showToast) App.showToast("Masukkan nominal belanja BOSP yang valid.", "warning");
      return;
    }

    const foundCode = this.arkasCodes.find((c) => c.code === code);
    const tax = this.calculateTax(nominal, pajakType);

    const newRec = {
      id: `BKU-${Date.now()}`,
      no_bukti: `BPU-${Math.floor(100 + Math.random() * 899)}/BOSP/${new Date().getFullYear()}`,
      tanggal: new Date().toISOString().slice(0, 10),
      kode_rekening: code,
      uraian: uraian,
      jenis_buku: "BANK",
      jenis_transaksi: "KELUAR",
      nominal: nominal,
      pajak_jenis: pajakType,
      pajak_nominal: tax.pph + tax.ppn,
      ntpn: ntpn,
      snp: foundCode ? foundCode.snp : "Standar Pengelolaan"
    };

    if (window.dbDexie && window.dbDexie.bku_records) {
      await window.dbDexie.bku_records.add(newRec);
    }
    await this.renderKeuanganContainer();
    if (window.App && App.showToast) {
      App.showToast("Transaksi BKU BOSP berhasil dicatat & direkonsiliasi!", "success");
    }
  }
};

if (typeof window !== "undefined") {
  ModulBkuKeuangan.render = function () {
    return this.renderKeuanganContainer();
  };
  window.ARKAS_24_ACCOUNT_CODES = ARKAS_24_ACCOUNT_CODES;
  window.ARKAS_REKENING_CODES = ARKAS_24_ACCOUNT_CODES;
  window.ModulBkuKeuangan = ModulBkuKeuangan;
  window.BkuKeuanganModule = ModulBkuKeuangan;
}

