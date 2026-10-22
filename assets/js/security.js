/* ==========================================================================
   SIM-TAS-SD: UTILITAS & KEAMANAN
   - Util : helper tanggal/waktu (zona waktu lokal, bukan UTC)
   - Sec  : sanitasi input (anti XSS), escape HTML, hak akses (ACL)
   ========================================================================== */

const Util = {
    pad(n) { return String(n).padStart(2, "0"); },

    // YYYY-MM-DD menurut zona waktu perangkat (toISOString() memakai UTC dan bisa meleset 1 hari)
    today(d = new Date()) {
        return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
    },

    nowTime(d = new Date()) {
        return `${this.pad(d.getHours())}:${this.pad(d.getMinutes())}:${this.pad(d.getSeconds())}`;
    },

    monthKey(d = new Date()) {
        return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}`;
    },

    daysInMonth(year, month1) { return new Date(year, month1, 0).getDate(); },

    NAMA_BULAN: ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"],
    NAMA_HARI: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],

    getHariIndonesia(d = new Date()) {
        return this.NAMA_HARI[d.getDay()];
    },

    // "2027-01" -> "JANUARI 2027"
    labelBulan(key) {
        const [y, m] = key.split("-").map(Number);
        return `${this.NAMA_BULAN[m - 1].toUpperCase()} ${y}`;
    },

    // Tahun ajaran berjalan: Juli-Desember => y/y+1, Januari-Juni => y-1/y
    defaultTahunAjaran(d = new Date()) {
        const y = d.getFullYear();
        return d.getMonth() + 1 >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
    },

    // "19680512 199303 1 004" -> "196805121993031004"
    cleanId(v) { return String(v == null ? "" : v).replace(/\s+/g, ""); },

    // Hitung selisih menit antara dua string "HH:mm[:ss]"
    diffMenit(a, b) {
        const toMin = t => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };
        return toMin(b) - toMin(a);
    },

    // Format kunci hari (1..31) menjadi "01"
    dd(n) { return this.pad(n); },

    // Format waktu 24 jam "HH:mm" yang aman dari Date objek / string tanggal Sheets (misal "Sat Dec 30 1899 07:15:00")
    formatTime(v) {
        if (!v) return "";
        const s = String(v).trim();
        const m = s.match(/(\d{1,2}):(\d{2})/);
        if (m) {
            return `${m[1].padStart(2, "0")}:${m[2]}`;
        }
        return s.substring(0, 5);
    },

    // Konversi Google Drive file viewer URL (/file/d/ID/view) ke direct thumbnail image link
    formatDriveImageUrl(url) {
        if (!url) return "";
        const s = String(url).trim();
        if (s.startsWith("data:image/") || s.includes("images.unsplash.com") || s.includes("drive.google.com/thumbnail")) return s;
        const m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (m && m[1]) {
            return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800`;
        }
        return s;
    }
};

/* --------------------------------------------------------------------------
   Matriks hak akses (diduplikasi di backend Code.gs -> ACTION_ROLES).
   Penegakan SEBENARNYA dilakukan di server; sisi klien hanya untuk UX.
   -------------------------------------------------------------------------- */
const ACL = {
    ROLES: {
        admin: "Administrator",
        kepsek: "Kepala Sekolah",
        tu: "Tenaga Administrasi",
        tenaga_administrasi: "Tenaga Administrasi",
        perpustakaan: "Tenaga Perpustakaan",
        penjaga: "Penjaga Sekolah",
        guru: "Guru / Tendik",
        guru_kelas: "Guru Kelas",
        guru_pjok: "Guru Mapel PJOK",
        guru_pai: "Guru Mapel PAI",
        guru_inggris: "Guru Mapel B. Inggris",
        guru_seni: "Guru Mapel Seni Budaya",
        guru_mapel: "Guru Mapel",
        kiosk: "Terminal Scan Presensi"
    },

    ACTIONS: {
        ping: ["*"],
        // Siswa
        getStudents: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru", "perpustakaan"],
        saveStudent: ["admin", "tu", "tenaga_administrasi"],
        importStudents: ["admin", "tu", "tenaga_administrasi"],
        uploadStudentDoc: ["admin", "tu", "tenaga_administrasi", "guru", "perpustakaan"],
        updateStudentPhone: ["admin", "tu", "tenaga_administrasi", "guru", "perpustakaan"],
        updateStudentFields: ["admin", "tu", "tenaga_administrasi", "guru", "perpustakaan"],
        // Jadwal Pelajaran
        getJadwal: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru"],
        saveJadwal: ["admin", "tu", "tenaga_administrasi", "guru"],
        deleteJadwal: ["admin", "tu", "tenaga_administrasi"],
        // Program PIP
        getPIP: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru", "perpustakaan"],
        savePIP: ["admin", "tu", "tenaga_administrasi"],
        importPIP: ["admin", "tu", "tenaga_administrasi"],
        updatePIPStatus: ["admin", "tu", "tenaga_administrasi", "guru", "perpustakaan"],
        // Permohonan Surat Online
        getPermohonanSurat: ["admin", "kepsek", "tu", "tenaga_administrasi"],
        submitPermohonanSurat: ["*"],
        updatePermohonanSurat: ["admin", "tu", "tenaga_administrasi"],
        deletePermohonanSurat: ["admin", "tu", "tenaga_administrasi"],
        // Surat
        getSuratKeluar: ["admin", "kepsek", "tu", "tenaga_administrasi"],
        getNextNomorSuratKeluar: ["admin", "kepsek", "tu", "tenaga_administrasi"],
        saveSuratKeluar: ["admin", "tu", "tenaga_administrasi"],
        deleteSuratKeluar: ["admin", "tu", "tenaga_administrasi"],
        getSuratMasuk: ["admin", "kepsek", "tu", "tenaga_administrasi"],
        saveSuratMasuk: ["admin", "tu", "tenaga_administrasi"],
        deleteSuratMasuk: ["admin", "tu", "tenaga_administrasi"],
        generateSuratDocPDF: ["admin", "kepsek", "tu", "tenaga_administrasi"],
        // Absensi harian (lama)
        getAbsensi: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru"],
        saveAbsensiBatch: ["admin", "tu", "tenaga_administrasi", "guru"],
        getRekapAbsensi: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru"],
        // Tendik & presensi QR
        getTendik: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru", "perpustakaan", "penjaga"],
        saveTendik: ["admin", "tu", "tenaga_administrasi"],
        deleteTendik: ["admin", "tu", "tenaga_administrasi"],
        saveQrFiles: ["admin", "tu", "tenaga_administrasi"],
        scanTendik: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru", "perpustakaan", "penjaga", "kiosk"],
        getAbsensiTendikBulan: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru", "perpustakaan", "penjaga"],
        saveAbsensiTendikManual: ["admin", "tu", "tenaga_administrasi"],
        // Absensi siswa bulanan
        getAbsensiSiswaBulan: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru"],
        saveAbsensiSiswaBulan: ["admin", "tu", "tenaga_administrasi", "guru"],
        // Administrasi
        setupDatabase: ["admin"],
        backupNow: ["admin"],
        listBackups: ["admin"],
        setAutoBackup: ["admin"]
    },

    ROUTES: {
        dashboard: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru", "perpustakaan", "penjaga"],
        "scan-absensi": ["admin", "kepsek", "tu", "tenaga_administrasi", "guru", "perpustakaan", "penjaga", "kiosk"],
        berkas: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru", "perpustakaan"],
        jadwal: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru"],
        pip: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru", "perpustakaan"],
        surat: ["admin", "kepsek", "tu", "tenaga_administrasi"],
        cetak: ["admin", "kepsek", "tu", "tenaga_administrasi"],
        absensi: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru", "perpustakaan", "penjaga", "kiosk"],
        tendik: ["admin", "kepsek", "tu", "tenaga_administrasi", "guru"],
        pengaturan: ["admin", "kepsek", "tu", "tenaga_administrasi"]
    },

    check(list, role) {
        if (!list) return false;
        if (list.includes("*") || list.includes(role)) return true;
        if (list.includes("tu") && role === "tenaga_administrasi") return true;
        if (list.includes("tenaga_administrasi") && role === "tu") return true;
        if (list.includes("guru") && typeof role === "string" && role.startsWith("guru")) return true;
        return false;
    }
};

const Sec = {
    // Escape untuk disisipkan ke HTML (teks maupun atribut)
    esc(v) {
        return String(v == null ? "" : v)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/`/g, "&#96;");
    },

    // Bersihkan string dari karakter berbahaya untuk innerHTML: < > " ` \ dan karakter kontrol.
    // Dipanggil pada SEMUA data yang masuk (input, impor, respons cloud) sehingga template lama
    // yang menyisipkan ${nama} ke innerHTML tetap aman.
    clean(v) {
        if (typeof v !== "string") return v;
        return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
            .replace(/[<>`\\]/g, "")
            .replace(/"/g, "\u201D")
            .trim();
    },

    SKIP_KEYS: new Set(["fileBase64", "scanBase64", "base64", "token", "url", "fileDriveUrl", "fileScanUrl"]),

    cleanDeep(obj, key = "") {
        if (obj == null) return obj;
        if (typeof obj === "string") return this.SKIP_KEYS.has(key) ? obj : this.clean(obj);
        if (Array.isArray(obj)) return obj.map(o => this.cleanDeep(o, key));
        if (typeof obj === "object") {
            const out = {};
            Object.keys(obj).forEach(k => { out[k] = this.cleanDeep(obj[k], k); });
            return out;
        }
        return obj;
    },

    // Hanya izinkan URL http(s) / data:image (untuk href/src)
    safeUrl(u) {
        const s = String(u || "");
        return /^(https?:\/\/|data:image\/|data:application\/pdf)/i.test(s) ? s : "#";
    },

    // Mitigasi "CSV/Excel formula injection" saat ekspor
    csvCell(v) {
        let s = String(v == null ? "" : v);
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
        return `"${s.replace(/"/g, '""')}"`;
    }
};
