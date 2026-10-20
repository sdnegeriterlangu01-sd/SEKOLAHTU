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
        tu: "Tata Usaha / Operator",
        guru: "Guru / Tendik",
        kiosk: "Terminal Scan Presensi"
    },

    ACTIONS: {
        ping: ["*"],
        // Siswa
        getStudents: ["admin", "kepsek", "tu", "guru"],
        saveStudent: ["admin", "tu"],
        importStudents: ["admin", "tu"],
        uploadStudentDoc: ["admin", "tu", "guru"],
        // Surat
        getSuratKeluar: ["admin", "kepsek", "tu"],
        getNextNomorSuratKeluar: ["admin", "kepsek", "tu"],
        saveSuratKeluar: ["admin", "tu"],
        deleteSuratKeluar: ["admin", "tu"],
        getSuratMasuk: ["admin", "kepsek", "tu"],
        saveSuratMasuk: ["admin", "tu"],
        deleteSuratMasuk: ["admin", "tu"],
        generateSuratDocPDF: ["admin", "kepsek", "tu"],
        // Absensi harian (lama)
        getAbsensi: ["admin", "kepsek", "tu", "guru"],
        saveAbsensiBatch: ["admin", "tu", "guru"],
        getRekapAbsensi: ["admin", "kepsek", "tu", "guru"],
        // Tendik & presensi QR
        getTendik: ["admin", "kepsek", "tu", "guru"],
        saveTendik: ["admin", "tu"],
        deleteTendik: ["admin", "tu"],
        saveQrFiles: ["admin", "tu"],
        scanTendik: ["admin", "kepsek", "tu", "guru", "kiosk"],
        getAbsensiTendikBulan: ["admin", "kepsek", "tu", "guru"],
        saveAbsensiTendikManual: ["admin", "tu"],
        // Absensi siswa bulanan
        getAbsensiSiswaBulan: ["admin", "kepsek", "tu", "guru"],
        saveAbsensiSiswaBulan: ["admin", "tu", "guru"],
        // Administrasi
        setupDatabase: ["admin"],
        backupNow: ["admin"],
        listBackups: ["admin"],
        setAutoBackup: ["admin"]
    },

    ROUTES: {
        dashboard: ["admin", "kepsek", "tu"],
        "scan-absensi": ["admin", "kepsek", "tu", "guru", "kiosk"],
        berkas: ["admin", "kepsek", "tu", "guru"],
        surat: ["admin", "kepsek", "tu"],
        cetak: ["admin", "kepsek", "tu"],
        absensi: ["admin", "kepsek", "tu", "guru", "kiosk"],
        pengaturan: ["admin", "kepsek", "tu"]
    },

    check(list, role) { return !!list && (list.includes("*") || list.includes(role)); }
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
