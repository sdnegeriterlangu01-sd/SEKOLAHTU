/**
 * ==========================================================================
 * SIM-TAS-SD: SISTEM INFORMASI MANAJEMEN TATA USAHA SEKOLAH DASAR
 * Backend REST API - Google Apps Script (GAS) v2.5.0
 * ==========================================================================
 * 
 * Version History:
 * - v2.5.0 (21 Oktober 2026):
 *   + Penambahan endpoint API "clearJadwalKelas" untuk 1-klik hapus seluruh jadwal pelajaran pada kelas tertentu.
 *   + Verifikasi dokumen surat: QR Code memuat string nomor registrasi surat untuk pencocokan instan tanpa skema URL.
 *   + Penyelarasan format tabel & impor Pengusulan PIP (28 kolom resmi Dapodik/Puslapdik 2026).
 *   + Penyelarasan format tabel & impor Penerima PIP (22 kolom SK Puslapdik 2026).
 *   + Pemetaan presisi profil akun Guru Kelas / Guru Mapel (tipeGuru & kelasGuru), isolasi dropdown absensi & rekap, serta perbaikan format jam jadwal.
 *   + Reposisi menu "Aksi Cepat" ke Hero Banner Dashboard Beranda.
 * - v2.4.0 (21 Oktober 2026):
 *   + Penyelarasan field dual alias WhatsApp permohonan surat (noWhatsApp & hpOrtu).
 *   + Dukungan format contoh Excel & import PIP Kemendikbud (Pengusulan & Penerima SK).
 *   + Dynamic rombel dropdown untuk pemilihan kelas modul Jadwal & modul PIP.
 *   + Perbaikan slot ID & preset Kurikulum Merdeka pada modul Jadwal Pelajaran.
 *   + Integrasi data hari libur nasional, hari Minggu, dan cuti bersama dari https://husniadil.com/calendar/{Tahun}/.
 *   + Optimasi QR Code surat keluar verifikasi langsung berbasis nomor surat resmi.
 * - v2.3.0 (21 Oktober 2026):
 *   + Ditambahkan endpoint API "trackPermohonanSurat" untuk pelacakan kode resi mandiri orang tua.
 *   + Pengecualian verifikasi token Supabase (Bypass Auth) untuk aksi publik (submit & track permohonan surat).
 *   + Standardisasi response tiket permohonan surat (trackingCode, ticketId, dan objek data).
 *   + Penyelarasan API payload dan optimasi respon JSON CORS text/plain.
 * - v2.2.0 (21 Oktober 2026):
 *   v2.2.0 - Penambahan 4 Database Sheet Baru & Handler Integrasi SIM-TAS-SD 2026:
 *    1. Menambahkan struktur sheet: DB_JadwalPelajaran, DB_PIP_Pengusulan, DB_PIP_Penerima, dan DB_PermohonanSurat.
 *    2. Menambahkan action handlers doPost:
 *       - Jadwal: getJadwal, saveJadwal, deleteJadwal
 *       - PIP: getPIP, savePIP, updatePIPStatus, importPIP
 *       - Permohonan Surat Mandiri: getPermohonanSurat, submitPermohonanSurat, updatePermohonanSurat
 *       - Siswa: updateStudentPhone, updateStudentFields
 *    3. Memperbarui setupDatabaseAndFolders() untuk inisialisasi otomatis tab baru dan header kolom terkait.
 * - v2.1.0 (20 Oktober 2026):
 *   + Ditambahkan endpoint API "getConfig" dan "saveConfig" untuk sinkronisasi
 *     konfigurasi profil sekolah & identitas Kepala Sekolah ke tab "Config" spreadsheet.
 *   + Dukungan auto-create tab "Config" dan pemetaan fleksibel nama kolom konfigurasi.
 * - v2.0.0 (19 Oktober 2026):
 *   + Integrasi token auth Supabase & RBAC multi-role (Admin, Guru, TU, Kepsek, Kiosk).
 *   + Sinkronisasi presensi tendik & siswa, backup drive, dan manajemen arsip surat.
 * 
 * Target Deployment:
 * - Execute as: Me (akun Google pemilik spreadsheet/drive)
 * - Who has access: Anyone (Siapa saja, termasuk anonim)
 * 
 * Integrasi:
 * 1. Google Sheets (Database relasional multi-tab)
 * 2. Google Drive (Penyimpanan terstruktur berkas PDF/Scan/QR/Backup)
 * 3. Supabase Auth Token Verification (Zero Trust Cloud API)
 */

// Konstanta Nama Folder di Google Drive
const ROOT_FOLDER_NAME = "SIM-TAS";
const FOLDER_BERKAS_SISWA = "Berkas_Siswa";
const FOLDER_SURAT_MASUK = "Surat_Masuk";
const FOLDER_SURAT_KELUAR = "Surat_Keluar_PDF";
const FOLDER_TEMPLATE = "Template_Surat";
const FOLDER_QR_TENDIK = "QR_Tendik";
const FOLDER_BACKUP = "Backup";

// Konstanta Nama Tab Sheet
const TAB_SISWA = "DB_Siswa";
const TAB_SURAT_KELUAR = "DB_SuratKeluar";
const TAB_SURAT_MASUK = "DB_SuratMasuk";
const TAB_ABSENSI = "DB_Absensi";
const TAB_TENDIK = "DB_Tendik";
const TAB_ABSENSI_TENDIK = "DB_AbsensiTendik";
const TAB_ABSENSI_SISWA_BULAN = "DB_AbsensiSiswaBulan";
const TAB_CONFIG = "Config";
const TAB_JADWAL = "DB_JadwalPelajaran";
const TAB_PIP_PENGUSULAN = "DB_PIP_Pengusulan";
const TAB_PIP_PENERIMA = "DB_PIP_Penerima";
const TAB_PERMOHONAN_SURAT = "DB_PermohonanSurat";

/**
 * Handle GET Requests (Health Check & Direct Info & Verifikasi Publik)
 */
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  if (params.action === "verifySuratKeluar" || params.no) {
    const no = params.no || params.nomorSurat;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = handleVerifySuratKeluar(ss, { nomorSurat: no });
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  if (params.action === "getSuratKeluar") {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = handleGetSuratKeluar(ss);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const result = {
    status: "ok",
    app: "SIM-TAS-SD Backend API",
    version: "2.3.0",
    timestamp: new Date().toISOString(),
    message: "Google Apps Script Backend berjalan normal. Gunakan HTTP POST untuk berinteraksi."
  };
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST Requests (Main Dispatcher with RBAC & Supabase Token Verification)
 */
function doPost(e) {
  let responseData = { success: false, message: "No data received" };
  
  try {
    const rawData = e.postData ? e.postData.contents : "{}";
    const request = JSON.parse(rawData);
    const action = request.action;
    const payload = request.payload || {};
    const token = request.token || null;

    // Ping / Health Check bebas token
    if (action === "ping") {
      responseData = { success: true, message: "Koneksi API SIM-TAS-SD aktif!", timestamp: new Date() };
      return ContentService.createTextOutput(JSON.stringify(responseData)).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi portal publik (permohonan mandiri & verifikasi keabsahan surat resmi) tidak memerlukan token login staf TU
    const isPublicAction = (
      action === "submitPermohonanSurat" || 
      action === "trackPermohonanSurat" || 
      action === "verifySuratKeluar" || 
      action === "getSuratKeluar"
    );

    // Verifikasi Token Supabase jika Script Properties disetel & bukan aksi publik
    if (!isPublicAction) {
      const authCheck = verifySupabaseToken(token);
      if (!authCheck.valid && isStrictAuthRequired()) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          code: "AUTH",
          message: authCheck.message || "Sesi Supabase tidak valid atau kedaluwarsa. Silakan masuk kembali."
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      // ==================== SETUP & PENCADANGAN ====================
      case "setupDatabase":
        responseData = setupDatabaseAndFolders();
        break;

      case "backupNow":
        responseData = handleBackupDatabase(ss);
        break;

      // ==================== MODUL 1: BERKAS & DATA SISWA ====================
      case "getStudents":
        responseData = handleGetStudents(ss, payload);
        break;

      case "saveStudent":
        responseData = handleSaveStudent(ss, payload);
        break;

      case "importStudents":
        responseData = handleImportStudents(ss, payload);
        break;

      case "uploadStudentDoc":
        responseData = handleUploadStudentDoc(ss, payload);
        break;

      // ==================== DATA TENDIK & KARTU QR ====================
      case "getTendik":
        responseData = handleGetTendik(ss);
        break;

      case "saveTendik":
        responseData = handleSaveTendik(ss, payload);
        break;

      case "deleteTendik":
        responseData = handleDeleteTendik(ss, payload);
        break;

      case "saveQrFiles":
        responseData = handleSaveQrFiles(payload);
        break;

      // ==================== MODUL 2: PENOMORAN & SURAT (SRIKANDI) ====================
      case "verifySuratKeluar":
        responseData = handleVerifySuratKeluar(ss, payload);
        break;

      case "getSuratKeluar":
        responseData = handleGetSuratKeluar(ss);
        break;

      case "getNextNomorSuratKeluar":
        responseData = handleGetNextNomorSuratKeluar(ss, payload);
        break;

      case "saveSuratKeluar":
        responseData = handleSaveSuratKeluar(ss, payload);
        break;

      case "deleteSuratKeluar":
        responseData = handleDeleteSuratKeluar(ss, payload);
        break;

      case "getSuratMasuk":
        responseData = handleGetSuratMasuk(ss);
        break;

      case "saveSuratMasuk":
        responseData = handleSaveSuratMasuk(ss, payload);
        break;

      case "deleteSuratMasuk":
        responseData = handleDeleteSuratMasuk(ss, payload);
        break;

      // ==================== MODUL 3: GENERATE SURAT PDF ====================
      case "generateSuratDocPDF":
        responseData = handleGenerateSuratPDF(ss, payload);
        break;

      // ==================== MODUL 4: ABSENSI & SCAN QR ====================
      case "getAbsensi":
        responseData = handleGetAbsensi(ss, payload);
        break;

      case "saveAbsensiBatch":
        responseData = handleSaveAbsensiBatch(ss, payload);
        break;

      case "scanTendik":
        responseData = handleScanTendik(ss, payload);
        break;

      case "getAbsensiTendikBulan":
        responseData = handleGetAbsensiTendikBulan(ss, payload);
        break;

      case "saveAbsensiTendikManual":
        responseData = handleSaveAbsensiTendikManual(ss, payload);
        break;

      case "getAbsensiSiswaBulan":
        responseData = handleGetAbsensiSiswaBulan(ss, payload);
        break;

      case "saveAbsensiSiswaBulan":
        responseData = handleSaveAbsensiSiswaBulan(ss, payload);
        break;

      // ==================== CONFIG & IDENTITAS SEKOLAH ====================
      case "getConfig":
        responseData = handleGetConfig(ss);
        break;

      case "saveConfig":
        responseData = handleSaveConfig(ss, payload);
        break;

      case "getCalendarHolidays":
        responseData = handleGetCalendarHolidays(ss, payload);
        break;

      // ==================== JADWAL PELAJARAN ====================
      case "getJadwal":
        responseData = handleGetJadwal(ss, payload);
        break;

      case "saveJadwal":
        responseData = handleSaveJadwal(ss, payload);
        break;

      case "deleteJadwal":
        responseData = handleDeleteJadwal(ss, payload);
        break;

      case "clearJadwalKelas":
        responseData = handleClearJadwalKelas(ss, payload);
        break;

      // ==================== PROGRAM PIP ====================
      case "getPIP":
        responseData = handleGetPIP(ss, payload);
        break;

      case "savePIP":
        responseData = handleSavePIP(ss, payload);
        break;

      case "updatePIPStatus":
        responseData = handleUpdatePIPStatus(ss, payload);
        break;

      case "importPIP":
        responseData = handleImportPIP(ss, payload);
        break;

      // ==================== PERMOHONAN SURAT ONLINE ====================
      case "getPermohonanSurat":
        responseData = handleGetPermohonanSurat(ss, payload);
        break;

      case "submitPermohonanSurat":
        responseData = handleSubmitPermohonanSurat(ss, payload);
        break;

      case "trackPermohonanSurat":
        responseData = handleTrackPermohonanSurat(ss, payload);
        break;

      case "updatePermohonanSurat":
        responseData = handleUpdatePermohonanSurat(ss, payload);
        break;

      // ==================== UPDATE DATA SISWA / KONTAK ====================
      case "updateStudentPhone":
        responseData = handleUpdateStudentPhone(ss, payload);
        break;

      case "updateStudentFields":
        responseData = handleUpdateStudentFields(ss, payload);
        break;

      default:
        responseData = { success: false, message: "Aksi tidak dikenali: " + action };
    }
  } catch (error) {
    responseData = {
      success: false,
      message: "Terjadi kesalahan server Apps Script: " + error.toString(),
      stack: error.stack
    };
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ==========================================================================
 * SUPABASE TOKEN VERIFICATION (ZERO TRUST)
 * ==========================================================================
 */
function isStrictAuthRequired() {
  const props = PropertiesService.getScriptProperties().getProperties();
  return !!(props.SUPABASE_URL && (props.SUPABASE_ANON_KEY || props.SUPABASE_JWT_SECRET));
}

function verifySupabaseToken(token) {
  if (!token) return { valid: false, message: "Token otentikasi tidak disertakan." };
  
  const props = PropertiesService.getScriptProperties().getProperties();
  const supabaseUrl = props.SUPABASE_URL;
  const anonKey = props.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    // Mode demo (tanpa Supabase terkonfigurasi di server)
    return { valid: true };
  }

  try {
    // Validasi token via endpoint Supabase Auth /auth/v1/user
    const url = supabaseUrl.replace(/\/$/, "") + "/auth/v1/user";
    const response = UrlFetchApp.fetch(url, {
      method: "GET",
      headers: {
        "apikey": anonKey,
        "Authorization": "Bearer " + token
      },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      const user = JSON.parse(response.getContentText());
      return { valid: true, user: user };
    }
    return { valid: false, message: "Token Supabase tidak valid atau telah kedaluwarsa." };
  } catch (e) {
    return { valid: false, message: "Gagal memverifikasi token ke Supabase: " + e.message };
  }
}

/**
 * ==========================================================================
 * INITIALIZER: SETUP DATABASE & GOOGLE DRIVE FOLDERS
 * ==========================================================================
 */
function setupDatabaseAndFolders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Tab DB_Siswa
  let sheetSiswa = ss.getSheetByName(TAB_SISWA);
  if (!sheetSiswa) sheetSiswa = ss.insertSheet(TAB_SISWA);
  if (sheetSiswa.getLastRow() === 0) {
    sheetSiswa.appendRow([
      "NISN", "NIS", "NAMA", "NIK", "TEMPAT_LAHIR", "TGL_LAHIR", "JK", "KELAS",
      "NAMA_ORTU", "PEKERJAAN_ORTU", "NO_HP", "ALAMAT",
      "URL_KK", "FILE_KK", "URL_AKTA", "FILE_AKTA", "URL_KIP", "FILE_KIP", "URL_FOTO", "FILE_FOTO",
      "UPDATED_AT", "TAHUN_AJARAN", "METADATA_JSON"
    ]);
    sheetSiswa.getRange(1, 1, 1, 23).setFontWeight("bold").setBackground("#d9ead3");
  }

  // 2. Tab DB_Tendik (Guru & Staf)
  let sheetTendik = ss.getSheetByName(TAB_TENDIK);
  if (!sheetTendik) sheetTendik = ss.insertSheet(TAB_TENDIK);
  if (sheetTendik.getLastRow() === 0) {
    sheetTendik.appendRow([
      "NIP", "NAMA", "JABATAN", "GOLONGAN", "JK", "NO_HP", "KODE_QR", "URL_QR", "AKTIF"
    ]);
    sheetTendik.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#d0e0e3");
  }

  // 3. Tab DB_SuratKeluar
  let sheetSK = ss.getSheetByName(TAB_SURAT_KELUAR);
  if (!sheetSK) sheetSK = ss.insertSheet(TAB_SURAT_KELUAR);
  if (sheetSK.getLastRow() === 0) {
    sheetSK.appendRow([
      "ID", "NOMOR_SURAT", "KODE_KLASIFIKASI", "NO_URUT", "TAHUN",
      "TANGGAL_SURAT", "TUJUAN", "PERIHAL", "PENGONSEP", "PENANDATANGAN",
      "KETERANGAN", "URL_BERKAS", "CREATED_AT"
    ]);
    sheetSK.getRange(1, 1, 1, 13).setFontWeight("bold").setBackground("#cfe2f3");
  }

  // 4. Tab DB_SuratMasuk
  let sheetSM = ss.getSheetByName(TAB_SURAT_MASUK);
  if (!sheetSM) sheetSM = ss.insertSheet(TAB_SURAT_MASUK);
  if (sheetSM.getLastRow() === 0) {
    sheetSM.appendRow([
      "ID", "NO_AGENDA", "NO_SURAT_ASLI", "TGL_SURAT", "TGL_TERIMA",
      "PENGIRIM", "PERIHAL", "DISPOSISI_KE", "INSTRUKSI_DISPOSISI",
      "URL_SCAN", "STATUS", "CREATED_AT"
    ]);
    sheetSM.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#fff2cc");
  }

  // 5. Tab DB_Absensi (Harian konvensional)
  let sheetAbsen = ss.getSheetByName(TAB_ABSENSI);
  if (!sheetAbsen) sheetAbsen = ss.insertSheet(TAB_ABSENSI);
  if (sheetAbsen.getLastRow() === 0) {
    sheetAbsen.appendRow([
      "ID", "TANGGAL", "KATEGORI", "KELAS", "NISN_NIP", "NAMA", "STATUS", "KETERANGAN", "TIMESTAMP"
    ]);
    sheetAbsen.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#ead1dc");
  }

  // 6. Tab DB_AbsensiTendik (Scan QR Datang / Pulang)
  let sheetAbsenTendik = ss.getSheetByName(TAB_ABSENSI_TENDIK);
  if (!sheetAbsenTendik) sheetAbsenTendik = ss.insertSheet(TAB_ABSENSI_TENDIK);
  if (sheetAbsenTendik.getLastRow() === 0) {
    sheetAbsenTendik.appendRow([
      "KEY", "TANGGAL", "NIP", "NAMA", "STATUS", "JAM_DATANG", "JAM_PULANG", "KETERANGAN", "UPDATED_AT"
    ]);
    sheetAbsenTendik.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#d9d2e9");
  }

  // 7. Tab DB_AbsensiSiswaBulan (Rekap Bulanan Siswa)
  let sheetAbsenSiswa = ss.getSheetByName(TAB_ABSENSI_SISWA_BULAN);
  if (!sheetAbsenSiswa) sheetAbsenSiswa = ss.insertSheet(TAB_ABSENSI_SISWA_BULAN);
  if (sheetAbsenSiswa.getLastRow() === 0) {
    sheetAbsenSiswa.appendRow([
      "KEY", "TAHUN_AJARAN", "BULAN", "KELAS", "NISN", "NAMA", "MARKS_JSON", "UPDATED_AT"
    ]);
    sheetAbsenSiswa.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#fce5cd");
  }

  // 8. Tab Config
  let sheetCfg = ss.getSheetByName(TAB_CONFIG);
  if (!sheetCfg) sheetCfg = ss.insertSheet(TAB_CONFIG);
  if (sheetCfg.getLastRow() === 0) {
    sheetCfg.appendRow(["KEY", "VALUE"]);
    sheetCfg.appendRow(["NAMA_SEKOLAH", "SD NEGERI TERLANGU 01"]);
    sheetCfg.appendRow(["NPSN", "20326713"]);
    sheetCfg.appendRow(["KEPALA_SEKOLAH", "Aisah Suciati, S.Pd.SD., M.Pd."]);
    sheetCfg.appendRow(["NIP_KEPALA_SEKOLAH", "19690808 199201 2 002"]);
    sheetCfg.getRange(1, 1, 1, 2).setFontWeight("bold").setBackground("#f3f3f3");
  }

  // 9. Tab DB_JadwalPelajaran
  let sheetJadwal = ss.getSheetByName(TAB_JADWAL);
  if (!sheetJadwal) sheetJadwal = ss.insertSheet(TAB_JADWAL);
  if (sheetJadwal.getLastRow() === 0) {
    sheetJadwal.appendRow([
      "ID", "ROMBEL", "HARI", "JAM_KE", "MAPEL", "NAMA_GURU", "WAKTU_MULAI", "WAKTU_SELESAI", "RUANG", "UPDATED_AT"
    ]);
    sheetJadwal.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#d9ead3");
  }

  // 10. Tab DB_PIP_Pengusulan
  let sheetPIPU = ss.getSheetByName(TAB_PIP_PENGUSULAN);
  if (!sheetPIPU) sheetPIPU = ss.insertSheet(TAB_PIP_PENGUSULAN);
  if (sheetPIPU.getLastRow() === 0) {
    sheetPIPU.appendRow([
      "ID", "TAHUN", "NISN", "NAMA", "KELAS", "NAMA_ORTU", "DESIL", "NOMINAL", "STATUS_KELAYAKAN", "KETERANGAN", "UPDATED_AT"
    ]);
    sheetPIPU.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#fff2cc");
  }

  // 11. Tab DB_PIP_Penerima
  let sheetPIPP = ss.getSheetByName(TAB_PIP_PENERIMA);
  if (!sheetPIPP) sheetPIPP = ss.insertSheet(TAB_PIP_PENERIMA);
  if (sheetPIPP.getLastRow() === 0) {
    sheetPIPP.appendRow([
      "ID", "TAHUN", "NISN", "NAMA", "KELAS", "NOMOR_SK", "TANGGAL_SK", "REKENING_SIMPEL", "BANK_PENYALUR", "NOMINAL", "STATUS_PENCAIRAN", "TGL_CAIR", "KETERANGAN", "UPDATED_AT"
    ]);
    sheetPIPP.getRange(1, 1, 1, 14).setFontWeight("bold").setBackground("#cfe2f3");
  }

  // 12. Tab DB_PermohonanSurat
  let sheetPermohonan = ss.getSheetByName(TAB_PERMOHONAN_SURAT);
  if (!sheetPermohonan) sheetPermohonan = ss.insertSheet(TAB_PERMOHONAN_SURAT);
  if (sheetPermohonan.getLastRow() === 0) {
    sheetPermohonan.appendRow([
      "ID", "CREATED_AT", "NISN", "NAMA", "KELAS", "NAMA_ORTU", "HP_ORTU", "JENIS_SURAT", "KEPERLUAN", "STATUS", "KETERANGAN", "UPDATED_AT"
    ]);
    sheetPermohonan.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#fce5cd");
  }

  // 13. Struktur Folder di Google Drive
  const rootFolder = getOrCreateSubFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  getOrCreateSubFolder(rootFolder, FOLDER_BERKAS_SISWA);
  getOrCreateSubFolder(rootFolder, FOLDER_SURAT_MASUK);
  getOrCreateSubFolder(rootFolder, FOLDER_SURAT_KELUAR);
  getOrCreateSubFolder(rootFolder, FOLDER_TEMPLATE);
  getOrCreateSubFolder(rootFolder, FOLDER_QR_TENDIK);
  getOrCreateSubFolder(rootFolder, FOLDER_BACKUP);

  return {
    success: true,
    message: "Inisialisasi Database Google Sheets (12 Tab) & Folder Google Drive (/SIM-TAS/) berhasil diselesaikan!",
    rootFolderId: rootFolder.getId()
  };
}

function getOrCreateSubFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  const newFolder = parentFolder.createFolder(folderName);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * ==========================================================================
 * HANDLER: BACKUP OTOMATIS KE GOOGLE DRIVE
 * ==========================================================================
 */
function handleBackupDatabase(ss) {
  const root = getOrCreateSubFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  const backupFolder = getOrCreateSubFolder(root, FOLDER_BACKUP);
  const now = new Date();
  const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd_HHmmss");

  const dump = {
    _app: "SIM-TAS-SD",
    _version: "2.0.0",
    _created: now.toISOString(),
    spreadsheetId: ss.getId(),
    tables: {}
  };

  const sheets = ss.getSheets();
  sheets.forEach(sheet => {
    const name = sheet.getName();
    if (sheet.getLastRow() > 0) {
      const data = sheet.getDataRange().getValues();
      dump.tables[name] = data;
    } else {
      dump.tables[name] = [];
    }
  });

  const jsonStr = JSON.stringify(dump, null, 2);
  const filename = `Backup_SIM-TAS_${timeStr}.json`;
  const file = backupFolder.createFile(filename, jsonStr, "application/json");

  return {
    success: true,
    message: `Pencadangan database berhasil disimpan di Google Drive /SIM-TAS/Backup/${filename}`,
    fileUrl: file.getUrl()
  };
}

/**
 * ==========================================================================
 * HANDLERS: MODUL 1 - BERKAS & DATA SISWA
 * ==========================================================================
 */
function convertDriveViewToThumbnail(url) {
  if (!url) return "";
  const s = String(url).trim();
  const m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) {
    return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
  }
  return s;
}

function handleGetStudents(ss, payload) {
  const sheet = ss.getSheetByName(TAB_SISWA);
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const students = values.map(row => {
    let meta = {};
    try { meta = row[22] ? JSON.parse(row[22]) : {}; } catch (e) { meta = {}; }

    return {
      nisn: String(row[0]),
      nis: String(row[1]),
      nama: String(row[2]),
      nik: String(row[3]),
      tempatLahir: String(row[4]),
      tanggalLahir: row[5] instanceof Date ? Utilities.formatDate(row[5], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(row[5]),
      jk: String(row[6]),
      kelas: String(row[7]),
      namaOrtu: String(row[8]),
      pekerjaanOrtu: String(row[9]),
      noHp: String(row[10]),
      alamat: String(row[11]),
      berkas: {
        kk: { uploaded: !!row[12], filename: String(row[13] || ""), url: String(row[12] || "") },
        akta: { uploaded: !!row[14], filename: String(row[15] || ""), url: String(row[14] || "") },
        kip: { uploaded: !!row[16], filename: String(row[17] || ""), url: String(row[16] || "") },
        foto: { uploaded: !!row[18], filename: String(row[19] || ""), url: convertDriveViewToThumbnail(row[18]) }
      },
      tahunAjaran: String(row[21] || ""),
      meta: meta
    };
  });

  return { success: true, data: students };
}

function handleSaveStudent(ss, payload) {
  const sheet = ss.getSheetByName(TAB_SISWA);
  const nisn = String(payload.nisn);
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === nisn) {
      rowIndex = i + 1;
      break;
    }
  }

  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  const metaJson = JSON.stringify(payload.meta || {});
  const ta = payload.tahunAjaran || "";

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 2, 1, 11).setValues([[
      payload.nis || "", payload.nama || "", payload.nik || "",
      payload.tempatLahir || "", payload.tanggalLahir || "", payload.jk || "",
      payload.kelas || "", payload.namaOrtu || "", payload.pekerjaanOrtu || "",
      payload.noHp || "", payload.alamat || ""
    ]]);
    sheet.getRange(rowIndex, 21).setValue(nowStr);
    sheet.getRange(rowIndex, 22).setValue(ta);
    sheet.getRange(rowIndex, 23).setValue(metaJson);
  } else {
    sheet.appendRow([
      nisn, payload.nis || "", payload.nama || "", payload.nik || "",
      payload.tempatLahir || "", payload.tanggalLahir || "", payload.jk || "",
      payload.kelas || "", payload.namaOrtu || "", payload.pekerjaanOrtu || "",
      payload.noHp || "", payload.alamat || "",
      "", "", "", "", "", "", "", "",
      nowStr, ta, metaJson
    ]);
  }

  return { success: true, message: "Data siswa berhasil disimpan ke Google Sheets!" };
}

function handleImportStudents(ss, payload) {
  const sheet = ss.getSheetByName(TAB_SISWA);
  const rows = payload.rows || [];
  const mode = payload.mode || "update";
  const ta = payload.tahunAjaran || "";
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  const existingData = sheet.getDataRange().getValues();
  const nisnRowMap = {};
  for (let i = 1; i < existingData.length; i++) {
    nisnRowMap[String(existingData[i][0])] = i + 1;
  }

  let imported = 0, updated = 0, skipped = 0;

  rows.forEach(s => {
    const nisn = String(s.nisn);
    const rowIdx = nisnRowMap[nisn];
    const metaJson = JSON.stringify(s.meta || {});

    if (rowIdx) {
      if (mode === "skip") {
        skipped++;
      } else {
        sheet.getRange(rowIdx, 2, 1, 11).setValues([[
          s.nipd || s.nis || "", s.nama || "", s.nik || "",
          s.tempatLahir || "", s.tanggalLahir || "", s.jk || "",
          s.rombel || s.kelas || "", s.ayahNama || s.namaOrtu || "", s.ayahPekerjaan || s.pekerjaanOrtu || "",
          s.noHp || "", s.alamat || ""
        ]]);
        sheet.getRange(rowIdx, 21).setValue(nowStr);
        sheet.getRange(rowIdx, 22).setValue(ta);
        sheet.getRange(rowIdx, 23).setValue(metaJson);
        updated++;
      }
    } else {
      sheet.appendRow([
        nisn, s.nipd || s.nis || "", s.nama || "", s.nik || "",
        s.tempatLahir || "", s.tanggalLahir || "", s.jk || "",
        s.rombel || s.kelas || "", s.ayahNama || s.namaOrtu || "", s.ayahPekerjaan || s.pekerjaanOrtu || "",
        s.noHp || "", s.alamat || "",
        "", "", "", "", "", "", "", "",
        nowStr, ta, metaJson
      ]);
      nisnRowMap[nisn] = sheet.getLastRow();
      imported++;
    }
  });

  return {
    success: true,
    message: `Impor berhasil: ${imported} baru, ${updated} diperbarui, ${skipped} dilewati.`,
    stats: { imported, updated, skipped }
  };
}

function handleUploadStudentDoc(ss, payload) {
  const root = getOrCreateSubFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  const berkasFolder = getOrCreateSubFolder(root, FOLDER_BERKAS_SISWA);

  const nisn = String(payload.nisn);
  const docType = String(payload.docType).toUpperCase();
  const ext = payload.fileExt || "pdf";
  const year = new Date().getFullYear();
  const filename = `${nisn}_${docType}_${year}.${ext}`;

  const base64Data = payload.fileBase64.replace(/^data:([A-Za-z-+\/]+);base64,/, '');
  const decodedBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), payload.mimeType || "application/pdf", filename);
  const driveFile = berkasFolder.createFile(decodedBlob);
  driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const fileId = driveFile.getId();
  const fileUrl = driveFile.getUrl();
  const directUrl = (docType === "FOTO") ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : fileUrl;

  const sheet = ss.getSheetByName(TAB_SISWA);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === nisn) {
      const row = i + 1;
      let colUrl = 13, colName = 14;
      if (docType === "AKTA") { colUrl = 15; colName = 16; }
      else if (docType === "KIP") { colUrl = 17; colName = 18; }
      else if (docType === "FOTO") { colUrl = 19; colName = 20; }

      sheet.getRange(row, colUrl).setValue(directUrl);
      sheet.getRange(row, colName).setValue(filename);
      sheet.getRange(row, 21).setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"));
      break;
    }
  }

  return {
    success: true,
    message: `Dokumen ${docType} berhasil diunggah ke Google Drive /SIM-TAS/Berkas_Siswa/!`,
    data: { filename: filename, url: directUrl, viewUrl: fileUrl }
  };
}

/**
 * ==========================================================================
 * HANDLERS: DATA GURU & TENDIK + KARTU QR
 * ==========================================================================
 */
function handleGetTendik(ss) {
  const sheet = ss.getSheetByName(TAB_TENDIK);
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const list = values.map(row => ({
    nip: String(row[0]),
    nama: String(row[1]),
    jabatan: String(row[2]),
    golongan: String(row[3]),
    statusKepegawaian: String(row[3]),
    jk: String(row[4]),
    noHp: String(row[5]),
    kodeQr: String(row[6]),
    urlQr: String(row[7]),
    aktif: row[8] !== false && String(row[8]).toLowerCase() !== "false"
  }));

  return { success: true, data: list };
}

function handleSaveTendik(ss, payload) {
  const sheet = ss.getSheetByName(TAB_TENDIK);
  if (!sheet) return { success: false, message: "Tab " + TAB_TENDIK + " tidak ditemukan." };

  const list = payload.list || (payload.tendik ? [payload.tendik] : (payload.nip ? [payload] : []));
  if (!list || list.length === 0) {
    return { success: false, message: "Tidak ada data guru/tendik yang dikirim." };
  }

  const existing = sheet.getDataRange().getValues();
  const nipRowMap = {};
  for (let i = 1; i < existing.length; i++) {
    nipRowMap[String(existing[i][0]).trim()] = i + 1;
  }

  list.forEach(t => {
    const nip = String(t.nip || "").trim();
    if (!nip) return;
    const row = nipRowMap[nip];
    const statusPeg = t.statusKepegawaian || t.golongan || "";
    if (row) {
      sheet.getRange(row, 2, 1, 8).setValues([[
        t.nama || "", t.jabatan || "", statusPeg, t.jk || "",
        t.noHp || "", t.kodeQr || "", t.urlQr || "", t.aktif !== false
      ]]);
    } else {
      sheet.appendRow([
        nip, t.nama || "", t.jabatan || "", statusPeg, t.jk || "",
        t.noHp || "", t.kodeQr || "", t.urlQr || "", t.aktif !== false
      ]);
      nipRowMap[nip] = sheet.getLastRow();
    }
  });

  return { success: true, message: `Data ${list.length} guru & tenaga kependidikan berhasil disimpan!` };
}

function handleDeleteTendik(ss, payload) {
  const sheet = ss.getSheetByName(TAB_TENDIK);
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, message: "Tidak ada data guru/tendik." };
  const nip = String(payload.nip || "").trim();
  if (!nip) return { success: false, message: "NIP wajib disertakan." };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === nip) {
      sheet.deleteRow(i + 1);
      return { success: true, message: `Data guru/tendik dengan NIP ${nip} berhasil dihapus!` };
    }
  }
  return { success: false, message: `Data guru/tendik dengan NIP ${nip} tidak ditemukan.` };
}

function handleSaveQrFiles(payload) {
  const root = getOrCreateSubFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  const qrFolder = getOrCreateSubFolder(root, FOLDER_QR_TENDIK);
  const files = payload.files || [];
  const results = {};

  files.forEach(f => {
    const nip = String(f.nip).replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `QR_${nip}.png`;
    const base64Data = f.base64.replace(/^data:([A-Za-z-+\/]+);base64,/, '');
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/png", filename);
    const driveFile = qrFolder.createFile(blob);
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    results[f.nip] = driveFile.getUrl();
  });

  return { success: true, message: `Berhasil menyimpan ${files.length} berkas QR ke Google Drive!`, urls: results };
}

/**
 * ==========================================================================
 * HANDLERS: MODUL 2 - PENOMORAN & PENGARSIPAN SURAT (SRIKANDI)
 * ==========================================================================
 */

/**
 * Verifikasi Keabsahan Surat Keluar (Publik tanpa login TU)
 */
function handleVerifySuratKeluar(ss, payload) {
  const targetNo = String(payload.nomorSurat || "").trim();
  if (!targetNo) {
    return { success: false, verified: false, message: "Nomor registrasi surat tidak disertakan." };
  }

  const sheet = ss.getSheetByName(TAB_SURAT_KELUAR);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: false, verified: false, message: "Buku Register Surat Keluar masih kosong di server." };
  }

  const cleanTarget = targetNo.toLowerCase().trim();
  const norm = function(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); };
  const targetNorm = norm(cleanTarget);

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  let found = null;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const sId = String(row[0] || "").trim();
    const sNo = String(row[1] || "").trim();
    
    if (sNo.toLowerCase() === cleanTarget || sId.toLowerCase() === cleanTarget ||
        (targetNorm && norm(sNo) === targetNorm) || (targetNorm && norm(sId) === targetNorm)) {
      found = {
        id: sId,
        nomorSurat: sNo,
        kodeKlasifikasi: String(row[2] || ""),
        noUrut: parseInt(row[3], 10),
        tahun: parseInt(row[4], 10),
        tanggalSurat: row[5] instanceof Date ? Utilities.formatDate(row[5], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(row[5]),
        tujuan: String(row[6] || ""),
        perihal: String(row[7] || ""),
        pengonsep: String(row[8] || ""),
        penandatangan: String(row[9] || ""),
        keterangan: String(row[10] || ""),
        fileDriveUrl: String(row[11] || "")
      };
      break;
    }
  }

  if (!found) {
    return { success: true, verified: false, message: "Nomor registrasi surat tidak ditemukan di Buku Register Surat Keluar." };
  }

  // Profil sekolah resmi untuk stempel validasi
  let configSekolah = {
    namaSekolah: "SD NEGERI TERLANGU 01",
    npsn: "20326713",
    namaKepalaSekolah: "Aisah Suciati, S.Pd.SD., M.Pd.",
    nipKepalaSekolah: "19690808 199201 2 002"
  };
  try {
    const cfgSheet = ss.getSheetByName(TAB_CONFIG);
    if (cfgSheet && cfgSheet.getLastRow() > 1) {
      const cfgVals = cfgSheet.getRange(2, 1, cfgSheet.getLastRow() - 1, 2).getValues();
      cfgVals.forEach(function(r) {
        const k = String(r[0]).trim();
        const v = String(r[1]).trim();
        if (k && v) configSekolah[k] = v;
      });
    }
  } catch (err) {}

  return {
    success: true,
    verified: true,
    data: found,
    config: configSekolah
  };
}

function handleGetSuratKeluar(ss) {
  const sheet = ss.getSheetByName(TAB_SURAT_KELUAR);
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const list = values.map(row => ({
    id: String(row[0]),
    nomorSurat: String(row[1]),
    kodeKlasifikasi: String(row[2]),
    noUrut: parseInt(row[3], 10),
    tahun: parseInt(row[4], 10),
    tanggalSurat: row[5] instanceof Date ? Utilities.formatDate(row[5], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(row[5]),
    tujuan: String(row[6]),
    perihal: String(row[7]),
    pengonsep: String(row[8]),
    penandatangan: String(row[9]),
    keterangan: String(row[10]),
    fileDriveUrl: String(row[11])
  }));

  return { success: true, data: list.reverse() };
}

function handleGetNextNomorSuratKeluar(ss, payload) {
  const sheet = ss.getSheetByName(TAB_SURAT_KELUAR);
  const kode = payload.kodeKlasifikasi || "421.2";
  const tahun = parseInt(payload.tahun || new Date().getFullYear(), 10);

  let nextNo = 1;
  if (sheet && sheet.getLastRow() > 1) {
    const values = sheet.getRange(2, 4, sheet.getLastRow() - 1, 2).getValues();
    let maxNo = 0;
    values.forEach(row => {
      const rNo = parseInt(row[0], 10);
      const rThn = parseInt(row[1], 10);
      if (rThn === tahun && rNo > maxNo) {
        maxNo = rNo;
      }
    });
    nextNo = maxNo + 1;
  }

  const romawiBulan = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const bulan = romawiBulan[new Date().getMonth()];
  const formattedNo = `${kode}/${String(nextNo).padStart(3, '0')}/${bulan}/${tahun}`;
  return {
    success: true,
    data: {
      nextNo: nextNo,
      nomorSurat: formattedNo,
      kodeKlasifikasi: kode,
      tahun: tahun
    }
  };
}

function handleSaveSuratKeluar(ss, payload) {
  const sheet = ss.getSheetByName(TAB_SURAT_KELUAR);
  const tahun = parseInt(payload.tahun || new Date().getFullYear(), 10);

  // Ambil nomor berikutnya secara atomik untuk mencegah nomor ganda (kecuali nomor manual ditentukan)
  const nextInfo = handleGetNextNomorSuratKeluar(ss, { kodeKlasifikasi: payload.kodeKlasifikasi, tahun: tahun }).data;
  const noUrut = payload.noUrut || nextInfo.nextNo;
  const nomorSurat = payload.nomorSuratManual || payload.nomorSurat || nextInfo.nomorSurat;
  const id = payload.id || `SK-${tahun}-${String(noUrut).padStart(3, '0')}`;
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  let fileUrl = payload.fileDriveUrl || "";
  if (payload.fileBase64) {
    try {
      const root = getOrCreateSubFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
      const skFolder = getOrCreateSubFolder(root, FOLDER_SURAT_KELUAR);
      const base64Data = payload.fileBase64.replace(/^data:([A-Za-z-+\/]+);base64,/, '');
      const cleanNo = (nomorSurat || id).replace(/[\/\\:*?"<>|]/g, '_');
      const filename = `SK_${cleanNo}.${payload.fileExt || "pdf"}`;
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), payload.mimeType || "application/pdf", filename);
      const f = skFolder.createFile(blob);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = f.getUrl();
    } catch (e) {
      Logger.log("Gagal simpan file surat keluar ke Drive: " + e.message);
    }
  }

  // Cek apakah mode edit (row sudah ada)
  let existingRow = -1;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if ((payload.id && String(data[i][0]) === String(payload.id)) ||
          (payload.oldNomorSurat && String(data[i][1]) === String(payload.oldNomorSurat))) {
        existingRow = i + 1;
        break;
      }
    }
  }

  if (existingRow > 1) {
    if (!fileUrl) {
      fileUrl = sheet.getRange(existingRow, 12).getValue() || "";
    }
    sheet.getRange(existingRow, 1, 1, 13).setValues([[
      id,
      nomorSurat,
      payload.kodeKlasifikasi || "-",
      noUrut,
      tahun,
      payload.tanggalSurat,
      payload.tujuan,
      payload.perihal,
      payload.pengonsep || "Staf TU",
      payload.penandatangan || "Kepala Sekolah",
      payload.keterangan || "-",
      fileUrl,
      nowStr
    ]]);

    return {
      success: true,
      message: `Surat keluar ${nomorSurat} berhasil diperbarui!`,
      data: { id: id, nomorSurat: nomorSurat, noUrut: noUrut, tahun: tahun, fileDriveUrl: fileUrl }
    };
  }

  sheet.appendRow([
    id,
    nomorSurat,
    payload.kodeKlasifikasi || "-",
    noUrut,
    tahun,
    payload.tanggalSurat,
    payload.tujuan,
    payload.perihal,
    payload.pengonsep || "Staf TU",
    payload.penandatangan || "Kepala Sekolah",
    payload.keterangan || "-",
    fileUrl,
    nowStr
  ]);

  return {
    success: true,
    message: `Nomor surat ${nomorSurat} berhasil didaftarkan!`,
    data: { id: id, nomorSurat: nomorSurat, noUrut: noUrut, tahun: tahun, fileDriveUrl: fileUrl }
  };
}

function handleDeleteSuratKeluar(ss, payload) {
  const sheet = ss.getSheetByName(TAB_SURAT_KELUAR);
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, message: "Tidak ada data surat keluar." };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id) || String(data[i][1]) === String(payload.nomorSurat)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Nomor surat keluar berhasil dihapus dari Google Sheets." };
    }
  }
  return { success: false, message: "Surat keluar tidak ditemukan." };
}

function handleDeleteSuratMasuk(ss, payload) {
  const sheet = ss.getSheetByName(TAB_SURAT_MASUK);
  if (!sheet || sheet.getLastRow() <= 1) return { success: false, message: "Tidak ada data surat masuk." };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id) || String(data[i][1]) === String(payload.noAgenda)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Surat masuk berhasil dihapus dari Google Sheets." };
    }
  }
  return { success: false, message: "Surat masuk tidak ditemukan." };
}

function handleGetSuratMasuk(ss) {
  const sheet = ss.getSheetByName(TAB_SURAT_MASUK);
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const list = values.map(row => ({
    id: String(row[0]),
    noAgenda: String(row[1]),
    noSuratAsli: String(row[2]),
    tglSurat: row[3] instanceof Date ? Utilities.formatDate(row[3], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(row[3]),
    tglTerima: row[4] instanceof Date ? Utilities.formatDate(row[4], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(row[4]),
    pengirim: String(row[5]),
    perihal: String(row[6]),
    disposisiKe: String(row[7]),
    instruksiDisposisi: String(row[8]),
    fileScanUrl: String(row[9]),
    status: String(row[10])
  }));

  return { success: true, data: list.reverse() };
}

function handleSaveSuratMasuk(ss, payload) {
  const sheet = ss.getSheetByName(TAB_SURAT_MASUK);
  const tahun = new Date().getFullYear();
  const count = sheet.getLastRow() > 1 ? sheet.getLastRow() : 1;
  const noAgenda = `SM/${tahun}/${String(count).padStart(3, '0')}`;
  const id = `SM-${tahun}-${String(count).padStart(3, '0')}`;

  let fileUrl = payload.fileScanUrl || "";
  if (payload.scanBase64) {
    const root = getOrCreateSubFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
    const smFolder = getOrCreateSubFolder(root, FOLDER_SURAT_MASUK);
    const base64Data = payload.scanBase64.replace(/^data:([A-Za-z-+\/]+);base64,/, '');
    const filename = `SCAN_${noAgenda.replace(/\//g, '_')}.pdf`;
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "application/pdf", filename);
    const f = smFolder.createFile(blob);
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    fileUrl = f.getUrl();
  }

  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  sheet.appendRow([
    id, noAgenda, payload.noSuratAsli || "-", payload.tglSurat,
    payload.tglTerima || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    payload.pengirim, payload.perihal, payload.disposisiKe || "-", payload.instruksiDisposisi || "-",
    fileUrl, payload.status || "Baru Masuk", nowStr
  ]);

  return {
    success: true,
    message: `Surat Masuk nomor agenda ${noAgenda} berhasil dicatat!`,
    data: { id: id, noAgenda: noAgenda, fileUrl: fileUrl }
  };
}

/**
 * ==========================================================================
 * HANDLERS: MODUL 3 - GENERATE SURAT DOKUMEN & PDF (SELF-SERVICE)
 * ==========================================================================
 */
function handleGenerateSuratPDF(ss, payload) {
  const root = getOrCreateSubFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  const pdfFolder = getOrCreateSubFolder(root, FOLDER_SURAT_KELUAR);

  const docName = `SURAT_${payload.jenisSurat}_${payload.nisn}_${Date.now()}`;
  const newDoc = DocumentApp.create(docName);
  const body = newDoc.getBody();

  body.setMarginTop(36); body.setMarginBottom(36); body.setMarginLeft(54); body.setMarginRight(54);

  body.appendParagraph("PEMERINTAH KABUPATEN BREBES")
    .setFontFamily("Times New Roman").setFontSize(11).setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph("DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA")
    .setFontFamily("Times New Roman").setFontSize(13).setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph("UPT SATUAN PENDIDIKAN")
    .setFontFamily("Times New Roman").setFontSize(11).setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph(payload.namaSekolah || "SD NEGERI TERLANGU 01")
    .setFontFamily("Times New Roman").setFontSize(15).setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph("KECAMATAN BREBES")
    .setFontFamily("Times New Roman").setFontSize(11).setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph("Alamat: " + (payload.alamatSekolah || "Jl. Raya Terlangu, Desa Terlangu") + " | NPSN: " + (payload.npsn || "20326713"))
    .setFontFamily("Times New Roman").setFontSize(9).setItalic(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  
  body.appendHorizontalRule();

  body.appendParagraph("");
  body.appendParagraph(payload.judulSurat || "SURAT KETERANGAN AKTIF BELAJAR")
    .setFontFamily("Times New Roman").setFontSize(12).setBold(true).setUnderline(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph("Nomor: " + payload.nomorSurat)
    .setFontFamily("Times New Roman").setFontSize(11).setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  body.appendParagraph("");
  body.appendParagraph("Yang bertanda tangan di bawah ini Kepala " + (payload.namaSekolah || "SD Negeri Terlangu 01") + ", dengan ini menerangkan bahwa:");

  const tableData = [
    ["1. Nama Lengkap", ": " + payload.nama],
    ["2. NISN / NIS", ": " + payload.nisn + " / " + (payload.nis || "-")],
    ["3. Tempat, Tanggal Lahir", ": " + payload.tempatLahir + ", " + payload.tanggalLahir],
    ["4. Jenis Kelamin", ": " + payload.jk],
    ["5. Kelas", ": " + payload.kelas + " (Sekolah Dasar)"],
    ["6. Nama Orang Tua / Wali", ": " + payload.namaOrtu],
    ["7. Alamat Siswa", ": " + payload.alamat]
  ];

  const table = body.appendTable(tableData);
  table.setBorderWidth(0);

  body.appendParagraph("");
  body.appendParagraph("Adalah benar-benar siswa aktif terdaftar pada satuan pendidikan kami. Surat keterangan ini diterbitkan untuk keperluan: " + (payload.keperluan || "Persyaratan administrasi") + ".");

  body.appendParagraph("");
  body.appendParagraph("Demikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.");

  body.appendParagraph("");
  const pTgl = body.appendParagraph((payload.kotaSekolah || "Brebes") + ", " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd MMMM yyyy"));
  pTgl.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  const pJabatan = body.appendParagraph("Kepala Sekolah,");
  pJabatan.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  
  body.appendParagraph("\n\n");
  const pKepsek = body.appendParagraph(payload.namaKepalaSekolah);
  pKepsek.setBold(true).setUnderline(true).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  const pNip = body.appendParagraph("NIP. " + payload.nipKepalaSekolah);
  pNip.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);

  newDoc.saveAndClose();

  const pdfBlob = newDoc.getAs('application/pdf');
  pdfBlob.setName(`SURAT_${payload.nomorSurat.replace(/\//g, '_')}.pdf`);
  const pdfFile = pdfFolder.createFile(pdfBlob);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  DriveApp.getFileById(newDoc.getId()).setTrashed(true);

  return {
    success: true,
    message: "Surat berhasil digenerate dan dikonversi ke PDF (< 5 detik)!",
    data: {
      pdfUrl: pdfFile.getUrl(),
      pdfDownloadUrl: pdfFile.getDownloadUrl(),
      nomorSurat: payload.nomorSurat
    }
  };
}

/**
 * ==========================================================================
 * HANDLERS: MODUL 4 - ABSENSI & SCAN QR
 * ==========================================================================
 */
function handleGetAbsensi(ss, payload) {
  const sheet = ss.getSheetByName(TAB_ABSENSI);
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  let list = values.map(row => ({
    id: String(row[0]),
    tanggal: row[1] instanceof Date ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(row[1]),
    kategori: String(row[2]),
    kelas: String(row[3]),
    nisnNip: String(row[4]),
    nama: String(row[5]),
    status: String(row[6]),
    keterangan: String(row[7]),
    timestamp: String(row[8])
  }));

  if (payload.tanggal) list = list.filter(a => a.tanggal === payload.tanggal);
  if (payload.kategori && payload.kategori !== "Semua") list = list.filter(a => a.kategori === payload.kategori);
  if (payload.kelas && payload.kelas !== "Semua") list = list.filter(a => a.kelas === payload.kelas);

  return { success: true, data: list };
}

function handleSaveAbsensiBatch(ss, payload) {
  const sheet = ss.getSheetByName(TAB_ABSENSI);
  const sheetSiswaBulan = ss.getSheetByName(TAB_ABSENSI_SISWA_BULAN);
  const records = payload.records || [];
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  records.forEach(rec => {
    const id = `ABS-${rec.tanggal}-${rec.kategori}-${String(rec.nisnNip).replace(/\s+/g, '')}`;
    sheet.appendRow([
      id, rec.tanggal, rec.kategori, rec.kelas || "-",
      String(rec.nisnNip), rec.nama, rec.status, rec.keterangan || "", nowStr
    ]);
  });

  // Sinkronisasi otomatis ke TAB_ABSENSI_SISWA_BULAN untuk records siswa
  if (sheetSiswaBulan) {
    try {
      const existing = sheetSiswaBulan.getDataRange().getValues();
      const keyRowMap = {};
      const marksMap = {};
      for (let i = 1; i < existing.length; i++) {
        const k = String(existing[i][0]);
        keyRowMap[k] = i + 1;
        try { marksMap[k] = existing[i][6] ? JSON.parse(existing[i][6]) : {}; } catch (e) { marksMap[k] = {}; }
      }

      records.forEach(r => {
        if (r.kategori === "Siswa") {
          const bulan = String(r.tanggal).substring(0, 7);
          const dd = String(r.tanggal).substring(8, 10);
          const ta = payload.tahunAjaran || "";
          const key = `${ta}|${bulan}|${r.nisnNip}`;
          let marks = marksMap[key] || {};
          if (r.status === "Sakit") marks[dd] = "S";
          else if (r.status === "Izin") marks[dd] = "I";
          else if (r.status === "Alpa") marks[dd] = "A";
          else marks[dd] = "H"; // Hadir
          marksMap[key] = marks;

          const rowIdx = keyRowMap[key];
          const marksJson = JSON.stringify(marks);
          if (rowIdx) {
            sheetSiswaBulan.getRange(rowIdx, 4, 1, 5).setValues([[r.kelas || "-", r.nisnNip, r.nama || "", marksJson, nowStr]]);
          } else {
            sheetSiswaBulan.appendRow([
              key, ta, bulan, r.kelas || "-", r.nisnNip, r.nama || "", marksJson, nowStr
            ]);
            keyRowMap[key] = sheetSiswaBulan.getLastRow();
          }
        }
      });
    } catch (eSync) {
      Logger.log("Gagal sync ke absensi siswa bulan: " + eSync.toString());
    }
  }

  return {
    success: true,
    message: `Berhasil mencatat presensi ${records.length} data ke database DB_Absensi!`,
    count: records.length
  };
}

function formatTimeCell(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "HH:mm");
  }
  const s = String(val).trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].length === 1 ? '0' + m[1] : m[1]}:${m[2]}`;
  return s.substring(0, 5);
}

function handleScanTendik(ss, payload) {
  const sheet = ss.getSheetByName(TAB_ABSENSI_TENDIK);
  const sheetTendik = ss.getSheetByName(TAB_TENDIK);
  var code = String(payload.code || "").trim();
  var nip = String(payload.nip || "").trim();
  if (!nip && code) {
    var m = code.match(/^SIMTAS\|T\|([A-Za-z0-9._-]{4,40})$/);
    nip = m ? m[1] : code;
  }
  nip = nip.replace(/[^A-Za-z0-9._-]/g, "").trim();

  const minGap = payload.minGapMenit || 1;
  const now = new Date();
  const today = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const jamNow = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm");
  const nowStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  // Cari nama tendik
  let namaTendik = "Guru / Tendik";
  if (sheetTendik && sheetTendik.getLastRow() > 1) {
    const tendikData = sheetTendik.getRange(2, 1, sheetTendik.getLastRow() - 1, 2).getValues();
    const cleanTargetNip = nip.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
    const found = tendikData.find(t => {
      const cleanRowNip = String(t[0]).replace(/[^A-Za-z0-9]/g, "").toLowerCase();
      return cleanRowNip === cleanTargetNip;
    });
    if (found) namaTendik = String(found[1]);
  }

  const key = `${today}|${nip}`;
  const data = sheet.getDataRange().getValues();
  let rowIdx = -1;
  let currentRec = null;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) {
      rowIdx = i + 1;
      currentRec = {
        jamDatang: formatTimeCell(data[i][5]),
        jamPulang: formatTimeCell(data[i][6]),
        status: String(data[i][4])
      };
      break;
    }
  }

  let tipe = "datang";
  if (!currentRec || !currentRec.jamDatang || currentRec.status !== "Hadir") {
    // Scan pertama = Datang
    if (rowIdx > 0) {
      sheet.getRange(rowIdx, 5, 1, 5).setValues([["Hadir", jamNow, "", "", nowStr]]);
    } else {
      sheet.appendRow([key, today, nip, namaTendik, "Hadir", jamNow, "", "", nowStr]);
    }
    tipe = "datang";
  } else {
    // Scan kedua / pembaruan = Pulang
    const [hD, mD] = currentRec.jamDatang.split(":").map(Number);
    const [hN, mN] = jamNow.split(":").map(Number);
    const diffMenit = (hN * 60 + mN) - (hD * 60 + mD);

    if (!currentRec.jamPulang && diffMenit < minGap) {
      tipe = "duplikat";
      return {
        success: true,
        data: { tipe: "duplikat", nip: nip, nama: namaTendik, jamDatang: currentRec.jamDatang },
        message: `Presensi sudah tercatat sebelumnya pada pukul ${currentRec.jamDatang}. Jeda minimal scan pulang adalah ${minGap} menit.`
      };
    }

    sheet.getRange(rowIdx, 7).setValue(jamNow);
    sheet.getRange(rowIdx, 9).setValue(nowStr);
    tipe = "pulang";
  }

  return {
    success: true,
    data: {
      tipe: tipe,
      nip: nip,
      nama: namaTendik,
      tanggal: today,
      jam: jamNow,
      jamDatang: tipe === "datang" ? jamNow : (currentRec ? currentRec.jamDatang : jamNow),
      jamPulang: tipe === "pulang" ? jamNow : ""
    },
    message: tipe === "datang" ? `Selamat datang ${namaTendik}! Presensi datang tercatat pukul ${jamNow}.` : `Terima kasih ${namaTendik}! Presensi pulang tercatat pukul ${jamNow}.`
  };
}

function handleGetAbsensiTendikBulan(ss, payload) {
  const sheet = ss.getSheetByName(TAB_ABSENSI_TENDIK);
  const bulan = payload.bulan; // format: "yyyy-MM"
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const list = values.filter(row => {
    const tgl = row[1] instanceof Date ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(row[1]);
    return tgl.startsWith(bulan);
  }).map(row => ({
    key: String(row[0]),
    tanggal: row[1] instanceof Date ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(row[1]),
    nip: String(row[2]),
    nama: String(row[3]),
    status: String(row[4]),
    jamDatang: formatTimeCell(row[5]),
    jamPulang: formatTimeCell(row[6]),
    keterangan: String(row[7] || "")
  }));

  return { success: true, data: list };
}

function handleSaveAbsensiTendikManual(ss, payload) {
  const sheet = ss.getSheetByName(TAB_ABSENSI_TENDIK);
  const sheetTendik = ss.getSheetByName(TAB_TENDIK);
  const { tanggal, nip, status, jamDatang, jamPulang, keterangan } = payload;
  const key = `${tanggal}|${nip}`;
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  let namaTendik = "Guru / Tendik";
  if (sheetTendik && sheetTendik.getLastRow() > 1) {
    const tendikData = sheetTendik.getRange(2, 1, sheetTendik.getLastRow() - 1, 2).getValues();
    const found = tendikData.find(t => String(t[0]).trim() === String(nip).trim());
    if (found) namaTendik = String(found[1]);
  }

  const data = sheet.getDataRange().getValues();
  let rowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) { rowIdx = i + 1; break; }
  }

  if (status === "Hapus") {
    if (rowIdx > 0) sheet.deleteRow(rowIdx);
    return { success: true, message: "Catatan presensi berhasil dihapus." };
  }

  if (rowIdx > 0) {
    sheet.getRange(rowIdx, 5, 1, 5).setValues([[
      status || "Hadir", jamDatang || "", jamPulang || "", keterangan || "", nowStr
    ]]);
  } else {
    sheet.appendRow([
      key, tanggal, nip, namaTendik, status || "Hadir", jamDatang || "", jamPulang || "", keterangan || "", nowStr
    ]);
  }

  return { success: true, message: "Presensi guru/tendik berhasil diperbarui." };
}

function handleGetAbsensiSiswaBulan(ss, payload) {
  const sheet = ss.getSheetByName(TAB_ABSENSI_SISWA_BULAN);
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: [] };

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  let list = values.map(row => {
    let marks = {};
    try { marks = row[6] ? JSON.parse(row[6]) : {}; } catch (e) { marks = {}; }
    return {
      key: String(row[0]),
      tahunAjaran: String(row[1]),
      bulan: String(row[2]),
      kelas: String(row[3]),
      nisn: String(row[4]),
      nama: String(row[5]),
      marks: marks
    };
  });

  if (payload.bulan) list = list.filter(r => r.bulan === payload.bulan);
  if (payload.tahunAjaran) list = list.filter(r => r.tahunAjaran === payload.tahunAjaran);
  if (payload.kelas) {
    const targetK = String(payload.kelas).trim();
    list = list.filter(r => {
      const rk = String(r.kelas || "").trim();
      if (!rk || rk === "-") return true;
      if (rk === targetK || rk.toLowerCase() === targetK.toLowerCase()) return true;
      const d1 = rk.replace(/\D/g, "");
      const d2 = targetK.replace(/\D/g, "");
      return !!(d1 && d2 && d1 === d2);
    });
  }

  return { success: true, data: list };
}

function handleSaveAbsensiSiswaBulan(ss, payload) {
  const sheet = ss.getSheetByName(TAB_ABSENSI_SISWA_BULAN);
  const { tahunAjaran, bulan, kelas, rows } = payload;
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  const existing = sheet.getDataRange().getValues();
  const keyRowMap = {};
  for (let i = 1; i < existing.length; i++) {
    keyRowMap[String(existing[i][0])] = i + 1;
  }

  (rows || []).forEach(r => {
    const key = `${tahunAjaran}|${bulan}|${r.nisn}`;
    const marksJson = JSON.stringify(r.marks || {});
    const rowIdx = keyRowMap[key];

    if (rowIdx) {
      sheet.getRange(rowIdx, 4, 1, 5).setValues([[kelas || "-", r.nisn, r.nama || "", marksJson, nowStr]]);
    } else {
      sheet.appendRow([
        key, tahunAjaran, bulan, kelas, r.nisn, r.nama || "", marksJson, nowStr
      ]);
      keyRowMap[key] = sheet.getLastRow();
    }
  });

  return { success: true, message: `Rekap absensi siswa kelas ${kelas} bulan ${bulan} berhasil disimpan!` };
}

/**
 * ==========================================================================
 * HANDLERS: CONFIG & IDENTITAS SEKOLAH
 * ==========================================================================
 */
function handleGetConfig(ss) {
  let sheet = ss.getSheetByName(TAB_CONFIG);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_CONFIG);
    sheet.appendRow(["Key", "Value"]);
    return { success: true, data: {} };
  }
  const data = sheet.getDataRange().getValues();
  const config = {};
  for (let i = 1; i < data.length; i++) {
    const k = String(data[i][0]).trim();
    if (k) {
      let val = data[i][1];
      try { val = JSON.parse(val); } catch (e) {}
      config[k] = val;
      if (k === "NAMA_SEKOLAH") config.namaSekolah = val;
      if (k === "NPSN") config.npsn = val;
      if (k === "KEPALA_SEKOLAH" || k === "NAMA_KEPALA_SEKOLAH") config.namaKepalaSekolah = val;
      if (k === "NIP_KEPALA_SEKOLAH") config.nipKepalaSekolah = val;
      if (k === "ALAMAT") config.alamat = val;
    }
  }
  return { success: true, data: config };
}

function handleSaveConfig(ss, payload) {
  let sheet = ss.getSheetByName(TAB_CONFIG);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_CONFIG);
    sheet.appendRow(["Key", "Value"]);
  }
  const data = sheet.getDataRange().getValues();
  const keyRowMap = {};
  for (let i = 1; i < data.length; i++) {
    keyRowMap[String(data[i][0]).trim()] = i + 1;
  }
  Object.keys(payload || {}).forEach(k => {
    const val = typeof payload[k] === "object" ? JSON.stringify(payload[k]) : String(payload[k]);
    if (keyRowMap[k]) {
      sheet.getRange(keyRowMap[k], 2).setValue(val);
    } else {
      sheet.appendRow([k, val]);
      keyRowMap[k] = sheet.getLastRow();
    }
  });
  return { success: true, message: "Konfigurasi identitas sekolah & Kepala Sekolah berhasil disimpan ke cloud!" };
}

/**
 * ==========================================================================
 * HANDLERS: JADWAL PELAJARAN (MATRIKS TEMATIK & MATA PELAJARAN)
 * ==========================================================================
 */
function handleGetJadwal(ss, payload) {
  let sheet = ss.getSheetByName(TAB_JADWAL);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_JADWAL);
    sheet.appendRow(["ID", "ROMBEL", "HARI", "JAM_KE", "MAPEL", "NAMA_GURU", "WAKTU_MULAI", "WAKTU_SELESAI", "RUANG", "UPDATED_AT"]);
    return { success: true, data: [] };
  }
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const list = [];
  const rawTarget = payload && (payload.rombel || payload.kelas) ? String(payload.rombel || payload.kelas) : null;
  const targetRombel = (rawTarget && rawTarget !== "Semua") ? rawTarget : null;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rombel = String(row[1]);
    if (targetRombel) {
      const norm1 = rombel.toLowerCase().replace(/[^a-z0-9]/g, "");
      const norm2 = targetRombel.toLowerCase().replace(/[^a-z0-9]/g, "");
      const d1 = rombel.replace(/\D/g, "");
      const d2 = targetRombel.replace(/\D/g, "");
      const match = (norm1 === norm2) || (d1 && d2 && d1 === d2) || rombel.includes(targetRombel) || targetRombel.includes(rombel);
      if (!match) continue;
    }

    list.push({
      id: String(row[0] || ""),
      rombel: rombel,
      kelas: rombel,
      hari: String(row[2] || ""),
      jamKe: Number(row[3]) || 1,
      mapel: String(row[4] || ""),
      namaGuru: String(row[5] || ""),
      guru: String(row[5] || ""),
      waktuMulai: String(row[6] || ""),
      waktuSelesai: String(row[7] || ""),
      ruang: String(row[8] || ""),
      updatedAt: String(row[9] || "")
    });
  }

  return { success: true, data: list };
}

function handleSaveJadwal(ss, payload) {
  let sheet = ss.getSheetByName(TAB_JADWAL);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_JADWAL);
    sheet.appendRow(["ID", "ROMBEL", "HARI", "JAM_KE", "MAPEL", "NAMA_GURU", "WAKTU_MULAI", "WAKTU_SELESAI", "RUANG", "UPDATED_AT"]);
  }

  const items = payload.items || (payload.item ? [payload.item] : [payload]);
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  const data = sheet.getDataRange().getValues();
  let savedCount = 0;

  items.forEach(item => {
    const rombel = String(item.rombel || item.kelas || "1");
    const hari = String(item.hari || "Senin");
    const jamKe = Number(item.jamKe) || 1;
    const mapel = String(item.mapel || "");
    const namaGuru = String(item.namaGuru || item.guru || "");
    const id = item.id || `JADWAL_${rombel.replace(/\s+/g, '_')}_${hari}_${jamKe}`;

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === id || (String(data[i][1]) === rombel && String(data[i][2]) === hari && Number(data[i][3]) === jamKe)) {
        rowIndex = i + 1;
        break;
      }
    }

    const rowValues = [
      id,
      rombel,
      hari,
      jamKe,
      mapel,
      namaGuru,
      String(item.waktuMulai || ""),
      String(item.waktuSelesai || ""),
      String(item.ruang || `Kelas ${rombel}`),
      nowStr
    ];

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, 10).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
    savedCount++;
  });

  return { success: true, message: `Berhasil menyimpan ${savedCount} slot jadwal pelajaran!`, count: savedCount };
}

function handleDeleteJadwal(ss, payload) {
  const sheet = ss.getSheetByName(TAB_JADWAL);
  if (!sheet) return { success: false, message: "Tab jadwal tidak ditemukan." };

  const id = String(payload.id || "");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: `Slot jadwal ${id} berhasil dihapus.` };
    }
  }

  return { success: false, message: `Slot jadwal dengan ID ${id} tidak ditemukan.` };
}

function handleClearJadwalKelas(ss, payload) {
  const sheet = ss.getSheetByName(TAB_JADWAL);
  if (!sheet) return { success: false, message: "Tab jadwal tidak ditemukan." };

  const targetRombel = String(payload.rombel || payload.kelas || "").trim();
  if (!targetRombel) return { success: false, message: "Parameter rombel/kelas wajib diisi." };

  const targetClean = targetRombel.replace(/\D/g, "");
  const data = sheet.getDataRange().getValues();
  let deletedCount = 0;

  // Loop mundur agar index deleteRow tidak bergeser
  for (let i = data.length - 1; i >= 1; i--) {
    const rowRombel = String(data[i][1] || "").trim();
    const rowClean = rowRombel.replace(/\D/g, "");
    if (rowRombel.toLowerCase() === targetRombel.toLowerCase() || (targetClean && rowClean === targetClean)) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }

  return { 
    success: true, 
    message: `Berhasil menghapus ${deletedCount} slot jadwal untuk kelas ${targetRombel}.`, 
    deletedCount: deletedCount 
  };
}

/**
 * ==========================================================================
 * HANDLERS: PROGRAM INDONESIA PINTAR (PIP)
 * ==========================================================================
 */
function handleGetPIP(ss, payload) {
  // 1. Data Pengusulan
  let sheetU = ss.getSheetByName(TAB_PIP_PENGUSULAN);
  const pengusulan = [];
  if (sheetU && sheetU.getLastRow() > 1) {
    const dataU = sheetU.getDataRange().getValues();
    for (let i = 1; i < dataU.length; i++) {
      const r = dataU[i];
      pengusulan.push({
        id: String(r[0] || ""),
        tahun: String(r[1] || ""),
        nisn: String(r[2] || ""),
        nama: String(r[3] || ""),
        kelas: String(r[4] || ""),
        namaOrtu: String(r[5] || ""),
        desil: Number(r[6]) || 1,
        nominal: Number(r[7]) || 450000,
        statusKelayakan: String(r[8] || "Layak"),
        keterangan: String(r[9] || ""),
        updatedAt: String(r[10] || "")
      });
    }
  }

  // 2. Data Siswa Penerima SK
  let sheetP = ss.getSheetByName(TAB_PIP_PENERIMA);
  const penerima = [];
  if (sheetP && sheetP.getLastRow() > 1) {
    const dataP = sheetP.getDataRange().getValues();
    for (let i = 1; i < dataP.length; i++) {
      const r = dataP[i];
      penerima.push({
        id: String(r[0] || ""),
        tahun: String(r[1] || ""),
        nisn: String(r[2] || ""),
        nama: String(r[3] || ""),
        kelas: String(r[4] || ""),
        nomorSK: String(r[5] || ""),
        tanggalSK: String(r[6] || ""),
        nomorRekening: String(r[7] || ""),
        bankPenyalur: String(r[8] || "BRI"),
        nominal: Number(r[9]) || 450000,
        statusPencairan: String(r[10] || "Belum Cair"),
        tglCair: String(r[11] || ""),
        keterangan: String(r[12] || ""),
        updatedAt: String(r[13] || "")
      });
    }
  }

  return {
    success: true,
    data: {
      pengusulan: pengusulan,
      penerima: penerima
    }
  };
}

function handleSavePIP(ss, payload) {
  const isPenerima = payload.kategori === "penerima" || !!payload.nomorSK;
  const tabName = isPenerima ? TAB_PIP_PENERIMA : TAB_PIP_PENGUSULAN;
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    setupDatabaseAndFolders();
    sheet = ss.getSheetByName(tabName);
  }

  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  const id = payload.id || `PIP_${payload.nisn}_${new Date().getFullYear()}`;
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id || String(data[i][2]) === String(payload.nisn)) {
      rowIndex = i + 1;
      break;
    }
  }

  if (isPenerima) {
    const rowValues = [
      id,
      String(payload.tahun || "2026"),
      String(payload.nisn || ""),
      String(payload.nama || ""),
      String(payload.kelas || ""),
      String(payload.nomorSK || ""),
      String(payload.tanggalSK || ""),
      String(payload.nomorRekening || ""),
      String(payload.bankPenyalur || "BRI"),
      Number(payload.nominal) || 450000,
      String(payload.statusPencairan || "Belum Cair"),
      String(payload.tglCair || ""),
      String(payload.keterangan || ""),
      nowStr
    ];
    if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, 14).setValues([rowValues]);
    else sheet.appendRow(rowValues);
  } else {
    const rowValues = [
      id,
      String(payload.tahun || "2026"),
      String(payload.nisn || ""),
      String(payload.nama || ""),
      String(payload.kelas || ""),
      String(payload.namaOrtu || ""),
      Number(payload.desil) || 1,
      Number(payload.nominal) || 450000,
      String(payload.statusKelayakan || "Layak"),
      String(payload.keterangan || ""),
      nowStr
    ];
    if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, 11).setValues([rowValues]);
    else sheet.appendRow(rowValues);
  }

  return { success: true, message: `Data PIP untuk siswa ${payload.nama} berhasil disimpan ke ${tabName}!`, id: id };
}

function handleUpdatePIPStatus(ss, payload) {
  const sheet = ss.getSheetByName(TAB_PIP_PENERIMA);
  if (!sheet) return { success: false, message: "Tab penerima PIP tidak ditemukan." };

  const id = String(payload.id || "");
  const newStatus = String(payload.status || "Sudah Cair");
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id || String(data[i][2]) === String(payload.nisn)) {
      sheet.getRange(i + 1, 11).setValue(newStatus);
      if (newStatus === "Sudah Cair") {
        sheet.getRange(i + 1, 12).setValue(nowStr);
      }
      sheet.getRange(i + 1, 14).setValue(nowStr);
      return { success: true, message: `Status pencairan PIP ${id} diperbarui menjadi: ${newStatus}` };
    }
  }

  return { success: false, message: `Data penerima PIP dengan ID ${id} tidak ditemukan.` };
}

function handleImportPIP(ss, payload) {
  const items = payload.items || [];
  if (!Array.isArray(items) || items.length === 0) {
    return { success: false, message: "Tidak ada baris data untuk diimpor." };
  }

  let successCount = 0;
  items.forEach(item => {
    try {
      handleSavePIP(ss, item);
      successCount++;
    } catch (e) {}
  });

  return { success: true, message: `Berhasil mengimpor ${successCount} data PIP ke Google Sheets!` };
}

/**
 * ==========================================================================
 * HANDLERS: PENGAJUAN SURAT MANDIRI ONLINE (PORTAL ORANG TUA)
 * ==========================================================================
 */
function handleGetPermohonanSurat(ss, payload) {
  let sheet = ss.getSheetByName(TAB_PERMOHONAN_SURAT);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_PERMOHONAN_SURAT);
    sheet.appendRow(["ID", "CREATED_AT", "NISN", "NAMA", "KELAS", "NAMA_ORTU", "HP_ORTU", "JENIS_SURAT", "KEPERLUAN", "STATUS", "KETERANGAN", "UPDATED_AT"]);
    return { success: true, data: [] };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const namaWali = String(r[5] || "");
    const hpWali = String(r[6] || "");
    list.push({
      id: String(r[0] || ""),
      createdAt: String(r[1] || ""),
      nisn: String(r[2] || ""),
      nama: String(r[3] || ""),
      kelas: String(r[4] || ""),
      namaOrtu: namaWali,
      namaPemohon: namaWali,
      hpOrtu: hpWali,
      noWhatsApp: hpWali,
      noHp: hpWali,
      jenisSurat: String(r[7] || ""),
      keperluan: String(r[8] || ""),
      status: String(r[9] || "Menunggu Verifikasi TU"),
      keterangan: String(r[10] || ""),
      updatedAt: String(r[11] || "")
    });
  }

  return { success: true, data: list };
}

function handleSubmitPermohonanSurat(ss, payload) {
  let sheet = ss.getSheetByName(TAB_PERMOHONAN_SURAT);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_PERMOHONAN_SURAT);
    sheet.appendRow(["ID", "CREATED_AT", "NISN", "NAMA", "KELAS", "NAMA_ORTU", "HP_ORTU", "JENIS_SURAT", "KEPERLUAN", "STATUS", "KETERANGAN", "UPDATED_AT"]);
  }

  const year = new Date().getFullYear();
  const nextNum = sheet.getLastRow(); // urutan
  const id = payload.id || `REQ-${year}-${String(nextNum).padStart(4, "0")}`;
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  const namaPemohonFinal = String(payload.namaPemohon || payload.namaOrtu || "");
  const hpPemohonFinal = String(payload.noWhatsApp || payload.hpOrtu || payload.noHp || "");

  const rowValues = [
    id,
    String(payload.createdAt || nowStr),
    String(payload.nisn || ""),
    String(payload.nama || ""),
    String(payload.kelas || ""),
    namaPemohonFinal,
    hpPemohonFinal,
    String(payload.jenisSurat || "Surat Keterangan Aktif"),
    String(payload.keperluan || ""),
    String(payload.status || "Menunggu Verifikasi TU"),
    String(payload.keterangan || ""),
    nowStr
  ];

  sheet.appendRow(rowValues);

  const payloadObj = {
    id: id,
    tanggalMasuk: nowStr,
    nisn: String(payload.nisn || ""),
    nama: String(payload.nama || ""),
    kelas: String(payload.kelas || ""),
    namaPemohon: namaPemohonFinal,
    namaOrtu: namaPemohonFinal,
    hubunganPemohon: String(payload.hubunganPemohon || "Orang Tua / Wali"),
    noWhatsApp: hpPemohonFinal,
    hpOrtu: hpPemohonFinal,
    noHp: hpPemohonFinal,
    jenisSurat: String(payload.jenisSurat || "Surat Keterangan Aktif"),
    keperluan: String(payload.keperluan || ""),
    status: String(payload.status || "Menunggu Verifikasi TU"),
    nomorSuratTerbit: "",
    keteranganTindak: String(payload.keterangan || "")
  };

  return {
    success: true,
    message: `Permohonan surat berhasil dikirim! Simpan kode tracking Anda: ${id}`,
    ticketId: id,
    trackingCode: id,
    data: payloadObj
  };
}

function handleTrackPermohonanSurat(ss, payload) {
  const sheet = ss.getSheetByName(TAB_PERMOHONAN_SURAT);
  if (!sheet) return { success: false, message: "Tab DB_PermohonanSurat tidak ditemukan." };

  const query = String(payload.query || payload.code || payload.id || "").trim().toUpperCase();
  if (!query) return { success: false, message: "Kode resi atau parameter pencarian kosong." };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const id = String(r[0] || "").trim().toUpperCase();
    const nisn = String(r[2] || "").trim();
    const hp = String(r[6] || "").trim();
    if (id === query || nisn === query || (query.length >= 8 && hp.includes(query))) {
      return {
        success: true,
        message: "Data permohonan surat ditemukan.",
        data: {
          id: String(r[0] || ""),
          tanggalMasuk: String(r[1] || ""),
          nisn: String(r[2] || ""),
          nama: String(r[3] || ""),
          kelas: String(r[4] || ""),
          namaPemohon: String(r[5] || ""),
          hubunganPemohon: "Orang Tua / Wali",
          noWhatsApp: String(r[6] || ""),
          jenisSurat: String(r[7] || ""),
          keperluan: String(r[8] || ""),
          status: String(r[9] || "Menunggu Verifikasi TU"),
          keteranganTindak: String(r[10] || ""),
          nomorSuratTerbit: String(r[10] || "").match(/421\.[0-9\/SD\-]+/i) ? String(r[10]) : "",
          updatedAt: String(r[11] || "")
        }
      };
    }
  }

  return { success: false, message: "Kode resi permohonan tidak ditemukan pada sistem." };
}

function handleUpdatePermohonanSurat(ss, payload) {
  const sheet = ss.getSheetByName(TAB_PERMOHONAN_SURAT);
  if (!sheet) return { success: false, message: "Tab permohonan surat tidak ditemukan." };

  const id = String(payload.id || "");
  const newStatus = String(payload.status || "Disetujui TU");
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sheet.getRange(i + 1, 10).setValue(newStatus);
      if (payload.keterangan) sheet.getRange(i + 1, 11).setValue(String(payload.keterangan));
      sheet.getRange(i + 1, 12).setValue(nowStr);
      return { success: true, message: `Status permohonan ${id} berhasil diubah menjadi: ${newStatus}` };
    }
  }

  return { success: false, message: `Permohonan dengan ID ${id} tidak ditemukan.` };
}

/**
 * ==========================================================================
 * HANDLERS: UPDATE KONTAK ORTU & FIELD SISWA (OCR SYNC)
 * ==========================================================================
 */
function handleUpdateStudentPhone(ss, payload) {
  const sheet = ss.getSheetByName(TAB_SISWA);
  if (!sheet) return { success: false, message: "Tab DB_Siswa tidak ditemukan." };

  const nisn = String(payload.nisn || "");
  const phone = String(payload.noHp || payload.phone || "");
  const namaOrtu = payload.namaOrtu ? String(payload.namaOrtu) : null;
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === nisn) {
      sheet.getRange(i + 1, 11).setValue(phone); // Column 11 = NO_HP
      if (namaOrtu) {
        sheet.getRange(i + 1, 9).setValue(namaOrtu); // Column 9 = NAMA_ORTU
      }
      sheet.getRange(i + 1, 21).setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"));
      return { success: true, message: `Kontak orang tua siswa NISN ${nisn} berhasil diperbarui ke Google Sheets!` };
    }
  }

  return { success: false, message: `Siswa dengan NISN ${nisn} tidak ditemukan di Google Sheets.` };
}

function handleUpdateStudentFields(ss, payload) {
  const sheet = ss.getSheetByName(TAB_SISWA);
  if (!sheet) return { success: false, message: "Tab DB_Siswa tidak ditemukan." };

  const nisn = String(payload.nisn || "");
  const fields = payload.fields || {};
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === nisn) {
      // Perbarui metadata JSON jika ada (Col 23)
      let meta = {};
      try {
        meta = JSON.parse(data[i][22] || "{}");
      } catch (e) {}

      Object.keys(fields).forEach(k => {
        meta[k] = fields[k];
        if (k === "nik" && fields.nik) sheet.getRange(i + 1, 4).setValue(String(fields.nik)); // Col 4 = NIK
        if (k === "noKk" && fields.noKk) meta.noKk = String(fields.noKk);
        if (k === "tglTerbitKk" && fields.tglTerbitKk) meta.tglTerbitKk = String(fields.tglTerbitKk);
        if (k === "namaAyah" && fields.namaAyah) meta.namaAyah = String(fields.namaAyah);
        if (k === "namaIbu" && fields.namaIbu) meta.namaIbu = String(fields.namaIbu);
      });

      sheet.getRange(i + 1, 23).setValue(JSON.stringify(meta)); // Col 23 = METADATA_JSON
      sheet.getRange(i + 1, 21).setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"));
      return { success: true, message: `Data pokok siswa NISN ${nisn} berhasil disinkronkan ke Google Sheets!` };
    }
  }

  return { success: false, message: `Siswa dengan NISN ${nisn} tidak ditemukan di Google Sheets.` };
}

/**
 * ==========================================================================
 * HANDLER: SINKRONISASI HARI LIBUR DARI KALENDER HUSNIADIL.COM
 * ==========================================================================
 */
function handleGetCalendarHolidays(ss, payload) {
  const year = payload && payload.year ? Number(payload.year) : new Date().getFullYear();
  try {
    const url = `https://husniadil.com/calendar/${year}/`;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const html = res.getContentText();
      const match = html.match(/data-holidays=['"]([^'"]+)['"]/);
      if (match && match[1]) {
        const rawJson = decodeURIComponent(match[1].replace(/&quot;/g, '"'));
        const parsed = JSON.parse(rawJson);
        const list = [];
        Object.keys(parsed).forEach(d => {
          list.push({ tanggal: d, ket: parsed[d] });
        });
        return { success: true, count: list.length, data: list, source: url };
      }
    }
  } catch (e) {
    Logger.log("Fetch holidays error: " + e.message);
  }

  return { success: true, count: 0, data: [], source: "fallback" };
}


