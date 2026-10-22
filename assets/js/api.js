/* ==========================================================================
   SIM-TAS-SD: SISTEM INFORMASI MANAJEMEN TATA USAHA SEKOLAH DASAR
   API Connector Layer: Dual-Mode (Google Apps Script + Token Supabase  |  LocalStore Demo)

   Perubahan keamanan & sinkronisasi:
   - Setiap request cloud membawa token login Supabase (diverifikasi ulang di server).
   - TIDAK ada lagi "fallback diam-diam" ke LocalStorage saat cloud gagal (menghindari data
     tercecer/tidak sinkron). Kegagalan ditampilkan apa adanya ke pengguna.
   - Setelah operasi tulis berhasil, cache lokal ditarik ulang dari Google Sheets sehingga
     tabel di layar selalu mencerminkan data cloud (memperbaiki kasus "nomor surat tidak muncul").
   ========================================================================== */

const ROMAWI_BULAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const ApiClient = {
    getConfig() { return DataStore.getConfig(); },

    getGasUrl() {
        const cfg = this.getConfig();
        if (cfg && cfg.gasApiUrl) return cfg.gasApiUrl;
        const fixed = (window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.GAS_API_URL) || "";
        return fixed || "";
    },

    isCloudActive() {
        const cfg = this.getConfig();
        if (cfg && cfg.isCloudMode === false) return false;
        const url = this.getGasUrl();
        const hasValidUrl = !!url && url.startsWith("https://script.google.com/");
        const isExplicitlyOn = cfg && cfg.isCloudMode === true;
        const hasFixedUrl = !!(window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.GAS_API_URL);
        return hasValidUrl && (isExplicitlyOn || (cfg && cfg.isCloudMode !== false && hasFixedUrl));
    },

    // -------- Pemanggilan ke Google Apps Script (membawa token) --------
    async cloudCall(action, payload = {}) {
        const token = (typeof Auth !== "undefined" && Auth.getToken) ? await Auth.getToken() : null;
        const usesSupabase = (typeof Auth !== "undefined" && Auth.usesSupabase) ? Auth.usesSupabase() : false;
        const isPublicAction = (action === "ping" || action === "submitPermohonanSurat" || action === "trackPermohonanSurat");
        if (usesSupabase && !token && !isPublicAction) {
            return { success: false, code: "AUTH", message: "Sesi login cloud tidak ditemukan. Silakan masuk kembali dengan akun Supabase." };
        }
        try {
            const response = await fetch(this.getGasUrl(), {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" }, // text/plain => tanpa preflight CORS di GAS
                body: JSON.stringify({ action, payload, token })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            if (json && json.code === "AUTH") {
                if (usesSupabase && typeof Auth !== "undefined" && Auth.forceLogout) {
                    Auth.forceLogout("Sesi berakhir atau tidak valid. Silakan masuk kembali.");
                } else {
                    return { success: false, code: "AUTH", message: "Backend Google Apps Script mewajibkan token Supabase. Konfigurasikan Supabase di config.js atau hapus Script Properties di Apps Script." };
                }
            }
            if (json && !json.success && json.message && json.message.includes("Aksi tidak dikenali")) {
                console.warn(`[ApiClient] GAS Web App belum mendukung aksi '${action}'. Deployment Apps Script perlu diperbarui ke versi baru.`);
                if (action === "deleteSuratKeluar" || action === "deleteSuratMasuk" || action === "deleteTendik" || action === "deletePermohonanSurat") {
                    this.handleLocalFallback(action, payload);
                    return {
                        success: true,
                        message: `Data berhasil dihapus dari data lokal. PENTING: Harap update deployment Google Apps Script Anda (Manage deployments > New version > Deploy) agar aksi '${action}' juga terhapus permanen di Google Sheets.`
                    };
                }
                return {
                    success: false,
                    message: `${json.message}. Harap Deploy versi baru Google Apps Script Anda (Manage deployments > Edit > New version > Deploy).`
                };
            }
            return Sec.cleanDeep(json);
        } catch (err) {
            console.warn(`[ApiClient] Gagal koneksi cloud (${action}):`, err);
            return { success: false, message: `Gagal terhubung ke server cloud (${err.message}). Periksa koneksi internet & URL Apps Script.` };
        }
    },

    // -------- Dispatcher utama --------
    async request(action, payload = {}) {
        payload = Sec.cleanDeep(payload);

        if (this.isCloudActive()) {
            const isDemo = (typeof Auth !== "undefined" && Auth.session) ? Auth.session.demo : false;
            const isPublicAction = (action === "ping" || action === "submitPermohonanSurat" || action === "trackPermohonanSurat");

            // Aksi portal publik (permohonan mandiri & tracking) selalu diproses ke Cloud tanpa terhalang sesi demo
            if (!isDemo || isPublicAction) {
                const res = await this.cloudCall(action, payload);
                if (res && res.success) {
                    if (typeof Sync !== "undefined" && Sync.PULL_AFTER && Sync.PULL_AFTER[action]) {
                        await Promise.all(Sync.PULL_AFTER[action].map(kind => Sync.pull(kind)));
                    }
                    return res;
                }
                // Jika aksi publik gagal di cloud, kembalikan respon kegagalan secara transparan agar user tidak tertipu nomor lokal
                if (isPublicAction) {
                    return res;
                }
                if (res && res.code === "AUTH") {
                    console.warn(`[ApiClient] Request '${action}' dialihkan ke database lokal karena sesi tanpa token.`);
                } else if (res && !res.success) {
                    return res;
                }
            }
        }

        await new Promise(r => setTimeout(r, 60)); // latensi mikro agar UX terasa natural
        try {
            return this.handleLocalFallback(action, payload);
        } catch (err) {
            console.error(`[ApiClient] Error lokal (${action}):`, err);
            return { success: false, message: `Terjadi kesalahan: ${err.message}` };
        }
    },

    async testConnection(testUrl) {
        try {
            const response = await fetch(testUrl, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "ping", payload: { timestamp: Date.now() } })
            });
            const data = await response.json();
            if (data.status === "ok" || data.success) {
                return { success: true, message: "Koneksi Google Apps Script berhasil terhubung!", data: data };
            }
            return { success: false, message: data.message || "Respon server tidak valid." };
        } catch (e) {
            return {
                success: false,
                message: `Gagal menghubungi URL Apps Script: ${e.message}. Pastikan deployment diset 'Anyone' (Siapa Saja).`
            };
        }
    },

    async testSupabaseConnection(supabaseUrl, anonKey) {
        if (!supabaseUrl) return { success: false, message: "URL Supabase tidak boleh kosong." };
        if (!anonKey) return { success: false, message: "Supabase Anon Key tidak boleh kosong." };
        try {
            const cleanUrl = supabaseUrl.replace(/\/$/, "");
            const res = await fetch(`${cleanUrl}/auth/v1/health`, {
                method: "GET",
                headers: {
                    "apikey": anonKey,
                    "Authorization": `Bearer ${anonKey}`
                }
            });
            if (res.ok) {
                return { success: true, message: "Koneksi Supabase Cloud Auth berhasil dan endpoint aktif!", status: res.status };
            }
            // Fallback coba ping /rest/v1/
            const resRest = await fetch(`${cleanUrl}/rest/v1/`, {
                method: "GET",
                headers: {
                    "apikey": anonKey,
                    "Authorization": `Bearer ${anonKey}`
                }
            });
            if (resRest.ok || resRest.status === 200 || resRest.status === 204) {
                return { success: true, message: "Koneksi REST Supabase berhasil!", status: resRest.status };
            }
            return { success: false, message: `Server Supabase merespon HTTP ${res.status}. Pastikan URL dan Anon Key sesuai.` };
        } catch (e) {
            return {
                success: false,
                message: `Gagal terhubung ke Supabase: ${e.message}. Periksa URL dan koneksi internet.`
            };
        }
    },

    // -------- Logika scan (dipakai mode lokal; dicerminkan di Code.gs) --------
    applyScan(rec, jam, minGap) {
        if (!rec.jamDatang || (rec.status && rec.status !== "Hadir")) {
            rec.status = "Hadir";
            rec.jamDatang = jam;
            return "datang";
        }
        const selisih = Util.diffMenit(rec.jamDatang, jam);
        if (!rec.jamPulang && selisih < minGap) return "duplikat";
        if (rec.jamPulang && Util.diffMenit(rec.jamPulang, jam) < 2) return "duplikat";
        rec.jamPulang = jam;
        return "pulang";
    },

    defaultBerkas() {
        return {
            kk: { uploaded: false, filename: null, date: null, url: null },
            akta: { uploaded: false, filename: null, date: null, url: null },
            kip: { uploaded: false, filename: null, date: null, url: null },
            foto: { uploaded: false, filename: null, date: null, url: null }
        };
    },

    // -------- Handler LocalStorage (Mode Demo) --------
    handleLocalFallback(action, payload) {
        const cfg = DataStore.getConfig();

        switch (action) {
            case "ping":
                return { success: true, message: "SIM-TAS Local Database Siap", mode: "local" };

            // ================== SISWA / BERKAS ==================
            case "getStudents": {
                const students = payload.all ? DataStore.getSiswaAll() : DataStore.getSiswa(payload.tahunAjaran);
                return { success: true, data: students };
            }

            case "saveStudent": {
                const students = DataStore.getSiswa();
                const index = students.findIndex(s => s.nisn === payload.nisn);
                if (!payload.rombel && payload.kelas) payload.rombel = String(payload.kelas);
                if (index >= 0) {
                    students[index] = { ...students[index], ...payload };
                } else {
                    students.unshift({ ...payload, berkas: payload.berkas || this.defaultBerkas() });
                }
                DataStore.saveSiswa(students);
                return { success: true, message: "Data siswa berhasil disimpan!", data: payload };
            }

            case "importStudents": {
                const ta = payload.tahunAjaran || DataStore.getActiveTA();
                const mode = payload.mode === "skip" ? "skip" : "update";
                const list = DataStore.getSiswa(ta);
                let added = 0, updated = 0, skipped = 0;

                (payload.rows || []).forEach(row => {
                    if (!row.nisn) return;
                    const idx = list.findIndex(s => s.nisn === row.nisn);
                    if (idx >= 0) {
                        if (mode === "skip") { skipped++; return; }
                        const old = list[idx];
                        const merged = { ...old };
                        Object.keys(row).forEach(k => {
                            if (k === "berkas") return;
                            if (row[k] !== "" && row[k] != null) merged[k] = row[k];
                        });
                        merged.berkas = row.berkas || old.berkas || this.defaultBerkas();
                        list[idx] = merged;
                        updated++;
                    } else {
                        list.push({ ...row, berkas: row.berkas || this.defaultBerkas() });
                        added++;
                    }
                });

                DataStore.saveSiswa(list, ta);
                DataStore.addTA(ta);
                return {
                    success: true,
                    message: `Impor selesai untuk TA ${ta}: ${added} siswa baru, ${updated} diperbarui, ${skipped} dilewati.`,
                    data: { added, updated, skipped }
                };
            }

            case "uploadStudentDoc": {
                const students = DataStore.getSiswa();
                const student = students.find(s => s.nisn === payload.nisn);
                if (!student) return { success: false, message: "Siswa dengan NISN tersebut tidak ditemukan." };

                const docKey = String(payload.docType).toLowerCase(); // kk, akta, kip, foto
                const today = Util.today();
                const year = new Date().getFullYear();
                const ext = payload.fileExt || "pdf";
                const filename = `${payload.nisn}_${String(payload.docType).toUpperCase()}_${year}.${ext}`;
                const fileUrl = payload.fileBase64 || `https://drive.google.com/file/d/sim-tas-${payload.nisn}-${docKey}/view`;

                if (!student.berkas) student.berkas = this.defaultBerkas();
                student.berkas[docKey] = { uploaded: true, filename, date: today, url: fileUrl, base64: payload.fileBase64 || null };

                DataStore.saveSiswa(students);
                return {
                    success: true,
                    message: `Dokumen ${String(payload.docType).toUpperCase()} berhasil diarsipkan!`,
                    data: { filename, fileUrl, date: today }
                };
            }

            // ================== SURAT (SRIKANDI) ==================
            case "getSuratKeluar":
                return { success: true, data: DataStore.getSuratKeluar() };

            case "getNextNomorSuratKeluar": {
                const list = DataStore.getSuratKeluar();
                const kode = payload.kodeKlasifikasi || "421.2";
                const tgl = payload.tanggalSurat ? new Date(payload.tanggalSurat + "T00:00:00") : new Date();
                const tahun = tgl.getFullYear();
                const bulanRomawi = ROMAWI_BULAN[tgl.getMonth()];

                // Ekstrak nomor urut tertinggi terakhir dari database (memeriksa noUrut maupun string nomorSurat)
                const maxNo = list.reduce((max, s) => {
                    let sTahun = s.tahun;
                    if (!sTahun && s.tanggalSurat) sTahun = parseInt(String(s.tanggalSurat).substring(0, 4), 10);
                    if (!sTahun && s.nomorSurat) {
                        const mYear = String(s.nomorSurat).match(/\b(20\d{2})\b/);
                        if (mYear) sTahun = parseInt(mYear[1], 10);
                    }
                    if (sTahun && sTahun !== tahun) return max;

                    let cand = parseInt(s.noUrut, 10);
                    if (isNaN(cand) || cand <= 0) {
                        const parts = String(s.nomorSurat || "").split("/").map(p => p.trim());
                        if (parts.length >= 2) {
                            const pNo = parseInt(parts[1], 10);
                            if (!isNaN(pNo)) cand = pNo;
                        }
                    }
                    return (!isNaN(cand) && cand > max) ? cand : max;
                }, 0);

                const nextNo = maxNo + 1;
                const nomorSurat = `${kode}/${String(nextNo).padStart(3, "0")}/${bulanRomawi}/${tahun}`;
                return { success: true, data: { nextNo, nomorSurat, kodeKlasifikasi: kode, bulan: bulanRomawi, tahun } };
            }

            case "saveSuratKeluar": {
                const list = DataStore.getSuratKeluar();
                const tgl = payload.tanggalSurat ? new Date(payload.tanggalSurat + "T00:00:00") : new Date();
                const tahun = tgl.getFullYear();
                const bulanRomawi = ROMAWI_BULAN[tgl.getMonth()];

                // Ekstrak nomor tertinggi untuk auto-increment jika noUrut belum ditentukan
                const maxNo = list.reduce((max, s) => {
                    let sTahun = s.tahun;
                    if (!sTahun && s.tanggalSurat) sTahun = parseInt(String(s.tanggalSurat).substring(0, 4), 10);
                    if (!sTahun && s.nomorSurat) {
                        const mYear = String(s.nomorSurat).match(/\b(20\d{2})\b/);
                        if (mYear) sTahun = parseInt(mYear[1], 10);
                    }
                    if (sTahun && sTahun !== tahun) return max;

                    let cand = parseInt(s.noUrut, 10);
                    if (isNaN(cand) || cand <= 0) {
                        const parts = String(s.nomorSurat || "").split("/").map(p => p.trim());
                        if (parts.length >= 2) {
                            const pNo = parseInt(parts[1], 10);
                            if (!isNaN(pNo)) cand = pNo;
                        }
                    }
                    return (!isNaN(cand) && cand > max) ? cand : max;
                }, 0);

                const noUrut = payload.noUrut || (maxNo + 1);
                const nomorSurat = payload.nomorSuratManual || payload.nomorSurat || `${payload.kodeKlasifikasi || "421.2"}/${String(noUrut).padStart(3, "0")}/${bulanRomawi}/${tahun}`;

                const existingIdx = list.findIndex(s => (payload.id && s.id === payload.id) || (payload.oldNomorSurat && s.nomorSurat === payload.oldNomorSurat));

                if (existingIdx >= 0) {
                    const existing = list[existingIdx];
                    const updated = {
                        ...existing,
                        id: payload.id || existing.id,
                        nomorSurat,
                        kodeKlasifikasi: payload.kodeKlasifikasi || existing.kodeKlasifikasi,
                        tanggalSurat: payload.tanggalSurat || existing.tanggalSurat,
                        tujuan: payload.tujuan,
                        perihal: payload.perihal,
                        pengonsep: payload.pengonsep || existing.pengonsep,
                        penandatangan: payload.penandatangan || existing.penandatangan,
                        keterangan: payload.keterangan || existing.keterangan,
                        fileDriveUrl: payload.fileDriveUrl || payload.fileBase64 || existing.fileDriveUrl,
                        isManual: !!payload.nomorSuratManual
                    };
                    list[existingIdx] = updated;
                    DataStore.saveSuratKeluar(list);
                    return { success: true, message: `Surat keluar ${nomorSurat} berhasil diperbarui!`, data: updated };
                }

                const newSurat = {
                    id: payload.id || `SK-${tahun}-${String(noUrut).padStart(3, "0")}`,
                    nomorSurat,
                    kodeKlasifikasi: payload.kodeKlasifikasi || "-",
                    noUrut,
                    tahun,
                    tanggalSurat: payload.tanggalSurat || Util.today(),
                    tujuan: payload.tujuan,
                    perihal: payload.perihal,
                    pengonsep: payload.pengonsep || "Staf TU",
                    penandatangan: payload.penandatangan || cfg.namaKepalaSekolah,
                    keterangan: payload.keterangan || "-",
                    fileDriveUrl: payload.fileDriveUrl || payload.fileBase64 || `https://drive.google.com/file/d/sk-${tahun}-${noUrut}/view`,
                    isManual: !!payload.nomorSuratManual,
                    createdAt: new Date().toISOString()
                };

                list.unshift(newSurat);
                DataStore.saveSuratKeluar(list);
                return { success: true, message: `Nomor surat keluar ${nomorSurat} berhasil disimpan!`, data: newSurat };
            }

            case "deleteSuratKeluar": {
                let list = DataStore.getSuratKeluar();
                list = list.filter(s => s.id !== payload.id && s.nomorSurat !== payload.nomorSurat);
                DataStore.saveSuratKeluar(list);
                return { success: true, message: "Nomor surat keluar berhasil dihapus!" };
            }

            case "deleteSuratMasuk": {
                let list = DataStore.getSuratMasuk();
                list = list.filter(s => s.id !== payload.id && s.noAgenda !== payload.noAgenda);
                DataStore.saveSuratMasuk(list);
                return { success: true, message: "Surat masuk berhasil dihapus!" };
            }

            case "getSuratMasuk":
                return { success: true, data: DataStore.getSuratMasuk() };

            case "saveSuratMasuk": {
                const list = DataStore.getSuratMasuk();
                const tahun = new Date().getFullYear();
                const noAgenda = `SM/${tahun}/${String(list.length + 1).padStart(3, "0")}`;

                const newSurat = {
                    id: `SM-${tahun}-${String(list.length + 1).padStart(3, "0")}`,
                    noAgenda,
                    noSuratAsli: payload.noSuratAsli,
                    tglSurat: payload.tglSurat,
                    tglTerima: payload.tglTerima || Util.today(),
                    pengirim: payload.pengirim,
                    perihal: payload.perihal,
                    disposisiKe: payload.disposisiKe || "-",
                    instruksiDisposisi: payload.instruksiDisposisi || "Arsipkan dan pelajari.",
                    fileScanUrl: payload.fileScanUrl || payload.scanBase64 || "https://drive.google.com/file/d/sample-scan/view",
                    status: payload.status || "Baru Masuk",
                    createdAt: new Date().toISOString()
                };

                list.unshift(newSurat);
                DataStore.saveSuratMasuk(list);
                return { success: true, message: `Surat Masuk dengan Agenda ${noAgenda} berhasil dicatat!`, data: newSurat };
            }

            // ================== ABSENSI HARIAN (LAMA) ==================
            case "getAbsensi": {
                let filtered = DataStore.getAbsensi();
                const { tanggal, kategori, kelas } = payload;
                if (tanggal) filtered = filtered.filter(a => a.tanggal === tanggal);
                if (kategori && kategori !== "Semua") filtered = filtered.filter(a => a.kategori === kategori);
                if (kelas && kelas !== "Semua" && kategori === "Siswa") filtered = filtered.filter(a => a.kelas === kelas);
                return { success: true, data: filtered };
            }

            case "saveAbsensiBatch": {
                const currentList = DataStore.getAbsensi();
                const newRecords = payload.records || [];
                const stamp = `${Util.today()} ${Util.nowTime()}`;

                const map = new Map();
                currentList.forEach(item => map.set(`${item.tanggal}_${item.kategori}_${item.nisnNip}`, item));
                newRecords.forEach(rec => {
                    map.set(`${rec.tanggal}_${rec.kategori}_${rec.nisnNip}`, {
                        id: `ABS-${rec.tanggal}-${rec.kategori}-${String(rec.nisnNip).replace(/\s+/g, "")}`,
                        ...rec,
                        timestamp: stamp
                    });
                });

                DataStore.saveAbsensi(Array.from(map.values()));

                // Sinkronisasi otomatis ke DataStore.getAbsensiSiswaBulan() jika ada data siswa
                const ta = DataStore.getActiveTA();
                const listBulan = DataStore.getAbsensiSiswaBulan();
                newRecords.forEach(rec => {
                    if (rec.kategori === "Siswa") {
                        const bulan = rec.tanggal.substring(0, 7);
                        const dd = rec.tanggal.substring(8, 10);
                        const key = `${ta}|${bulan}|${rec.nisnNip}`;
                        let item = listBulan.find(r => r.key === key);
                        if (!item) {
                            item = { key, tahunAjaran: ta, bulan, kelas: rec.kelas || "", nisn: rec.nisnNip, nama: rec.nama, marks: {} };
                            listBulan.push(item);
                        }
                        if (!item.marks) item.marks = {};
                        if (rec.status === "Sakit") item.marks[dd] = "S";
                        else if (rec.status === "Izin") item.marks[dd] = "I";
                        else if (rec.status === "Alpa") item.marks[dd] = "A";
                        else item.marks[dd] = "H"; // Hadir
                    }
                });
                DataStore.saveAbsensiSiswaBulan(listBulan);

                return { success: true, message: `Berhasil menyimpan presensi ${newRecords.length} orang!`, count: newRecords.length };
            }

            case "getRekapAbsensi": {
                const list = DataStore.getAbsensi();
                const todayData = list.filter(a => a.tanggal === Util.today());
                const cnt = st => todayData.filter(a => a.status === st).length;
                return {
                    success: true,
                    data: {
                        todayStats: {
                            total: todayData.length, hadir: cnt("Hadir"), sakit: cnt("Sakit"), izin: cnt("Izin"), alpa: cnt("Alpa"),
                            persenHadir: todayData.length > 0 ? ((cnt("Hadir") / todayData.length) * 100).toFixed(1) : 0
                        },
                        historiBulanan: DataStore.getHistoriBulanan()
                    }
                };
            }

            // ================== TENDIK & PRESENSI QR ==================
            case "getTendik":
                return { success: true, data: DataStore.getTendik() };

            case "saveTendik": {
                const listInput = payload.list || (payload.tendik ? [payload.tendik] : (payload.nip ? [payload] : []));
                if (!listInput || listInput.length === 0) return { success: false, message: "NIP/ID dan Nama wajib diisi." };
                const list = DataStore.getTendik();
                listInput.forEach(p => {
                    const key = Util.cleanId(p.nip);
                    const idx = list.findIndex(t => Util.cleanId(t.nip) === key);
                    const rec = {
                        nip: p.nip, nama: p.nama, jabatan: p.jabatan || "-",
                        jk: p.jk || "-", statusKepegawaian: p.statusKepegawaian || p.golongan || "-",
                        aktif: p.aktif !== false
                    };
                    if (idx >= 0) list[idx] = { ...list[idx], ...rec }; else list.push(rec);
                });
                DataStore.saveTendik(list);
                return { success: true, message: `Data guru/tendik berhasil disimpan (${listInput.length} orang).`, data: list };
            }

            case "deleteTendik": {
                const key = Util.cleanId(payload.nip);
                let list = DataStore.getTendik();
                list = list.filter(t => Util.cleanId(t.nip) !== key);
                DataStore.saveTendik(list);
                return { success: true, message: `Data guru/tendik berhasil dihapus!` };
            }

            case "saveQrFiles":
                return { success: true, message: `(Mode Demo) ${(payload.files || []).length} QR dibuat. Aktifkan Mode Cloud untuk menyimpannya ke Google Drive.`, simulated: true };

            case "scanTendik": {
                let code = String(payload.code || "").trim();
                let nip = String(payload.nip || "").trim();
                if (!nip && code) {
                    const m = code.match(/^SIMTAS\|T\|([A-Za-z0-9._-]{4,40})$/);
                    nip = m ? m[1] : code;
                }
                const cleanNip = Util.cleanId(nip);
                if (!cleanNip) return { success: false, message: "Kode QR / NIP tidak terbaca. Pastikan scanner membaca kartu ID dengan benar." };

                const tendik = DataStore.getTendik().find(t => Util.cleanId(t.nip) === cleanNip && t.aktif !== false);
                if (!tendik) return { success: false, message: `Data guru/tendik dengan NIP/ID '${nip}' tidak ditemukan atau nonaktif.` };

                const tanggal = Util.today();
                const jam = Util.nowTime();
                const list = DataStore.getAbsensiTendik();
                let rec = list.find(r => r.tanggal === tanggal && Util.cleanId(r.nip) === cleanNip);
                if (!rec) {
                    rec = { key: `${tanggal}|${cleanNip}`, tanggal, nip: cleanNip, nama: tendik.nama, jamDatang: "", jamPulang: "", status: "", keterangan: "" };
                    list.push(rec);
                }
                const tipe = this.applyScan(rec, jam, 1); // min gap 1 menit
                DataStore.saveAbsensiTendik(list);

                const pesan = tipe === "datang" ? `Selamat datang, ${tendik.nama}! Presensi datang tercatat pukul ${jam}.`
                    : tipe === "pulang" ? `Terima kasih, ${tendik.nama}! Presensi pulang tercatat pukul ${jam}. Hati-hati di jalan!`
                        : `${tendik.nama} sudah tercatat sebelumnya pada pukul ${rec.jamPulang || rec.jamDatang}.`;
                return {
                    success: true, message: pesan,
                    data: { tipe, nip: cleanNip, nama: tendik.nama, jabatan: tendik.jabatan, tanggal, jam, jamDatang: rec.jamDatang, jamPulang: rec.jamPulang }
                };
            }

            case "getAbsensiTendikBulan": {
                const bulan = String(payload.bulan || Util.monthKey());
                return { success: true, data: DataStore.getAbsensiTendik().filter(r => r.tanggal.startsWith(bulan)) };
            }

            case "saveAbsensiTendikManual": {
                const { tanggal, nip, status } = payload;
                if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal || "")) return { success: false, message: "Tanggal tidak valid." };
                const tendik = DataStore.getTendik().find(t => Util.cleanId(t.nip) === Util.cleanId(nip));
                if (!tendik) return { success: false, message: "Guru/tendik tidak ditemukan." };
                const key = Util.cleanId(nip);
                let list = DataStore.getAbsensiTendik();

                if (status === "Hapus") {
                    list = list.filter(r => !(r.tanggal === tanggal && r.nip === key));
                } else {
                    let rec = list.find(r => r.tanggal === tanggal && r.nip === key);
                    if (!rec) { rec = { key: `${tanggal}|${key}`, tanggal, nip: key, nama: tendik.nama }; list.push(rec); }
                    rec.status = status || "Hadir";
                    rec.jamDatang = payload.jamDatang || "";
                    rec.jamPulang = payload.jamPulang || "";
                    rec.keterangan = payload.keterangan || "";
                }
                DataStore.saveAbsensiTendik(list);
                return { success: true, message: "Presensi guru/tendik berhasil diperbarui." };
            }

            // ================== ABSENSI SISWA BULANAN ==================
            case "getAbsensiSiswaBulan": {
                let list = DataStore.getAbsensiSiswaBulan().filter(r => r.bulan === payload.bulan);
                if (payload.tahunAjaran) list = list.filter(r => r.tahunAjaran === payload.tahunAjaran);
                if (payload.kelas) {
                    const targetK = String(payload.kelas).trim();
                    list = list.filter(r => {
                        const rk = String(r.kelas || "").trim();
                        if (rk === targetK || rk.toLowerCase() === targetK.toLowerCase()) return true;
                        const d1 = rk.replace(/\D/g, "");
                        const d2 = targetK.replace(/\D/g, "");
                        return !!(d1 && d2 && d1 === d2);
                    });
                }
                return { success: true, data: list };
            }

            case "saveAbsensiSiswaBulan": {
                const { tahunAjaran, bulan, kelas } = payload;
                if (!/^\d{4}-\d{2}$/.test(bulan || "")) return { success: false, message: "Bulan tidak valid." };
                const list = DataStore.getAbsensiSiswaBulan();
                (payload.rows || []).forEach(row => {
                    const key = `${tahunAjaran}|${bulan}|${row.nisn}`;
                    const rec = { key, tahunAjaran, bulan, kelas, nisn: row.nisn, nama: row.nama, marks: row.marks || {} };
                    const idx = list.findIndex(r => r.key === key);
                    if (idx >= 0) list[idx] = rec; else list.push(rec);
                });
                DataStore.saveAbsensiSiswaBulan(list);
                return { success: true, message: `Absensi kelas ${kelas} bulan ${Util.labelBulan(bulan)} berhasil disimpan.` };
            }

            // ================== MODUL JADWAL PELAJARAN ==================
            case "getJadwal": {
                const list = DataStore.getJadwal(payload.kelas, payload.tahunAjaran);
                return { success: true, data: list };
            }

            case "saveJadwal": {
                const current = DataStore.getJadwalAll();
                const newItems = payload.items || (payload.item ? [payload.item] : (payload.rombel || payload.kelas ? [payload] : []));
                const map = new Map();
                current.forEach(j => {
                    const id = j.id || `JDW-${String(j.kelas || j.rombel || '1').replace(/\s+/g, '_')}-${(j.hari || 'SEN').substring(0, 3).toUpperCase()}-${j.jamKe}`;
                    map.set(id, j);
                });
                newItems.forEach(j => {
                    const k = String(j.kelas || j.rombel || "1");
                    const g = j.guru || j.namaGuru || "";
                    const id = j.id || `JDW-${k.replace(/\s+/g, '_')}-${(j.hari || 'SEN').substring(0, 3).toUpperCase()}-${j.jamKe}`;
                    map.set(id, { 
                        ...j, 
                        id, 
                        kelas: k, 
                        rombel: k, 
                        guru: g, 
                        namaGuru: g, 
                        updatedAt: new Date().toISOString() 
                    });
                });
                const updatedList = Array.from(map.values());
                DataStore.saveJadwalAll(updatedList);
                return { success: true, message: "Jadwal pelajaran berhasil disimpan!", data: updatedList };
            }

            case "deleteJadwal": {
                let current = DataStore.getJadwalAll();
                const targetId = payload.id;
                current = current.filter(j => j.id !== targetId && !(payload.rombel && String(j.kelas || j.rombel) === String(payload.rombel) && j.hari === payload.hari && Number(j.jamKe) === Number(payload.jamKe)));
                DataStore.saveJadwalAll(current);
                return { success: true, message: "Jadwal pelajaran berhasil dihapus!" };
            }

            case "getCalendarHolidays": {
                const year = Number(payload.year) || new Date().getFullYear();
                const configHolidays = DataStore.getConfig().hariLibur || [];
                const filtered = configHolidays.filter(h => h.tanggal && h.tanggal.startsWith(String(year)));
                return { 
                    success: true, 
                    source: `https://husniadil.com/calendar/${year}/`,
                    data: filtered.length > 0 ? filtered : configHolidays 
                };
            }

            // ================== MODUL PIP KEMENDIKBUD ==================
            case "getPIP": {
                return {
                    success: true,
                    data: {
                        pengusulan: DataStore.getPIPPengusulan(),
                        penerima: DataStore.getPIPPenerima()
                    }
                };
            }

            case "savePIP": {
                if (payload.tipe === "pengusulan" || payload.pengusulan) {
                    const list = payload.list || payload.pengusulan;
                    DataStore.savePIPPengusulan(list);
                    return { success: true, message: "Data pengusulan PIP berhasil disimpan!" };
                } else {
                    const list = payload.list || payload.penerima;
                    DataStore.savePIPPenerima(list);
                    return { success: true, message: "Data penerima PIP berhasil disimpan!" };
                }
            }

            case "updatePIPStatus": {
                const list = DataStore.getPIPPenerima();
                const item = list.find(p => p.nisn === payload.nisn);
                if (item) {
                    if (payload.statusCair !== undefined) item.statusCair = payload.statusCair;
                    if (payload.tanggalCair !== undefined) item.tanggalCair = payload.tanggalCair;
                    if (payload.statusRekening !== undefined) item.statusRekening = payload.statusRekening;
                    DataStore.savePIPPenerima(list);
                    return { success: true, message: `Status PIP ${item.nama} berhasil diperbarui!`, data: item };
                }
                return { success: false, message: "Data penerima PIP tidak ditemukan." };
            }

            case "importPIP": {
                const { jenis, rows } = payload;
                if (!Array.isArray(rows) || rows.length === 0) return { success: false, message: "Data impor kosong." };
                const nowIso = new Date().toISOString();
                if (jenis === "pengusulan") {
                    const current = DataStore.getPIPPengusulan();
                    const map = new Map();
                    current.forEach(item => map.set(item.nisn, item));
                    rows.forEach(r => map.set(r.nisn, { ...r, tahunUsulan: r.tahunUsulan || "2026", updatedAt: r.updatedAt || nowIso }));
                    DataStore.savePIPPengusulan(Array.from(map.values()));
                    return { success: true, message: `Berhasil mengimpor ${rows.length} data pengusulan PIP!`, count: rows.length };
                } else {
                    const current = DataStore.getPIPPenerima();
                    const map = new Map();
                    current.forEach(item => map.set(item.nisn, item));
                    rows.forEach(r => map.set(r.nisn, { ...r, tahunAnggaran: r.tahunAnggaran || "2026", updatedAt: r.updatedAt || nowIso }));
                    DataStore.savePIPPenerima(Array.from(map.values()));
                    return { success: true, message: `Berhasil mengimpor ${rows.length} data penerima PIP!`, count: rows.length };
                }
            }

            // ================== LAYANAN MANDIRI PERMOHONAN SURAT ==================
            case "getPermohonanSurat": {
                return { success: true, data: DataStore.getPermohonanSurat() };
            }

            case "submitPermohonanSurat": {
                const list = DataStore.getPermohonanSurat();
                const now = new Date();
                const y = now.getFullYear();
                let counter = list.length + 1;
                let code = `REQ-${y}-${String(counter).padStart(4, "0")}`;
                while (list.some(r => r.id === code)) {
                    counter++;
                    code = `REQ-${y}-${String(counter).padStart(4, "0")}`;
                }
                const newReq = {
                    id: code,
                    tanggalMasuk: `${Util.today()} ${Util.nowTime()}`,
                    nisn: payload.nisn,
                    nama: payload.nama || payload.namaSiswa,
                    kelas: payload.kelas,
                    jenisSurat: payload.jenisSurat,
                    keperluan: payload.keperluan,
                    namaPemohon: payload.namaPemohon || payload.namaOrtu || "",
                    namaOrtu: payload.namaOrtu || payload.namaPemohon || "",
                    hubunganPemohon: payload.hubunganPemohon || "Orang Tua / Wali",
                    noWhatsApp: payload.noWhatsApp || payload.hpOrtu || payload.noHp || "",
                    hpOrtu: payload.hpOrtu || payload.noWhatsApp || payload.noHp || "",
                    noHp: payload.noWhatsApp || payload.hpOrtu || payload.noHp || "",
                    status: "Menunggu",
                    nomorSuratTerbit: "",
                    keteranganTindak: ""
                };
                list.unshift(newReq);
                DataStore.savePermohonanSurat(list);
                return { success: true, message: "Permohonan surat berhasil dikirim!", trackingCode: code, ticketId: code, data: newReq };
            }

            case "trackPermohonanSurat": {
                const rawQuery = String(payload.query || payload.code || payload.id || "").trim();
                const queryUpper = rawQuery.toUpperCase();
                const queryClean = queryUpper.replace(/[^A-Z0-9]/g, "");
                const queryHp = rawQuery.replace(/[^0-9]/g, "");
                const list = DataStore.getPermohonanSurat();
                const found = list.find(r => {
                    if (!r) return false;
                    const id = String(r.id || "").toUpperCase().trim();
                    const idClean = id.replace(/[^A-Z0-9]/g, "");
                    const nisn = String(r.nisn || "").trim();
                    const hp = String(r.noWhatsApp || r.hpOrtu || r.noHp || "").replace(/[^0-9]/g, "");
                    return (id === queryUpper) ||
                           (idClean && idClean === queryClean) ||
                           (queryClean.length >= 4 && idClean.endsWith(queryClean)) ||
                           (nisn && nisn === rawQuery) ||
                           (queryHp.length >= 8 && hp.includes(queryHp));
                });
                if (found) {
                    return { success: true, message: "Data permohonan surat ditemukan.", data: found };
                }
                return { success: false, message: "Kode resi permohonan tidak ditemukan pada sistem." };
            }

            case "updatePermohonanSurat": {
                const list = DataStore.getPermohonanSurat();
                const item = list.find(r => r.id === payload.id);
                if (item) {
                    if (payload.status) item.status = payload.status;
                    if (payload.nomorSuratTerbit) item.nomorSuratTerbit = payload.nomorSuratTerbit;
                    if (payload.keteranganTindak !== undefined) item.keteranganTindak = payload.keteranganTindak;
                    if (payload.keterangan !== undefined) item.keterangan = payload.keterangan;
                    if (item.nomorSuratTerbit && (!item.keteranganTindak || !item.keteranganTindak.includes("SRIKANDI:"))) {
                        item.keteranganTindak = `Surat Anda telah selesai diterbitkan dengan Nomor Registrasi SRIKANDI: ${item.nomorSuratTerbit}.`;
                    }
                    DataStore.savePermohonanSurat(list);
                    return { success: true, message: `Status permohonan ${item.id} berhasil diperbarui!`, data: item };
                }
                return { success: false, message: "Permohonan surat tidak ditemukan." };
            }

            case "deletePermohonanSurat": {
                let list = DataStore.getPermohonanSurat();
                list = list.filter(p => p.id !== payload.id);
                DataStore.savePermohonanSurat(list);
                return { success: true, message: "Pengajuan surat berhasil dihapus!" };
            }

            // ================== PEMBARUAN DATA SISWA (NO HP ORTU, KK, OCR) ==================
            case "updateStudentPhone":
            case "updateStudentFields": {
                const nisn = payload.nisn;
                const fields = payload.fields || payload;
                delete fields.nisn;
                const res = DataStore.updateStudentField(nisn, fields);
                return res.success ? { success: true, message: "Data siswa berhasil diperbarui!", data: res.student } : res;
            }

            // ================== ADMIN (hanya cloud) ==================
            case "setupDatabase":
            case "backupNow":
            case "listBackups":
            case "setAutoBackup":
                return { success: false, message: "Fitur ini hanya tersedia pada Mode Cloud (Google Sheets & Drive). Untuk Mode Demo gunakan 'Backup Lokal (JSON)'." };

            default:
                return { success: false, message: `Aksi '${action}' tidak dikenal.` };
        }
    }
};

/* ==========================================================================
   SINKRONISASI CLOUD -> CACHE LOKAL
   Modul UI membaca dari DataStore (cache). Setelah login & setelah setiap operasi tulis,
   cache diperbarui dari Google Sheets.
   ========================================================================== */
const Sync = {
    SOURCES: {
        siswa: { action: "getStudents", payload: { all: true }, save: d => DataStore.saveSiswaAll(d) },
        tendik: { action: "getTendik", payload: {}, save: d => DataStore.saveTendik(d) },
        suratKeluar: { action: "getSuratKeluar", payload: {}, save: d => DataStore.saveSuratKeluar(d) },
        suratMasuk: { action: "getSuratMasuk", payload: {}, save: d => DataStore.saveSuratMasuk(d) },
        jadwal: { action: "getJadwal", payload: { kelas: "Semua" }, save: d => { if (Array.isArray(d)) DataStore.saveJadwalAll(d); } },
        pip: { action: "getPIP", payload: {}, save: d => {
            if (d && d.pengusulan) DataStore.savePIPPengusulan(d.pengusulan);
            if (d && d.penerima) DataStore.savePIPPenerima(d.penerima);
        }},
        permohonan: { action: "getPermohonanSurat", payload: {}, save: d => { if (Array.isArray(d)) DataStore.savePermohonanSurat(d); } },
        absensi: { 
            action: "getAbsensi", 
            payload: { tanggal: Util.today() }, 
            save: d => {
                if (!Array.isArray(d)) return;
                const current = DataStore.getAbsensi();
                const map = new Map();
                current.forEach(item => map.set(`${item.tanggal}_${item.kategori}_${item.nisnNip}`, item));
                d.forEach(item => map.set(`${item.tanggal}_${item.kategori}_${item.nisnNip}`, item));
                DataStore.saveAbsensi(Array.from(map.values()));
            } 
        },
        absensiSiswaBulan: {
            action: "getAbsensiSiswaBulan",
            payload: { bulan: Util.monthKey() },
            save: d => {
                if (!Array.isArray(d)) return;
                const current = DataStore.getAbsensiSiswaBulan();
                const map = new Map();
                current.forEach(item => map.set(item.key || `${item.tahunAjaran}|${item.bulan}|${item.nisn}`, item));
                d.forEach(item => map.set(item.key || `${item.tahunAjaran}|${item.bulan}|${item.nisn}`, item));
                DataStore.saveAbsensiSiswaBulan(Array.from(map.values()));
            }
        },
        config: {
            action: "getConfig",
            payload: {},
            save: d => {
                if (d && (d.namaSekolah || d.namaKepalaSekolah)) {
                    const current = DataStore.getConfig();
                    DataStore.saveConfig({ ...current, ...d });
                }
            }
        }
    },

    PULL_AFTER: {
        saveStudent: ["siswa"],
        importStudents: ["siswa"],
        uploadStudentDoc: ["siswa"],
        updateStudentPhone: ["siswa"],
        updateStudentFields: ["siswa"],
        saveSuratKeluar: ["suratKeluar"],
        deleteSuratKeluar: ["suratKeluar"],
        saveSuratMasuk: ["suratMasuk"],
        deleteSuratMasuk: ["suratMasuk"],
        saveTendik: ["tendik"],
        deleteTendik: ["tendik"],
        saveJadwal: ["jadwal"],
        deleteJadwal: ["jadwal"],
        savePIP: ["pip"],
        importPIP: ["pip"],
        updatePIPStatus: ["pip"],
        submitPermohonanSurat: ["permohonan"],
        updatePermohonanSurat: ["permohonan"],
        deletePermohonanSurat: ["permohonan"],
        saveAbsensiBatch: ["absensi", "absensiSiswaBulan"],
        saveAbsensiSiswaBulan: ["absensiSiswaBulan"]
    },

    async pull(kind) {
        const src = this.SOURCES[kind];
        if (!src || !ApiClient.isCloudActive() || !Auth.canDo(src.action)) return false;
        const res = await ApiClient.cloudCall(src.action, src.payload);
        if (res && res.success && (Array.isArray(res.data) || (res.data && typeof res.data === "object"))) {
            src.save(res.data);
            return true;
        }
        if (res && !res.success) console.warn(`[Sync] ${kind}:`, res.message);
        return false;
    },

    async pullAll() {
        if (!ApiClient.isCloudActive()) return;
        await Promise.all(Object.keys(this.SOURCES).map(k => this.pull(k)));
        // Pastikan TA aktif tetap valid terhadap data yang ditarik
        const list = DataStore.getTAList();
        if (list.length && !list.includes(DataStore.getActiveTA())) DataStore.setActiveTA(list[list.length - 1]);
    }
};
