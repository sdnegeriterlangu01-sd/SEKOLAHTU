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
        tu: { pw: "tu123", nama: "Staf TU (Demo)", role: "tu" },
        guru: { pw: "guru123", nama: "Guru Kelas 1 (Demo)", role: "guru", tipeGuru: "kelas", kelasGuru: "1" },
        guru_mapel: { pw: "guru123", nama: "Guru Mapel PJOK (Demo)", role: "guru", tipeGuru: "mapel", kelasGuru: "Semua" },
        kiosk: { pw: "kiosk123", nama: "Terminal Scan (Demo)", role: "kiosk" }
    },

    cfg() { return window.SIMTAS_CONFIG || {}; },
    usesSupabase() { const c = this.cfg(); return !!(c.SUPABASE_URL && c.SUPABASE_ANON_KEY); },
    user() { return this.session ? this.session.user : null; },
    role() { return this.session && this.session.user ? this.session.user.role : null; },
    isAdmin() { return this.role() === "admin"; },

    canDo(action) { return !!this.role() && ACL.check(ACL.ACTIONS[action], this.role()); },
    canRoute(route) { return !!this.role() && ACL.check(ACL.ROUTES[route], this.role()); },
    defaultRoute() {
        if (this.role() === "kiosk") return "scan-absensi";
        return this.canRoute("dashboard") ? "dashboard" : (this.canRoute("absensi") ? "absensi" : "scan-absensi");
    },

    // Deteksi apakah akun guru adalah Guru Kelas (spesifik kelas) atau Guru Mapel (semua kelas)
    getGuruInfo() {
        if (this.role() !== "guru") return null;
        const u = this.user() || {};
        let tendikList = [];
        try { tendikList = (typeof DataStore !== "undefined" && DataStore.getTendik) ? DataStore.getTendik() : []; } catch (e) {}
        const t = tendikList.find(item => 
            (u.nama && item.nama && item.nama.toLowerCase().includes(u.nama.toLowerCase())) ||
            (u.email && item.nip && item.nip.includes(u.email.split("@")[0]))
        );
        const jabatan = t?.jabatan || "";
        const m = jabatan.match(/kelas\s*(\d+[a-zA-Z]?)/i);
        const isMapel = (u.tipeGuru === "mapel") || (jabatan.toLowerCase().includes("mapel") || jabatan.toLowerCase().includes("pjok") || jabatan.toLowerCase().includes("agama") || jabatan.toLowerCase().includes("inggris") || jabatan.toLowerCase().includes("seni"));
        const rawKelas = u.kelasGuru || (m ? m[1] : "");
        const isKelas = !isMapel;
        const kelas = rawKelas || (isKelas ? "1" : "");

        return {
            isGuruKelas: isKelas && !!kelas,
            isGuruMapel: isMapel || !kelas || kelas === "Semua",
            kelas: kelas || "1",
            nama: u.nama || t?.nama || "Guru",
            jabatan: jabatan || (isKelas ? `Guru Kelas ${kelas || '1'}` : "Guru Mata Pelajaran")
        };
    },

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
        const res = await this.sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=nama,role,aktif,tipe_guru,kelas_guru`, {}, this.session.token);
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
        this.session.user.tipeGuru = p.tipe_guru || (p.role === "guru" ? "kelas" : "");
        this.session.user.kelasGuru = p.kelas_guru || (p.role === "guru" ? "1" : "");
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
            App.navigateTo(this.defaultRoute());
            return;
        }
        this._started = true;
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
    },

    // ------------------------------------------------ MANAJEMEN AKUN (ADMIN)
    openUserModal() {
        if (!this.isAdmin()) return;
        const modal = document.getElementById("modal-manage-users");
        if (!modal) return;
        document.getElementById("form-add-user")?.reset();

        // Populate pilihan kelas yang diajar dari rombel bangkas siswa
        const selGuruKelas = document.getElementById("new-user-guru-kelas");
        if (selGuruKelas) {
            const rombels = typeof DataStore !== "undefined" && DataStore.getRombels ? DataStore.getRombels() : ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"];
            selGuruKelas.innerHTML = `<option value="Semua">Semua Kelas (Guru Mapel)</option>` +
                rombels.map(r => {
                    const label = r.toLowerCase().startsWith("kelas") ? r : `Kelas ${r}`;
                    return `<option value="${Sec.esc(r)}">${Sec.esc(label)}</option>`;
                }).join("");
        }

        this.onRoleChange("tu");
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

        [btnAdd, btnList, btnPw].forEach(b => {
            b?.classList.remove("border-b-2", "border-blue-700", "text-blue-700");
            b?.classList.add("text-slate-500");
        });

        formAdd?.classList.add("hidden");
        boxList?.classList.add("hidden");
        formPw?.classList.add("hidden");

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
        }
    },

    onRoleChange(role) {
        const container = document.getElementById("guru-extra-container");
        if (container) {
            container.classList.toggle("hidden", role !== "guru");
        }
    },

    async handleCreateUser(e) {
        if (e && e.preventDefault) e.preventDefault();
        const nama = document.getElementById("new-user-nama")?.value.trim();
        const email = document.getElementById("new-user-email")?.value.trim();
        const password = document.getElementById("new-user-password")?.value;
        const role = document.getElementById("new-user-role")?.value;
        const tipeGuru = document.getElementById("new-user-guru-tipe")?.value || "";
        const kelasGuru = document.getElementById("new-user-guru-kelas")?.value || "";

        if (!nama || !email || !password || !role) {
            App.showToast("Semua kolom bertanda bintang wajib diisi!", "error");
            return;
        }

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
                        data: { nama, role, tipeGuru, kelasGuru }
                    })
                });

                const j = await res.json().catch(() => ({}));
                if (!res.ok) {
                    if (j.message && j.message.toLowerCase().includes("rate limit")) {
                        throw new Error("Batas kirim email verifikasi Supabase terlampaui. Silakan matikan opsi 'Confirm email' di dashboard Supabase (Authentication > Providers > Email) agar akun bisa langsung aktif dibuat tanpa email verifikasi.");
                    }
                    throw new Error(j.msg || j.message || "Gagal membuat akun di Supabase.");
                }

                // Pastikan role dan nama terupdate di tabel profiles
                if (j.user && j.user.id) {
                    await this.sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(j.user.id)}`, {
                        method: "PATCH",
                        body: JSON.stringify({ nama, role, aktif: true })
                    }, this.session.token).catch(() => {});
                }

                App.showToast(`Akun ${nama} (${ACL.ROLES[role] || role}) berhasil didaftarkan!`, "success");
                document.getElementById("form-add-user")?.reset();
                this.switchUserTab("list");
            } else {
                // Mode Demo (Lokal)
                const username = email.split("@")[0].toLowerCase().trim();
                this.DEMO_USERS[username] = { pw: password, nama: nama, role: role };
                App.showToast(`(Mode Demo) Akun ${username} (${ACL.ROLES[role]}) berhasil ditambahkan!`, "success");
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
                tbody.innerHTML = list.map(u => `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-3 py-2.5">
                            <div class="font-bold text-slate-800">${Sec.esc(u.nama)}</div>
                            <div class="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">${Sec.esc(u.id)}</div>
                        </td>
                        <td class="px-3 py-2.5">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                u.role === 'guru' ? 'bg-emerald-100 text-emerald-800' :
                                u.role === 'kepsek' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }">
                                ${ACL.ROLES[u.role] || u.role}
                            </span>
                        </td>
                        <td class="px-3 py-2.5 text-center">
                            <span class="inline-flex items-center gap-1 text-[11px] font-semibold ${u.aktif ? 'text-emerald-600' : 'text-slate-400'}">
                                <span class="w-1.5 h-1.5 rounded-full ${u.aktif ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
                                ${u.aktif ? 'Aktif' : 'Nonaktif'}
                            </span>
                        </td>
                        <td class="px-3 py-2.5 text-right whitespace-nowrap">
                            <button type="button" onclick="Auth.promptChangePassword('${u.id}', '${Sec.esc(u.nama)}')" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold border border-amber-200 inline-flex items-center gap-1 transition">
                                <i class="fa-solid fa-key text-[10px]"></i> Ganti Sandi
                            </button>
                        </td>
                    </tr>
                `).join("");
            } else {
                // Mode Demo List
                const entries = Object.entries(this.DEMO_USERS);
                tbody.innerHTML = entries.map(([usr, u]) => `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="px-3 py-2.5">
                            <div class="font-bold text-slate-800">${Sec.esc(u.nama)}</div>
                            <div class="text-[10px] text-slate-400 font-mono">User Demo: ${usr}</div>
                        </td>
                        <td class="px-3 py-2.5">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                u.role === 'guru' ? 'bg-emerald-100 text-emerald-800' :
                                u.role === 'kepsek' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }">
                                ${ACL.ROLES[u.role] || u.role}
                            </span>
                        </td>
                        <td class="px-3 py-2.5 text-center">
                            <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif (Demo)
                            </span>
                        </td>
                        <td class="px-3 py-2.5 text-right whitespace-nowrap">
                            <button type="button" onclick="Auth.promptChangePassword('${usr}', '${Sec.esc(u.nama)}')" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold border border-amber-200 inline-flex items-center gap-1 transition">
                                <i class="fa-solid fa-key text-[10px]"></i> Ganti Sandi
                            </button>
                        </td>
                    </tr>
                `).join("");
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
