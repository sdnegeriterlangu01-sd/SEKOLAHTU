/* ==========================================================================
   SIM-TAS-SD: CLIENT-SIDE SPA HASH ROUTER
   Mendukung routing modular: #/menu/sub-menu tanpa reload halaman
   Fitur: Template Caching (<300ms), RBAC Route Guard, Auto-Lifecycle Mount
   ========================================================================== */

const Router = {
    currentRoute: "",
    currentPath: "",
    templateCache: new Map(),
    isNavigating: false,
    _postNavCallbacks: [],

    // Rute Konfigurasi: Pemetaan Route Hash -> Lokasi Berkas HTML & Hook Controller
    routes: {
        "beranda": {
            template: "views/beranda.html",
            title: "Beranda & Ringkasan",
            menuId: "dashboard",
            onMount: () => {
                App.updateDashboardStats();
            }
        },
        "berkas-siswa": {
            template: "views/berkas-siswa/index.html",
            title: "Bangkas Digital Siswa",
            menuId: "berkas",
            onMount: () => {
                if (window.ModulBerkas) {
                    ModulBerkas.init();
                }
            }
        },
        "berkas-siswa/detail": {
            template: "views/berkas-siswa/detail.html",
            title: "Detail Berkas Siswa",
            menuId: "berkas",
            onMount: (params) => {
                if (window.ModulBerkas && params && params.nisn) {
                    ModulBerkas.openDetailModal(params.nisn);
                }
            }
        },
        "surat/srikandi": {
            template: "views/surat/srikandi.html",
            title: "Penomoran & Agenda Surat SRIKANDI",
            menuId: "surat",
            onMount: (params) => {
                if (window.ModulSurat) {
                    ModulSurat.init();
                    if (params && params.tab) {
                        ModulSurat.switchSubTab(params.tab);
                    }
                }
                if (window.ModulVue) {
                    ModulVue.mountSuratTabs();
                }
            }
        },
        "surat/cetak": {
            template: "views/surat/cetak.html",
            title: "Cetak Surat Otomatis",
            menuId: "cetak",
            onMount: () => {
                if (window.ModulCetak) {
                    ModulCetak.init();
                }
            }
        },
        "presensi/harian": {
            template: "views/presensi/harian.html",
            title: "Presensi Harian",
            menuId: "absensi",
            onMount: () => {
                if (window.VueStore) VueStore.absensiTab = "harian";
                if (window.ModulPresensi) {
                    ModulPresensi.init();
                    ModulPresensi.switchTab("harian");
                }
                if (window.ModulAbsensi) {
                    ModulAbsensi.init();
                }
                if (window.ModulVue) {
                    ModulVue.mountAbsensiTabs();
                }
            }
        },
        "presensi/rekap": {
            template: "views/presensi/rekap.html",
            title: "Rekap Absensi Siswa Bulanan",
            menuId: "absensi",
            onMount: () => {
                if (window.VueStore) VueStore.absensiTab = "siswa";
                if (window.ModulPresensi) {
                    ModulPresensi.init();
                    ModulPresensi.switchTab("siswa");
                }
                if (window.ModulVue) {
                    ModulVue.mountAbsensiTabs();
                }
            }
        },
        "presensi/tendik": {
            template: "views/presensi/tendik.html",
            title: "Rekap Presensi Guru & Tendik",
            menuId: "absensi",
            onMount: () => {
                if (window.VueStore) VueStore.absensiTab = "tendik";
                if (window.ModulPresensi) {
                    ModulPresensi.init();
                    ModulPresensi.switchTab("tendik");
                }
                if (window.ModulVue) {
                    ModulVue.mountAbsensiTabs();
                }
            }
        },
        "presensi/scan": {
            template: "views/presensi/scan.html",
            title: "Scan Presensi Mandiri (QR & Barcode)",
            menuId: "scan-absensi",
            onMount: () => {
                if (window.ModulPresensi) {
                    ModulPresensi.renderScanView();
                }
            }
        },
        "pengaturan": {
            template: "views/pengaturan/index.html",
            title: "Pengaturan & Backend GAS",
            menuId: "pengaturan",
            onMount: () => {
                App.loadSchoolSettings();
                App.bindBackupControls();
            }
        }
    },

    // Alias untuk Backward Compatibility dengan rute versi sebelumnya
    aliases: {
        "": "beranda",
        "dashboard": "beranda",
        "berkas": "berkas-siswa",
        "surat": "surat/srikandi",
        "cetak": "surat/cetak",
        "absensi": "presensi/harian",
        "scan-absensi": "presensi/scan",
        "presensi": "presensi/harian"
    },

    init() {
        window.addEventListener("hashchange", () => this.handleHashChange());
        console.log("[Router] Client-side Hash Router siap dioperasikan.");
    },

    parseHash() {
        let hash = window.location.hash || "";
        // Bersihkan tanda '#' dan '/' di awal secara aman
        // Contoh: "#/beranda" -> "beranda", "#beranda" -> "beranda", "/beranda" -> "beranda"
        hash = hash.replace(/^[#/]+/, "");

        // Pisahkan query parameter jika ada (misal: berkas-siswa?kelas=5)
        const [pathPart, queryPart] = hash.split("?");
        const cleanPath = (pathPart || "").trim();
        const params = {};

        if (queryPart) {
            const searchParams = new URLSearchParams(queryPart);
            searchParams.forEach((val, key) => {
                params[key] = val;
            });
        }

        return { path: cleanPath, params };
    },

    resolveRoute(rawPath) {
        let path = (rawPath || "").trim();
        if (this.aliases[path] !== undefined) {
            path = this.aliases[path];
        }
        return path || "beranda";
    },

    async handleHashChange() {
        const { path, params } = this.parseHash();
        const resolved = this.resolveRoute(path);
        await this.navigate(resolved, params, false);
    },

    async navigate(routePath, params = {}, updateHash = true) {
        if (this.isNavigating) return;
        this.isNavigating = true;

        try {
            const resolvedPath = this.resolveRoute(routePath);
            const routeConfig = this.routes[resolvedPath];

            if (!routeConfig) {
                console.warn(`[Router] Rute '${routePath}' tidak ditemukan. Mengarahkan ke beranda.`);
                this.isNavigating = false;
                return this.navigate("beranda", {}, updateHash);
            }

            // Periksa Hak Akses (RBAC)
            const menuId = routeConfig.menuId || resolvedPath;
            if (window.Auth && !Auth.canRoute(menuId)) {
                if (window.App && App.showToast) {
                    App.showToast("Anda tidak memiliki hak akses untuk membuka halaman ini.", "warning");
                }
                this.isNavigating = false;
                return;
            }

            if (updateHash) {
                const targetHash = "#/" + resolvedPath;
                if (window.location.hash !== targetHash) {
                    window.location.hash = targetHash;
                }
            }

            // Ambil kontainer utama
            const appContainer = document.getElementById("app");
            if (!appContainer) {
                console.error("[Router] Elemen <main id='app'> tidak ditemukan di DOM!");
                this.isNavigating = false;
                return;
            }

            // Indikator loading halus jika template belum di-cache
            if (!this.templateCache.has(routeConfig.template)) {
                appContainer.innerHTML = `
                    <div class="flex items-center justify-center min-h-[320px] text-slate-400">
                        <div class="text-center space-y-2">
                            <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600"></i>
                            <p class="text-xs font-medium">Memuat modul ${routeConfig.title}...</p>
                        </div>
                    </div>
                `;
            }

            // Fetch template HTML dengan in-memory caching (<300ms)
            const html = await this.loadTemplate(routeConfig.template);
            appContainer.innerHTML = html;
            appContainer.classList.add("animate-fade-in");

            // Update state aplikasi & sidebar
            this.currentRoute = resolvedPath;
            this.currentPath = routeConfig.template;
            App.currentRoute = menuId;

            if (window.VueStore) {
                VueStore.currentRoute = menuId;
                VueStore.refresh();
            }
            if (window.ModulVue) {
                ModulVue.applyRoleNavVisibility();
            }

            // Eksekusi Lifecycle onMount
            if (typeof routeConfig.onMount === "function") {
                routeConfig.onMount(params);
            }

            // Jalankan callbacks pasca navigasi (misal buka modal tambah)
            while (this._postNavCallbacks.length > 0) {
                const cb = this._postNavCallbacks.shift();
                try {
                    cb();
                } catch (e) {
                    console.error("[Router] Post-nav callback error:", e);
                }
            }

            // Tutup sidebar mobile jika sedang terbuka
            const sidebar = document.getElementById("main-sidebar");
            const overlay = document.getElementById("sidebar-overlay");
            if (sidebar && overlay && window.innerWidth < 1024) {
                sidebar.classList.add("-translate-x-full");
                overlay.classList.add("hidden");
            }

            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            console.error("[Router] Kesalahan saat memuat view:", err);
            const appContainer = document.getElementById("app");
            if (appContainer) {
                appContainer.innerHTML = `
                    <div class="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-2 text-center">
                        <i class="fa-solid fa-triangle-exclamation text-2xl text-rose-500"></i>
                        <h3 class="font-bold text-sm">Gagal Memuat Halaman</h3>
                        <p class="text-xs text-rose-600">${err.message || 'Terjadi kesalahan saat mengambil berkas tampilan.'}</p>
                        <button onclick="Router.navigate('beranda')" class="mt-2 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700">
                            Kembali ke Beranda
                        </button>
                    </div>
                `;
            }
        } finally {
            this.isNavigating = false;
        }
    },

    async loadTemplate(templatePath) {
        if (this.templateCache.has(templatePath)) {
            return this.templateCache.get(templatePath);
        }

        const res = await fetch(templatePath, { cache: "no-cache" });
        if (!res.ok) {
            throw new Error(`Gagal memuat template: ${templatePath} (Status ${res.status})`);
        }
        const text = await res.text();
        this.templateCache.set(templatePath, text);
        return text;
    },

    // Jalankan callback segera setelah view tujuan selesai di-mount
    afterNextRoute(cb) {
        if (typeof cb === "function") {
            this._postNavCallbacks.push(cb);
        }
    }
};

window.Router = Router;
