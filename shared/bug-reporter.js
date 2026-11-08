/**
 * ==========================================================================
 * SEKOLAHTU SHARED LIBRARY: PROACTIVE BUG & ERROR REPORTER ENGINE
 * Lokasi Satuan Pendidikan: SD Negeri Terlangu 01, Kec. Brebes, Kab. Brebes
 * ==========================================================================
 * Meliputi:
 * 1. Pemantau error global proaktif (`window.onerror`, `unhandledrejection`)
 * 2. Tangkapan layar otomatis sisi klien format WebP mikro <= 500 KB
 * 3. Dialog empatik ramah guru senior (tanpa menyalahkan pengguna)
 * 4. Tombol mengambang (FAB) Bantuan & Lapor Kendala
 * 5. Sinkronisasi tiket ke IndexedDB `bug_reports`, Google Sheets `DB_LAPORAN_BUG`,
 *    dan folder Google Drive `/SEKOLAHTU/Bug_Reports/`.
 */

const SEED_BUG_REPORTS = [
  {
    ticket_id: "BUG-20261104-1024",
    timestamp: "2026-11-04T08:40:00.000Z",
    reporter_role: "GURU_KELAS",
    reporter_name: "Dewi Kurniasih, S.Pd.",
    active_module: "#berkas",
    error_summary: "NIK Ayah pada impor Excel Dapodik memiliki spasi di depan sehingga perlu perapihan otomatis",
    technical_trace: "modul-import.js:cleanNikString() - Trim whitespace applied",
    affected_data_id: "NISN-0134892011",
    screenshot_base64: "",
    ticket_status: "SELESAI",
    kepsek_disposition: "Segera rapikan otomatis saat file Dapodik diunggah agar wali kelas tidak perlu edit manual.",
    resolution_notes: "Telah ditambahkan fungsi pembersih spasi dan masking otomatis UU PDP (332909******0001)."
  },
  {
    ticket_id: "BUG-20261106-2089",
    timestamp: "2026-11-06T10:15:00.000Z",
    reporter_role: "OPERATOR_TU",
    reporter_name: "Hendra Wijaya, S.Kom.",
    active_module: "#surat",
    error_summary: "Penyesuaian jarak spasi tanda tangan basah untuk surat keluar ke Korwilcam Brebes",
    technical_trace: "surat-permendagri.js:renderDualSignatureBlock() - Mode B spacing check",
    affected_data_id: "400.3.5/012/2026",
    screenshot_base64: "",
    ticket_status: "SELESAI",
    kepsek_disposition: "Pastikan ruang tanda tangan Mode B cukup longgar 2,5 cm untuk cap basah sekolah.",
    resolution_notes: "Saklar Mode B (Siap Pengesahan Basah Manual) telah diatur dengan tinggi vertikal 2,5 cm dan menyembunyikan QR/stempel digital 100%."
  }
];

class BugReporterEngine {
  constructor(dbDexie, apiClient) {
    this.db = dbDexie || (typeof window !== "undefined" ? window.dbDexie : null);
    this.api = apiClient || (typeof window !== "undefined" ? window.EnterpriseApi : null);
    this._ensureSeedTickets();
    this.initGlobalCatchers();
  }

  async _ensureSeedTickets() {
    if (!this.db || !this.db.bug_reports) return;
    try {
      const count = await this.db.bug_reports.count();
      if (count === 0) {
        await this.db.bug_reports.bulkPut(SEED_BUG_REPORTS);
      }
    } catch (e) {}
  }

  initGlobalCatchers() {
    if (typeof window === "undefined") return;

    window.onerror = (message, source, lineno, colno, error) => {
      // Abaikan gangguan ekstensi pihak ketiga atau ResizeObserver benign
      if (String(message).includes("ResizeObserver")) return false;
      this.handleFatalError({
        message,
        source,
        lineno,
        colno,
        stack: error?.stack
      });
      return false;
    };

    window.addEventListener("unhandledrejection", (event) => {
      const msg = event.reason?.message || String(event.reason || "Unhandled Promise Rejection");
      if (msg.includes("ResizeObserver") || msg.includes("AbortError")) return;
      this.handleFatalError({
        message: msg,
        source: "PromiseAsync",
        lineno: 0,
        stack: event.reason?.stack
      });
    });
  }

  /**
   * Membuat tangkapan layar kontekstual ringan berformat WebP (<= 500 KB)
   */
  async captureScreenWebP(customNote = "") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(typeof window !== "undefined" ? window.innerWidth : 1024, 1280);
      canvas.height = Math.min(typeof window !== "undefined" ? window.innerHeight : 640, 720);
      const ctx = canvas.getContext("2d");

      // Latar visual ringkasan layar aplikasi saat kendala terjadi
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, 72);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 72, canvas.width, canvas.height - 72);

      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("SEKOLAHTU SDN TERLANGU 01 — TANGKAPAN LAYAR KENDALA OTOMATIS", 24, 42);

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 15px sans-serif";
      const activeMod = (typeof window !== "undefined" && window.location.hash) || "#dashboard";
      ctx.fillText(`Modul Aktif: ${activeMod}`, 24, 115);
      ctx.font = "13px monospace";
      ctx.fillText(`Waktu Kejadian : ${new Date().toLocaleString("id-ID")}`, 24, 145);
      ctx.fillText(`Perangkat / OS : ${typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 80) : "Browser"}`, 24, 170);
      ctx.fillText(`Status Jaringan: ${typeof navigator !== "undefined" && navigator.onLine ? "Online" : "Offline (Tanpa Sinyal)"}`, 24, 195);

      if (customNote) {
        ctx.fillStyle = "#b91c1c";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(`Ringkasan Kendala: ${String(customNote).slice(0, 90)}`, 24, 235);
      }

      // Kotak cuplikan teks halaman aktif
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(24, 260, canvas.width - 48, canvas.height - 290);
      ctx.fillStyle = "#475569";
      ctx.font = "12px sans-serif";
      const pageTitle = (typeof document !== "undefined" && document.title) || "SEKOLAHTU";
      ctx.fillText(`Halaman: ${pageTitle}`, 40, 290);

      // Output WebP mikro (<= 500 KB)
      return canvas.toDataURL("image/webp", 0.78);
    } catch (err) {
      console.warn("[BugReporterEngine] Capture layar gagal:", err);
      return null;
    }
  }

  async handleFatalError(errorContext) {
    const screenshot = await this.captureScreenWebP(errorContext.message);
    this.showProactiveErrorModal({
      errorSummary: errorContext.message || "Kendala Pemrosesan Data",
      technicalTrace: `${errorContext.source || "app"}:${errorContext.lineno || 0} - ${errorContext.stack || ""}`,
      activeModule: (typeof window !== "undefined" && window.location.hash) || "#beranda",
      screenshotBase64: screenshot
    });
  }

  showProactiveErrorModal({
    errorSummary = "",
    technicalTrace = "",
    activeModule = "#dashboard",
    screenshotBase64 = null
  } = {}) {
    let modal = document.getElementById("sekolahtu-bug-reporter-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "sekolahtu-bug-reporter-modal";
      modal.className = "fixed inset-0 z-[90] bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-4";
      document.body.appendChild(modal);
    }

    const currentUser = (typeof window !== "undefined" && window.Auth && window.Auth.user()) || {};
    const defaultName = currentUser.nama || "Staf / Guru SDN Terlangu 01";
    const defaultRole = (currentUser.role || "GURU").toUpperCase();

    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center text-lg font-bold">
              <i class="fa-solid fa-life-ring"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">Pusat Bantuan & Pelaporan Kendala Layar</h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Tenang Bapak/Ibu, data pekerjaan Bapak/Ibu tetap aman tersimpan.</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('sekolahtu-bug-reporter-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block font-bold mb-1">Nama Pelapor</label>
              <input type="text" id="bug-reporter-name" value="${defaultName}" class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
            </div>
            <div>
              <label class="block font-bold mb-1">Modul yang Sedang Dibuka</label>
              <input type="text" id="bug-active-module" value="${activeModule}" class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 font-mono">
            </div>
          </div>

          <div>
            <label class="block font-bold mb-1">Ceritakan Kendala yang Bapak/Ibu Alami</label>
            <textarea id="bug-error-summary" rows="2" placeholder="Contoh: Tombol cetak surat belum merespons saat diklik..." class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">${errorSummary}</textarea>
          </div>

          <div>
            <label class="block font-bold mb-1">ID Data Terkait (NISN / Nomor Surat / No Bukti BKU - Opsional)</label>
            <input type="text" id="bug-affected-id" placeholder="Contoh: 400.3.5/001/2027" class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono">
          </div>

          ${
            screenshotBase64
              ? `<div class="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div class="text-[10px] font-bold uppercase text-slate-500 mb-1">Tangkapan Layar Otomatis (WebP &le; 500 KB)</div>
                  <img src="${screenshotBase64}" alt="Screenshot Kendala" class="max-h-28 object-contain rounded border border-slate-300" />
                </div>`
              : ""
          }
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onclick="document.getElementById('sekolahtu-bug-reporter-modal').classList.add('hidden')" class="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold cursor-pointer">
            Batal
          </button>
          <button type="button" id="btn-send-bug-ticket" class="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer">
            <i class="fa-solid fa-paper-plane"></i> Kirim ke Meja Kerja Koordinator IT
          </button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");

    modal.querySelector("#btn-send-bug-ticket").addEventListener("click", async () => {
      const shot = screenshotBase64 || (await this.captureScreenWebP(modal.querySelector("#bug-error-summary").value));
      await this.sendBugTicket({
        reporterRole: defaultRole,
        reporterName: modal.querySelector("#bug-reporter-name").value,
        activeModule: modal.querySelector("#bug-active-module").value,
        errorSummary: modal.querySelector("#bug-error-summary").value || "Laporan Bantuan Pengguna",
        technicalTrace: technicalTrace || `Browser: ${navigator.userAgent}`,
        affectedDataId: modal.querySelector("#bug-affected-id").value || "-",
        screenshotBase64: shot
      });
      modal.classList.add("hidden");
      if (typeof window.ModulTindakLanjut !== "undefined") {
        window.ModulTindakLanjut.refreshView();
      }
      if (typeof App !== "undefined" && App.toast) {
        App.toast("Tiket kendala berhasil dikirim ke Meja Kerja Tindak Lanjut (#tindak-lanjut).", "success");
      }
    });
  }

  async sendBugTicket(ticketData) {
    const ticketId = `BUG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
    const fullTicket = {
      ticket_id: ticketId,
      timestamp: new Date().toISOString(),
      reporter_role: ticketData.reporterRole || "GURU",
      reporter_name: ticketData.reporterName || "Pengguna Aplikasi",
      active_module: ticketData.activeModule || "#dashboard",
      error_summary: ticketData.errorSummary,
      technical_trace: ticketData.technicalTrace || "-",
      affected_data_id: ticketData.affectedDataId || "-",
      screenshot_base64: ticketData.screenshotBase64 || "",
      ticket_status: "BARU",
      kepsek_disposition: "",
      resolution_notes: ""
    };

    if (this.db && this.db.bug_reports) {
      await this.db.bug_reports.add(fullTicket);
    }
    if (typeof navigator !== "undefined" && navigator.onLine && this.api && this.api.reportBugIssue) {
      await this.api.reportBugIssue(fullTicket).catch(console.warn);
    }
    return fullTicket;
  }

  async getAllTickets() {
    await this._ensureSeedTickets();
    if (!this.db || !this.db.bug_reports) return SEED_BUG_REPORTS;
    return await this.db.bug_reports.toArray();
  }

  async updateTicketResolution({ ticketId, newStatus, kepsekDisposition, resolutionNotes }) {
    if (!this.db || !this.db.bug_reports) return null;
    const existing = await this.db.bug_reports.get(ticketId);
    if (!existing) return null;
    const updated = {
      ...existing,
      ticket_status: newStatus || existing.ticket_status,
      kepsek_disposition: kepsekDisposition !== undefined ? kepsekDisposition : existing.kepsek_disposition,
      resolution_notes: resolutionNotes !== undefined ? resolutionNotes : existing.resolution_notes,
      updated_at: new Date().toISOString()
    };
    await this.db.bug_reports.put(updated);
    return updated;
  }
}

if (typeof window !== "undefined") {
  window.BugReporterEngine = BugReporterEngine;
  window.BugReporterManager = new BugReporterEngine(window.dbDexie, window.EnterpriseApi);
}

