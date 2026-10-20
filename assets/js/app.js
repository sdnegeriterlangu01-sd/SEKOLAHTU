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

        if (window.Router) Router.init();
        if (window.ModulVue) ModulVue.init();
        this.renderTASelector();
        this.renderQuickActions();
        this.updateConnectionStatusBadge();

        // Auto pull fresh data jika cloud mode aktif
        if (ApiClient.isCloudActive()) {
            Sync.pullAll().then(() => {
                this.updateDashboardStats();
                if (Router.currentRoute === "berkas-siswa" && window.ModulBerkas) ModulBerkas.renderTable();
            }).catch(e => console.warn("Sync initial error:", e));
        }

        // Navigate ke default route sesuai peran akun atau hash saat ini
        const currentHash = window.location.hash ? Router.parseHash().path : "";
        const initial = currentHash || Auth.defaultRoute() || "beranda";
        this.navigateTo(initial);
    },

    bindNavigation() {
        const navLinks = document.querySelectorAll(".nav-link");
        navLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const route = link.getAttribute("data-route") || link.getAttribute("href");
                if (route) {
                    const cleanRoute = route.replace(/^#\/?/, "");
                    this.navigateTo(cleanRoute);
                }
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
        // Module hooks are loaded on-demand via Router lifecycle (onMount)
    },

    renderTASelector() {
        ModulImport.renderTASelect();
    },

    refreshAll() {
        this.updateDashboardStats();
        if (Router.currentRoute === "berkas-siswa" && window.ModulBerkas) ModulBerkas.renderTable();
        else if (Router.currentRoute === "surat/cetak" && window.ModulCetak) ModulCetak.populateStudentSelect();
        else if (Router.currentRoute.startsWith("presensi") && window.ModulPresensi) ModulPresensi.onShow();
    },

    navigateTo(route, cb) {
        if (!route) route = "beranda";
        if (cb && window.Router) {
            Router.afterNextRoute(cb);
        }
        if (window.Router) {
            Router.navigate(route);
        }
    },

    pindahKeCetakSurat(nisn) {
        this.navigateTo("surat/cetak", () => {
            const selectSiswa = document.getElementById("cetak-select-siswa");
            if (selectSiswa) {
                selectSiswa.value = nisn;
                if (window.ModulCetak) ModulCetak.loadStudentData(nisn);
            }
        });
    },

    VERSION: "1.4.1",

    updateDashboardStats() {
        const students = DataStore.getSiswa();
        const suratKeluar = DataStore.getSuratKeluar();
        const suratMasuk = DataStore.getSuratMasuk();
        const absensiList = DataStore.getAbsensi();
        const today = Util.today();
        const role = Auth.role();
        const gInfo = Auth.getGuruInfo ? Auth.getGuruInfo() : null;

        // Filter siswa untuk role guru
        let targetStudents = students;
        let isFilteredKelas = false;
        let kelasLabel = "Seluruh Kelas";

        if (role === "guru" && gInfo) {
            if (gInfo.isGuruKelas) {
                isFilteredKelas = true;
                kelasLabel = `Kelas ${gInfo.kelas}`;
                targetStudents = students.filter(s => {
                    const k = String(s.rombel || s.kelas || "");
                    const d1 = k.replace(/\D/g, "");
                    const d2 = String(gInfo.kelas).replace(/\D/g, "");
                    return k === gInfo.kelas || (d1 && d2 && d1 === d2) || k.toLowerCase().includes(gInfo.kelas.toLowerCase());
                });
            } else if (gInfo.isGuruMapel) {
                isFilteredKelas = false;
                kelasLabel = gInfo.namaMapel ? `Mapel ${gInfo.namaMapel}` : "Semua Kelas (Mapel)";
                targetStudents = students;
            }
        }

        // 1. Total Siswa & Kelengkapan Berkas
        const totalSiswa = targetStudents.length;
        const lengkapCount = targetStudents.filter(s => s.berkas && s.berkas.kk?.uploaded && s.berkas.akta?.uploaded).length;
        const persenLengkap = totalSiswa > 0 ? Math.round((lengkapCount / totalSiswa) * 100) : 0;

        const statTotal = document.getElementById("stat-total-siswa");
        if (statTotal) statTotal.textContent = totalSiswa;
        const statTotalTitle = document.getElementById("stat-total-siswa-title");
        if (statTotalTitle) {
            if (role === "guru") {
                statTotalTitle.textContent = isFilteredKelas ? `Siswa ${kelasLabel}` : `Siswa (${kelasLabel})`;
            } else {
                statTotalTitle.textContent = "Total Siswa Terdaftar";
            }
        }
        const statTotalDesc = document.getElementById("stat-total-siswa-desc");
        if (statTotalDesc) {
            if (role === "guru") {
                statTotalDesc.innerHTML = `<i class="fa-solid fa-check text-emerald-500 mr-1"></i> ${isFilteredKelas ? `Siswa binaan aktif ${kelasLabel}` : `Siswa aktif lintas kelas (${kelasLabel})`}`;
            } else {
                statTotalDesc.innerHTML = `<i class="fa-solid fa-check text-emerald-500 mr-1"></i> Terindeks di database DB_Siswa`;
            }
        }

        const statBerkasLengkap = document.getElementById("stat-berkas-lengkap");
        if (statBerkasLengkap) statBerkasLengkap.textContent = `${persenLengkap}%`;
        const statBerkasDetail = document.getElementById("stat-berkas-detail");
        if (statBerkasDetail) statBerkasDetail.textContent = `${lengkapCount} dari ${totalSiswa} siswa berkas lengkap`;

        // 2. Card 3: Agenda Surat atau Presensi Tendik (jika guru)
        const cardSuratBox = document.getElementById("dashboard-card-surat");
        const cardTendikBox = document.getElementById("dashboard-card-guru-presensi");
        if (role === "guru") {
            if (cardSuratBox) cardSuratBox.classList.add("hidden");
            if (cardTendikBox) {
                cardTendikBox.classList.remove("hidden");
                const u = Auth.user();
                const tendikToday = DataStore.getAbsensiTendik().find(r => r.tanggal === today && (Util.cleanId(r.nip) === Util.cleanId(u?.email?.split("@")[0] || u?.id) || (u?.nama && r.nama && r.nama.toLowerCase().includes(u.nama.toLowerCase()))));
                const statGuruJam = document.getElementById("stat-guru-presensi-status");
                if (statGuruJam) {
                    if (tendikToday && tendikToday.jamPulang) {
                        statGuruJam.innerHTML = `<span class="text-blue-700 font-bold text-lg">Sudah Pulang</span> <span class="text-xs text-slate-400 font-normal">(${Util.formatTime(tendikToday.jamPulang)})</span>`;
                    } else if (tendikToday && tendikToday.jamDatang) {
                        statGuruJam.innerHTML = `<span class="text-emerald-700 font-bold text-lg">Sudah Hadir</span> <span class="text-xs text-slate-400 font-normal">(${Util.formatTime(tendikToday.jamDatang)})</span>`;
                    } else {
                        statGuruJam.innerHTML = `<span class="text-amber-600 font-bold text-lg">Belum Scan</span> <a href="/presensi/scan" onclick="App.navigateTo('presensi/scan')" class="text-xs text-blue-600 underline ml-1">Scan Sekarang</a>`;
                    }
                }
            }
        } else {
            if (cardSuratBox) cardSuratBox.classList.remove("hidden");
            if (cardTendikBox) cardTendikBox.classList.add("hidden");
            const statSK = document.getElementById("stat-surat-keluar");
            if (statSK) statSK.textContent = suratKeluar.length;
            const statSM = document.getElementById("stat-surat-masuk");
            if (statSM) statSM.textContent = suratMasuk.length;
        }

        // 3. Presensi Hari Ini (Rincian Hadir, Sakit, Izin, Alpa)
        const targetNisns = new Set(targetStudents.map(s => s.nisn));
        const todayAbsensi = absensiList.filter(a => a.tanggal === today && a.kategori === "Siswa" && (isFilteredKelas ? targetNisns.has(a.nisnNip) : true));

        const countHadir = todayAbsensi.filter(a => a.status === "Hadir").length;
        const countSakit = todayAbsensi.filter(a => a.status === "Sakit").length;
        const countIzin = todayAbsensi.filter(a => a.status === "Izin").length;
        const countAlpa = todayAbsensi.filter(a => a.status === "Alpa").length;
        const totalDiabsen = todayAbsensi.length;
        const basisTotal = totalSiswa > 0 ? totalSiswa : totalDiabsen;
        const persenHadir = basisTotal > 0 ? ((countHadir / basisTotal) * 100).toFixed(1) : "0.0";

        const statPresensiTitle = document.getElementById("stat-presensi-title");
        if (statPresensiTitle) {
            if (role === "guru") {
                statPresensiTitle.textContent = isFilteredKelas ? `Kehadiran ${kelasLabel} Hari Ini` : `Kehadiran Siswa (${kelasLabel}) Hari Ini`;
            } else {
                statPresensiTitle.textContent = "Kehadiran Siswa Hari Ini";
            }
        }

        const statPresensiPersen = document.getElementById("stat-presensi-persen");
        if (statPresensiPersen) statPresensiPersen.textContent = `${persenHadir}%`;

        const statPresensiDetail = document.getElementById("stat-presensi-detail");
        if (statPresensiDetail) {
            statPresensiDetail.innerHTML = `
                <div class="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800" title="Hadir"><i class="fa-solid fa-check mr-1"></i>H: ${countHadir}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800" title="Sakit"><i class="fa-solid fa-notes-medical mr-1"></i>S: ${countSakit}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800" title="Izin"><i class="fa-solid fa-envelope-open mr-1"></i>I: ${countIzin}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800" title="Alpa"><i class="fa-solid fa-xmark mr-1"></i>A: ${countAlpa}</span>
                </div>
            `;
        }

        // Personalisasi Hero Banner sesuai Peran
        const heroTitle = document.getElementById("dashboard-hero-title");
        const heroDesc = document.getElementById("dashboard-hero-desc");
        const u = Auth.user();
        if (heroTitle && u) {
            if (role === "guru") {
                heroTitle.textContent = `Selamat Datang, ${u.nama}`;
                if (heroDesc) {
                    heroDesc.textContent = gInfo?.isGuruKelas
                        ? `Kelola data kehadiran dan administrasi siswa binaan Anda pada ${kelasLabel} secara mudah, akurat, dan paperless.`
                        : `Kelola data kehadiran dan administrasi siswa seluruh kelas yang Anda ajar (${gInfo?.namaMapel ? 'Mata Pelajaran ' + gInfo.namaMapel : 'Lintas Kelas'}) secara terpadu dan otomatis.`;
                }
            } else {
                heroTitle.textContent = `Selamat Datang di SIM-TAS-SD`;
                if (heroDesc) {
                    heroDesc.textContent = `Kelola administrasi sekolah dasar secara modern, terpadu, dan otomatis. Pengarsipan berkas siswa, penomoran surat baku SRIKANDI, penerbitan surat keterangan instan, dan absensi digital terhubung langsung ke Google Sheets & Drive.`;
                }
            }
        }

        // Sembunyikan bagian arsitektur teknis jika role Guru
        const stemSection = document.getElementById("dashboard-stem-section");
        if (stemSection) stemSection.classList.toggle("hidden", role === "guru");

        // Render Recent Activity on Dashboard
        this.renderRecentActivities(suratKeluar, suratMasuk, targetStudents);
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

        if (config.isCloudMode && config.gasApiUrl) {
            ApiClient.request("saveConfig", config).catch(e => console.warn("Sync config to cloud:", e));
        }

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
        const badge = document.getElementById("cloud-status-badge");
        if (!badge) return;

        const isCloud = ApiClient.isCloudActive();
        if (isCloud) {
            badge.className = "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs";
            badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> <span class="hidden sm:inline">Cloud Mode: Google Sheets & Drive</span><span class="sm:hidden font-bold">Cloud</span>`;
        } else {
            badge.className = "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs";
            badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> <span class="hidden sm:inline">Mode Demo (Lokal Browser)</span><span class="sm:hidden font-bold">Demo</span>`;
        }
    },

    renderQuickActions() {
        if (window.ModulVue && ModulVue.apps && ModulVue.apps.quickActions) {
            if (window.VueStore) VueStore.refresh();
            return;
        }
        const container = document.getElementById("quick-actions-dropdown");
        if (!container) return;

        const role = Auth.role();
        const isGuru = role === "guru";
        const isKepsek = role === "kepsek";
        const isKiosk = role === "kiosk";

        if (isKiosk) {
            container.innerHTML = `
                <a href="/presensi/scan" onclick="App.navigateTo('presensi/scan');" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <i class="fa-solid fa-qrcode text-indigo-600 w-4"></i> Scan Presensi Mandiri
                </a>
            `;
            return;
        }

        if (isGuru) {
            const gInfo = Auth.getGuruInfo ? Auth.getGuruInfo() : null;
            const labelKelas = gInfo && gInfo.isGuruKelas ? ` (Kelas ${gInfo.kelas})` : "";
            container.innerHTML = `
                <a href="/presensi/harian" onclick="App.navigateTo('presensi/harian');" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <i class="fa-solid fa-clipboard-check text-indigo-600 w-4"></i> Input Presensi Hari Ini${Sec.esc(labelKelas)}
                </a>
                <a href="/presensi/rekap" onclick="App.navigateTo('presensi/rekap');" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <i class="fa-solid fa-table-cells text-blue-600 w-4"></i> Rekap Absensi Bulanan
                </a>
                <a href="/presensi/scan" onclick="App.navigateTo('presensi/scan');" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <i class="fa-solid fa-qrcode text-emerald-600 w-4"></i> Presensi Datang / Pulang Saya
                </a>
                <a href="/berkas-siswa" onclick="App.navigateTo('berkas-siswa');" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <i class="fa-solid fa-folder-closed text-amber-600 w-4"></i> Berkas Siswa${Sec.esc(labelKelas)}
                </a>
            `;
            return;
        }

        if (isKepsek) {
            container.innerHTML = `
                <a href="/presensi/tendik" onclick="App.navigateTo('presensi/tendik');" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <i class="fa-solid fa-clipboard-user text-indigo-600 w-4"></i> Rekap Presensi Guru & Tendik
                </a>
                <a href="/presensi/rekap" onclick="App.navigateTo('presensi/rekap');" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <i class="fa-solid fa-table-cells text-blue-600 w-4"></i> Rekap Absensi Siswa
                </a>
                <a href="/surat/srikandi" onclick="App.navigateTo('surat/srikandi');" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <i class="fa-solid fa-envelopes-bulk text-amber-600 w-4"></i> Buku Register Surat SRIKANDI
                </a>
                <a href="/surat/cetak" onclick="App.navigateTo('surat/cetak');" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                    <i class="fa-solid fa-print text-teal-600 w-4"></i> Cetak Surat Keterangan
                </a>
            `;
            return;
        }

        // Admin & TU default
        container.innerHTML = `
            <a href="/berkas-siswa" onclick="App.navigateTo('berkas-siswa', () => { if (window.ModulBerkas) ModulBerkas.openAddModal(); });" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                <i class="fa-solid fa-user-plus text-blue-600 w-4"></i> Tambah Siswa Baru
            </a>
            <a href="/surat/srikandi" onclick="App.navigateTo('surat/srikandi', () => { if (window.ModulSurat) ModulSurat.openModalSuratKeluar(); });" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                <i class="fa-solid fa-paper-plane text-emerald-600 w-4"></i> Terbitkan Nomor Surat
            </a>
            <a href="/surat/cetak" onclick="App.navigateTo('surat/cetak');" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                <i class="fa-solid fa-file-invoice text-teal-600 w-4"></i> Cetak Surat Keterangan
            </a>
            <a href="/presensi/harian" onclick="App.navigateTo('presensi/harian');" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                <i class="fa-solid fa-clipboard-check text-indigo-600 w-4"></i> Input Presensi Harian
            </a>
            <a href="/presensi/scan" onclick="App.navigateTo('presensi/scan');" class="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50">
                <i class="fa-solid fa-qrcode text-indigo-600 w-4"></i> Scan Absensi Datang/Pulang
            </a>
        `;
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
