/* ==========================================================================
   SIM-TAS-SD: AUTENTIKASI & HAK AKSES BERBASIS PERAN (ROLE-BASED ACCESS CONTROL)

   Database login  : Supabase Auth (email + kata sandi) + tabel `profiles` (peran & status akun)
   Data aplikasi   : Google Sheets / Drive via Google Apps Script (token Supabase divalidasi
                     ulang di server; peran dicek ulang di server -> tidak bisa dibypass dari browser)
   Tanpa SDK       : memakai REST Supabase langsung (ringan, tanpa library tambahan)
   Penyimpanan sesi: sessionStorage (hilang saat tab ditutup), bukan localStorage

   Mode Demo (SUPABASE_URL kosong): login lokal untuk uji coba. Tidak terhubung ke cloud.
   ========================================================================== */

const Auth = {
    SESSION_KEY: "sim_tas_session",
    FLASH_KEY: "sim_tas_flash",
    FAIL_KEY: "sim_tas_login_fail",
    session: null,
    _idleTimer: null,
    _started: false,

    // Akun contoh (Bisa dipakai baik di Mode Demo maupun pengujian cepat)
    DEMO_USERS: {
        admin: { pw: "admin123", nama: "Administrator (Demo)", role: "admin" },
        kepsek: { pw: "kepsek123", nama: "Kepala Sekolah (Demo)", role: "kepsek" },
        perpustakaan: { pw: "perpus123", nama: "Tenaga Perpustakaan (Demo)", role: "perpustakaan" },
        penjaga: { pw: "penjaga123", nama: "Penjaga Sekolah (Demo)", role: "penjaga" },
        guru: { pw: "guru123", nama: "Guru Kelas 1 (Demo)", role: "guru", tipeGuru: "kelas", kelasGuru: "1" },
        guru_mapel: { pw: "guru123", nama: "Guru Mapel PJOK (Demo)", role: "guru", tipeGuru: "mapel", namaMapel: "PJOK", kelasGuru: "Semua" },
        guru_pjok: { pw: "guru123", nama: "Guru Mapel PJOK (Demo)", role: "guru", tipeGuru: "mapel", namaMapel: "PJOK", kelasGuru: "Semua" },
        guru_pai: { pw: "guru123", nama: "Guru Mapel PAI (Demo)", role: "guru", tipeGuru: "mapel", namaMapel: "PAI", kelasGuru: "Semua" }
    },

    cfg() {
        let stored = {};
        try {
            if (typeof DataStore !== "undefined" && DataStore.getConfig) {
                stored = DataStore.getConfig() || {};
            }
        } catch (e) {}
        const winCfg = window.SIMTAS_CONFIG || {};
        return {
            SUPABASE_URL: stored.supabaseUrl || winCfg.SUPABASE_URL || "",
            SUPABASE_ANON_KEY: stored.supabaseAnonKey || winCfg.SUPABASE_ANON_KEY || "",
            GAS_API_URL: stored.gasApiUrl || winCfg.GAS_API_URL || "",
            IDLE_TIMEOUT_MENIT: winCfg.IDLE_TIMEOUT_MENIT || 30
        };
    },
    usesSupabase() {
        let stored = {};
        try {
            if (typeof DataStore !== "undefined" && DataStore.getConfig) {
                stored = DataStore.getConfig() || {};
            }
        } catch (e) {}
        // Jika mode cloud dimatikan oleh user (isCloudMode === false), sistem masuk ke mode demo lokal
        if (stored.isCloudMode === false) return false;
        const c = this.cfg();
        return !!(c.SUPABASE_URL && c.SUPABASE_ANON_KEY);
    },
    user() { return this.session ? this.session.user : null; },
    role() { return this.session && this.session.user ? this.session.user.role : null; },
    isAdmin() { return this.role() === "admin"; },

    canDo(action) { return !!this.role() && ACL.check(ACL.ACTIONS[action], this.role()); },
    canRoute(route) { return !!this.role() && ACL.check(ACL.ROUTES[route], this.role()); },
    defaultRoute() {
        return this.canRoute("dashboard") ? "dashboard" : (this.canRoute("absensi") ? "absensi" : "scan-absensi");
    },

    USER_MAPPINGS_KEY: "sim_tas_user_mappings",
    CUSTOM_USERS_KEY: "sim_tas_custom_users",

    getUserMapping(idOrEmail) {
        if (!idOrEmail) return null;
        try {
            const map = JSON.parse(localStorage.getItem(this.USER_MAPPINGS_KEY)) || {};
            const key = String(idOrEmail).toLowerCase().trim();
            const prefix = key.split("@")[0];
            return map[key] || map[prefix] || null;
        } catch (e) { return null; }
    },

    saveUserMapping(idOrEmail, data) {
        if (!idOrEmail) return;
        try {
            const map = JSON.parse(localStorage.getItem(this.USER_MAPPINGS_KEY)) || {};
            const key = String(idOrEmail).toLowerCase().trim();
            const prefix = key.split("@")[0];
            map[key] = { ...(map[key] || {}), ...data };
            map[prefix] = map[key];
            localStorage.setItem(this.USER_MAPPINGS_KEY, JSON.stringify(map));
        } catch (e) {}
    },

    cleanPersonName(name) {
        if (!name) return "";
        return String(name)
            .toLowerCase()
            .replace(/\b(s\.pd\.sd|s\.pd|m\.pd|s\.kom|s\.ag|s\.pd\.i|s\.sos|drs|dra|h|hj|prof|dr)\b/gi, "")
            .replace(/[^a-z0-9]/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
    },

    // Deteksi apakah akun guru adalah Guru Kelas (spesifik kelas) atau Guru Mapel (semua kelas)
    getGuruInfo() {
        if (this.role() !== "guru") return null;
        const u = this.user() || {};
        const mapping = this.getUserMapping(u.email || u.id) || {};

        let tendikList = [];
        try { tendikList = (typeof DataStore !== "undefined" && DataStore.getTendik) ? DataStore.getTendik() : []; } catch (e) {}

        const uClean = this.cleanPersonName(u.nama);
        const uEmailPrefix = String(u.email || "").split("@")[0].toLowerCase();
        const uNipClean = Util.cleanId(u.nip || uEmailPrefix);

        // Cari tendik yang cocok dengan NIP atau Nama Bersih (mengabaikan gelar akademik)
        const t = tendikList.find(item => {
            const tNipClean = Util.cleanId(item.nip);
            if (uNipClean && tNipClean && (tNipClean === uNipClean || tNipClean.includes(uNipClean) || uNipClean.includes(tNipClean))) return true;
            const tClean = this.cleanPersonName(item.nama);
            if (uClean && tClean && (uClean.includes(tClean) || tClean.includes(uClean))) return true;
            if (u.nama && item.nama && (u.nama.toLowerCase().includes(item.nama.toLowerCase()) || item.nama.toLowerCase().includes(u.nama.toLowerCase()))) return true;
            return false;
        });

        // PRIORITAS UTAMA: Mapping eksplisit saat akun dibuat / diedit
        const explicitTipe = u.tipeGuru || mapping.tipeGuru || mapping.tipe_guru || "";
        const explicitKelas = u.kelasGuru || mapping.kelasGuru || mapping.kelas_guru || "";

        const jabatan = (t?.jabatan || "").trim();
        const m = jabatan.match(/kelas\s*(\d+[a-zA-Z]?)/i);

        // Deteksi bidang mata pelajaran jika guru mapel
        let namaMapel = u.namaMapel || mapping.namaMapel || mapping.mapel_guru || "";
        const userOrMapRole = u.rawRole || u.role || mapping.rawRole || mapping.role || "";
        if (!namaMapel) {
            if (userOrMapRole === "guru_pjok") namaMapel = "PJOK";
            else if (userOrMapRole === "guru_pai") namaMapel = "PAI";
            else if (userOrMapRole === "guru_inggris") namaMapel = "Bahasa Inggris";
            else if (userOrMapRole === "guru_seni") namaMapel = "Seni Budaya";
        }
        const jabLow = (jabatan + " " + (u.nama || "")).toLowerCase();
        if (!namaMapel) {
            if (jabLow.includes("pjok") || jabLow.includes("penjas") || jabLow.includes("olahraga")) namaMapel = "PJOK";
            else if (jabLow.includes("pai") || jabLow.includes("agama") || jabLow.includes("budi pekerti")) namaMapel = "PAI";
            else if (jabLow.includes("inggris")) namaMapel = "Bahasa Inggris";
            else if (jabLow.includes("seni") || jabLow.includes("sbk")) namaMapel = "Seni Budaya";
            else if (jabLow.includes("mapel")) namaMapel = "Mata Pelajaran";
        }

        let isKelas = false;
        let isMapel = false;
        let kelas = "";

        if (explicitTipe === "mapel") {
            isMapel = true;
            isKelas = false;
            kelas = explicitKelas || "Semua";
        } else if (explicitTipe === "kelas") {
            isKelas = true;
            isMapel = false;
            kelas = explicitKelas ? (String(explicitKelas).replace(/kelas\s*/i, "").trim() || explicitKelas) : (m ? m[1] : "1");
        } else {
            // Jika belum ada mapping eksplisit
            if (explicitKelas && explicitKelas !== "Semua") {
                isKelas = true;
                isMapel = false;
                kelas = String(explicitKelas).replace(/kelas\s*/i, "").trim() || explicitKelas;
            } else if (explicitKelas === "Semua" || !!namaMapel || (jabLow.includes("mapel") && !m)) {
                isMapel = true;
                isKelas = false;
                kelas = "Semua";
            } else if (m) {
                isKelas = true;
                isMapel = false;
                kelas = m[1];
            } else {
                isKelas = true;
                isMapel = false;
                kelas = "1";
            }
        }

        const displayJabatan = isKelas 
            ? `Guru Kelas ${kelas}` 
            : (namaMapel ? `Guru Mapel ${namaMapel}` : (kelas && kelas !== 'Semua' ? `Guru Mapel (Kelas ${kelas})` : 'Guru Mata Pelajaran'));

        return {
            isGuruKelas: isKelas,
            isGuruMapel: isMapel,
            kelas: isMapel && kelas === "Semua" ? "Semua" : (kelas || "1"),
            nama: u.nama || t?.nama || "Guru",
            nip: t?.nip || u.nip || "",
            namaMapel: namaMapel,
            jabatan: displayJabatan
        };
    },

    // ------------------------------------------------------------------ INIT
    async init() {
        // Load custom demo users & mappings
        try {
            const savedUsers = JSON.parse(localStorage.getItem(this.CUSTOM_USERS_KEY)) || {};
            Object.assign(this.DEMO_USERS, savedUsers);
        } catch (e) {}

        this.bindLoginForm();
        this.renderLoginMode();

        const flash = sessionStorage.getItem(this.FLASH_KEY);
        if (flash) { sessionStorage.removeItem(this.FLASH_KEY); this.showError(flash); }

        const saved = this.loadSession();
        if (saved) {
            this.session = saved;
            try {
                if (this.usesSupabase()) {
                    await this.ensureFresh();
                    await this.loadProfile();
                    this.saveSession();
                }
            } catch (e) {
                this.session = null;
                this.clearSession();
            }
        }

        if (this.session) { this.onAuthenticated(); return true; }
        this.showLogin();
        return false;
    },

    // ------------------------------------------------------------ SUPABASE REST
    async sb(path, options = {}, token = null) {
        const c = this.cfg();
        const headers = Object.assign({
            apikey: c.SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        }, token ? { Authorization: `Bearer ${token}` } : {}, options.headers || {});
        return fetch(c.SUPABASE_URL.replace(/\/$/, "") + path, Object.assign({}, options, { headers }));
    },

    async login(identifier, password) {
        this.checkLockout();

        // 1. Cek akun demo terlebih dahulu (memungkinkan pengujian cepat tanpa hambatan jaringan)
        const cleanId = String(identifier).toLowerCase().trim();
        const demoU = this.DEMO_USERS[cleanId];
        if (demoU && demoU.pw === password) {
            this.session = {
                demo: true,
                token: null,
                user: {
                    id: "demo-" + demoU.role,
                    email: identifier,
                    nama: demoU.nama,
                    role: demoU.role,
                    tipeGuru: demoU.tipeGuru || (demoU.role === "guru" ? "kelas" : ""),
                    kelasGuru: demoU.kelasGuru || (demoU.role === "guru" ? "1" : "")
                }
            };
            this.resetFail();
            this.saveSession();
            return;
        }

        if (!this.usesSupabase()) {
            this.registerFail();
            throw new Error("Nama pengguna atau kata sandi salah (Mode Demo).");
        }

        const res = await this.sb("/auth/v1/token?grant_type=password", {
            method: "POST",
            body: JSON.stringify({ email: String(identifier).trim(), password })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.access_token) {
            this.registerFail();
            throw new Error("Email atau kata sandi salah.");
        }

        this.session = {
            token: j.access_token,
            refresh: j.refresh_token,
            exp: Date.now() + (j.expires_in || 3600) * 1000,
            user: { id: j.user.id, email: j.user.email }
        };

        try {
            await this.loadProfile();
        } catch (e) {
            await this.sb("/auth/v1/logout", { method: "POST" }, j.access_token).catch(() => { });
            this.session = null;
            throw e;
        }
        this.resetFail();
        this.saveSession();
    },

    async loadProfile() {
        const uid = this.session.user.id;
        let res = await this.sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=nama,role,aktif,tipe_guru,kelas_guru`, {}, this.session.token);
        if (!res.ok) {
            // Fallback jika database Supabase belum menjalankan migrasi kolom tipe_guru & kelas_guru
            res = await this.sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=nama,role,aktif`, {}, this.session.token);
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const detail = err.message || err.error || `HTTP ${res.status}`;
            console.error("[Auth] Gagal membaca profil:", res.status, err);
            throw new Error(`Gagal membaca profil pengguna (${detail}). Silakan jalankan ulang schema.sql terbaru di SQL Editor Supabase.`);
        }
        const rows = await res.json();
        const p = rows && rows[0];
        if (!p) throw new Error("Profil pengguna belum tersedia. Hubungi administrator.");
        if (!p.aktif) throw new Error("Akun Anda belum diaktifkan oleh administrator.");
        if (!ACL.ROLES[p.role]) throw new Error("Peran akun tidak valid. Hubungi administrator.");
        
        const localMapping = this.getUserMapping(this.session.user.email || uid) || {};
        this.session.user.nama = Sec.clean(p.nama || localMapping.nama || this.session.user.email);
        this.session.user.role = p.role;
        this.session.user.tipeGuru = p.tipe_guru || localMapping.tipeGuru || localMapping.tipe_guru || "";
        this.session.user.kelasGuru = p.kelas_guru || localMapping.kelasGuru || localMapping.kelas_guru || "";
        this.saveUserMapping(this.session.user.email, {
            nama: this.session.user.nama,
            role: this.session.user.role,
            tipeGuru: this.session.user.tipeGuru,
            kelasGuru: this.session.user.kelasGuru
        });
    },

    async ensureFresh() {
        if (!this.session || !this.usesSupabase() || this.session.demo) return;
        if (this.session.exp - Date.now() > 60000) return;
        const res = await this.sb("/auth/v1/token?grant_type=refresh_token", {
            method: "POST",
            body: JSON.stringify({ refresh_token: this.session.refresh })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.access_token) throw new Error("Sesi berakhir.");
        this.session.token = j.access_token;
        this.session.refresh = j.refresh_token || this.session.refresh;
        this.session.exp = Date.now() + (j.expires_in || 3600) * 1000;
        this.saveSession();
    },

    // Dipakai ApiClient pada setiap request cloud
    async getToken() {
        if (!this.session || !this.session.token) return null;
        try { await this.ensureFresh(); } catch (e) { this.forceLogout("Sesi berakhir. Silakan masuk kembali."); return null; }
        return this.session.token;
    },

    // -------------------------------------------------------------- LOGOUT
    async logout(message) {
        const token = this.session && this.session.token;
        if (token && this.usesSupabase()) { await this.sb("/auth/v1/logout", { method: "POST" }, token).catch(() => { }); }
        this.endSession(message);
    },

    forceLogout(message) { this.endSession(message); },

    endSession(message) {
        // Jangan bersihkan cache database lokal saat logout agar data presensi & pekerjaan tidak hilang ketika berpindah akun
        this.clearSession();
        if (message) sessionStorage.setItem(this.FLASH_KEY, message);
        location.reload();
    },

    // ------------------------------------------------------------- SESI
    saveSession() { sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(this.session)); },
    clearSession() { sessionStorage.removeItem(this.SESSION_KEY); this.session = null; },
    loadSession() {
        try {
            const s = JSON.parse(sessionStorage.getItem(this.SESSION_KEY));
            if (!s || !s.user || !s.user.role) return null;
            return s;
        } catch (e) { return null; }
    },

    // ------------------------------------------------- ANTI BRUTE-FORCE (klien)
    checkLockout() {
        const f = JSON.parse(sessionStorage.getItem(this.FAIL_KEY) || "{\"n\":0,\"until\":0}");
        if (f.until > Date.now()) {
            const detik = Math.ceil((f.until - Date.now()) / 1000);
            throw new Error(`Terlalu banyak percobaan gagal. Coba lagi dalam ${detik} detik.`);
        }
    },
    registerFail() {
        const f = JSON.parse(sessionStorage.getItem(this.FAIL_KEY) || "{\"n\":0,\"until\":0}");
        f.n += 1;
        if (f.n >= 5) { f.until = Date.now() + 60000; f.n = 0; }
        sessionStorage.setItem(this.FAIL_KEY, JSON.stringify(f));
    },
    resetFail() { sessionStorage.removeItem(this.FAIL_KEY); },

    // ---------------------------------------------------- TIMEOUT NON-AKTIF
    startIdleWatch() {
        if (this.role() === "kiosk") return; // terminal scan harus tetap menyala
        const menit = this.cfg().IDLE_TIMEOUT_MENIT || 30;
        const reset = () => {
            clearTimeout(this._idleTimer);
            this._idleTimer = setTimeout(() => this.logout("Anda otomatis keluar karena tidak ada aktivitas."), menit * 60000);
        };
        ["mousemove", "keydown", "click", "touchstart", "scroll"].forEach(ev => document.addEventListener(ev, reset, { passive: true }));
        reset();
    },

    // ------------------------------------------------------------------ UI
    bindLoginForm() {
        const form = document.getElementById("login-form");
        if (!form || form.dataset.bound) return;
        form.dataset.bound = "1";

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("login-email").value;
            const pw = document.getElementById("login-password").value;
            const btn = document.getElementById("login-btn");
            this.showError("");
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi...`;
            try {
                await this.login(id, pw);
                document.getElementById("login-password").value = "";
                this.onAuthenticated();
            } catch (err) {
                this.showError(err.message || "Gagal masuk.");
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Masuk`;
            }
        });

        const toggle = document.getElementById("login-toggle-pw");
        if (toggle) toggle.addEventListener("click", () => {
            const inp = document.getElementById("login-password");
            inp.type = inp.type === "password" ? "text" : "password";
            toggle.innerHTML = `<i class="fa-solid ${inp.type === "password" ? "fa-eye" : "fa-eye-slash"}"></i>`;
        });

        const forgot = document.getElementById("login-forgot");
        if (forgot) forgot.addEventListener("click", async (e) => {
            e.preventDefault();
            if (!this.usesSupabase()) { this.showError("Mode Demo: tidak ada fitur reset kata sandi."); return; }
            const email = document.getElementById("login-email").value.trim();
            if (!email) { this.showError("Isi email terlebih dahulu, lalu klik 'Lupa kata sandi'."); return; }
            await this.sb("/auth/v1/recover", { method: "POST", body: JSON.stringify({ email }) }).catch(() => { });
            this.showError("Jika email terdaftar, tautan reset kata sandi telah dikirim.", true);
        });
    },

    renderLoginMode() {
        const note = document.getElementById("login-mode-note");
        const emailInput = document.getElementById("login-email");
        if (!note || !emailInput) return;
        if (this.usesSupabase()) {
            note.innerHTML = `<i class="fa-solid fa-shield-halved text-emerald-400"></i> Terhubung ke Supabase Auth. Akun dikelola oleh administrator sekolah.`;
            emailInput.type = "email";
            emailInput.placeholder = "email@sekolah.sch.id";
        } else {
            note.innerHTML = `<i class="fa-solid fa-flask text-amber-400"></i> <b>Mode Demo</b> (Supabase belum dikonfigurasi). Akun uji: <code>admin / admin123</code>, <code>tu / tu123</code>, <code>guru / guru123</code>, <code>kepsek / kepsek123</code>, <code>kiosk / kiosk123</code>.`;
            emailInput.type = "text";
            emailInput.placeholder = "nama pengguna (demo)";
        }
    },

    showError(msg, ok = false) {
        const el = document.getElementById("login-error");
        if (!el) return;
        el.textContent = msg || "";
        el.className = "text-xs rounded-lg px-3 py-2 " + (msg ? (ok ? "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30" : "bg-rose-500/15 text-rose-200 border border-rose-400/30") : "hidden");
    },

    showLogin() {
        document.body.classList.add("app-locked");
        const o = document.getElementById("login-overlay");
        if (o) o.classList.remove("hidden");
        setTimeout(() => { const i = document.getElementById("login-email"); if (i) i.focus(); }, 50);
    },

    hideLogin() {
        document.body.classList.remove("app-locked");
        const o = document.getElementById("login-overlay");
        if (o) o.classList.add("hidden");
    },

    onAuthenticated() {
        this.hideLogin();
        this.applyUI();
        this.startIdleWatch();
        if (this._started) {
            if (window.VueStore) VueStore.refresh();
            if (window.ModulVue) ModulVue.applyRoleNavVisibility();
            if (App.renderQuickActions) App.renderQuickActions();
            if (App.updateHeaderUserProfile) App.updateHeaderUserProfile();
            App.navigateTo(this.defaultRoute());
            return;
        }
        this._started = true;
        App.start();
        if (App.updateHeaderUserProfile) App.updateHeaderUserProfile();
    },

    // Sembunyikan menu & tombol sesuai peran (UX saja; server tetap menegakkan)
    applyUI() {
        const u = this.user();
        if (!u) return;

        document.querySelectorAll("[data-route]").forEach(el => {
            const r = el.getAttribute("data-route");
            el.classList.toggle("hidden", !this.canRoute(r));
        });
        document.querySelectorAll("[data-need]").forEach(el => {
            el.classList.toggle("hidden", !this.canDo(el.getAttribute("data-need")));
        });
        document.querySelectorAll("[data-role]").forEach(el => {
            const roles = el.getAttribute("data-role").split(",").map(s => s.trim());
            el.classList.toggle("hidden", !roles.includes(u.role));
        });

        const nm = document.getElementById("profile-name");
        const rl = document.getElementById("profile-role");
        const av = document.getElementById("profile-avatar");
        if (nm) nm.textContent = u.nama || u.email;
        if (rl) rl.textContent = ACL.ROLES[u.role] + (this.session.demo ? " • Demo" : "");
        if (av) av.textContent = String(u.nama || u.email || "?").trim().substring(0, 2).toUpperCase();

        if (window.ModulVue && window.ModulVue.applyRoleNavVisibility) {
            window.ModulVue.applyRoleNavVisibility();
        }
    },

    // ------------------------------------------------ MANAJEMEN AKUN (ADMIN)
    syncUserKelasDropdowns() {
        const rombels = (typeof DataStore !== "undefined" && DataStore.getRombels) ? DataStore.getRombels() : ["1", "2", "3", "4", "5", "6"];
        const buildOptions = () => `<option value="Semua">Semua Kelas (Guru Mapel)</option>` +
            rombels.map(r => {
                const label = r.toLowerCase().startsWith("kelas") ? r : `Kelas ${r}`;
                return `<option value="${Sec.esc(r)}">${Sec.esc(label)}</option>`;
            }).join("");

        const selGuruKelas = document.getElementById("new-user-guru-kelas");
        if (selGuruKelas) {
            const curVal = selGuruKelas.value;
            selGuruKelas.innerHTML = buildOptions();
            if (curVal && Array.from(selGuruKelas.options).some(o => o.value === curVal)) selGuruKelas.value = curVal;
        }

        const selEditGuruKelas = document.getElementById("edit-user-guru-kelas");
        if (selEditGuruKelas) {
            const curVal = selEditGuruKelas.value;
            selEditGuruKelas.innerHTML = buildOptions();
            if (curVal && Array.from(selEditGuruKelas.options).some(o => o.value === curVal)) selEditGuruKelas.value = curVal;
        }
    },

    openUserModal() {
        if (!this.isAdmin()) return;
        const modal = document.getElementById("modal-manage-users");
        if (!modal) return;
        document.getElementById("form-add-user")?.reset();

        // Populate pilihan kelas yang diajar dari rombel siswa
        this.syncUserKelasDropdowns();

        this.onRoleChange("admin");
        this.switchUserTab("add");
        modal.classList.remove("hidden");
    },

    closeUserModal() {
        const modal = document.getElementById("modal-manage-users");
        if (modal) modal.classList.add("hidden");
    },

    switchUserTab(tab, preselectedUser = null) {
        const btnAdd = document.getElementById("tab-btn-add-user");
        const btnList = document.getElementById("tab-btn-list-user");
        const btnPw = document.getElementById("tab-btn-pw-user");

        const formAdd = document.getElementById("form-add-user");
        const boxList = document.getElementById("container-user-list");
        const formPw = document.getElementById("form-change-password");
        const formEdit = document.getElementById("form-edit-user");

        [btnAdd, btnList, btnPw].forEach(b => {
            b?.classList.remove("border-b-2", "border-blue-700", "text-blue-700");
            b?.classList.add("text-slate-500");
        });

        formAdd?.classList.add("hidden");
        boxList?.classList.add("hidden");
        formPw?.classList.add("hidden");
        formEdit?.classList.add("hidden");

        if (tab === "add") {
            btnAdd?.classList.add("border-b-2", "border-blue-700", "text-blue-700");
            btnAdd?.classList.remove("text-slate-500");
            formAdd?.classList.remove("hidden");
        } else if (tab === "list") {
            btnList?.classList.add("border-b-2", "border-blue-700", "text-blue-700");
            btnList?.classList.remove("text-slate-500");
            boxList?.classList.remove("hidden");
            this.loadUsersList();
        } else if (tab === "password") {
            btnPw?.classList.add("border-b-2", "border-blue-700", "text-blue-700");
            btnPw?.classList.remove("text-slate-500");
            formPw?.classList.remove("hidden");
            this.populatePasswordUsers(preselectedUser);
        } else if (tab === "edit") {
            btnList?.classList.add("border-b-2", "border-blue-700", "text-blue-700");
            btnList?.classList.remove("text-slate-500");
            formEdit?.classList.remove("hidden");
        }
    },

    parseRoleInputs(roleVal, tipeGuruVal, kelasGuruVal, mapelNamaVal) {
        let baseRole = roleVal || "admin";
        let rawRole = roleVal || "admin";
        let tipeGuru = tipeGuruVal || "";
        let kelasGuru = kelasGuruVal || "";
        let namaMapel = "";

        if (roleVal && roleVal.startsWith("guru")) {
            baseRole = "guru";
            if (roleVal === "guru_kelas") {
                tipeGuru = "kelas";
                kelasGuru = (kelasGuruVal && kelasGuruVal !== "Semua") ? kelasGuruVal : "1";
                namaMapel = "";
            } else if (roleVal === "guru_pjok") {
                tipeGuru = "mapel";
                namaMapel = "PJOK";
                kelasGuru = kelasGuruVal || "Semua";
            } else if (roleVal === "guru_pai") {
                tipeGuru = "mapel";
                namaMapel = "PAI";
                kelasGuru = kelasGuruVal || "Semua";
            } else if (roleVal === "guru_inggris") {
                tipeGuru = "mapel";
                namaMapel = "Bahasa Inggris";
                kelasGuru = kelasGuruVal || "Semua";
            } else if (roleVal === "guru_seni") {
                tipeGuru = "mapel";
                namaMapel = "Seni Budaya";
                kelasGuru = kelasGuruVal || "Semua";
            } else if (roleVal === "guru_mapel") {
                tipeGuru = "mapel";
                namaMapel = mapelNamaVal ? mapelNamaVal.trim() : "Mata Pelajaran";
                kelasGuru = kelasGuruVal || "Semua";
            } else {
                tipeGuru = tipeGuruVal || "kelas";
                kelasGuru = kelasGuruVal || "1";
            }
        }
        return { baseRole, rawRole, tipeGuru, kelasGuru, namaMapel };
    },

    getRoleBadge(userObj) {
        if (!userObj) return "";
        const r = userObj.rawRole || userObj.role;
        const mapping = this.getUserMapping(userObj.email || userObj.id || userObj.usr) || {};
        const tipe = userObj.tipe_guru || userObj.tipeGuru || mapping.tipeGuru || mapping.tipe_guru || "";
        const kls = userObj.kelas_guru || userObj.kelasGuru || mapping.kelasGuru || mapping.kelas_guru || "";
        let mapel = userObj.nama_mapel || userObj.namaMapel || mapping.namaMapel || "";
        const combined = ((userObj.nama || "") + " " + (userObj.usr || "") + " " + mapel).toLowerCase();

        if (r === "admin") return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800"><i class="fa-solid fa-shield-halved mr-1"></i>Administrator</span>`;
        if (r === "kepsek") return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800"><i class="fa-solid fa-user-tie mr-1"></i>Kepala Sekolah</span>`;
        if (r === "perpustakaan") return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800"><i class="fa-solid fa-book-bookmark mr-1"></i>Tenaga Perpustakaan</span>`;
        if (r === "penjaga") return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800"><i class="fa-solid fa-person-shelter mr-1"></i>Penjaga Sekolah</span>`;

        if (r === "guru" || (typeof r === "string" && r.startsWith("guru"))) {
            if (r === "guru_pjok" || mapel.toLowerCase().includes("pjok") || combined.includes("pjok") || combined.includes("penjas")) {
                return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800"><i class="fa-solid fa-person-running mr-1"></i>Guru Mapel PJOK</span>`;
            }
            if (r === "guru_pai" || mapel.toLowerCase().includes("pai") || combined.includes("pai") || combined.includes("agama")) {
                return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800"><i class="fa-solid fa-book-quran mr-1"></i>Guru Mapel PAI</span>`;
            }
            if (r === "guru_inggris" || mapel.toLowerCase().includes("inggris") || combined.includes("inggris")) {
                return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800"><i class="fa-solid fa-language mr-1"></i>Guru Mapel B. Inggris</span>`;
            }
            if (r === "guru_seni" || mapel.toLowerCase().includes("seni") || combined.includes("seni")) {
                return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-100 text-pink-800"><i class="fa-solid fa-palette mr-1"></i>Guru Mapel Seni Budaya</span>`;
            }
            if (r === "guru_mapel" || tipe === "mapel" || kls === "Semua" || mapel) {
                const label = mapel ? `Guru Mapel ${mapel}` : "Guru Mapel";
                return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800"><i class="fa-solid fa-chalkboard-user mr-1"></i>${Sec.esc(label)}</span>`;
            }
            return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800"><i class="fa-solid fa-graduation-cap mr-1"></i>Guru Kelas ${Sec.esc(kls || '1')}</span>`;
        }

        return `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">${Sec.esc(ACL.ROLES[r] || r)}</span>`;
    },

    // Ambil data jabatan yang sinkron dari manajemen akun
    getJabatanFromAccount(t) {
        if (!t) return "";
        const nipClean = Util.cleanId(t.nip || "");
        const namaClean = this.cleanPersonName(t.nama || "");

        // Kumpulkan semua akun (custom users dari localStorage + demo users)
        let allUsers = [];
        try {
            const custom = JSON.parse(localStorage.getItem(this.CUSTOM_USERS_KEY)) || {};
            allUsers = Object.values(custom);
        } catch (e) {}
        allUsers = [...allUsers, ...Object.values(this.DEMO_USERS)];

        const matched = allUsers.find(u => {
            if (!u) return false;
            const uNip = Util.cleanId(u.nip || (u.email ? u.email.split("@")[0] : (u.usr || "")));
            if (nipClean && uNip && (uNip === nipClean || uNip.includes(nipClean) || nipClean.includes(uNip))) return true;
            const uName = this.cleanPersonName(u.nama || "");
            if (namaClean && uName && (uName.includes(namaClean) || namaClean.includes(uName))) return true;
            return false;
        });

        if (matched) {
            const r = matched.rawRole || matched.role || "";
            const mapping = this.getUserMapping(matched.email || matched.id || matched.usr) || {};
            const kls = matched.kelasGuru || mapping.kelasGuru || mapping.kelas_guru || "";
            const mapel = matched.namaMapel || mapping.namaMapel || "";
            if (r === "guru_kelas") return `Guru Kelas ${kls || '1'}`;
            if (r === "guru_pjok") return "Guru Mapel PJOK";
            if (r === "guru_pai") return "Guru Mapel PAI";
            if (r === "guru_inggris") return "Guru Mapel Bahasa Inggris";
            if (r === "guru_seni") return "Guru Mapel Seni Budaya";
            if (r === "guru_mapel") return mapel ? `Guru Mapel ${mapel}` : "Guru Mapel";
            if (r === "tu" || r === "tenaga_administrasi") return "Tenaga Administrasi";
            if (r === "perpustakaan") return "Tenaga Perpustakaan";
            if (r === "penjaga") return "Penjaga Sekolah";
            if (r === "kepsek") return "Kepala Sekolah";
            if (r === "admin") return "Administrator";
            return ACL.ROLES[r] || r;
        }
        return "";
    },

    onRoleChange(role) {
        const container = document.getElementById("guru-extra-container");
        const mapelCustomBox = document.getElementById("new-user-mapel-custom-box");
        const kelasLabel = document.getElementById("new-user-guru-kelas-label");
        const selKelas = document.getElementById("new-user-guru-kelas");
        if (!container) return;

        const isGuru = role && (role === "guru" || role.startsWith("guru"));
        container.classList.toggle("hidden", !isGuru);
        if (!isGuru) return;

        if (role === "guru_kelas") {
            if (mapelCustomBox) mapelCustomBox.classList.add("hidden");
            if (kelasLabel) kelasLabel.textContent = "Kelas yang Diampu (Wajib)";
            if (selKelas && selKelas.value === "Semua") selKelas.value = "1";
        } else if (role === "guru_mapel") {
            if (mapelCustomBox) mapelCustomBox.classList.remove("hidden");
            if (kelasLabel) kelasLabel.textContent = "Jangkauan Kelas";
        } else {
            if (mapelCustomBox) mapelCustomBox.classList.add("hidden");
            if (kelasLabel) kelasLabel.textContent = "Jangkauan Kelas";
        }
    },

    onEditRoleChange(role) {
        const container = document.getElementById("edit-guru-extra-container");
        const mapelCustomBox = document.getElementById("edit-user-mapel-custom-box");
        const kelasLabel = document.getElementById("edit-user-guru-kelas-label");
        const selKelas = document.getElementById("edit-user-guru-kelas");
        if (!container) return;

        const isGuru = role && (role === "guru" || role.startsWith("guru"));
        container.classList.toggle("hidden", !isGuru);
        if (!isGuru) return;

        if (role === "guru_kelas") {
            if (mapelCustomBox) mapelCustomBox.classList.add("hidden");
            if (kelasLabel) kelasLabel.textContent = "Kelas yang Diampu (Wajib)";
            if (selKelas && selKelas.value === "Semua") selKelas.value = "1";
        } else if (role === "guru_mapel") {
            if (mapelCustomBox) mapelCustomBox.classList.remove("hidden");
            if (kelasLabel) kelasLabel.textContent = "Jangkauan Kelas";
        } else {
            if (mapelCustomBox) mapelCustomBox.classList.add("hidden");
            if (kelasLabel) kelasLabel.textContent = "Jangkauan Kelas";
        }
    },

    async handleCreateUser(e) {
        if (e && e.preventDefault) e.preventDefault();
        const nama = document.getElementById("new-user-nama")?.value.trim();
        const email = document.getElementById("new-user-email")?.value.trim();
        const password = document.getElementById("new-user-password")?.value;
        const role = document.getElementById("new-user-role")?.value;
        const kelasGuru = document.getElementById("new-user-guru-kelas")?.value || "";
        const mapelNama = document.getElementById("new-user-guru-mapel-nama")?.value?.trim() || "";

        if (!nama || !email || !password || !role) {
            App.showToast("Semua kolom bertanda bintang wajib diisi!", "error");
            return;
        }

        const parsed = this.parseRoleInputs(role, "", kelasGuru, mapelNama);
        const { baseRole, rawRole, tipeGuru, kelasGuru: klsG, namaMapel } = parsed;

        const btn = document.getElementById("btn-save-new-user");
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;

        try {
            if (this.usesSupabase()) {
                const res = await this.sb("/auth/v1/signup", {
                    method: "POST",
                    body: JSON.stringify({
                        email,
                        password,
                        data: { nama, role: baseRole, rawRole, tipeGuru, kelasGuru: klsG, namaMapel, tipe_guru: tipeGuru, kelas_guru: klsG }
                    })
                });

                const j = await res.json().catch(() => ({}));
                if (!res.ok) {
                    if (j.message && j.message.toLowerCase().includes("rate limit")) {
                        throw new Error("Batas kirim email verifikasi Supabase terlampaui. Silakan matikan opsi 'Confirm email' di dashboard Supabase (Authentication > Providers > Email) agar akun bisa langsung aktif dibuat tanpa email verifikasi.");
                    }
                    if ((j.msg || j.message || "").includes("profiles_role_check")) {
                        throw new Error("Gagal: Database Supabase masih membatasi peran (check constraint 'profiles_role_check'). Buka Supabase > SQL Editor dan jalankan skrip migrasi dari file 'supabase/schema.sql' agar peran baru (perpustakaan, penjaga) dapat disimpan.");
                    }
                    throw new Error(j.msg || j.message || "Gagal membuat akun di Supabase.");
                }

                // Pastikan role, nama, dan penugasan guru terupdate di tabel profiles
                if (j.user && j.user.id) {
                    await this.sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(j.user.id)}`, {
                        method: "PATCH",
                        body: JSON.stringify({ nama, role: baseRole, aktif: true, tipe_guru: tipeGuru, kelas_guru: klsG })
                    }, this.session.token).catch(() => {});
                }

                const userMappingData = { nama, role: baseRole, rawRole, tipeGuru, kelasGuru: klsG, namaMapel, tipe_guru: tipeGuru, kelas_guru: klsG };
                this.saveUserMapping(email, userMappingData);
                if (j.user && j.user.id) this.saveUserMapping(j.user.id, userMappingData);

                const roleLabel = ACL.ROLES[rawRole] || (namaMapel ? `Guru Mapel ${namaMapel}` : (ACL.ROLES[baseRole] || baseRole));
                App.showToast(`Akun ${nama} (${roleLabel}) berhasil didaftarkan!`, "success");
                document.getElementById("form-add-user")?.reset();
                this.switchUserTab("list");
            } else {
                // Mode Demo (Lokal)
                const username = email.split("@")[0].toLowerCase().trim();
                const newUserObj = { pw: password, nama: nama, role: baseRole, rawRole, tipeGuru: tipeGuru, kelasGuru: klsG, namaMapel };
                this.DEMO_USERS[username] = newUserObj;
                this.DEMO_USERS[email.toLowerCase().trim()] = newUserObj;
                
                try {
                    const customUsers = JSON.parse(localStorage.getItem(this.CUSTOM_USERS_KEY)) || {};
                    customUsers[username] = newUserObj;
                    customUsers[email.toLowerCase().trim()] = newUserObj;
                    localStorage.setItem(this.CUSTOM_USERS_KEY, JSON.stringify(customUsers));
                } catch (e) {}

                const userMappingData = { nama, role: baseRole, rawRole, tipeGuru, kelasGuru: klsG, namaMapel, tipe_guru: tipeGuru, kelas_guru: klsG };
                this.saveUserMapping(email, userMappingData);
                this.saveUserMapping(username, userMappingData);

                const roleLabel = ACL.ROLES[rawRole] || (namaMapel ? `Guru Mapel ${namaMapel}` : (ACL.ROLES[baseRole] || baseRole));
                App.showToast(`(Mode Demo) Akun ${username} (${roleLabel}) berhasil ditambahkan!`, "success");
                document.getElementById("form-add-user")?.reset();
                this.switchUserTab("list");
            }
        } catch (err) {
            console.error("handleCreateUser:", err);
            App.showToast(`Gagal: ${err.message}`, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-user-plus"></i> Daftarkan Pengguna`;
        }
    },

    promptEditUser(userObj) {
        if (!userObj) return;
        this.switchUserTab("edit");

        document.getElementById("edit-user-id").value = userObj.id || userObj.usr || "";
        document.getElementById("edit-user-nama").value = userObj.nama || "";

        const mapping = this.getUserMapping(userObj.id || userObj.usr || userObj.email) || {};
        let roleValue = userObj.rawRole || userObj.role || mapping.rawRole || mapping.role || "guru_kelas";
        const mapel = (userObj.nama_mapel || userObj.namaMapel || mapping.namaMapel || "").toLowerCase();
        const combined = ((userObj.nama || "") + " " + (userObj.usr || "") + " " + mapel).toLowerCase();
        const tipe = userObj.tipe_guru || userObj.tipeGuru || mapping.tipeGuru || "";

        if (roleValue === "guru" || (typeof roleValue === "string" && roleValue.startsWith("guru"))) {
            if (roleValue === "guru_pjok" || mapel.includes("pjok") || combined.includes("pjok") || combined.includes("penjas")) {
                roleValue = "guru_pjok";
            } else if (roleValue === "guru_pai" || mapel.includes("pai") || combined.includes("pai") || combined.includes("agama")) {
                roleValue = "guru_pai";
            } else if (roleValue === "guru_inggris" || mapel.includes("inggris") || combined.includes("inggris")) {
                roleValue = "guru_inggris";
            } else if (roleValue === "guru_seni" || mapel.includes("seni") || combined.includes("seni")) {
                roleValue = "guru_seni";
            } else if (tipe === "mapel" || mapel) {
                roleValue = "guru_mapel";
            } else {
                roleValue = "guru_kelas";
            }
        }

        const roleSel = document.getElementById("edit-user-role");
        if (roleSel) roleSel.value = roleValue;

        const aktifSel = document.getElementById("edit-user-aktif");
        if (aktifSel) aktifSel.value = (userObj.aktif !== false) ? "true" : "false";

        const mapelInput = document.getElementById("edit-user-guru-mapel-nama");
        if (mapelInput) mapelInput.value = userObj.nama_mapel || userObj.namaMapel || mapping.namaMapel || "";

        this.syncUserKelasDropdowns();
        const kelasSel = document.getElementById("edit-user-guru-kelas");
        if (kelasSel) kelasSel.value = userObj.kelas_guru || userObj.kelasGuru || mapping.kelasGuru || (roleValue === "guru_kelas" ? "1" : "Semua");

        this.onEditRoleChange(roleValue);
    },

    async handleUpdateUser(e) {
        if (e && e.preventDefault) e.preventDefault();
        const id = document.getElementById("edit-user-id")?.value;
        const nama = document.getElementById("edit-user-nama")?.value.trim();
        const role = document.getElementById("edit-user-role")?.value;
        const aktif = document.getElementById("edit-user-aktif")?.value === "true";
        const kelasGuru = document.getElementById("edit-user-guru-kelas")?.value || "";
        const mapelNama = document.getElementById("edit-user-guru-mapel-nama")?.value?.trim() || "";

        if (!id || !nama || !role) {
            App.showToast("Semua data wajib terisi!", "error");
            return;
        }

        const parsed = this.parseRoleInputs(role, "", kelasGuru, mapelNama);
        const { baseRole, rawRole, tipeGuru, kelasGuru: klsG, namaMapel } = parsed;

        const btn = document.getElementById("btn-save-edit-user");
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;

        try {
            if (this.usesSupabase()) {
                const res = await this.sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`, {
                    method: "PATCH",
                    body: JSON.stringify({ nama, role: baseRole, aktif, tipe_guru: tipeGuru, kelas_guru: klsG })
                }, this.session.token);

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || "Gagal memperbarui profil pengguna.");
                }
            } else {
                // Mode Demo Update
                if (this.DEMO_USERS[id]) {
                    this.DEMO_USERS[id].nama = nama;
                    this.DEMO_USERS[id].role = baseRole;
                    this.DEMO_USERS[id].rawRole = rawRole;
                    this.DEMO_USERS[id].tipeGuru = tipeGuru;
                    this.DEMO_USERS[id].kelasGuru = klsG;
                    this.DEMO_USERS[id].namaMapel = namaMapel;
                }
                try {
                    const customUsers = JSON.parse(localStorage.getItem(this.CUSTOM_USERS_KEY)) || {};
                    if (customUsers[id]) {
                        customUsers[id].nama = nama;
                        customUsers[id].role = baseRole;
                        customUsers[id].rawRole = rawRole;
                        customUsers[id].tipeGuru = tipeGuru;
                        customUsers[id].kelasGuru = klsG;
                        customUsers[id].namaMapel = namaMapel;
                        localStorage.setItem(this.CUSTOM_USERS_KEY, JSON.stringify(customUsers));
                    }
                } catch (e) {}
            }

            const userMappingData = { nama, role: baseRole, rawRole, tipeGuru, kelasGuru: klsG, namaMapel, tipe_guru: tipeGuru, kelas_guru: klsG };
            this.saveUserMapping(id, userMappingData);

            // Jika mengedit akun yang sedang login saat ini, perbarui sesi dan tampilan seketika
            if (this.session && this.session.user && (this.session.user.id === id || this.session.user.email?.includes(id))) {
                this.session.user.nama = nama;
                this.session.user.role = baseRole;
                this.session.user.rawRole = rawRole;
                this.session.user.tipeGuru = tipeGuru;
                this.session.user.kelasGuru = klsG;
                this.session.user.namaMapel = namaMapel;
                this.saveSession();
                if (window.VueStore && window.VueStore.refresh) window.VueStore.refresh();
                if (App.updateDashboardStats) App.updateDashboardStats();
            }

            App.showToast(`Akun ${nama} berhasil diperbarui!`, "success");
            this.switchUserTab("list");
        } catch (err) {
            console.error("handleUpdateUser:", err);
            App.showToast(`Gagal: ${err.message}`, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Simpan Perubahan Akun`;
        }
    },

    async loadUsersList() {
        const tbody = document.getElementById("user-list-table-body");
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="4" class="px-3 py-6 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Memuat daftar akun...</td></tr>`;

        try {
            if (this.usesSupabase()) {
                const res = await this.sb(`/rest/v1/profiles?select=*&order=created_at.desc`, {}, this.session.token);
                if (!res.ok) throw new Error("Gagal mengambil data profil.");
                const list = await res.json();
                if (!list || list.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" class="px-3 py-6 text-center text-slate-400">Belum ada akun pengguna terdaftar.</td></tr>`;
                    return;
                }
                tbody.innerHTML = list.map(u => {
                    const uDataJson = Sec.esc(JSON.stringify(u));
                    return `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-3 py-2.5">
                            <div class="font-bold text-slate-800">${Sec.esc(u.nama)}</div>
                            <div class="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">${Sec.esc(u.id)}</div>
                        </td>
                        <td class="px-3 py-2.5">
                            ${this.getRoleBadge(u)}
                        </td>
                        <td class="px-3 py-2.5 text-center">
                            <span class="inline-flex items-center gap-1 text-[11px] font-semibold ${u.aktif !== false ? 'text-emerald-600' : 'text-slate-400'}">
                                <span class="w-1.5 h-1.5 rounded-full ${u.aktif !== false ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
                                ${u.aktif !== false ? 'Aktif' : 'Nonaktif'}
                            </span>
                        </td>
                        <td class="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                            <button type="button" onclick='Auth.promptEditUser(${uDataJson})' class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-200 inline-flex items-center gap-1 transition" title="Ubah Peran atau Penugasan Kelas">
                                <i class="fa-solid fa-user-pen text-[10px]"></i> Edit
                            </button>
                            <button type="button" onclick="Auth.promptChangePassword('${u.id}', '${Sec.esc(u.nama)}')" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold border border-amber-200 inline-flex items-center gap-1 transition" title="Ganti Kata Sandi">
                                <i class="fa-solid fa-key text-[10px]"></i> Sandi
                            </button>
                        </td>
                    </tr>
                    `;
                }).join("");
            } else {
                // Mode Demo List
                const entries = Object.entries(this.DEMO_USERS);
                tbody.innerHTML = entries.map(([usr, u]) => {
                    const demoObj = { id: usr, usr, nama: u.nama, role: u.role, rawRole: u.rawRole, tipeGuru: u.tipeGuru, kelasGuru: u.kelasGuru, namaMapel: u.namaMapel, tipe_guru: u.tipeGuru, kelas_guru: u.kelasGuru, aktif: true };
                    const demoJson = Sec.esc(JSON.stringify(demoObj));
                    return `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-3 py-2.5">
                            <div class="font-bold text-slate-800">${Sec.esc(u.nama)}</div>
                            <div class="text-[10px] text-slate-400 font-mono">User Demo: ${usr}</div>
                        </td>
                        <td class="px-3 py-2.5">
                            ${this.getRoleBadge(demoObj)}
                        </td>
                        <td class="px-3 py-2.5 text-center">
                            <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif (Demo)
                            </span>
                        </td>
                        <td class="px-3 py-2.5 text-right whitespace-nowrap space-x-1">
                            <button type="button" onclick='Auth.promptEditUser(${demoJson})' class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-200 inline-flex items-center gap-1 transition" title="Ubah Peran atau Penugasan Kelas">
                                <i class="fa-solid fa-user-pen text-[10px]"></i> Edit
                            </button>
                            <button type="button" onclick="Auth.promptChangePassword('${usr}', '${Sec.esc(u.nama)}')" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold border border-amber-200 inline-flex items-center gap-1 transition">
                                <i class="fa-solid fa-key text-[10px]"></i> Sandi
                            </button>
                        </td>
                    </tr>
                    `;
                }).join("");
            }
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="4" class="px-3 py-4 text-center text-rose-500 text-xs">Error memuat daftar: ${err.message}</td></tr>`;
        }
    },

    async populatePasswordUsers(preselectedUser = null) {
        const select = document.getElementById("pw-target-user");
        if (!select) return;

        select.innerHTML = `<option value="">-- Memuat Akun Pengguna... --</option>`;

        try {
            if (this.usesSupabase()) {
                const res = await this.sb(`/rest/v1/profiles?select=*&order=nama.asc`, {}, this.session?.token);
                if (!res.ok) throw new Error("Gagal mengambil daftar pengguna.");
                const profiles = await res.json();
                
                if (!profiles || profiles.length === 0) {
                    select.innerHTML = `<option value="">Tidak ada akun pengguna</option>`;
                    return;
                }

                select.innerHTML = profiles.map(p => `
                    <option value="${p.id}">${p.nama} (${ACL.ROLES[p.role] || p.role}) - ID: ${p.id.substring(0, 8)}...</option>
                `).join("");
            } else {
                const entries = Object.entries(this.DEMO_USERS);
                select.innerHTML = entries.map(([usr, u]) => `
                    <option value="${usr}">${u.nama} (${ACL.ROLES[u.role] || u.role}) - [Akun Demo: ${usr}]</option>
                `).join("");
            }

            if (preselectedUser) {
                select.value = preselectedUser;
            }
        } catch (err) {
            select.innerHTML = `<option value="">Gagal memuat pengguna (${err.message})</option>`;
        }
    },

    promptChangePassword(userId, userName) {
        this.switchUserTab("password", userId);
        const inputPw = document.getElementById("pw-new-password");
        if (inputPw) {
            setTimeout(() => inputPw.focus(), 150);
        }
    },

    async handleChangePassword(e) {
        if (e && e.preventDefault) e.preventDefault();

        const targetUserId = document.getElementById("pw-target-user")?.value;
        const newPw = document.getElementById("pw-new-password")?.value;
        const confirmPw = document.getElementById("pw-confirm-password")?.value;

        if (!targetUserId) {
            App.showToast("Silakan pilih akun pengguna terlebih dahulu!", "error");
            return;
        }

        if (!newPw || newPw.length < 6) {
            App.showToast("Kata sandi baru minimal 6 karakter!", "error");
            return;
        }

        if (newPw !== confirmPw) {
            App.showToast("Konfirmasi kata sandi tidak cocok!", "error");
            return;
        }

        const btn = document.getElementById("btn-save-password");
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;

        try {
            if (this.usesSupabase()) {
                // Jika user yang diubah adalah user yang sedang login sendiri:
                if (this.session && this.session.user && this.session.user.id === targetUserId) {
                    const res = await this.sb("/auth/v1/user", {
                        method: "PUT",
                        body: JSON.stringify({ password: newPw })
                    }, this.session.token);

                    if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        throw new Error(j.msg || j.message || "Gagal mengubah kata sandi akun sendiri.");
                    }
                    App.showToast("Kata sandi akun Anda berhasil diperbarui!", "success");
                } else {
                    // Admin mengubah akun pengguna lain via RPC admin_change_password
                    const res = await this.sb("/rest/v1/rpc/admin_change_password", {
                        method: "POST",
                        body: JSON.stringify({
                            target_user_id: targetUserId,
                            new_password: newPw
                        })
                    }, this.session?.token);

                    if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        if (res.status === 404 || (j.message && j.message.includes("could not find"))) {
                            throw new Error("Fungsi database 'admin_change_password' belum dijalankan di Supabase SQL Editor. Jalankan skrip di supabase/schema.sql terlebih dahulu.");
                        }
                        throw new Error(j.message || j.msg || "Gagal mengubah kata sandi pengguna.");
                    }
                    App.showToast("Kata sandi pengguna berhasil diperbarui oleh Administrator!", "success");
                }
            } else {
                // Mode Demo
                if (this.DEMO_USERS[targetUserId]) {
                    this.DEMO_USERS[targetUserId].pw = newPw;
                    App.showToast(`(Mode Demo) Kata sandi akun '${targetUserId}' berhasil diperbarui!`, "success");
                } else {
                    throw new Error("Akun demo tidak ditemukan.");
                }
            }

            document.getElementById("form-change-password")?.reset();
            this.switchUserTab("list");
        } catch (err) {
            console.error("handleChangePassword:", err);
            App.showToast(`Gagal: ${err.message}`, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-key"></i> Simpan Kata Sandi Baru`;
        }
    }
};
