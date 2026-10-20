/* ==========================================================================
   SIM-TAS-SD: MAIN APPLICATION CONTROLLER & ROUTER
   Routing SPA, Dashboard Analytics, Settings Management & Notifications
   ========================================================================== */

const App = {
    currentRoute: "dashboard",
    _isStarted: false,

    async init() {
        this.bindNavigation();
        this.loadSchoolSettings();
        this.bindBackupControls();

        // Autentikasi (Supabase Auth / Demo Mode)
        // Jika sudah ada sesi, Auth.init() akan otomatis memanggil Auth.onAuthenticated() -> App.start()
        // Jika belum, Auth.init() akan menampilkan Login Overlay modal.
        await Auth.init();

        console.log("SIM-TAS-SD Controller Ready");
    },

    start() {
        if (this._isStarted) return;
        this._isStarted = true;

        this.initModules();
        this.renderTASelector();
        this.updateDashboardStats();
        this.updateConnectionStatusBadge();

        // Auto pull fresh data jika cloud mode aktif
        if (ApiClient.isCloudActive()) {
            Sync.pullAll().then(() => {
                this.updateDashboardStats();
                if (this.currentRoute === "berkas") ModulBerkas.renderTable();
            }).catch(e => console.warn("Sync initial error:", e));
        }

        // Navigate ke default route sesuai peran akun
        const initial = Auth.defaultRoute();
        this.navigateTo(initial);
    },

    bindNavigation() {
        const navLinks = document.querySelectorAll(".nav-link");
        navLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const route = link.getAttribute("data-route");
                if (route) this.navigateTo(route);
            });
        });

        // Mobile drawer toggle
        const btnToggleMobile = document.getElementById("btn-mobile-menu");
        const sidebar = document.getElementById("main-sidebar");
        const overlay = document.getElementById("sidebar-overlay");

        if (btnToggleMobile && sidebar && overlay) {
            btnToggleMobile.addEventListener("click", () => {
                sidebar.classList.toggle("-translate-x-full");
                overlay.classList.toggle("hidden");
            });

            overlay.addEventListener("click", () => {
                sidebar.classList.add("-translate-x-full");
                overlay.classList.add("hidden");
            });
        }
    },

    initModules() {
        ModulBerkas.init();
        ModulSurat.init();
        ModulCetak.init();
        ModulAbsensi.init();
        ModulPresensi.init();
    },

    renderTASelector() {
        ModulImport.renderTASelect();
    },

    refreshAll() {
        this.updateDashboardStats();
        if (this.currentRoute === "berkas") ModulBerkas.renderTable();
        else if (this.currentRoute === "cetak") ModulCetak.populateStudentSelect();
        else if (this.currentRoute === "absensi") ModulPresensi.onShow();
        else if (this.currentRoute === "scan-absensi") ModulPresensi.renderScanView();
    },

    navigateTo(route) {
        // Cek RBAC
        if (!Auth.canRoute(route)) {
            this.showToast("Anda tidak memiliki hak akses untuk membuka modul ini.", "warning");
            return;
        }

        this.currentRoute = route;

        // Hide all views
        const views = document.querySelectorAll(".app-view");
        views.forEach(v => v.classList.add("hidden"));

        // Show target view
        const targetView = document.getElementById(`view-${route}`);
        if (targetView) {
            targetView.classList.remove("hidden");
            targetView.classList.add("animate-fade-in");
        }

        // Update active nav link
        const navLinks = document.querySelectorAll(".nav-link");
        navLinks.forEach(link => {
            if (link.getAttribute("data-route") === route) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
        });

        // Close mobile drawer on route change
        const sidebar = document.getElementById("main-sidebar");
        const overlay = document.getElementById("sidebar-overlay");
        if (sidebar && overlay && window.innerWidth < 1024) {
            sidebar.classList.add("-translate-x-full");
            overlay.classList.add("hidden");
        }

        // View specific refresh
        if (route === "dashboard") {
            this.updateDashboardStats();
        } else if (route === "scan-absensi") {
            ModulPresensi.renderScanView();
        } else if (route === "berkas") {
            ModulBerkas.renderTable();
        } else if (route === "surat") {
            ModulSurat.renderSubTab();
        } else if (route === "cetak") {
            ModulCetak.populateStudentSelect();
            ModulCetak.generatePreview();
        } else if (route === "absensi") {
            ModulAbsensi.populateKelasOptions();
            ModulPresensi.onShow();
            ModulAbsensi.renderPresensiInputTable();
            ModulAbsensi.renderRekapitulasi();
        } else if (route === "pengaturan") {
            this.loadSchoolSettings();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    pindahKeCetakSurat(nisn) {
        this.navigateTo("cetak");
        const selectSiswa = document.getElementById("cetak-select-siswa");
        if (selectSiswa) {
            selectSiswa.value = nisn;
            ModulCetak.loadStudentData(nisn);
        }
    },

    updateDashboardStats() {
        const students = DataStore.getSiswa();
        const suratKeluar = DataStore.getSuratKeluar();
        const suratMasuk = DataStore.getSuratMasuk();
        const absensiList = DataStore.getAbsensi();
        const today = Util.today();

        // 1. Total Siswa & Kelengkapan Berkas
        const totalSiswa = students.length;
        const lengkapCount = students.filter(s => s.berkas && s.berkas.kk?.uploaded && s.berkas.akta?.uploaded).length;
        const persenLengkap = totalSiswa > 0 ? Math.round((lengkapCount / totalSiswa) * 100) : 0;

        const statTotal = document.getElementById("stat-total-siswa");
        if (statTotal) statTotal.textContent = totalSiswa;
        const statBerkasLengkap = document.getElementById("stat-berkas-lengkap");
        if (statBerkasLengkap) statBerkasLengkap.textContent = `${persenLengkap}%`;
        const statBerkasDetail = document.getElementById("stat-berkas-detail");
        if (statBerkasDetail) statBerkasDetail.textContent = `${lengkapCount} dari ${totalSiswa} siswa berkas pokok lengkap`;

        // 2. Surat Keluar & Masuk
        const statSK = document.getElementById("stat-surat-keluar");
        if (statSK) statSK.textContent = suratKeluar.length;
        const statSM = document.getElementById("stat-surat-masuk");
        if (statSM) statSM.textContent = suratMasuk.length;

        // 3. Presensi Hari Ini
        const todayAbsensi = absensiList.filter(a => a.tanggal === today);
        const totalAbsen = todayAbsensi.length;
        const totalHadir = todayAbsensi.filter(a => a.status === "Hadir").length;
        const persenHadir = totalAbsen > 0 ? ((totalHadir / totalAbsen) * 100).toFixed(1) : 0;

        const statPresensiPersen = document.getElementById("stat-presensi-persen");
        if (statPresensiPersen) statPresensiPersen.textContent = `${persenHadir}%`;
        const statPresensiDetail = document.getElementById("stat-presensi-detail");
        if (statPresensiDetail) statPresensiDetail.textContent = `${totalHadir} hadir dari ${totalAbsen} target presensi`;

        // Render Recent Activity on Dashboard
        this.renderRecentActivities(suratKeluar, suratMasuk, students);
    },

    renderRecentActivities(skList, smList, siswaList) {
        const container = document.getElementById("dashboard-recent-activities");
        if (!container) return;

        const activities = [];

        skList.slice(0, 3).forEach(sk => {
            activities.push({
                type: "surat_keluar",
                icon: "fa-solid fa-paper-plane text-blue-600 bg-blue-100",
                title: `Surat Keluar: ${sk.nomorSurat}`,
                desc: `${sk.perihal} (Tujuan: ${sk.tujuan})`,
                time: sk.tanggalSurat
            });
        });

        smList.slice(0, 2).forEach(sm => {
            activities.push({
                type: "surat_masuk",
                icon: "fa-solid fa-inbox text-amber-600 bg-amber-100",
                title: `Surat Masuk: ${sm.noAgenda}`,
                desc: `${sm.perihal} (Dari: ${sm.pengirim})`,
                time: sm.tglTerima
            });
        });

        siswaList.slice(0, 2).forEach(s => {
            activities.push({
                type: "siswa",
                icon: "fa-solid fa-folder-closed text-emerald-600 bg-emerald-100",
                title: `Arsip Digital Siswa: ${s.nama}`,
                desc: `Kelas ${s.kelas} • NISN ${s.nisn}`,
                time: "Aktif"
            });
        });

        container.innerHTML = activities.map(act => `
            <div class="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${act.icon}"></div>
                <div class="flex-grow min-w-0">
                    <div class="text-xs font-bold text-slate-800 truncate">${act.title}</div>
                    <div class="text-[11px] text-slate-500 line-clamp-1">${act.desc}</div>
                </div>
                <div class="text-[10px] text-slate-400 font-mono whitespace-nowrap">${act.time}</div>
            </div>
        `).join("");
    },

    // ==================== SETTINGS & SYNC ====================
    loadSchoolSettings() {
        const config = DataStore.getConfig();

        // Populate header & branding
        const brandSchoolName = document.querySelectorAll(".school-name-text");
        brandSchoolName.forEach(el => el.textContent = config.namaSekolah);

        const brandNpsn = document.querySelectorAll(".school-npsn-text");
        brandNpsn.forEach(el => el.textContent = `NPSN: ${config.npsn}`);

        // Populate Settings inputs if on settings view
        const inputNama = document.getElementById("cfg-nama-sekolah");
        if (inputNama) {
            inputNama.value = config.namaSekolah;
            document.getElementById("cfg-npsn").value = config.npsn;
            document.getElementById("cfg-akreditasi").value = config.akreditasi;
            document.getElementById("cfg-alamat").value = config.alamat;
            document.getElementById("cfg-kabupaten").value = config.kabupatenKota;
            document.getElementById("cfg-telepon").value = config.telepon || "";
            document.getElementById("cfg-email").value = config.email || "";
            const inputWeb = document.getElementById("cfg-website");
            if (inputWeb) inputWeb.value = config.website || "";
            document.getElementById("cfg-kepsek").value = config.namaKepalaSekolah;
            document.getElementById("cfg-nip").value = config.nipKepalaSekolah;
            document.getElementById("cfg-pangkat").value = config.pangkatGolongan;
            document.getElementById("cfg-gas-url").value = config.gasApiUrl || "";
            document.getElementById("cfg-cloud-mode").checked = !!config.isCloudMode;
        }
    },

    async saveSettings(e) {
        e.preventDefault();
        const config = DataStore.getConfig();

        config.namaSekolah = document.getElementById("cfg-nama-sekolah").value.trim();
        config.npsn = document.getElementById("cfg-npsn").value.trim();
        config.akreditasi = document.getElementById("cfg-akreditasi").value.trim();
        config.alamat = document.getElementById("cfg-alamat").value.trim();
        config.kabupatenKota = document.getElementById("cfg-kabupaten").value.trim();
        config.telepon = document.getElementById("cfg-telepon").value.trim();
        config.email = document.getElementById("cfg-email").value.trim();
        const inputWeb = document.getElementById("cfg-website");
        config.website = inputWeb ? inputWeb.value.trim() : (config.website || "");
        config.namaKepalaSekolah = document.getElementById("cfg-kepsek").value.trim();
        config.nipKepalaSekolah = document.getElementById("cfg-nip").value.trim();
        config.pangkatGolongan = document.getElementById("cfg-pangkat").value.trim();
        config.gasApiUrl = document.getElementById("cfg-gas-url").value.trim();
        config.isCloudMode = document.getElementById("cfg-cloud-mode").checked;

        DataStore.saveConfig(config);
        this.loadSchoolSettings();
        this.updateConnectionStatusBadge();

        App.showToast("Pengaturan identitas sekolah & konfigurasi API berhasil disimpan!", "success");
    },

    async testGasConnection() {
        const url = document.getElementById("cfg-gas-url").value.trim();
        if (!url) {
            App.showToast("Masukkan URL Google Apps Script Web App terlebih dahulu!", "warning");
            return;
        }

        const btn = document.getElementById("btn-test-gas");
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menguji...`;

        const res = await ApiClient.testConnection(url);
        if (res.success) {
            App.showToast(res.message, "success");
            // Auto switch cloud mode on if test successful
            document.getElementById("cfg-cloud-mode").checked = true;
            const config = DataStore.getConfig();
            config.gasApiUrl = url;
            config.isCloudMode = true;
            DataStore.saveConfig(config);
            this.updateConnectionStatusBadge();
        } else {
            App.showToast(res.message, "error");
        }

        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-link"></i> Uji Koneksi`;
    },

    updateConnectionStatusBadge() {
        const config = DataStore.getConfig();
        const badge = document.getElementById("cloud-status-badge");
        if (!badge) return;

        if (config.isCloudMode && config.gasApiUrl) {
            badge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300";
            badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Cloud Mode: Google Sheets & Drive Aktif`;
        } else {
            badge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300";
            badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> Local Mode (Database Browser / Demo)`;
        }
    },

    // ==================== PENCADANGAN (BACKUP & RESTORE) ====================
    bindBackupControls() {
        const fileInput = document.getElementById("input-restore-json");
        if (fileInput) {
            fileInput.addEventListener("change", (e) => this.restoreLocalBackup(e));
        }
    },

    async backupDrive() {
        if (!ApiClient.isCloudActive()) {
            this.showToast("Pencadangan Google Drive membutuhkan Cloud Mode aktif terhubung ke Google Apps Script.", "warning");
            return;
        }

        const btn = document.getElementById("btn-backup-drive");
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mencadangkan ke Google Drive...`;
        }

        try {
            const res = await ApiClient.request("backupNow");
            if (res.success) {
                this.showToast(res.message || "Pencadangan database ke Google Drive berhasil!", "success");
            } else {
                this.showToast(res.message || "Gagal mencadangkan ke Google Drive.", "error");
            }
        } catch (e) {
            this.showToast(`Kesalahan pencadangan: ${e.message}`, "error");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Cadangkan ke Drive Sekarang`;
            }
        }
    },

    downloadLocalBackup() {
        try {
            const dump = DataStore.exportAll();
            const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `SIM-TAS-SD_backup_${Util.today()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showToast("Berkas cadangan lokal (.json) berhasil diunduh!", "success");
        } catch (e) {
            this.showToast(`Gagal mengekspor data: ${e.message}`, "error");
        }
    },

    restoreLocalBackup(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const dump = JSON.parse(e.target.result);
                if (!confirm(`Pulihkan data dari cadangan tanggal ${dump._dibuat || "tidak diketahui"}? Data saat ini di browser akan digantikan.`)) {
                    event.target.value = "";
                    return;
                }
                DataStore.importAll(dump);
                this.showToast("Data berhasil dipulihkan dari berkas cadangan!", "success");
                setTimeout(() => location.reload(), 800);
            } catch (err) {
                this.showToast(`Gagal memulihkan cadangan: ${err.message}`, "error");
            } finally {
                event.target.value = "";
            }
        };
        reader.readAsText(file);
    },

    resetAllData() {
        if (confirm("Apakah Anda yakin ingin mereset seluruh database ke data bawaan awal (seed)? Tindakan ini tidak dapat dibatalkan.")) {
            DataStore.resetToDefault();
            this.init();
            App.showToast("Database berhasil di-reset ke setelan awal!", "info");
        }
    },

    // ==================== TOAST NOTIFICATIONS ====================
    showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = "toast";

        let iconHtml = `<i class="fa-solid fa-circle-info text-blue-500 text-lg"></i>`;
        let borderClass = "border-blue-200";

        if (type === "success") {
            iconHtml = `<i class="fa-solid fa-circle-check text-emerald-500 text-lg"></i>`;
            borderClass = "border-emerald-200";
        } else if (type === "error") {
            iconHtml = `<i class="fa-solid fa-circle-exclamation text-rose-500 text-lg"></i>`;
            borderClass = "border-rose-200";
        } else if (type === "warning") {
            iconHtml = `<i class="fa-solid fa-triangle-exclamation text-amber-500 text-lg"></i>`;
            borderClass = "border-amber-200";
        }

        toast.classList.add(borderClass);
        toast.innerHTML = `
            ${iconHtml}
            <div class="flex-grow text-xs font-semibold text-slate-800">${message}</div>
            <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600 text-xs">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(50px)";
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
    App.init();
});
