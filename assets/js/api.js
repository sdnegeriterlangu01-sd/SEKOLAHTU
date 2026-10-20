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
        const fixed = (window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.GAS_API_URL) || "";
        return fixed || this.getConfig().gasApiUrl || "";
    },

    isCloudActive() {
        const fixed = (window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.GAS_API_URL);
        const url = this.getGasUrl();
        return !!url && url.startsWith("https://script.google.com/") && (!!fixed || !!this.getConfig().isCloudMode);
    },

    // -------- Pemanggilan ke Google Apps Script (membawa token) --------
    async cloudCall(action, payload = {}) {
        const token = await Auth.getToken();
        if (!token && action !== "ping") {
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
            if (json && json.code === "AUTH") Auth.forceLogout("Sesi berakhir atau tidak valid. Silakan masuk kembali.");
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
            const res = await this.cloudCall(action, payload);
            if (res && res.success && Sync.PULL_AFTER[action]) {
                await Promise.all(Sync.PULL_AFTER[action].map(kind => Sync.pull(kind)));
            }
            return res;
        }

        await new Promise(r => setTimeout(r, 120)); // latensi mikro agar UX terasa natural
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

                const suratTahunIni = list.filter(s => s.tahun === tahun);
                const nextNo = suratTahunIni.length > 0 ? Math.max(...suratTahunIni.map(s => s.noUrut || 0)) + 1 : 1;
                const nomorSurat = `${kode}/${String(nextNo).padStart(3, "0")}/${bulanRomawi}/${tahun}`;
                return { success: true, data: { nextNo, nomorSurat, kodeKlasifikasi: kode, bulan: bulanRomawi, tahun } };
            }

            case "saveSuratKeluar": {
                const list = DataStore.getSuratKeluar();
                const tgl = payload.tanggalSurat ? new Date(payload.tanggalSurat + "T00:00:00") : new Date();
                const tahun = tgl.getFullYear();
                const bulanRomawi = ROMAWI_BULAN[tgl.getMonth()];

                const suratTahunIni = list.filter(s => s.tahun === tahun);
                const noUrut = suratTahunIni.length > 0 ? Math.max(...suratTahunIni.map(s => s.noUrut || 0)) + 1 : 1;
                const nomorSurat = `${payload.kodeKlasifikasi}/${String(noUrut).padStart(3, "0")}/${bulanRomawi}/${tahun}`;

                const newSurat = {
                    id: `SK-${tahun}-${String(noUrut).padStart(3, "0")}`,
                    nomorSurat,
                    kodeKlasifikasi: payload.kodeKlasifikasi,
                    noUrut,
                    tahun,
                    tanggalSurat: payload.tanggalSurat || Util.today(),
                    tujuan: payload.tujuan,
                    perihal: payload.perihal,
                    pengonsep: payload.pengonsep || "Staf TU",
                    penandatangan: payload.penandatangan || cfg.namaKepalaSekolah,
                    keterangan: payload.keterangan || "-",
                    fileDriveUrl: payload.fileDriveUrl || `https://drive.google.com/file/d/sk-${tahun}-${noUrut}/view`,
                    createdAt: new Date().toISOString()
                };

                list.unshift(newSurat);
                DataStore.saveSuratKeluar(list);
                return { success: true, message: `Nomor surat keluar ${nomorSurat} berhasil diterbitkan!`, data: newSurat };
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
                if (!payload.nip || !payload.nama) return { success: false, message: "NIP/ID dan Nama wajib diisi." };
                const list = DataStore.getTendik();
                const key = Util.cleanId(payload.nip);
                const idx = list.findIndex(t => Util.cleanId(t.nip) === key);
                const rec = {
                    nip: payload.nip, nama: payload.nama, jabatan: payload.jabatan || "-",
                    jk: payload.jk || "-", statusKepegawaian: payload.statusKepegawaian || "-",
                    aktif: payload.aktif !== false
                };
                if (idx >= 0) list[idx] = { ...list[idx], ...rec }; else list.push(rec);
                DataStore.saveTendik(list);
                return { success: true, message: `Data ${payload.nama} berhasil disimpan.`, data: rec };
            }

            case "saveQrFiles":
                return { success: true, message: `(Mode Demo) ${(payload.files || []).length} QR dibuat. Aktifkan Mode Cloud untuk menyimpannya ke Google Drive.`, simulated: true };

            case "scanTendik": {
                const m = String(payload.code || "").trim().match(/^SIMTAS\|T\|([A-Za-z0-9._-]{4,40})$/);
                if (!m) return { success: false, message: "Kode QR tidak dikenali. Gunakan kartu ID resmi SIM-TAS-SD." };

                const nip = m[1];
                const tendik = DataStore.getTendik().find(t => Util.cleanId(t.nip) === nip && t.aktif !== false);
                if (!tendik) return { success: false, message: "Data guru/tendik tidak ditemukan atau nonaktif." };

                const tanggal = Util.today();
                const jam = Util.nowTime();
                const list = DataStore.getAbsensiTendik();
                let rec = list.find(r => r.tanggal === tanggal && r.nip === nip);
                if (!rec) {
                    rec = { key: `${tanggal}|${nip}`, tanggal, nip, nama: tendik.nama, jamDatang: "", jamPulang: "", status: "", keterangan: "" };
                    list.push(rec);
                }
                const tipe = this.applyScan(rec, jam, cfg.scanMinGapMenit || 30);
                DataStore.saveAbsensiTendik(list);

                const pesan = tipe === "datang" ? `Selamat datang, ${tendik.nama}!`
                    : tipe === "pulang" ? `Terima kasih, ${tendik.nama}. Hati-hati di jalan!`
                        : `${tendik.nama} sudah tercatat pukul ${rec.jamPulang || rec.jamDatang}.`;
                return {
                    success: true, message: pesan,
                    data: { tipe, nama: tendik.nama, jabatan: tendik.jabatan, tanggal, jam, jamDatang: rec.jamDatang, jamPulang: rec.jamPulang }
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
                if (payload.kelas) list = list.filter(r => r.kelas === payload.kelas);
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
        suratMasuk: { action: "getSuratMasuk", payload: {}, save: d => DataStore.saveSuratMasuk(d) }
    },

    PULL_AFTER: {
        saveStudent: ["siswa"],
        importStudents: ["siswa"],
        uploadStudentDoc: ["siswa"],
        saveSuratKeluar: ["suratKeluar"],
        saveSuratMasuk: ["suratMasuk"],
        saveTendik: ["tendik"]
    },

    async pull(kind) {
        const src = this.SOURCES[kind];
        if (!src || !ApiClient.isCloudActive() || !Auth.canDo(src.action)) return false;
        const res = await ApiClient.cloudCall(src.action, src.payload);
        if (res && res.success && Array.isArray(res.data)) {
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
