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

        this.cleanupCorruptedTendikData();
        this.initModules();
        if (window.ModulVue) ModulVue.init();
        this.renderTASelector();
        this.renderQuickActions();
        this.updateDashboardStats();
        this.updateConnectionStatusBadge();

        // Auto pull fresh data jika cloud mode aktif
        if (ApiClient.isCloudActive()) {
            Sync.pullAll().then(() => {
                this.updateDashboardStats();
                if (this.currentRoute === "berkas") ModulBerkas.renderTable();
                if (this.currentRoute === "tendik" && window.ModulTendik) ModulTendik.renderTable();
            }).catch(e => console.warn("Sync initial error:", e));
        }

        // Navigate ke default route sesuai peran akun
        const initial = Auth.defaultRoute();
        this.navigateTo(initial);
    },

    cleanupCorruptedTendikData() {
        try {
            let list = DataStore.getTendik();
            if (!Array.isArray(list) || list.length === 0) return;
            let changed = false;
            list = list.map(t => {
                let updated = { ...t };
                // Jika golJabatan / golongan bernilai "PPPK" atau "PNS" (akibat bug lama)
                if (updated.statusKepegawaian === "PPPK" && (updated.golJabatan === "PPPK" || updated.golongan === "PPPK")) {
                    const seed = typeof SEED_TENDIK !== "undefined" ? SEED_TENDIK.find(s => Util.cleanId(s.nip) === Util.cleanId(t.nip)) : null;
                    updated.golJabatan = (seed && seed.golJabatan) ? seed.golJabatan : "IX / Guru Kelas";
                    updated.golongan = updated.golJabatan;
                    changed = true;
                }
                return updated;
            });
            if (changed) {
                DataStore.saveTendik(list);
            }
        } catch (e) {}
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
        if (window.ModulJadwal) ModulJadwal.init();
        if (window.ModulPIP) ModulPIP.init();
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
        else if (this.currentRoute === "jadwal" && window.ModulJadwal) ModulJadwal.renderGrid();
        else if (this.currentRoute === "pip" && window.ModulPIP) ModulPIP.renderTab();
    },

    navigateTo(route) {
        // Cek RBAC
        if (!Auth.canRoute(route)) {
            this.showToast("Anda tidak memiliki hak akses untuk membuka modul ini.", "warning");
            return;
        }

        this.currentRoute = route;
        if (window.VueStore) VueStore.refresh();
        if (window.ModulVue) ModulVue.applyRoleNavVisibility();
        this.renderQuickActions();

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
        } else if (route === "jadwal") {
            if (window.ModulJadwal) {
                ModulJadwal.renderKelasSelector();
                ModulJadwal.renderGrid();
            }
        } else if (route === "pip") {
            if (window.ModulPIP) {
                ModulPIP.renderKelasFilter();
                (ModulPIP.renderActiveTab ? ModulPIP.renderActiveTab() : ModulPIP.renderTab());
            }
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
        } else if (route === "tendik") {
            if (window.ModulTendik) ModulTendik.renderTable();
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

    VERSION: "2.7.0",

    formatJamMenit(w) {
        if (!w) return "";
        const str = String(w);
        const m = str.match(/(\d{1,2}:\d{2})/);
        return m ? m[1].padStart(5, '0') : str;
    },

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
                const cleanK = String(gInfo.kelas || "1").replace(/kelas\s*/i, "").trim();
                kelasLabel = `Kelas ${cleanK}`;
                targetStudents = students.filter(s => {
                    const k = String(s.rombel || s.kelas || "").trim();
                    const d1 = k.replace(/\D/g, "");
                    const d2 = cleanK.replace(/\D/g, "");
                    if (d1 && d2 && d1 === d2) return true;
                    return k.toLowerCase() === cleanK.toLowerCase() || k.toLowerCase() === `kelas ${cleanK}`.toLowerCase();
                });
            } else if (gInfo.isGuruMapel) {
                if (gInfo.kelas && gInfo.kelas !== "Semua") {
                    isFilteredKelas = true;
                    const cleanK = String(gInfo.kelas).replace(/kelas\s*/i, "").trim();
                    kelasLabel = `Kelas ${cleanK} (${gInfo.namaMapel || 'Mapel'})`;
                    targetStudents = students.filter(s => {
                        const k = String(s.rombel || s.kelas || "").trim();
                        const d1 = k.replace(/\D/g, "");
                        const d2 = cleanK.replace(/\D/g, "");
                        return (d1 && d2 && d1 === d2) || k.toLowerCase().includes(cleanK.toLowerCase());
                    });
                } else {
                    isFilteredKelas = false;
                    kelasLabel = gInfo.namaMapel ? `Mapel ${gInfo.namaMapel}` : "Semua Kelas (Mapel)";
                    targetStudents = students;
                }
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
                        statGuruJam.innerHTML = `<span class="text-amber-600 font-bold text-lg">Belum Scan</span> <a href="#scan-absensi" onclick="App.navigateTo('scan-absensi')" class="text-xs text-blue-600 underline ml-1">Scan Sekarang</a>`;
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

        // Sembunyikan bagian arsitektur teknis jika role Guru, Penjaga, atau Perpustakaan
        const stemSection = document.getElementById("dashboard-stem-section");
        if (stemSection) stemSection.classList.toggle("hidden", role === "guru" || role === "penjaga" || role === "perpustakaan");

        // Role-Aware Dashboard Widgets
        this.renderRoleDashboardWidgets(role, u, gInfo, targetStudents);

        // Render Recent Activity on Dashboard
        this.renderRecentActivities(suratKeluar, suratMasuk, targetStudents);
    },

    _berkasChartInstance: null,

    renderRoleDashboardWidgets(role, user, gInfo, targetStudents) {
        const guruSection = document.getElementById("dashboard-guru-section");
        const adminSection = document.getElementById("dashboard-admin-section");

        if (role === "guru") {
            if (guruSection) guruSection.classList.remove("hidden");
            if (adminSection) adminSection.classList.add("hidden");

            this.renderGuruScheduleToday(user, gInfo);
            this.renderGuruIncompleteDocs(targetStudents);
            this.renderGuruPIPStatus(targetStudents);
        } else if (role === "penjaga") {
            if (guruSection) guruSection.classList.add("hidden");
            if (adminSection) adminSection.classList.add("hidden");
        } else if (role === "perpustakaan") {
            if (guruSection) guruSection.classList.add("hidden");
            if (adminSection) adminSection.classList.remove("hidden");

            this.renderAdminBerkasChart();
            this.renderAdminPIPStats();
        } else {
            if (guruSection) guruSection.classList.add("hidden");
            if (adminSection) adminSection.classList.remove("hidden");

            this.renderAdminBerkasChart();
            this.renderAdminPIPStats();
            this.renderPendingPermohonanAlert();
        }
    },

    renderGuruScheduleToday(user, gInfo) {
        const container = document.getElementById("guru-jadwal-hari-ini-body");
        const dayBadge = document.getElementById("guru-jadwal-hari-label");
        if (!container) return;

        let todayHari = Util.getHariIndonesia();
        if (todayHari === "Minggu") todayHari = "Senin"; // Pratinjau hari kerja
        if (dayBadge) dayBadge.textContent = todayHari;

        const allJadwal = DataStore.getJadwalAll();
        let slots = [];

        const matchRombel = (itemRombel, targetRombel) => {
            if (!itemRombel || !targetRombel) return false;
            const r1 = String(itemRombel).trim();
            const r2 = String(targetRombel).trim();
            if (r1.toLowerCase() === r2.toLowerCase()) return true;
            const d1 = r1.replace(/\D/g, "");
            const d2 = r2.replace(/\D/g, "");
            return !!(d1 && d2 && d1 === d2);
        };

        if (gInfo && gInfo.isGuruKelas) {
            const rombel = String(gInfo.kelas || "1");
            slots = allJadwal.filter(j => (matchRombel(j.rombel, rombel) || matchRombel(j.kelas, rombel)) && j.hari === todayHari);
        } else if (gInfo && gInfo.isGuruMapel) {
            const myName = (user?.nama || "").toLowerCase();
            const myMapel = (gInfo.namaMapel || "").toLowerCase();
            const targetKelas = gInfo.kelas && gInfo.kelas !== "Semua" ? gInfo.kelas : "";
            slots = allJadwal.filter(j => {
                const matchHari = j.hari === todayHari;
                const matchGuru = myName && ((j.namaGuru && j.namaGuru.toLowerCase().includes(myName)) || (j.guru && j.guru.toLowerCase().includes(myName)));
                const matchMapel = myMapel && j.mapel && j.mapel.toLowerCase().includes(myMapel);
                const matchK = targetKelas ? (matchRombel(j.rombel, targetKelas) || matchRombel(j.kelas, targetKelas)) : true;
                return matchHari && (matchGuru || matchMapel) && matchK;
            });
        } else {
            slots = allJadwal.filter(j => j.hari === todayHari && (matchRombel(j.rombel, "1") || matchRombel(j.kelas, "1")));
        }

        slots.sort((a, b) => Number(a.jamKe) - Number(b.jamKe));

        if (slots.length === 0) {
            container.innerHTML = `
                <div class="py-6 text-center text-slate-400">
                    <i class="fa-regular fa-calendar-xmark text-3xl mb-2 text-slate-300"></i>
                    <p class="text-xs font-semibold text-slate-600">Tidak ada jadwal mengajar pada hari ${todayHari}</p>
                    <a href="#jadwal" onclick="App.navigateTo('jadwal')" class="text-[11px] text-blue-600 underline mt-1 inline-block">Lihat Seluruh Matriks Jadwal</a>
                </div>
            `;
            return;
        }

        container.innerHTML = slots.map(s => {
            const isBreak = s.mapel && s.mapel.toLowerCase().includes("istirahat");
            const jamMulai = this.formatJamMenit(s.waktuMulai) || "07:00";
            const jamSelesai = this.formatJamMenit(s.waktuSelesai) || "07:35";
            const displayWaktu = `${jamMulai} - ${jamSelesai}`;

            if (isBreak) {
                return `
                    <div class="flex items-center gap-3 p-2 bg-amber-50/70 border border-amber-200 rounded-xl text-xs">
                        <span class="w-14 font-mono font-bold text-amber-800 text-center text-[11px]">Jam ${s.jamKe}</span>
                        <div class="flex-grow font-semibold text-amber-900 flex items-center gap-2">
                            <i class="fa-solid fa-mug-hot text-amber-600"></i> ${s.mapel}
                        </div>
                        <span class="text-[10px] text-amber-700 font-mono">${displayWaktu}</span>
                    </div>
                `;
            }

            const rombelLabel = String(s.rombel || s.kelas || "1").toLowerCase().startsWith("kelas") ? (s.rombel || s.kelas) : `Kelas ${s.rombel || s.kelas || "1"}`;

            return `
                <div class="flex items-center justify-between p-2.5 bg-white border border-slate-200 hover:border-blue-400 rounded-xl text-xs transition shadow-xs">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="w-12 py-1 px-1.5 bg-blue-50 text-blue-800 font-black rounded-lg text-center font-mono text-[11px] border border-blue-200 flex-shrink-0">
                            Jam ${s.jamKe}
                        </span>
                        <div class="min-w-0">
                            <div class="font-bold text-slate-800 truncate">${s.mapel || "Mata Pelajaran"}</div>
                            <div class="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                                <span><i class="fa-solid fa-chalkboard-user text-slate-400 mr-1"></i>${rombelLabel}</span>
                                <span>•</span>
                                <span class="truncate">${s.namaGuru || s.guru || "Guru"}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0 pl-2">
                        <span class="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">${displayWaktu}</span>
                    </div>
                </div>
            `;
        }).join("");
    },

    renderGuruIncompleteDocs(targetStudents) {
        const container = document.getElementById("guru-incomplete-docs-body");
        const countBadge = document.getElementById("guru-incomplete-docs-count");
        if (!container) return;

        const incomplete = targetStudents.filter(s => !s.berkas?.kk?.uploaded || !s.berkas?.akta?.uploaded);
        if (countBadge) countBadge.textContent = `${incomplete.length} Siswa`;

        if (incomplete.length === 0) {
            container.innerHTML = `
                <div class="py-6 text-center text-emerald-600">
                    <i class="fa-solid fa-circle-check text-3xl mb-2 text-emerald-500"></i>
                    <p class="text-xs font-bold">Luar biasa! Berkas seluruh siswa di kelas Anda sudah 100% lengkap.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = incomplete.slice(0, 5).map(s => {
            const missingKK = !s.berkas?.kk?.uploaded;
            const missingAkta = !s.berkas?.akta?.uploaded;
            const waLink = ModulBerkas.getWhatsAppReminderLink(s);

            return `
                <div class="flex items-center justify-between p-2.5 bg-rose-50/40 border border-rose-100 hover:border-rose-300 rounded-xl text-xs transition">
                    <div class="min-w-0 flex-grow pr-2">
                        <div class="font-bold text-slate-800 truncate">${s.nama}</div>
                        <div class="flex items-center gap-1 mt-1 flex-wrap">
                            ${missingKK ? '<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Belum KK</span>' : ''}
                            ${missingAkta ? '<span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Belum Akta</span>' : ''}
                            <span class="text-[10px] text-slate-400 font-mono">NISN: ${s.nisn}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                        ${waLink ? `
                            <a href="${waLink}" target="_blank"
                                title="Kirim Pengingat Berkas ke WA Orang Tua"
                                class="p-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shadow-xs transition">
                                <i class="fa-brands fa-whatsapp"></i> Ingatkan
                            </a>
                        ` : `
                            <button onclick="ModulBerkas.openEditKontakModal('${s.nisn}')"
                                title="Lengkapi No HP Orang Tua"
                                class="p-1.5 px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition">
                                <i class="fa-solid fa-phone-plus"></i> Isi No HP
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join("");
    },

    renderGuruPIPStatus(targetStudents) {
        const container = document.getElementById("guru-pip-summary-body");
        if (!container) return;

        const nisnSet = new Set(targetStudents.map(s => s.nisn));
        const allPenerima = DataStore.getPIPPenerima();
        const myPenerima = allPenerima.filter(p => nisnSet.has(p.nisn) || targetStudents.some(s => s.nama.toLowerCase() === p.nama.toLowerCase()));

        if (myPenerima.length === 0) {
            container.innerHTML = `
                <div class="py-4 text-center text-slate-400 text-xs">
                    <p>Tidak ada siswa penerima PIP SK di rombel ini</p>
                </div>
            `;
            return;
        }

        const countCair = myPenerima.filter(p => p.statusPencairan === "Sudah Cair").length;
        const countBelum = myPenerima.length - countCair;

        container.innerHTML = `
            <div class="flex items-center justify-between mb-3 text-xs">
                <span class="font-bold text-slate-700">${myPenerima.length} Siswa Penerima PIP</span>
                <span class="text-[11px] text-slate-500">${countCair} Cair • ${countBelum} Belum</span>
            </div>
            <div class="space-y-1.5">
                ${myPenerima.slice(0, 3).map(p => `
                    <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <div class="truncate pr-2">
                            <span class="font-bold text-slate-800">${p.nama}</span>
                            <span class="text-[10px] text-slate-400 ml-1">Rp ${(p.nominal || 450000).toLocaleString('id-ID')}</span>
                        </div>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.statusPencairan === 'Sudah Cair' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                            ${p.statusPencairan || 'Belum Cair'}
                        </span>
                    </div>
                `).join("")}
            </div>
            <div class="mt-3 pt-2 border-t border-slate-100 text-right">
                <a href="#pip" onclick="App.navigateTo('pip')" class="text-xs text-blue-600 font-bold hover:underline">Buka Modul PIP Lengkap &rarr;</a>
            </div>
        `;
    },

    renderAdminBerkasChart() {
        const canvas = document.getElementById("chart-berkas-kelengkapan");
        if (!canvas || typeof Chart === "undefined") return;

        const students = DataStore.getSiswa();
        let lengkap = 0;
        let hanyaKK = 0;
        let hanyaAkta = 0;
        let belumKeduanya = 0;

        students.forEach(s => {
            const hasKK = !!s.berkas?.kk?.uploaded;
            const hasAkta = !!s.berkas?.akta?.uploaded;

            if (hasKK && hasAkta) lengkap++;
            else if (hasKK && !hasAkta) hanyaKK++;
            else if (!hasKK && hasAkta) hanyaAkta++;
            else belumKeduanya++;
        });

        if (this._berkasChartInstance) {
            this._berkasChartInstance.destroy();
        }

        const ctx = canvas.getContext("2d");
        this._berkasChartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Lengkap (KK + Akta)", "Hanya KK", "Hanya Akta", "Belum Keduanya"],
                datasets: [{
                    data: [lengkap, hanyaKK, hanyaAkta, belumKeduanya],
                    backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#f43f5e"],
                    borderWidth: 2,
                    borderColor: "#ffffff"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            boxWidth: 12,
                            font: { size: 10, family: "sans-serif" }
                        }
                    }
                },
                cutout: "68%"
            }
        });
    },

    renderAdminPIPStats() {
        const container = document.getElementById("dashboard-admin-pip-summary");
        if (!container) return;

        const pengusulan = DataStore.getPIPPengusulan();
        const penerima = DataStore.getPIPPenerima();

        const desil1_4 = pengusulan.filter(p => Number(p.desil) >= 1 && Number(p.desil) <= 4).length;
        const desil5_7 = pengusulan.filter(p => Number(p.desil) >= 5 && Number(p.desil) <= 7).length;
        const desil8_10 = pengusulan.filter(p => Number(p.desil) >= 8 && Number(p.desil) <= 10).length;

        const totalDana = penerima.reduce((acc, curr) => acc + (Number(curr.nominal) || 450000), 0);
        const cairCount = penerima.filter(p => p.statusPencairan === "Sudah Cair").length;

        container.innerHTML = `
            <div class="grid grid-cols-3 gap-2 text-center mb-3">
                <div class="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                    <div class="text-xs font-bold text-rose-700">Desil 1-4</div>
                    <div class="text-lg font-black text-rose-900">${desil1_4}</div>
                    <div class="text-[9px] text-rose-600">Sangat Miskin</div>
                </div>
                <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <div class="text-xs font-bold text-amber-700">Desil 5-7</div>
                    <div class="text-lg font-black text-amber-900">${desil5_7}</div>
                    <div class="text-[9px] text-amber-600">Miskin</div>
                </div>
                <div class="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                    <div class="text-xs font-bold text-blue-700">Desil 8-10</div>
                    <div class="text-lg font-black text-blue-900">${desil8_10}</div>
                    <div class="text-[9px] text-blue-600">Rentan Miskin</div>
                </div>
            </div>
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                <div>
                    <span class="text-slate-500 text-[11px]">Total Alokasi SK PIP:</span>
                    <div class="font-extrabold text-slate-800">Rp ${totalDana.toLocaleString('id-ID')}</div>
                </div>
                <div class="text-right">
                    <span class="text-slate-500 text-[11px]">Pencairan Dana:</span>
                    <div class="font-extrabold text-emerald-600">${cairCount} / ${penerima.length} Siswa</div>
                </div>
            </div>
        `;
    },

    renderPendingPermohonanAlert() {
        const alertEl = document.getElementById("dashboard-pending-permohonan-alert");
        if (!alertEl) return;

        const list = DataStore.getPermohonanSurat();
        const pending = list.filter(p => p.status === "Menunggu Verifikasi TU");

        if (pending.length > 0) {
            alertEl.classList.remove("hidden");
            alertEl.innerHTML = `
                <div class="p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl text-white shadow-md flex items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg flex-shrink-0">
                            <i class="fa-solid fa-bell animate-bounce"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-xs sm:text-sm">Ada ${pending.length} Permohonan Surat Online Baru dari Orang Tua!</h4>
                            <p class="text-[11px] text-amber-100">Permohonan mandiri via portal publik membutuhkan verifikasi dan penerbitan nomor surat resmi.</p>
                        </div>
                    </div>
                    <button onclick="App.navigateTo('surat'); ModulSurat.switchSubTab('permohonan');"
                        class="px-4 py-2 bg-white hover:bg-slate-100 text-amber-900 rounded-xl font-bold text-xs shadow transition whitespace-nowrap">
                        Buka Antrean &rarr;
                    </button>
                </div>
            `;
        } else {
            alertEl.classList.add("hidden");
        }
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
            
            // Konfigurasi Supabase & GAS
            const inputSupabaseUrl = document.getElementById("cfg-supabase-url");
            if (inputSupabaseUrl) {
                inputSupabaseUrl.value = config.supabaseUrl || (window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.SUPABASE_URL) || "";
            }
            const inputSupabaseKey = document.getElementById("cfg-supabase-anon-key");
            if (inputSupabaseKey) {
                inputSupabaseKey.value = config.supabaseAnonKey || (window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.SUPABASE_ANON_KEY) || "";
            }
            const inputGas = document.getElementById("cfg-gas-url");
            if (inputGas) {
                inputGas.value = config.gasApiUrl || (window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.GAS_API_URL) || "";
            }
            const checkCloud = document.getElementById("cfg-cloud-mode");
            if (checkCloud) {
                checkCloud.checked = config.isCloudMode !== false;
                this.renderCloudModeVisual(checkCloud.checked);
            }
        }
    },

    toggleCloudMode(checked) {
        const config = DataStore.getConfig();
        config.isCloudMode = !!checked;
        DataStore.saveConfig(config);
        this.renderCloudModeVisual(checked);
        this.updateConnectionStatusBadge();

        if (checked) {
            App.showToast("Mode Cloud Diaktifkan: Terhubung ke Google Sheets, Drive & Supabase Auth.", "success");
            if (ApiClient.isCloudActive()) {
                Sync.pullAll().then(() => {
                    App.updateDashboardStats();
                    App.refreshAll();
                }).catch(e => console.warn("Pull on cloud toggle error:", e));
            }
        } else {
            App.showToast("Mode Lokal Diaktifkan: Sistem beroperasi offline tanpa akses cloud (LocalStorage).", "info");
        }
    },

    renderCloudModeVisual(isCloud) {
        const visualBadge = document.getElementById("cfg-cloud-mode-status-text");
        const container = document.getElementById("cfg-cloud-mode-card");
        if (!visualBadge) return;

        if (isCloud) {
            visualBadge.className = "text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 shadow-xs";
            visualBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Mode Cloud Aktif (Google Sheets, Drive & Supabase)`;
            if (container) {
                container.className = "p-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50/60 transition-all shadow-xs";
            }
        } else {
            visualBadge.className = "text-xs font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 shadow-xs";
            visualBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> Mode Lokal Aktif (Simulasi Offline Browser LocalStorage)`;
            if (container) {
                container.className = "p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/50 transition-all shadow-xs";
            }
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

        const supUrlEl = document.getElementById("cfg-supabase-url");
        if (supUrlEl) config.supabaseUrl = supUrlEl.value.trim();
        const supKeyEl = document.getElementById("cfg-supabase-anon-key");
        if (supKeyEl) config.supabaseAnonKey = supKeyEl.value.trim();

        config.gasApiUrl = document.getElementById("cfg-gas-url").value.trim();
        config.isCloudMode = document.getElementById("cfg-cloud-mode").checked;

        // Sinkronkan ke objek window.SIMTAS_CONFIG aktif
        if (window.SIMTAS_CONFIG) {
            if (config.supabaseUrl) window.SIMTAS_CONFIG.SUPABASE_URL = config.supabaseUrl;
            if (config.supabaseAnonKey) window.SIMTAS_CONFIG.SUPABASE_ANON_KEY = config.supabaseAnonKey;
            if (config.gasApiUrl) window.SIMTAS_CONFIG.GAS_API_URL = config.gasApiUrl;
        }

        DataStore.saveConfig(config);
        this.loadSchoolSettings();
        this.updateConnectionStatusBadge();

        if (config.isCloudMode && config.gasApiUrl) {
            ApiClient.request("saveConfig", config).catch(e => console.warn("Sync config to cloud:", e));
        }

        App.showToast("Pengaturan identitas sekolah, konfigurasi Supabase & GAS API berhasil disimpan!", "success");
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
            this.renderCloudModeVisual(true);
            const config = DataStore.getConfig();
            config.gasApiUrl = url;
            config.isCloudMode = true;
            DataStore.saveConfig(config);
            this.updateConnectionStatusBadge();
        } else {
            App.showToast(res.message, "error");
        }

        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-link"></i> Uji Koneksi GAS`;
    },

    async testSupabaseConnection() {
        const urlInput = document.getElementById("cfg-supabase-url");
        const keyInput = document.getElementById("cfg-supabase-anon-key");
        const url = urlInput ? urlInput.value.trim() : "";
        const key = keyInput ? keyInput.value.trim() : "";

        if (!url || !key) {
            App.showToast("Harap isi URL Supabase dan Anon Key terlebih dahulu!", "warning");
            return;
        }

        const btn = document.getElementById("btn-test-supabase");
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menguji...`;
        }

        const res = await ApiClient.testSupabaseConnection(url, key);
        if (res.success) {
            App.showToast(res.message, "success");
            const config = DataStore.getConfig();
            config.supabaseUrl = url;
            config.supabaseAnonKey = key;
            DataStore.saveConfig(config);
            if (window.SIMTAS_CONFIG) {
                window.SIMTAS_CONFIG.SUPABASE_URL = url;
                window.SIMTAS_CONFIG.SUPABASE_ANON_KEY = key;
            }
        } else {
            App.showToast(res.message, "error");
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Uji Supabase`;
        }
    },

    resetConfigDefaults() {
        const defSupUrl = (window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.SUPABASE_URL) || "https://wesuxejtpquzqkojpvpg.supabase.co";
        const defSupKey = (window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.SUPABASE_ANON_KEY) || "sb_publishable_fz1vTJMm99C7PPNsCKjS_g_dt2DfhVa";
        const defGasUrl = (window.SIMTAS_CONFIG && window.SIMTAS_CONFIG.GAS_API_URL) || "https://script.google.com/macros/s/AKfycby8iGSmXP0R6ytEtzWLCcrp7FZQVQQFORaS1KqCsKuNEXrAQ9-JnAZtmkz0mSITSaFM/exec";

        if (document.getElementById("cfg-supabase-url")) document.getElementById("cfg-supabase-url").value = defSupUrl;
        if (document.getElementById("cfg-supabase-anon-key")) document.getElementById("cfg-supabase-anon-key").value = defSupKey;
        if (document.getElementById("cfg-gas-url")) document.getElementById("cfg-gas-url").value = defGasUrl;
        if (document.getElementById("cfg-cloud-mode")) {
            document.getElementById("cfg-cloud-mode").checked = true;
            this.renderCloudModeVisual(true);
        }

        App.showToast("Nilai default Supabase & GAS URL berhasil dimuat! Klik 'Simpan Seluruh Pengaturan' untuk menerapkan permanen.", "info");
    },

    togglePasswordVisibility(inputId, btnEl) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const icon = btnEl ? btnEl.querySelector("i") : null;
        if (input.type === "password") {
            input.type = "text";
            if (icon) {
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            }
        } else {
            input.type = "password";
            if (icon) {
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        }
    },

    updateConnectionStatusBadge() {
        const badge = document.getElementById("cloud-status-badge");
        if (!badge) return;

        const isCloud = ApiClient.isCloudActive();
        if (isCloud) {
            badge.className = "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs cursor-pointer hover:bg-emerald-200 transition";
            badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> <span class="hidden sm:inline">Cloud Mode: Google Sheets, Drive & Supabase</span><span class="sm:hidden font-bold">Cloud</span>`;
            badge.title = "Mode Cloud Aktif. Klik untuk membuka Pengaturan.";
        } else {
            badge.className = "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs cursor-pointer hover:bg-amber-200 transition";
            badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500"></span> <span class="hidden sm:inline">Mode Lokal: Browser LocalStorage (Offline)</span><span class="sm:hidden font-bold">Lokal</span>`;
            badge.title = "Mode Lokal Aktif. Klik untuk membuka Pengaturan.";
        }
        badge.onclick = () => App.navigateTo('pengaturan');
    },

    renderQuickActions() {
        if (window.ModulVue && ModulVue.apps && ModulVue.apps.quickActions) {
            if (window.VueStore) VueStore.refresh();
            return;
        }
        const container = document.getElementById("vue-quick-actions");
        if (!container) return;

        const role = Auth.role();
        const isGuru = role === "guru";
        const isKepsek = role === "kepsek";
        const isKiosk = role === "kiosk";

        const btnClass = "group inline-flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl text-xs font-semibold backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md hover:border-white/40 transition duration-150 cursor-pointer";

        if (isKiosk) {
            container.innerHTML = `
                <button type="button" onclick="App.navigateTo('scan-absensi');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-qrcode text-indigo-300"></i></span>
                    <span>Scan Presensi Mandiri</span>
                </button>
            `;
            return;
        }

        if (role === "penjaga") {
            container.innerHTML = `
                <button type="button" onclick="App.navigateTo('scan-absensi');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-qrcode text-emerald-300"></i></span>
                    <span>Scan Absensi Datang/Pulang</span>
                </button>
                <button type="button" onclick="App.navigateTo('absensi'); if (window.ModulPresensi) ModulPresensi.switchTab('tendik');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-clipboard-user text-indigo-300"></i></span>
                    <span>Rekap Absensi Saya</span>
                </button>
            `;
            return;
        }

        if (role === "perpustakaan") {
            container.innerHTML = `
                <button type="button" onclick="App.navigateTo('berkas');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-folder-closed text-amber-300"></i></span>
                    <span>Bangkas Digital Siswa</span>
                </button>
                <button type="button" onclick="App.navigateTo('pip');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-hand-holding-dollar text-sky-300"></i></span>
                    <span>Program PIP Siswa</span>
                </button>
                <button type="button" onclick="App.navigateTo('scan-absensi');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-qrcode text-emerald-300"></i></span>
                    <span>Scan Absensi Datang/Pulang</span>
                </button>
                <button type="button" onclick="App.navigateTo('absensi'); if (window.ModulPresensi) ModulPresensi.switchTab('tendik');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-clipboard-user text-indigo-300"></i></span>
                    <span>Rekap Absensi Saya</span>
                </button>
            `;
            return;
        }

        if (isGuru) {
            const gInfo = Auth.getGuruInfo ? Auth.getGuruInfo() : null;
            const labelKelas = gInfo && gInfo.isGuruKelas ? ` (Kelas ${gInfo.kelas})` : "";
            container.innerHTML = `
                <button type="button" onclick="App.navigateTo('absensi'); if (window.ModulPresensi) ModulPresensi.switchTab('harian');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-clipboard-check text-amber-300"></i></span>
                    <span>Input Presensi Hari Ini${Sec.esc(labelKelas)}</span>
                </button>
                <button type="button" onclick="App.navigateTo('absensi'); if (window.ModulPresensi) ModulPresensi.switchTab('siswa');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-table-cells text-sky-300"></i></span>
                    <span>Rekap Absensi Bulanan</span>
                </button>
                <button type="button" onclick="App.navigateTo('scan-absensi');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-qrcode text-emerald-300"></i></span>
                    <span>Presensi Datang / Pulang Saya</span>
                </button>
                <button type="button" onclick="App.navigateTo('berkas');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-folder-closed text-amber-300"></i></span>
                    <span>Berkas Siswa${Sec.esc(labelKelas)}</span>
                </button>
            `;
            return;
        }

        if (isKepsek) {
            container.innerHTML = `
                <button type="button" onclick="App.navigateTo('tendik');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-chalkboard-user text-sky-300"></i></span>
                    <span>Data Guru & Tendik</span>
                </button>
                <button type="button" onclick="App.navigateTo('absensi'); if (window.ModulPresensi) ModulPresensi.switchTab('tendik');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-clipboard-user text-indigo-300"></i></span>
                    <span>Rekap Presensi Guru & Tendik</span>
                </button>
                <button type="button" onclick="App.navigateTo('absensi'); if (window.ModulPresensi) ModulPresensi.switchTab('siswa');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-table-cells text-sky-300"></i></span>
                    <span>Rekap Absensi Siswa</span>
                </button>
                <button type="button" onclick="App.navigateTo('surat');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-envelopes-bulk text-amber-300"></i></span>
                    <span>Buku Register Surat SRIKANDI</span>
                </button>
                <button type="button" onclick="App.navigateTo('cetak');" class="${btnClass}">
                    <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-print text-teal-300"></i></span>
                    <span>Cetak Surat Keterangan</span>
                </button>
            `;
            return;
        }

        // Admin & TU default
        container.innerHTML = `
            <button type="button" onclick="App.navigateTo('tendik');" class="${btnClass}">
                <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-chalkboard-user text-purple-300"></i></span>
                <span>Data Guru & Tendik</span>
            </button>
            <button type="button" onclick="App.navigateTo('berkas'); if (window.ModulBerkas) ModulBerkas.openAddModal();" class="${btnClass}">
                <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-user-plus text-sky-300"></i></span>
                <span>Tambah Siswa Baru</span>
            </button>
            <button type="button" onclick="App.navigateTo('surat'); if (window.ModulSurat) ModulSurat.openModalSuratKeluar();" class="${btnClass}">
                <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-paper-plane text-emerald-300"></i></span>
                <span>Terbitkan Nomor Surat</span>
            </button>
            <button type="button" onclick="App.navigateTo('cetak');" class="${btnClass}">
                <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-file-invoice text-teal-300"></i></span>
                <span>Cetak Surat Keterangan</span>
            </button>
            <button type="button" onclick="App.navigateTo('absensi');" class="${btnClass}">
                <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-clipboard-check text-amber-300"></i></span>
                <span>Input Presensi Harian</span>
            </button>
            <button type="button" onclick="App.navigateTo('scan-absensi');" class="${btnClass}">
                <span class="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs group-hover:scale-110 transition-transform flex-shrink-0"><i class="fa-solid fa-qrcode text-indigo-300"></i></span>
                <span>Scan Absensi Datang/Pulang</span>
            </button>
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
