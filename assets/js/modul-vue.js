/* ==========================================================================
   SIM-TAS-SD: MODUL VUE 3 CDN (MODULAR REACTIVE UI LAYER)
   Dijalankan via CDN tanpa build step/npm dependency (Zero Config Reactive UI)
   Fitur:
   1. Sidebar Navigation Menu Modular (Role-based filtering, auto-active route, dynamic labels)
   2. Sub-tab Navigasi Modul Surat SRIKANDI (Surat Keluar vs Surat Masuk)
   3. Sub-tab Navigasi Modul Presensi & Absensi (Presensi Harian, Rekap Siswa, Rekap Tendik, QR)
   4. Sub-tab Mode Modul Cetak Surat (Nomor Terbit, Nomor Baru, Ketik Manual)
   5. Dropdown Aksi Cepat Dinamis berbasis Role Akun
   6. Kartu Profil Akun Reaktif di Sidebar
   ========================================================================== */

const ModulVue = {
    isReady: false,
    store: null,
    apps: {},

    init() {
        if (typeof Vue === "undefined") {
            console.warn("[ModulVue] Vue 3 CDN belum dimuat di halaman.");
            return;
        }

        const { reactive } = Vue;

        // 1. Reactive Store Tunggal untuk Sinkronisasi State Seluruh Komponen Vue
        this.store = reactive({
            currentRoute: App.currentRoute || "dashboard",
            role: Auth.role() || "admin",
            user: Auth.user() || null,
            isCloud: ApiClient.isCloudActive(),
            absensiTab: (window.ModulPresensi && ModulPresensi.tab) || "harian",
            suratSubTab: (window.ModulSurat && ModulSurat.activeSubTab) || "keluar",
            cetakNomorMode: (window.ModulCetak && ModulCetak.nomorMode) || "terbit"
        });

        window.VueStore = this.store;
        window.VueStore.refresh = () => {
            this.store.currentRoute = App.currentRoute || "dashboard";
            this.store.role = Auth.role() || "admin";
            this.store.user = Auth.user() || null;
            this.store.isCloud = ApiClient.isCloudActive();
            if (window.ModulPresensi) this.store.absensiTab = ModulPresensi.tab;
            if (window.ModulSurat) this.store.suratSubTab = ModulSurat.activeSubTab;
            if (window.ModulCetak) this.store.cetakNomorMode = ModulCetak.nomorMode;
        };

        // 2. Pasang Komponen Modular ke Mount Points di DOM
        this.mountSidebarNav();
        this.mountSidebarProfile();
        this.mountQuickActions();
        this.mountSuratTabs();
        this.mountAbsensiTabs();
        this.mountCetakTabs();

        this.isReady = true;
        console.log("[ModulVue] Seluruh Menu dan Tab Modular Vue 3 Siap Beroperasi.");
    },

    applyRoleNavVisibility() {
        if (window.VueStore && window.VueStore.refresh) {
            window.VueStore.refresh();
        }
    },

    // -------------------------------------------------------------------------
    // 1. MODULAR SIDEBAR NAVIGATION
    // -------------------------------------------------------------------------
    mountSidebarNav() {
        const el = document.getElementById("vue-sidebar-nav");
        if (!el || this.apps.sidebarNav) return;

        const { createApp, computed } = Vue;
        const store = this.store;

        const app = createApp({
            template: `
                <!-- Menu Utama -->
                <div class="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Menu Utama</div>

                <a v-for="item in mainMenuItems" :key="item.id" :href="'#' + item.route" :data-route="item.route"
                    @click.prevent="navigate(item.route)"
                    :class="['nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition cursor-pointer', currentRoute === item.route ? 'active bg-blue-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100']">
                    <i :class="['fa-solid', item.icon, item.iconColor || '', 'text-sm w-5 text-center']"></i>
                    <span>{{ getMenuLabel(item) }}</span>
                    <span v-if="item.badge"
                        :class="['ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full', item.badgeColor || 'bg-slate-100 text-slate-700']">
                        {{ item.badge }}
                    </span>
                </a>

                <!-- Integrasi & Pengaturan -->
                <div v-if="settingsMenuItems.length > 0"
                    class="pt-4 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Integrasi & Pengaturan
                </div>

                <template v-for="item in settingsMenuItems" :key="item.id">
                    <a v-if="item.isExternal" :href="item.url" target="_blank"
                        class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition">
                        <i :class="['fa-solid', item.icon, item.iconColor || '', 'text-sm w-5 text-center']"></i>
                        <span>{{ item.label }}</span>
                        <i class="fa-solid fa-arrow-up-right-from-square text-[10px] ml-auto text-slate-400"></i>
                    </a>
                    <a v-else :href="'#' + item.route" :data-route="item.route" @click.prevent="navigate(item.route)"
                        :class="['nav-link flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition cursor-pointer', currentRoute === item.route ? 'active bg-blue-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100']">
                        <i :class="['fa-solid', item.icon, item.iconColor || '', 'text-sm w-5 text-center']"></i>
                        <span>{{ item.label }}</span>
                    </a>
                </template>
            `,
            setup() {
                const currentRoute = computed(() => store.currentRoute);
                const role = computed(() => store.role);
                const guruInfo = computed(() => (Auth.getGuruInfo ? Auth.getGuruInfo() : null));

                const allMenuItems = [
                    { id: "dashboard", route: "dashboard", label: "Beranda & Ringkasan", icon: "fa-gauge-high", section: "main" },
                    { id: "tendik", route: "tendik", label: "Data Guru & Tendik", icon: "fa-chalkboard-user", badge: "GTK", badgeColor: "bg-indigo-100 text-indigo-800", section: "main" },
                    { id: "jadwal", route: "jadwal", label: "Jadwal Pelajaran", icon: "fa-calendar-days", badge: "Jadwal", badgeColor: "bg-emerald-100 text-emerald-800", section: "main" },
                    { id: "berkas", route: "berkas", label: "Bangkas Digital Siswa", icon: "fa-folder-closed", badge: "M1", badgeColor: "bg-blue-100 text-blue-800", section: "main" },
                    { id: "pip", route: "pip", label: "Program PIP Siswa", icon: "fa-hand-holding-dollar", badge: "PIP", badgeColor: "bg-amber-100 text-amber-800", section: "main" },
                    { id: "surat", route: "surat", label: "Penomoran & Surat", icon: "fa-envelopes-bulk", badge: "SRIKANDI", badgeColor: "bg-purple-100 text-purple-800", section: "main" },
                    { id: "cetak", route: "cetak", label: "Cetak Surat Otomatis", icon: "fa-file-invoice", badge: "<5 Detik", badgeColor: "bg-teal-100 text-teal-800", section: "main" },
                    { id: "scan-absensi", route: "scan-absensi", label: "Scan Absensi (Datang/Pulang)", icon: "fa-qrcode", iconColor: "text-indigo-600", badge: "Scan QR", badgeColor: "bg-indigo-100 text-indigo-800", section: "main" },
                    { id: "absensi", route: "absensi", label: "Presensi & Absensi", icon: "fa-clipboard-user", badge: "M4", badgeColor: "bg-indigo-100 text-indigo-800", section: "main" },
                    { id: "pengaturan", route: "pengaturan", label: "Pengaturan & Backend GAS", icon: "fa-sliders", section: "settings" },
                    { id: "permohonan", url: "permohonan.html", label: "Portal Permohonan Ortu", icon: "fa-paper-plane", iconColor: "text-blue-600", isExternal: true, section: "settings" },
                    { id: "verifikasi", url: "verifikasi.html", label: "Portal Verifikasi QR", icon: "fa-shield-halved", iconColor: "text-emerald-600", isExternal: true, section: "settings" }
                ];

                const canAccessRoute = (route) => {
                    const currentRole = role.value || (Auth.role && Auth.role()) || "admin";
                    if (typeof ACL !== "undefined" && ACL.ROUTES && ACL.ROUTES[route]) {
                        return ACL.check(ACL.ROUTES[route], currentRole);
                    }
                    return Auth.canRoute ? Auth.canRoute(route) : true;
                };

                const mainMenuItems = computed(() => {
                    return allMenuItems.filter(item => item.section === "main" && canAccessRoute(item.route));
                });

                const settingsMenuItems = computed(() => {
                    return allMenuItems.filter(item => {
                        if (item.section !== "settings") return false;
                        if (item.isExternal) return true;
                        return canAccessRoute(item.route);
                    });
                });

                const getMenuLabel = (item) => {
                    const currentRole = role.value || (Auth.role && Auth.role());
                    if (item.route === "absensi") {
                        if (currentRole === "penjaga" || currentRole === "perpustakaan") {
                            return "Rekap Absensi Saya";
                        }
                        if (currentRole === "guru") {
                            const g = Auth.getGuruInfo ? Auth.getGuruInfo() : null;
                            if (g && g.isGuruKelas) {
                                const k = String(g.kelas || "1").replace(/kelas\s*/i, "").trim();
                                return `Absensi Kelas ${k}`;
                            }
                            if (g && g.isGuruMapel) {
                                if (g.kelas && g.kelas !== "Semua") {
                                    const k = String(g.kelas).replace(/kelas\s*/i, "").trim();
                                    return `Absensi Kelas ${k}`;
                                }
                                return `Absensi Siswa (Mapel)`;
                            }
                        }
                    }
                    return item.label;
                };

                const navigate = (route) => {
                    App.navigateTo(route);
                };

                return {
                    currentRoute,
                    mainMenuItems,
                    settingsMenuItems,
                    getMenuLabel,
                    navigate
                };
            }
        });

        this.apps.sidebarNav = app.mount(el);
    },

    // -------------------------------------------------------------------------
    // 2. MODULAR SIDEBAR PROFILE & ACCOUNT CARD
    // -------------------------------------------------------------------------
    mountSidebarProfile() {
        const el = document.getElementById("vue-sidebar-profile");
        if (!el || this.apps.sidebarProfile) return;

        const { createApp, computed } = Vue;
        const store = this.store;

        const app = createApp({
            template: `
                <div class="flex items-center gap-3">
                    <div id="sidebar-user-avatar-wrap"
                        class="w-9 h-9 rounded-full overflow-hidden bg-blue-900 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0 ring-1 ring-blue-500/30">
                        <img v-if="userPhoto" :src="userPhoto" alt="Foto Profil" class="w-full h-full object-cover">
                        <span v-else>{{ userInitials }}</span>
                    </div>
                    <div class="flex-grow min-w-0">
                        <div class="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{{ userName }}</div>
                        <div class="text-[10px] text-blue-700 dark:text-blue-400 font-semibold truncate">{{ userRoleLabel }}</div>
                    </div>
                    <button type="button" @click="logout" title="Keluar dari sistem"
                        class="text-slate-400 hover:text-rose-600 transition p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 flex-shrink-0">
                        <i class="fa-solid fa-right-from-bracket text-xs"></i>
                    </button>
                </div>
                <!-- Admin User Management Button -->
                <div v-if="role === 'admin'" class="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <button type="button" @click="openUserModal"
                        class="w-full py-1.5 px-2 bg-gradient-to-r from-blue-900 to-indigo-800 hover:from-blue-800 hover:to-indigo-700 text-white text-[11px] font-bold rounded-xl transition inline-flex items-center justify-center gap-1.5 shadow-xs">
                        <i class="fa-solid fa-user-plus text-amber-300"></i> Kelola / Tambah Akun
                    </button>
                </div>
            `,
            setup() {
                const role = computed(() => store.role);
                const user = computed(() => store.user);

                const matchedTendik = computed(() => {
                    const u = user.value;
                    if (!u) return null;
                    let tendikList = [];
                    try {
                        tendikList = (typeof DataStore !== "undefined" && DataStore.getTendik) ? DataStore.getTendik() : [];
                    } catch (e) {}

                    const uClean = (typeof Auth !== "undefined" && Auth.cleanPersonName) ? Auth.cleanPersonName(u.nama) : (u.nama || "").toLowerCase();
                    const uNipClean = (typeof Util !== "undefined" && Util.cleanId) ? Util.cleanId(u.nip || "") : (u.nip || "").replace(/\D/g, "");

                    return tendikList.find(t => {
                        const tNipClean = (typeof Util !== "undefined" && Util.cleanId) ? Util.cleanId(t.nip || "") : (t.nip || "").replace(/\D/g, "");
                        if (uNipClean && tNipClean && (tNipClean === uNipClean || tNipClean.includes(uNipClean) || uNipClean.includes(tNipClean))) return true;
                        const tClean = (typeof Auth !== "undefined" && Auth.cleanPersonName) ? Auth.cleanPersonName(t.nama) : (t.nama || "").toLowerCase();
                        if (uClean && tClean && (uClean.includes(tClean) || tClean.includes(uClean))) return true;
                        if (u.nama && t.nama && (u.nama.toLowerCase().includes(t.nama.toLowerCase()) || t.nama.toLowerCase().includes(u.nama.toLowerCase()))) return true;
                        return false;
                    }) || null;
                });

                const userPhoto = computed(() => {
                    return matchedTendik.value?.foto || user.value?.foto || "";
                });

                const userName = computed(() => {
                    return matchedTendik.value?.nama || user.value?.nama || "Pengguna";
                });

                const userInitials = computed(() => {
                    const name = userName.value;
                    const parts = name.trim().split(/\s+/);
                    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                    return name.substring(0, 2).toUpperCase();
                });

                const userRoleLabel = computed(() => {
                    const r = role.value;
                    if (r === "admin") return "Administrator";
                    if (r === "perpustakaan") return "Tenaga Perpustakaan";
                    if (r === "penjaga") return "Penjaga Sekolah";
                    if (r === "kepsek") return "Kepala Sekolah";
                    if (r === "guru") {
                        const g = Auth.getGuruInfo ? Auth.getGuruInfo() : null;
                        if (g?.isGuruKelas) return `Guru Kelas ${g.kelas}`;
                        if (g?.isGuruMapel) return `Guru Mapel (${g.namaMapel || 'PJOK/PAI'})`;
                        return "Guru";
                    }
                    return r || "Pengguna";
                });

                const logout = () => {
                    Auth.logout();
                };

                const openUserModal = () => {
                    Auth.openUserModal();
                };

                return {
                    role,
                    userPhoto,
                    userInitials,
                    userName,
                    userRoleLabel,
                    logout,
                    openUserModal
                };
            }
        });

        this.apps.sidebarProfile = app.mount(el);
    },

    // -------------------------------------------------------------------------
    // 3. MODULAR TOP BAR / HERO QUICK ACTIONS
    // -------------------------------------------------------------------------
    mountQuickActions() {
        const el = document.getElementById("vue-quick-actions");
        if (!el || this.apps.quickActions) return;

        const { createApp, computed } = Vue;
        const store = this.store;

        const app = createApp({
            setup() {
                const role = computed(() => store.role);

                const actions = computed(() => {
                    const r = role.value;
                    if (r === "penjaga") {
                        return [
                            { label: "Scan Absensi Datang/Pulang", icon: "fa-qrcode", color: "text-emerald-300", action: () => App.navigateTo("scan-absensi") },
                            { label: "Rekap Absensi Saya", icon: "fa-clipboard-user", color: "text-indigo-300", action: () => { App.navigateTo("absensi"); if (window.ModulPresensi) ModulPresensi.switchTab("tendik"); } }
                        ];
                    }
                    if (r === "perpustakaan") {
                        return [
                            { label: "Bangkas Digital Siswa", icon: "fa-folder-closed", color: "text-amber-300", action: () => App.navigateTo("berkas") },
                            { label: "Program PIP Siswa", icon: "fa-hand-holding-dollar", color: "text-sky-300", action: () => App.navigateTo("pip") },
                            { label: "Scan Absensi Datang/Pulang", icon: "fa-qrcode", color: "text-emerald-300", action: () => App.navigateTo("scan-absensi") },
                            { label: "Rekap Absensi Saya", icon: "fa-clipboard-user", color: "text-indigo-300", action: () => { App.navigateTo("absensi"); if (window.ModulPresensi) ModulPresensi.switchTab("tendik"); } }
                        ];
                    }
                    if (r === "guru") {
                        const g = Auth.getGuruInfo ? Auth.getGuruInfo() : null;
                        const kelasLabel = g && g.isGuruKelas ? ` (Kelas ${g.kelas})` : "";
                        return [
                            { label: `Input Presensi Hari Ini${kelasLabel}`, icon: "fa-clipboard-check", color: "text-amber-300", action: () => { App.navigateTo("absensi"); if (window.ModulPresensi) ModulPresensi.switchTab("harian"); } },
                            { label: "Rekap Absensi Bulanan", icon: "fa-table-cells", color: "text-sky-300", action: () => { App.navigateTo("absensi"); if (window.ModulPresensi) ModulPresensi.switchTab("siswa"); } },
                            { label: "Presensi Datang / Pulang Saya", icon: "fa-qrcode", color: "text-emerald-300", action: () => App.navigateTo("scan-absensi") },
                            { label: `Berkas Siswa${kelasLabel}`, icon: "fa-folder-closed", color: "text-amber-300", action: () => App.navigateTo("berkas") }
                        ];
                    }
                    if (r === "kepsek") {
                        return [
                            { label: "Data Guru & Tendik", icon: "fa-chalkboard-user", color: "text-sky-300", action: () => App.navigateTo("tendik") },
                            { label: "Rekap Presensi Guru & Tendik", icon: "fa-clipboard-user", color: "text-indigo-300", action: () => { App.navigateTo("absensi"); if (window.ModulPresensi) ModulPresensi.switchTab("tendik"); } },
                            { label: "Rekap Absensi Siswa", icon: "fa-table-cells", color: "text-sky-300", action: () => { App.navigateTo("absensi"); if (window.ModulPresensi) ModulPresensi.switchTab("siswa"); } },
                            { label: "Buku Register Surat SRIKANDI", icon: "fa-envelopes-bulk", color: "text-amber-300", action: () => App.navigateTo("surat") },
                            { label: "Cetak Surat Keterangan", icon: "fa-print", color: "text-teal-300", action: () => App.navigateTo("cetak") }
                        ];
                    }
                    // Administrator default
                    return [
                        { label: "Data Guru & Tendik", icon: "fa-chalkboard-user", color: "text-purple-300", action: () => App.navigateTo("tendik") },
                        { label: "Tambah Siswa Baru", icon: "fa-user-plus", color: "text-sky-300", action: () => { App.navigateTo("berkas"); if (window.ModulBerkas) ModulBerkas.openAddModal(); } },
                        { label: "Terbitkan Nomor Surat", icon: "fa-paper-plane", color: "text-emerald-300", action: () => { App.navigateTo("surat"); if (window.ModulSurat) ModulSurat.openModalSuratKeluar(); } },
                        { label: "Cetak Surat Keterangan", icon: "fa-file-invoice", color: "text-teal-300", action: () => App.navigateTo("cetak") },
                        { label: "Input Presensi Harian", icon: "fa-clipboard-check", color: "text-amber-300", action: () => App.navigateTo("absensi") },
                        { label: "Scan Absensi Datang/Pulang", icon: "fa-qrcode", color: "text-indigo-300", action: () => App.navigateTo("scan-absensi") }
                    ];
                });

                const run = (act) => {
                    if (act && typeof act.action === "function") act.action();
                };

                return { actions, run };
            }
        });

        this.apps.quickActions = app.mount(el);
    },

    // -------------------------------------------------------------------------
    // 4. MODULAR SUB-TABS: MODUL PRESENSI & ABSENSI
    // -------------------------------------------------------------------------
    mountAbsensiTabs() {
        const el = document.getElementById("vue-absensi-tabs");
        if (!el || this.apps.absensiTabs) return;

        const { createApp, computed } = Vue;
        const store = this.store;

        const app = createApp({
            setup() {
                const currentTab = computed(() => store.absensiTab);
                const role = computed(() => store.role);

                const allTabs = [
                    { id: "harian", label: "Presensi Harian", icon: "fa-clipboard-check", need: "getAbsensi" },
                    { id: "tendik", label: "Rekap Guru & Tendik", icon: "fa-table-list", need: "getAbsensiTendikBulan" },
                    { id: "siswa", label: "Rekap Siswa Bulanan", icon: "fa-table-cells", need: "getAbsensiSiswaBulan" },
                    { id: "qr", label: "Kartu ID QR", icon: "fa-id-card", need: "saveTendik" }
                ];

                const visibleTabs = computed(() => {
                    const r = role.value;
                    const isGuru = r === "guru";
                    const isRestrictedStaff = r === "penjaga" || r === "perpustakaan";
                    return allTabs.filter(t => {
                        if (!Auth.canDo(t.need)) return false;
                        if (isRestrictedStaff) {
                            return t.id === "tendik";
                        }
                        if (isGuru && t.id === "qr") return false;
                        return true;
                    }).map(t => {
                        let label = t.label;
                        if ((isGuru || isRestrictedStaff) && t.id === "tendik") label = "Rekap Absensi Saya";
                        return { ...t, label };
                    });
                });

                const switchTab = (tabId) => {
                    store.absensiTab = tabId;
                    if (window.ModulPresensi) ModulPresensi.switchTab(tabId);
                };

                return {
                    currentTab,
                    visibleTabs,
                    switchTab
                };
            }
        });

        this.apps.absensiTabs = app.mount(el);
    },

    // -------------------------------------------------------------------------
    // 5. MODULAR SUB-TABS: MODUL SURAT SRIKANDI
    // -------------------------------------------------------------------------
    mountSuratTabs() {
        // Sub-tab Surat (Surat Keluar, Surat Masuk, Pengajuan Ortu) dikelola secara native & reaktif oleh ModulSurat
        if (window.ModulSurat && this.store) {
            this.store.suratSubTab = ModulSurat.activeSubTab || "keluar";
        }
    },

    // -------------------------------------------------------------------------
    // 6. MODULAR SUB-TABS: MODUL CETAK SURAT
    // -------------------------------------------------------------------------
    mountCetakTabs() {
        // Tombol mode nomor surat dikelola secara native dan reaktif di ModulCetak
        if (window.ModulCetak && this.store) {
            this.store.cetakNomorMode = ModulCetak.nomorMode || "terbit";
        }
    }
};

// Auto-initialize when DOM ready
document.addEventListener("DOMContentLoaded", () => {
    if (typeof Vue !== "undefined" && !ModulVue.isReady) {
        ModulVue.init();
    }
});
