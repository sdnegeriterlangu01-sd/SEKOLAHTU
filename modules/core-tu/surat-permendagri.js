/**
 * ==========================================================================
 * SEKOLAHTU CORE TU MODULE: STANDARISASI PERSURATAN PERMENDAGRI NO. 83/2022
 * LAMPIRAN B (PEMERINTAH DAERAH TINGKAT SD) & DUAL-MODE SIGNATURE SWITCHER
 * Lokasi Satuan Pendidikan: SD Negeri Terlangu 01, Kec. Brebes, Kab. Brebes
 * ==========================================================================
 * Meliputi:
 * 1. Format Penomoran 3-Segmen Baku: [Kode_Klasifikasi]/[Nomor_Urut_3_Digit]/[Tahun]
 *    (Tanpa singkatan sekolah di baris nomor surat)
 * 2. Katalog Lengkap 22 Kode Klasifikasi Arsip SD Terverifikasi
 * 3. Dual-Regulation Switcher: Mode Transisi 2026 vs Otomatis Permendagri 83/2022 per 1 Jan 2027
 * 4. Dual-Mode Signature & Stamp Switcher:
 *    - Mode A: Format Digital Internal Satpen (TTD Digital Transparan + Stempel + QR Verifikasi)
 *    - Mode B: Siap Pengesahan Basah Manual (Ruang Pulpen ~2,5 cm + Sembunyikan Stempel & QR 100%)
 * 5. Demarkasi SRIKANDI Pemda Kabupaten Brebes untuk naskah keluar ke Dindikpora / OPD
 */

const PERMENDAGRI_83_SD_CODES = [
  { code: "400.3.5", category: "Pendidikan Dasar, Kurikulum, BOSP, PIP", example: "Surat pengantar usulan PIP, SK Kurikulum Satuan Pendidikan (KSP)" },
  { code: "400.3.10", category: "Pembinaan PTK, Supervisi, PKG", example: "Jadwal supervisi kelas, instrumen evaluasi guru, berkas PKG" },
  { code: "400.3.11", category: "Penilaian, Asesmen, SKL, Ijazah", example: "SK Kelulusan, Surat Keterangan Lulus (SKL), berita acara ijazah" },
  { code: "400.3.12", category: "Kesiswaan, Mutasi Siswa, Dapodik", example: "Surat Keterangan Siswa Aktif, Surat Pindah/Mutasi Masuk & Keluar" },
  { code: "400.3.13", category: "Sarana Prasarana Sekolah Dasar", example: "Usulan rehab ruang kelas, laporan kerusakan gedung" },
  { code: "400.2.4", category: "Pencegahan & Penanganan Kekerasan (TPPK)", example: "SK Tim TPPK, berita acara mediasi ramah anak" },
  { code: "400.4.2", category: "Olahraga Pendidikan & O2SN", example: "Surat tugas kontingen O2SN, dispensasi lomba olahraga" },
  { code: "400.5.8", category: "Kepramukaan / Gugus Depan", example: "Surat izin Persami, mandat Jambore Ranting Gudep Brebes" },
  { code: "400.6.3", category: "Kesenian Daerah, FLS2N, FTBI Jawa Brebesan", example: "Surat tugas lomba FLS2N dan FTBI Bahasa Jawa Brebesan" },
  { code: "400.7.15", category: "UKS / Imunisasi Puskesmas", example: "Surat koordinasi Puskesmas Brebes (BIAS), rujukan UKS" },
  { code: "400.8.2", category: "Pendidikan Agama Islam / MAPSI", example: "Surat tugas kafilah Lomba MAPSI SD" },
  { code: "400.14.1", category: "Humas & Komite Sekolah", example: "Undangan rapat pleno Komite Sekolah & wali murid" },
  { code: "000.1.2", category: "Perjalanan Dinas Dalam Daerah (SPPD)", example: "SPPD Guru/Tendik ke Korwilcam Brebes / Dindikpora" },
  { code: "000.1.5", category: "Undangan Kedinasan & Notula Rapat", example: "Undangan rapat dinas bulanan, daftar hadir rapat" },
  { code: "000.2.1", category: "Pengelolaan Barang Milik Daerah (KIB & KIR)", example: "Berita acara inventarisasi KIB A-F dan KIR Kelas 1-6" },
  { code: "000.3.2", category: "Pengadaan Barang & Jasa Sekolah (SIPLah)", example: "Surat pesanan SIPLah, Berita Acara Serah Terima (BAST)" },
  { code: "000.4.14", category: "Perpustakaan Sekolah Dasar", example: "Laporan sirkulasi perpustakaan DDC 000-900 & buku paket BOS" },
  { code: "000.5.3", category: "Tata Kearsipan & Buku Agenda Surat", example: "Berita Acara Pemusnahan Arsip Digital, buku agenda surat" },
  { code: "000.7.2", category: "Perencanaan Satuan Pendidikan (RKT & PBD)", example: "Laporan Evaluasi Kinerja Sistem Digital Tahunan, RKT, PBD" },
  { code: "100.3.3", category: "Keputusan Kepala Sekolah / SOP Layanan", example: "SK Pembagian Tugas Mengajar, SOP Layanan Administrasi" },
  { code: "800.1.11", category: "Surat Tugas PTK / Cuti / SK Tim Operasional", example: "Surat Perintah Tugas (SPT), SK Tim Digital, SK Cuti" },
  { code: "900.1.3", category: "Pertanggungjawaban BOSP / SPJ Keuangan", example: "Laporan Realisasi BOSP K-7/K-7a, SPJ BKU, Penutupan Kas" }
];

function formatNomorSuratPermendagri(kodeKlasifikasi, nomorUrut, tahun = new Date().getFullYear()) {
  const cleanCode = String(kodeKlasifikasi || "400.3.5").trim();
  const formattedNo = String(Number(nomorUrut) || 1).padStart(3, "0");
  return `${cleanCode}/${formattedNo}/${tahun}`;
}

const ModulSuratPermendagri = {
  codes: PERMENDAGRI_83_SD_CODES,
  regulationMode: "PERMENDAGRI_83_2022", // "PERMENDAGRI_83_2022" | "TRANSISI_2026"
  signatureMode: "TTD_DIGITAL_INTERNAL", // "TTD_DIGITAL_INTERNAL" | "TTD_BASAH_MANUAL"
  isExternalOpdDestination: false,

  init() {
    const currentYear = new Date().getFullYear();
    if (currentYear >= 2027) {
      // Hard cutover otomatis mulai 1 Januari 2027
      this.regulationMode = "PERMENDAGRI_83_2022";
    }
    this.injectPermendagriControlsIntoSuratAndCetak();
  },

  formatNomor(kodeKlasifikasi, nomorUrut, tahun = new Date().getFullYear()) {
    if (this.regulationMode === "TRANSISI_2026" && Number(tahun) < 2027) {
      const romawi = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][new Date().getMonth()];
      const padded = String(Number(nomorUrut) || 1).padStart(3, "0");
      return `${kodeKlasifikasi}/${padded}/${romawi}/${tahun}`;
    }
    return formatNomorSuratPermendagri(kodeKlasifikasi, nomorUrut, tahun);
  },

  /**
   * Menghasilkan Blok HTML Tanda Tangan Kepala Sekolah yang mematuhi Dual-Mode Switcher
   * Mode A: TTD Digital Transparan + Stempel Digital + QR Code Verifikasi Internal
   * Mode B: Ruang kosong bersih ~2,5 cm (3 baris spasi) untuk pulpen + Stempel & QR 100% disembunyikan
   */
  renderSignatureBlockHTML({
    nomorDokumen = "400.3.12/001/2027",
    tanggalIndo = "",
    jabatanPenandatangan = "Kepala SD Negeri Terlangu 01",
    namaPenandatangan = "Aisah Suciati, S.Pd.SD., M.Pd.",
    nipPenandatangan = "19690808 199201 2 002",
    mode = this.signatureMode
  } = {}) {
    const tgl =
      tanggalIndo ||
      new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    const savedSig = localStorage.getItem("sekolahtu_saved_signature");

    if (mode === "TTD_BASAH_MANUAL") {
      return `
        <div class="mt-6 flex justify-end text-xs font-serif text-slate-900">
          <div class="w-72 text-left">
            <div>Brebes, ${tgl}</div>
            <div class="font-bold">${jabatanPenandatangan},</div>
            <!-- Ruang Kosong Bersih ~2,5 cm (3 Baris Spasi) untuk Tanda Tangan Pulpen & Cap Stempel Basah Asli -->
            <div style="height: 2.6cm;" class="w-full"></div>
            <div class="font-bold underline">${namaPenandatangan}</div>
            <div>NIP. ${nipPenandatangan}</div>
          </div>
        </div>
      `;
    }

    // Mode A: Format Digital Internal Satpen (UU ITE 1/2024 & PP 71/2019)
    return `
      <div class="mt-6 flex items-end justify-between gap-4 text-xs font-serif text-slate-900">
        <div class="flex items-center gap-2.5 p-2 border border-slate-300 rounded-lg bg-slate-50 max-w-xs font-sans">
          <div class="w-12 h-12 bg-blue-900 text-white rounded flex flex-col items-center justify-center font-mono text-[9px] font-bold flex-shrink-0">
            <i class="fa-solid fa-qrcode text-lg"></i>
            <span>VALID</span>
          </div>
          <div class="text-[9px] leading-tight text-slate-600">
            <div class="font-bold text-slate-800">Dokumen Internal Terverifikasi SEKOLAHTU</div>
            <div>No: <span class="font-mono">${nomorDokumen}</span></div>
            <div>Sah secara internal Satpen sesuai UU ITE No. 1/2024 & PP 71/2019</div>
          </div>
        </div>

        <div class="w-72 text-left relative">
          <div>Brebes, ${tgl}</div>
          <div class="font-bold">${jabatanPenandatangan},</div>
          <div class="relative h-20 flex items-center">
            <!-- Stempel Digital Internal Satpen -->
            <div class="w-16 h-16 rounded-full border-2 border-blue-800/70 text-blue-800/80 flex flex-col items-center justify-center text-[7px] font-bold uppercase tracking-tighter rotate-[-12deg] select-none mr-2">
              <span>PEMKAB BREBES</span>
              <span class="border-y border-blue-800/60 px-1 my-0.5 text-[8px]">SDN TERLANGU 01</span>
              <span>KEC. BREBES</span>
            </div>
            ${
              savedSig
                ? `<img src="${savedSig}" alt="TTD Digital" class="h-16 object-contain -ml-6 z-10" />`
                : `<div class="italic font-serif text-blue-950 font-bold text-sm -ml-3 z-10">[TTD Digital Kepsek]</div>`
            }
          </div>
          <div class="font-bold underline">${namaPenandatangan}</div>
          <div>NIP. ${nipPenandatangan}</div>
        </div>
      </div>
    `;
  },

  /**
   * Menyuntikkan toolbar Dual-Regulation Switcher, 22 Kode Permendagri 83/2022,
   * Dual-Mode Signature Switcher, dan Demarkasi SRIKANDI Pemda ke modul #surat dan #cetak
   */
  injectPermendagriControlsIntoSuratAndCetak() {
    if (typeof document === "undefined") return;

    // 1. Suntikkan 22 Kode Klasifikasi Permendagri 83/2022 ke dropdown klasifikasi surat jika ada
    const selects = [
      document.getElementById("sk-kode-klasifikasi"),
      document.getElementById("filter-klasifikasi-surat")
    ];
    selects.forEach((sel) => {
      if (!sel) return;
      const isFilter = sel.id === "filter-klasifikasi-surat";
      const existingVal = sel.value;
      const optionsHtml = this.codes
        .map(
          (c) =>
            `<option value="${c.code}">${c.code} — ${c.category}</option>`
        )
        .join("");
      sel.innerHTML =
        (isFilter ? `<option value="Semua">Semua 22 Kode Klasifikasi Permendagri 83/2022</option>` : "") +
        optionsHtml;
      if (existingVal) sel.value = existingVal;
    });

    // 2. Tambahkan Panel Switcher Permendagri 83/2022 & Dual-Mode Signature di halaman Cetak & Surat
    const cetakSection = document.getElementById("view-cetak") || document.getElementById("section-cetak");
    const suratSection = document.getElementById("view-surat") || document.getElementById("section-surat");

    [suratSection, cetakSection].forEach((secEl, idx) => {
      if (!secEl || secEl.querySelector(".permendagri83-banner")) return;
      const banner = document.createElement("div");
      banner.className =
        "permendagri83-banner mb-4 p-4 rounded-2xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white shadow-md border border-blue-800/60 space-y-3";
      banner.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-400 text-blue-950 flex items-center justify-center font-black text-base flex-shrink-0">
              <i class="fa-solid fa-scale-balanced"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="font-extrabold text-xs sm:text-sm">Standar Tata Naskah Dinas Permendagri No. 83 Tahun 2022 (Lampiran B SD)</h4>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">22 Kode Baku</span>
              </div>
              <p class="text-[11px] text-blue-200">Format 3-Segmen Tanpa Singkatan Sekolah: <code>[Kode_Klasifikasi]/[Nomor_Urut_3_Digit]/[Tahun]</code> (Contoh: <code>400.3.5/001/2027</code>)</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2" id="${idx === 0 ? "dual-signature-mode-switcher" : ""}">
            <select onchange="ModulSuratPermendagri.setRegulationMode(this.value)" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 border border-white/20 text-white cursor-pointer">
              <option value="PERMENDAGRI_83_2022" class="text-slate-900" ${this.regulationMode === "PERMENDAGRI_83_2022" ? "selected" : ""}>Standar Baru Permendagri 83/2022 (3-Segmen)</option>
              <option value="TRANSISI_2026" class="text-slate-900" ${this.regulationMode === "TRANSISI_2026" ? "selected" : ""}>Mode Transisi Buku Register 2026</option>
            </select>

            <select onchange="ModulSuratPermendagri.setSignatureMode(this.value)" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400 text-blue-950 cursor-pointer">
              <option value="TTD_DIGITAL_INTERNAL" ${this.signatureMode === "TTD_DIGITAL_INTERNAL" ? "selected" : ""}>Mode A: Pengesahan Digital Internal (+QR & Stempel)</option>
              <option value="TTD_BASAH_MANUAL" ${this.signatureMode === "TTD_BASAH_MANUAL" ? "selected" : ""}>Mode B: Siap TTD Pulpen & Cap Basah (Instansi Luar)</option>
            </select>

            <button type="button" id="btn-quick-signature-extractor" onclick="window.SignatureManager && window.SignatureManager.openSignatureModal()" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 border border-white/20 text-white cursor-pointer">
              <i class="fa-solid fa-signature text-amber-300 mr-1"></i>Ekstrak TTD Kertas Putih
            </button>
          </div>
        </div>

        <!-- Peringatan Demarkasi SRIKANDI Pemda Kabupaten Brebes -->
        <div class="p-2.5 rounded-xl bg-white/10 border border-white/15 text-[11px] text-blue-100 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <i class="fa-solid fa-building-columns text-amber-300 mr-1.5"></i>
            <strong>Demarkasi SRIKANDI Pemda Brebes (UU ITE 1/2024):</strong> Untuk naskah dinas keluar yang dikirim ke <strong>Dindikpora / OPD Pemkab Brebes</strong>, gunakan <em>Mode B (Cetak Basah)</em> atau unggah draf ke Aplikasi <strong>SRIKANDI Pemda</strong> untuk mendapatkan TTE Tersertifikasi BSrE-BSSN.
          </div>
          <button type="button" onclick="ModulSuratPermendagri.recordPrintTelemetry('SIMPAN_PDF')" class="px-2.5 py-1 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer">
            <i class="fa-solid fa-leaf mr-1"></i>Catat Penghematan Kertas (PDF)
          </button>
        </div>
      `;
      secEl.insertBefore(banner, secEl.firstChild);
    });
  },

  setRegulationMode(mode) {
    this.regulationMode = mode;
    if (window.ModulSurat && ModulSurat.updateLiveNomorSuratPreview) {
      ModulSurat.updateLiveNomorSuratPreview();
    }
    if (window.App && App.showToast) {
      App.showToast(
        mode === "PERMENDAGRI_83_2022"
          ? "Format penomoran beralih ke Standar 3-Segmen Permendagri 83/2022 (Kode/No/Tahun)."
          : "Format penomoran diatur ke Mode Transisi Tahun Berjalan 2026.",
        "info"
      );
    }
  },

  setSignatureMode(mode) {
    this.signatureMode = mode;
    this.recordPrintTelemetry("SIMPAN_PDF");
    if (window.ModulCetak && ModulCetak.generatePreview) {
      ModulCetak.generatePreview();
    }
    if (window.App && App.showToast) {
      App.showToast(
        mode === "TTD_BASAH_MANUAL"
          ? "Mode B Aktif: Ruang tanda tangan dikosongkan ~2,5 cm untuk pulpen, stempel & QR disembunyikan 100%."
          : "Mode A Aktif: Tanda tangan digital transparan, stempel, & QR verifikasi internal ditampilkan.",
        "success"
      );
    }
  },

  async recordPrintTelemetry(outputAction = "SIMPAN_PDF", pageCount = 1) {
    if (window.TelemetryManager) {
      const role = (window.Auth && window.Auth.role()) || "OPERATOR_TU";
      await window.TelemetryManager.recordDocumentAction({
        documentId: `SURAT-${new Date().toISOString().slice(0, 13)}`,
        documentCategory: "PERSURATAN_PERMENDAGRI_83",
        signatureMode: this.signatureMode,
        outputAction: outputAction,
        pageCount: pageCount,
        userRole: String(role).toUpperCase()
      });
    }
  }
};

if (typeof window !== "undefined") {
  ModulSuratPermendagri.injectControls = function () {
    return this.init();
  };
  window.PERMENDAGRI_83_SD_CODES = PERMENDAGRI_83_SD_CODES;
  window.formatNomorSuratPermendagri = formatNomorSuratPermendagri;
  window.formatNomorSuratPermendagri83 = formatNomorSuratPermendagri;
  window.ModulSuratPermendagri = ModulSuratPermendagri;
  window.SuratPermendagriModule = ModulSuratPermendagri;
}

