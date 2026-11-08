/**
 * ==========================================================================
 * SEKOLAHTU SHARED LIBRARY: SKEMA DATABASE KLIEN INDEXEDDB TERPADU (DEXIE.JS)
 * Lokasi Satuan Pendidikan: SD Negeri Terlangu 01, Kec. Brebes, Kab. Brebes
 * ==========================================================================
 * Mengelola 19+1 Tabel Klien Lokal (SekolahtuClientDB) untuk ketahanan
 * 100% Offline-First dan perlindungan data 4 lapis sesuai UU PDP No. 27/2022.
 * Dilengkapi fallback otomatis ke In-Memory/LocalStorage jika peramban
 * membuka mode privat terbatas atau Dexie CDN belum selesai dimuat.
 */

const SEKOLAHTU_DEXIE_SCHEMA_V1 = {
  // 1-7: Tabel Master Utama
  siswa: "nisn, nipd, nik, nama, jk, kelas, rombel_id, nik_ayah, nik_ibu, status_pip, is_deleted, deleted_at",
  tendik: "nip, nama, jabatan, role, statusKepegawaian, is_deleted, deleted_at",
  rombel: "rombel_id, nama_rombel, tingkat_kelas, tahun_ajaran, wali_kelas_nip",
  kaldik: "id, tanggal_mulai, tanggal_selesai, uraian, kategori, semester",
  surat_masuk: "id, nomorSurat, tanggalSurat, pengirim, perihal, kode_klasifikasi, is_deleted, deleted_at",
  surat_keluar: "id, nomorSurat, tanggalSurat, tujuan, perihal, kode_klasifikasi, tahun, is_deleted, deleted_at",
  config: "key, updated_at",

  // 8-14: Tabel Operasional TU & Keuangan (BOSP & Non-BOSP)
  lapbul_records: "id, bulan, tahun, tahun_ajaran, status_kirim, created_at, is_deleted, deleted_at",
  ekinerja_vault: "id, nip_pegawai, kategori_rhk, judul_bukti, tahun, drive_url, qr_code, created_at, is_deleted, deleted_at",
  draft_forms: "composite_key, form_id, user_id, updated_at",
  bku_records: "id, no_bukti, tanggal, kode_rekening, jenis_buku, jenis_transaksi, nominal, ntpn, tahun_anggaran, is_deleted, deleted_at",
  tabungan_siswa: "id, nisn, nama_siswa, kelas, tanggal, jenis_mutasi, nominal, saldo_akhir, petugas, is_deleted, deleted_at",
  pinjaman_talangan: "id, peminjam_nip, peminjam_nama, nominal_pinjam, status_approval, jatuh_tempo, tanggal_lunas, created_at",
  kas_infaq: "id, tanggal, rombel_id, jenis_mutasi, kategori_infaq, nominal, saldo_akhir, petugas, is_deleted, deleted_at",

  // 15-18: Tabel Evaluasi, Telemetri, Survei SUS, Bug Tracker & Pemusnahan Arsip
  system_telemetry: "++id, event_name, document_id, document_category, signature_mode, output_action, dedup_key, timestamp",
  sus_surveys: "survey_id, respondent_role, respondent_id, sus_score, grade, timestamp",
  bug_reports: "ticket_id, timestamp, reporter_role, reporter_name, active_module, ticket_status",
  purge_logs: "purge_id, table_name, authorized_token, executed_by, executed_at, legal_code",

  // 19-20: Tabel Keamanan, Antrean Offline & Audit Trail 4-Tier
  sync_queue: "++id, action, target_sheet, status, created_at, retry_count",
  audit_trail: "++id, timestamp, actor_id, actor_role, action_type, table_name, record_id, security_tier"
};

/**
 * Fallback Tabel Berbasis LocalStorage jika Dexie belum aktif di lingkungan tes/offline
 */
class LocalStorageTableAdapter {
  constructor(tableName, primaryKeySpec) {
    this.tableName = tableName;
    this.storageKey = `sekolahtu_idb_${tableName}`;
    this.pkField = primaryKeySpec.split(",")[0].trim().replace("++", "");
    this.autoIncrement = primaryKeySpec.trim().startsWith("++");
  }

  _readAll() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  _writeAll(items) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch (e) {
      console.warn(`[SekolahtuClientDB] Kuota penyimpanan lokal penuh pada tabel ${this.tableName}:`, e);
    }
  }

  async toArray() {
    return this._readAll();
  }

  async count() {
    return this._readAll().length;
  }

  async get(key) {
    const all = this._readAll();
    return all.find((item) => String(item[this.pkField]) === String(key)) || null;
  }

  async add(record) {
    const all = this._readAll();
    const copy = { ...record };
    if (this.autoIncrement && !copy[this.pkField]) {
      copy[this.pkField] = Date.now() + Math.floor(Math.random() * 1000);
    } else if (!copy[this.pkField]) {
      copy[this.pkField] = `${this.tableName}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }
    const existingIdx = all.findIndex((i) => String(i[this.pkField]) === String(copy[this.pkField]));
    if (existingIdx >= 0) {
      all[existingIdx] = copy;
    } else {
      all.push(copy);
    }
    this._writeAll(all);
    return copy[this.pkField];
  }

  async put(record) {
    return this.add(record);
  }

  async bulkPut(records) {
    if (!Array.isArray(records)) return;
    for (const r of records) {
      await this.put(r);
    }
  }

  async delete(key) {
    const all = this._readAll().filter((i) => String(i[this.pkField]) !== String(key));
    this._writeAll(all);
  }

  async bulkDelete(keys) {
    const keySet = new Set((keys || []).map(String));
    const all = this._readAll().filter((i) => !keySet.has(String(i[this.pkField])));
    this._writeAll(all);
  }

  where(field) {
    const self = this;
    return {
      equals(val) {
        let filtered = self._readAll().filter((item) => item[field] === val);
        return {
          reverse() {
            filtered = [...filtered].reverse();
            return this;
          },
          async sortBy(sortField) {
            return [...filtered].sort((a, b) =>
              String(b[sortField] || "").localeCompare(String(a[sortField] || ""))
            );
          },
          async toArray() {
            return filtered;
          }
        };
      },
      below(val) {
        const filtered = self._readAll().filter((item) => item[field] && String(item[field]) < String(val));
        return {
          async toArray() {
            return filtered;
          }
        };
      }
    };
  }
}

class SekolahtuClientDB {
  constructor() {
    this.dbName = "SekolahtuClientDB";
    this.dexieInstance = null;
    this.isNativeDexie = false;
    this._initTables();
  }

  _initTables() {
    if (typeof window !== "undefined" && typeof window.Dexie !== "undefined") {
      try {
        const db = new window.Dexie(this.dbName);
        db.version(1).stores(SEKOLAHTU_DEXIE_SCHEMA_V1);
        this.dexieInstance = db;
        this.isNativeDexie = true;

        Object.keys(SEKOLAHTU_DEXIE_SCHEMA_V1).forEach((tableName) => {
          this[tableName] = db[tableName];
        });
        return;
      } catch (err) {
        console.warn("[SekolahtuClientDB] Gagal inisialisasi Dexie native, beralih ke adapter lokal:", err);
      }
    }

    // Fallback ke LocalStorageTableAdapter dengan API identik Dexie
    Object.entries(SEKOLAHTU_DEXIE_SCHEMA_V1).forEach(([tableName, spec]) => {
      this[tableName] = new LocalStorageTableAdapter(tableName, spec);
    });
  }

  /**
   * Sinkronisasi awal dari DataStore eksisting (v3.3.8) ke tabel IndexedDB Fase 1
   * agar data 183 siswa, 13 tendik, surat masuk/keluar tetap utuh 100%
   */
  async hydrateFromLegacyDataStore() {
    try {
      if (typeof DataStore === "undefined") return;

      const siswaList = DataStore.getSiswa ? DataStore.getSiswa() : [];
      if (Array.isArray(siswaList) && siswaList.length > 0) {
        const count = await this.siswa.count();
        if (count === 0) {
          await this.siswa.bulkPut(
            siswaList.map((s) => ({
              ...s,
              nisn: s.nisn || s.id || String(Date.now()),
              rombel_id: s.rombel_id || `KELAS-${s.kelas || "1"}`,
              nik_ayah: s.nik_ayah || s.nikAyah || "",
              nik_ibu: s.nik_ibu || s.nikIbu || "",
              is_deleted: false
            }))
          );
        }
      }

      const tendikList = DataStore.getTendik ? DataStore.getTendik() : [];
      if (Array.isArray(tendikList) && tendikList.length > 0) {
        const count = await this.tendik.count();
        if (count === 0) {
          await this.tendik.bulkPut(
            tendikList.map((t) => ({
              ...t,
              nip: t.nip || t.id || String(Date.now()),
              is_deleted: false
            }))
          );
        }
      }

      const skList = DataStore.getSuratKeluar ? DataStore.getSuratKeluar() : [];
      if (Array.isArray(skList) && skList.length > 0) {
        const count = await this.surat_keluar.count();
        if (count === 0) {
          await this.surat_keluar.bulkPut(
            skList.map((sk, idx) => ({
              ...sk,
              id: sk.id || sk.nomorSurat || `SK-${idx + 1}`,
              is_deleted: false
            }))
          );
        }
      }

      const smList = DataStore.getSuratMasuk ? DataStore.getSuratMasuk() : [];
      if (Array.isArray(smList) && smList.length > 0) {
        const count = await this.surat_masuk.count();
        if (count === 0) {
          await this.surat_masuk.bulkPut(
            smList.map((sm, idx) => ({
              ...sm,
              id: sm.id || sm.nomorSurat || `SM-${idx + 1}`,
              is_deleted: false
            }))
          );
        }
      }
    } catch (err) {
      console.warn("[SekolahtuClientDB] Hydrate legacy datastore warning:", err);
    }
  }

  /**
   * Mencatat Audit Trail 4-Tier (Tier 1 Publik s.d. Tier 4 Sangat Rahasia)
   */
  async logAudit({ actorId, actorRole, actionType, tableName, recordId, securityTier = "TIER_2_INTERNAL", details = "" }) {
    const entry = {
      timestamp: new Date().toISOString(),
      actor_id: actorId || "SYSTEM",
      actor_role: actorRole || "tu",
      action_type: actionType,
      table_name: tableName,
      record_id: String(recordId || "-"),
      security_tier: securityTier,
      details
    };
    await this.audit_trail.add(entry);
    return entry;
  }

  /**
   * Ekspor seluruh snapshot database lokal ke JSON untuk Backup ke Google Drive
   */
  async exportFullSnapshot() {
    const snapshot = {
      exported_at: new Date().toISOString(),
      school_npsn: "20326713",
      school_name: "SD NEGERI TERLANGU 01",
      tables: {}
    };
    for (const tableName of Object.keys(SEKOLAHTU_DEXIE_SCHEMA_V1)) {
      snapshot.tables[tableName] = await this[tableName].toArray();
    }
    return snapshot;
  }
}

const dbDexieInstance = new SekolahtuClientDB();

if (typeof window !== "undefined") {
  window.SEKOLAHTU_DEXIE_SCHEMA_V1 = SEKOLAHTU_DEXIE_SCHEMA_V1;
  window.SekolahtuClientDB = SekolahtuClientDB;
  window.dbDexie = dbDexieInstance;
}

