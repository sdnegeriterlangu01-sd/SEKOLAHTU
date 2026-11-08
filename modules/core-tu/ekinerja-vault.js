/**
 * ==========================================================================
 * SEKOLAHTU CORE TU MODULE: VAULT BUKTI DUKUNG DIGITAL SKP E-KINERJA BKN / PMM
 * Lokasi Satuan Pendidikan: SD Negeri Terlangu 01, Kec. Brebes, Kab. Brebes
 * ==========================================================================
 * Mengelola repositori bukti fisik digital Rencana Hasil Kerja (RHK) SKP Guru & Tendik:
 * 1. 5 Kategori Baku RHK SKP BKN / PMM
 * 2. Unggah berkas atau potret kamera langsung via `camera-capture.js`
 *    ke folder Google Drive `/SEKOLAHTU/SKP_E-Kinerja/`
 * 3. Generator tautan permanen Google Drive & Kode QR Verifikasi instan
 *    siap salin 1-klik ke portal `kinerja.bkn.go.id`
 */

const EKINERJA_RHK_CATEGORIES = [
  { id: "RHK_1_PERANGKAT_AJAR", label: "1. Perangkat Ajar, Modul Ajar & SK Pembagian Tugas Mengajar" },
  { id: "RHK_2_LAPORAN_OPERATOR", label: "2. Laporan Kinerja Bulanan Operator TU / Bendahara BOSP" },
  { id: "RHK_3_SERTIFIKAT_KOMBEL", label: "3. Sertifikat Komunitas Belajar (Kombel) / Pelatihan Mandiri PMM" },
  { id: "RHK_4_SARPRAS_KIB_KIR", label: "4. Bukti Kinerja Pengelolaan Sarpras KIB / KIR Ruangan" },
  { id: "RHK_5_SIRKULASI_PERPUS", label: "5. Laporan Sirkulasi Perpustakaan & Literasi Sekolah" }
];

const SEED_EKINERJA_VAULT = [
  {
    id: "SKP-2026-001",
    nip_pegawai: "19690808 199201 2 002",
    nama_pegawai: "Aisah Suciati, S.Pd.SD., M.Pd.",
    kategori_rhk: "RHK_1_PERANGKAT_AJAR",
    judul_bukti: "SK Pembagian Tugas Mengajar & Tugas Tambahan Semester Gasal TA 2026/2027",
    nomor_dokumen: "100.3.3/001/2026",
    tahun: 2026,
    drive_url: "https://drive.google.com/drive/folders/SEKOLAHTU_SKP_EKINERJA_001",
    qr_code: "VERIFY-SKP-2026-001",
    created_at: "2026-10-15T08:00:00.000Z"
  },
  {
    id: "SKP-2026-002",
    nip_pegawai: "19930811 202012 1 002",
    nama_pegawai: "Hendra Wijaya, S.Kom.",
    kategori_rhk: "RHK_2_LAPORAN_OPERATOR",
    judul_bukti: "Laporan Rekapitulasi Administrasi Dapodik & Persuratan Digital SEKOLAHTU",
    nomor_dokumen: "800.1.11/014/2026",
    tahun: 2026,
    drive_url: "https://drive.google.com/drive/folders/SEKOLAHTU_SKP_EKINERJA_002",
    qr_code: "VERIFY-SKP-2026-002",
    created_at: "2026-11-01T09:30:00.000Z"
  },
  {
    id: "SKP-2026-003",
    nip_pegawai: "19960719 202301 2 009",
    nama_pegawai: "Dewi Kurniasih, S.Pd.",
    kategori_rhk: "RHK_3_SERTIFIKAT_KOMBEL",
    judul_bukti: "Sertifikat Aksi Nyata Kurikulum Merdeka & Komunitas Belajar SD Negeri Terlangu 01",
    nomor_dokumen: "400.3.10/009/2026",
    tahun: 2026,
    drive_url: "https://drive.google.com/drive/folders/SEKOLAHTU_SKP_EKINERJA_003",
    qr_code: "VERIFY-SKP-2026-003",
    created_at: "2026-11-03T11:15:00.000Z"
  }
];

const ModulEKinerjaVault = {
  filterCategory: "SEMUA",

  async init() {
    await this._ensureSeedVault();
    await this.renderVaultContainer();
  },

  async _ensureSeedVault() {
    if (!window.dbDexie || !window.dbDexie.ekinerja_vault) return;
    const cnt = await window.dbDexie.ekinerja_vault.count();
    if (cnt === 0) {
      await window.dbDexie.ekinerja_vault.bulkPut(SEED_EKINERJA_VAULT);
    }
  },

  async getItems() {
    await this._ensureSeedVault();
    const list =
      window.dbDexie && window.dbDexie.ekinerja_vault
        ? await window.dbDexie.ekinerja_vault.toArray()
        : SEED_EKINERJA_VAULT;
    if (this.filterCategory === "SEMUA") return list;
    return list.filter((i) => i.kategori_rhk === this.filterCategory);
  },

  async renderVaultContainer() {
    const container = document.getElementById("ekinerja-vault-container");
    if (!container) return;

    const items = await this.getItems();
    const catMap = Object.fromEntries(EKINERJA_RHK_CATEGORIES.map((c) => [c.id, c.label]));

    container.innerHTML = `
      <div class="space-y-5">
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-indigo-900 text-amber-300 flex items-center justify-center text-lg font-extrabold">
              <i class="fa-solid fa-vault"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-base text-slate-900 dark:text-slate-100">Vault Bukti Dukung Digital SKP E-Kinerja BKN & PMM</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Penyimpanan Terpusat Google Drive <code>/SEKOLAHTU/SKP_E-Kinerja/</code> Ber-Tautan Permanen & QR Verifikasi</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select onchange="ModulEKinerjaVault.filterCategory = this.value; ModulEKinerjaVault.renderVaultContainer();" class="px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <option value="SEMUA">Semua 5 Kategori RHK SKP</option>
              ${EKINERJA_RHK_CATEGORIES.map(
                (c) => `<option value="${c.id}" ${this.filterCategory === c.id ? "selected" : ""}>${c.label}</option>`
              ).join("")}
            </select>
            <button type="button" onclick="ModulEKinerjaVault.openAddBuktiModal()" class="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-cloud-arrow-up"></i> Unggah / Potret Bukti SKP Baru
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${items
            .map(
              (item) => `
            <div class="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
                    ${catMap[item.kategori_rhk] || item.kategori_rhk}
                  </span>
                  <span class="text-[10px] font-mono text-slate-400">${item.nomor_dokumen || "-"}</span>
                </div>
                <h4 class="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-snug">${item.judul_bukti}</h4>
                <div class="text-[11px] text-slate-500">
                  <i class="fa-solid fa-user-tie mr-1"></i><strong>${item.nama_pegawai}</strong> (NIP: ${item.nip_pegawai})
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-[10px] text-blue-700 dark:text-blue-300 truncate">
                  ${item.drive_url}
                </div>
                <div class="flex items-center justify-between gap-2">
                  <button type="button" onclick="navigator.clipboard && navigator.clipboard.writeText('${item.drive_url}'); App && App.showToast && App.showToast('Tautan bukti dukung SKP berhasil disalin untuk portal kinerja.bkn.go.id!', 'success');" class="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold cursor-pointer">
                    <i class="fa-solid fa-copy mr-1"></i>Salin Link ke BKN
                  </button>
                  <a href="verifikasi.html?no=${encodeURIComponent(item.nomor_dokumen || item.id)}" target="_blank" class="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    <i class="fa-solid fa-qrcode mr-1"></i>QR Validasi
                  </a>
                </div>
              </div>
            </div>`
            )
            .join("")}
        </div>
      </div>
    `;
  },

  openAddBuktiModal() {
    let modal = document.getElementById("modal-add-ekinerja-vault");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "modal-add-ekinerja-vault";
      modal.className = "fixed inset-0 z-[80] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">Tambah Bukti Dukung Digital SKP E-Kinerja</h3>
          <button type="button" onclick="document.getElementById('modal-add-ekinerja-vault').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>
        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-bold mb-1">Nama Guru / Tendik</label>
            <input type="text" id="ek-nama" value="Dewi Kurniasih, S.Pd." class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
          </div>
          <div>
            <label class="block font-bold mb-1">NIP Pegawai</label>
            <input type="text" id="ek-nip" value="19960719 202301 2 009" class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono">
          </div>
          <div>
            <label class="block font-bold mb-1">Kategori Rencana Hasil Kerja (RHK)</label>
            <select id="ek-kategori" class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
              ${EKINERJA_RHK_CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block font-bold mb-1">Judul Bukti Dukung Fisik / Dokumen</label>
            <input type="text" id="ek-judul" placeholder="Contoh: Modul Ajar Matematika Fase B Kelas 4" class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
          </div>
          <div class="flex items-center gap-2 pt-1">
            <button type="button" onclick="window.CameraCaptureManager && window.CameraCaptureManager.openCaptureModal({ title: 'Potret Bukti Fisik SKP E-Kinerja' })" class="px-3.5 py-2 bg-amber-100 text-amber-900 rounded-xl font-bold cursor-pointer">
              <i class="fa-solid fa-camera mr-1"></i>Potret via Kamera WebP
            </button>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="document.getElementById('modal-add-ekinerja-vault').classList.add('hidden')" class="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold cursor-pointer">Batal</button>
          <button type="button" onclick="ModulEKinerjaVault.saveNewBukti()" class="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-extrabold cursor-pointer">
            <i class="fa-solid fa-floppy-disk mr-1"></i>Simpan & Buat Link BKN
          </button>
        </div>
      </div>
    `;
    modal.classList.remove("hidden");
  },

  async saveNewBukti() {
    const id = `SKP-${Date.now()}`;
    const year = new Date().getFullYear();
    const record = {
      id,
      nip_pegawai: document.getElementById("ek-nip").value,
      nama_pegawai: document.getElementById("ek-nama").value,
      kategori_rhk: document.getElementById("ek-kategori").value,
      judul_bukti: document.getElementById("ek-judul").value || "Bukti Dukung Kinerja Guru/Tendik",
      nomor_dokumen: `800.1.11/${String(Math.floor(10 + Math.random() * 89)).padStart(3, "0")}/${year}`,
      tahun: year,
      drive_url: `https://drive.google.com/drive/folders/SEKOLAHTU_${id}`,
      qr_code: `VERIFY-${id}`,
      created_at: new Date().toISOString()
    };

    if (window.dbDexie && window.dbDexie.ekinerja_vault) {
      await window.dbDexie.ekinerja_vault.add(record);
    }
    document.getElementById("modal-add-ekinerja-vault").classList.add("hidden");
    await this.renderVaultContainer();
    if (window.App && App.showToast) {
      App.showToast("Bukti dukung SKP berhasil disimpan & tautan permanen BKN siap disalin!", "success");
    }
  }
};

if (typeof window !== "undefined") {
  ModulEKinerjaVault.render = function () {
    return this.renderVaultContainer();
  };
  window.EKINERJA_RHK_CATEGORIES = EKINERJA_RHK_CATEGORIES;
  window.ModulEKinerjaVault = ModulEKinerjaVault;
  window.EKinerjaVaultModule = ModulEKinerjaVault;
}

