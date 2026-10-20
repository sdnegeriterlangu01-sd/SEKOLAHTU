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

    // Akun contoh HANYA aktif di Mode Demo (Supabase belum dikonfigurasi)
    DEMO_USERS: {
        admin: { pw: "admin123", nama: "Administrator (Demo)", role: "admin" },
        kepsek: { pw: "kepsek123", nama: "Kepala Sekolah (Demo)", role: "kepsek" },
        tu: { pw: "tu123", nama: "Staf TU (Demo)", role: "tu" },
        guru: { pw: "guru123", nama: "Guru (Demo)", role: "guru" },
        kiosk: { pw: "kiosk123", nama: "Terminal Scan (Demo)", role: "kiosk" }
    },

    cfg() { return window.SIMTAS_CONFIG || {}; },
    usesSupabase() { const c = this.cfg(); return !!(c.SUPABASE_URL && c.SUPABASE_ANON_KEY); },
    user() { return this.session ? this.session.user : null; },
    role() { return this.session && this.session.user ? this.session.user.role : null; },
    isAdmin() { return this.role() === "admin"; },

    canDo(action) { return !!this.role() && ACL.check(ACL.ACTIONS[action], this.role()); },
    canRoute(route) { return !!this.role() && ACL.check(ACL.ROUTES[route], this.role()); },
    defaultRoute() { return this.canRoute("dashboard") ? "dashboard" : "absensi"; },

    // ------------------------------------------------------------------ INIT
    async init() {
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

        if (!this.usesSupabase()) {
            const u = this.DEMO_USERS[String(identifier).toLowerCase().trim()];
            if (!u || u.pw !== password) { this.registerFail(); throw new Error("Nama pengguna atau kata sandi salah (Mode Demo)."); }
            this.session = { demo: true, token: null, user: { id: "demo-" + u.role, email: identifier, nama: u.nama, role: u.role } };
            this.resetFail();
            this.saveSession();
            return;
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
        const res = await this.sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=nama,role,aktif`, {}, this.session.token);
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
        this.session.user.nama = Sec.clean(p.nama || this.session.user.email);
        this.session.user.role = p.role;
    },

    async ensureFresh() {
        if (!this.session || !this.usesSupabase()) return;
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
        // Pada mode cloud, bersihkan cache data dari perangkat agar tidak tertinggal di komputer bersama
        if (this.usesSupabase() || ApiClient.isCloudActive()) DataStore.clearCache();
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
            // Sesi demo tidak boleh dipakai saat Supabase aktif (dan sebaliknya)
            if (!!s.demo === this.usesSupabase()) return null;
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
        if (this._started) return;
        this._started = true;
        this.applyUI();
        this.startIdleWatch();
        App.start();
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
    }
};
