/**
 * ==========================================================================
 * SEKOLAHTU SHARED LIBRARY: API CLIENT & JITTERED STAGGERED QUEUE ANTI-CRASH
 * Lokasi Satuan Pendidikan: SD Negeri Terlangu 01, Kec. Brebes, Kab. Brebes
 * ==========================================================================
 * Mengamankan komunikasi ke Google Apps Script (Batas 30 Concurrent Executions)
 * untuk populasi 379 pengguna riil (183 Siswa + 13 Tendik + 183 Orang Tua).
 * Menyediakan:
 * 1. STABILITY_CONFIG & calculateStaggeredDelay(rombelIndex)
 * 2. Antrean pengiriman konkuren maksimal 4 HTTP request per perangkat
 * 3. Penyimpanan otomatis ke tabel `sync_queue` IndexedDB saat Offline
 * 4. Wrapper 20+1 Endpoint REST API Code.gs v4.0
 */

const STABILITY_CONFIG = {
  // Demografi Riil SDN Terlangu 01
  TOTAL_STUDENTS: 183,
  TOTAL_STAFF: 13,
  TOTAL_PARENTS: 183,

  // Pengaturan Jittered Staggered Queue (Mencegah Crash Limit 30 Concurrent GAS)
  MAX_CONCURRENT_DISPATCH: 4,          // Maksimal 4 HTTP request aktif simultan per gawai
  BASE_JITTER_MS: 1500,                // Jitter dasar 1,5 detik
  MAX_JITTER_MS: 15000,                // Jitter maksimal 15 detik
  STAGGER_PER_ROMBEL_MS: 12000,        // Jeda staggered antar-tingkat rombel (12 detik)

  // Ketahanan Offline-First
  OFFLINE_RETRY_INTERVAL_MS: 5000,     // Pengecekan koneksi tiap 5 detik jika offline
  MAX_OFFLINE_QUEUE_ITEMS: 500,        // Mampu menampung 500 transaksi tunda di IndexedDB

  // Standar Ukuran Data Mikro
  MAX_SIGNATURE_SIZE_KB: 50,           // TTD transparan maksimal 50 KB
  MAX_DOCUMENT_SIZE_KB: 800            // Foto arsip surat maksimal 800 KB
};

/**
 * Algoritma Penundaan Acak (Jitter Calculation) Sebelum Dispatch ke GAS
 */
function calculateStaggeredDelay(rombelIndex = 0) {
  const safeRombel = Math.max(0, Number(rombelIndex) || 0);
  const rombelStagger = safeRombel * STABILITY_CONFIG.STAGGER_PER_ROMBEL_MS;
  const randomJitter =
    Math.floor(
      Math.random() * (STABILITY_CONFIG.MAX_JITTER_MS - STABILITY_CONFIG.BASE_JITTER_MS)
    ) + STABILITY_CONFIG.BASE_JITTER_MS;
  return rombelStagger + randomJitter;
}

class SekolahtuEnterpriseApiClient {
  constructor(dbDexie) {
    this.db = dbDexie || (typeof window !== "undefined" ? window.dbDexie : null);
    this.activeRequests = 0;
    this.memoryQueue = [];
    this.isFlushingOfflineQueue = false;
    this._bindNetworkListeners();
  }

  _bindNetworkListeners() {
    if (typeof window === "undefined") return;
    window.addEventListener("online", () => {
      this.flushOfflineQueue();
    });
    setInterval(() => {
      if (navigator.onLine) {
        this.flushOfflineQueue();
      }
    }, STABILITY_CONFIG.OFFLINE_RETRY_INTERVAL_MS * 3);
  }

  /**
   * Menentukan target Spreadsheet dari nama action
   */
  resolveTargetSheet(action) {
    const akademikActions = ["pushRekapNilai", "getMediaAjarModuleBundle"];
    const cbtPerpusActions = ["publishPaketUjian", "submitHasilUjian", "syncSirkulasiPerpus"];
    if (akademikActions.includes(action)) return "DB_AKADEMIK_DAN_SUPERVISI";
    if (cbtPerpusActions.includes(action)) return "DB_CBT_PERPUS_EKSKUL";
    return "DB_MASTER_SEKOLAHTU";
  }

  /**
   * Pengiriman ke GAS dengan kontrol antrean konkuren & opsi Staggered Jitter
   */
  async dispatch(action, payload = {}, options = {}) {
    const useJitter = options.useJitter === true;
    const rombelIndex = options.rombelIndex || 0;
    const targetSheet = this.resolveTargetSheet(action);

    // Jika sedang offline, langsung amankan ke sync_queue IndexedDB
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return this.enqueueOfflineAction(action, payload, targetSheet);
    }

    if (useJitter) {
      const delayMs = options.customDelayMs !== undefined
        ? options.customDelayMs
        : calculateStaggeredDelay(rombelIndex);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return new Promise((resolve) => {
      this.memoryQueue.push({ action, payload, targetSheet, resolve });
      this._processMemoryQueue();
    });
  }

  async _processMemoryQueue() {
    if (
      this.activeRequests >= STABILITY_CONFIG.MAX_CONCURRENT_DISPATCH ||
      this.memoryQueue.length === 0
    ) {
      return;
    }

    const item = this.memoryQueue.shift();
    this.activeRequests++;

    try {
      let response;
      if (typeof window !== "undefined" && window.ApiClient && window.ApiClient.isCloudActive()) {
        response = await window.ApiClient.cloudCall(item.action, {
          ...item.payload,
          _targetSpreadsheet: item.targetSheet
        });
      } else {
        response = {
          success: true,
          localMode: true,
          action: item.action,
          targetSheet: item.targetSheet,
          timestamp: new Date().toISOString()
        };
      }
      item.resolve(response);
    } catch (err) {
      const queued = await this.enqueueOfflineAction(item.action, item.payload, item.targetSheet);
      item.resolve(queued);
    } finally {
      this.activeRequests = Math.max(0, this.activeRequests - 1);
      this._processMemoryQueue();
    }
  }

  async enqueueOfflineAction(action, payload, targetSheet = "DB_MASTER_SEKOLAHTU") {
    if (this.db && this.db.sync_queue) {
      const currentCount = await this.db.sync_queue.count();
      if (currentCount < STABILITY_CONFIG.MAX_OFFLINE_QUEUE_ITEMS) {
        await this.db.sync_queue.add({
          action,
          payload,
          target_sheet: targetSheet,
          status: "PENDING",
          created_at: new Date().toISOString(),
          retry_count: 0
        });
      }
    }
    return {
      success: true,
      offlineQueued: true,
      action,
      message: "Disimpan di Antrean Pengiriman Data Bertahap Anti-Macet (Offline Queue)."
    };
  }

  async flushOfflineQueue() {
    if (this.isFlushingOfflineQueue || !this.db || !this.db.sync_queue) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    this.isFlushingOfflineQueue = true;
    try {
      const pendingItems = await this.db.sync_queue.toArray();
      for (const item of pendingItems) {
        if (item.status === "COMPLETED") {
          await this.db.sync_queue.delete(item.id);
          continue;
        }
        // Jitter kecil 500ms-1500ms saat menguras antrean offline agar tidak membanjiri GAS
        await new Promise((r) => setTimeout(r, 500 + Math.floor(Math.random() * 1000)));
        const res = await this.dispatch(item.action, item.payload, { useJitter: false });
        if (res && res.success && !res.offlineQueued) {
          await this.db.sync_queue.delete(item.id);
        }
      }
    } catch (e) {
      console.warn("[EnterpriseApiClient] Flush offline queue warning:", e);
    } finally {
      this.isFlushingOfflineQueue = false;
    }
  }

  // ==========================================================================
  // WRAPPER 20 + 1 ENDPOINT REST API BAKU FASE 1
  // ==========================================================================
  getInitialBundle(params = {}) { return this.dispatch("getInitialBundle", params); }
  pushRekapNilai(data) { return this.dispatch("pushRekapNilai", data, { useJitter: true, customDelayMs: 1500 }); }
  publishPaketUjian(data) { return this.dispatch("publishPaketUjian", data); }
  submitHasilUjian(data, rombelIndex = 0) { return this.dispatch("submitHasilUjian", data, { useJitter: true, rombelIndex }); }
  backupIndexedDB(snapshot) { return this.dispatch("backupIndexedDB", snapshot); }
  getBackupGuru(params) { return this.dispatch("getBackupGuru", params); }
  syncSirkulasiPerpus(data) { return this.dispatch("syncSirkulasiPerpus", data); }
  pushAuditLog(logEntry) { return this.dispatch("pushAuditLog", logEntry); }
  uploadCapturedDocument(docData) { return this.dispatch("uploadCapturedDocument", docData); }
  reserveNomorSuratPermendagri(reqData) { return this.dispatch("reserveNomorSuratPermendagri", reqData); }
  getMediaAjarModuleBundle(params) { return this.dispatch("getMediaAjarModuleBundle", params); }
  getUserSessionRoles(userParams) { return this.dispatch("getUserSessionRoles", userParams); }
  verifyStudentPin(nisn, pinDdmm) { return this.dispatch("verifyStudentPin", { nisn, pin: pinDdmm }); }
  submitTabunganMutasi(mutasiData) { return this.dispatch("submitTabunganMutasi", mutasiData); }
  ajukanPinjamanTalangan(pinjamanData) { return this.dispatch("ajukanPinjamanTalangan", pinjamanData); }
  submitKasInfaq(infaqData) { return this.dispatch("submitKasInfaq", infaqData); }
  submitHonorariumPayroll(payrollData) { return this.dispatch("submitHonorariumPayroll", payrollData); }
  sendTelemetryBatch(entries) { return this.dispatch("recordTelemetryBatch", { entries }); }
  submitSusSurvey(surveyRecord) { return this.dispatch("submitSusSurvey", surveyRecord); }
  reportBugIssue(ticketData) { return this.dispatch("reportBugIssue", ticketData); }
  executeSecurePurge(purgeLog) { return this.dispatch("executeSecurePurge", purgeLog); }
}

if (typeof window !== "undefined") {
  window.STABILITY_CONFIG = STABILITY_CONFIG;
  window.calculateStaggeredDelay = calculateStaggeredDelay;
  window.SekolahtuEnterpriseApiClient = SekolahtuEnterpriseApiClient;
  window.EnterpriseApi = new SekolahtuEnterpriseApiClient(window.dbDexie);
}

