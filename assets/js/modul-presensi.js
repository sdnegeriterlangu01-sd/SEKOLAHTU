/* ==========================================================================
   SIM-TAS-SD: PRESENSI LANJUTAN
   1. Scan QR (barcode berbasis teks) untuk jam DATANG & PULANG guru/tendik
   2. Rekap bulanan Guru & Tendik (format: Datang/Pulang x tanggal, S I A JML)
   3. Rekap bulanan Siswa per kelas (format: kolom tanggal, S I A JML)
   4. Kartu ID QR otomatis (disimpan ke Google Drive) + cetak kartu
   Kolom ABU-ABU = hari Minggu / libur nasional (diatur di Pengaturan).
   ========================================================================== */

const ModulPresensi = {
    tab: "harian",
    bulanTendik: Util.monthKey(),
    bulanSiswa: Util.monthKey(),
    kelasSiswa: "",
    siswaMarks: {},        // { nisn: { "03": "S" } }
    siswaDirty: false,
    tendikRows: [],        // hasil getAbsensiTendikBulan
    sessionLog: [],
    scanner: null,
    scannerRunning: false,
    _lastCode: "", _lastAt: 0,

    TABS: [
        { id: "harian", label: "Presensi Harian", icon: "fa-clipboard-check", need: "getAbsensi" },
        { id: "scan", label: "Scan QR Datang/Pulang", icon: "fa-qrcode", need: "scanTendik" },
        { id: "tendik", label: "Rekap Guru & Tendik", icon: "fa-table-list", need: "getAbsensiTendikBulan" },
        { id: "siswa", label: "Rekap Siswa Bulanan", icon: "fa-table-cells", need: "getAbsensiSiswaBulan" },
        { id: "qr", label: "Kartu ID QR", icon: "fa-id-card", need: "saveTendik" }
    ],

    GRID_CSS: `
        .abs-grid{border-collapse:collapse;font-size:10px;background:#fff;color:#111827}
        .abs-grid th,.abs-grid td{border:1px solid #1f2937;padding:1px 3px;text-align:center;line-height:1.25;height:19px;min-width:19px}
        .abs-grid th{background:#f1f5f9;font-weight:700}
        .abs-grid td.nama{text-align:left;padding:2px 6px;white-space:nowrap;font-weight:600}
        .abs-grid td.sub{font-size:9px;font-weight:400;white-space:nowrap}
        .abs-grid td.t{font-size:8.5px;letter-spacing:-.2px}
        .abs-grid .off{background:#7f7f7f !important;color:#fff}
        .abs-grid td.cell{cursor:pointer}
        .abs-grid td.cell:hover{background:#dbeafe}
        .abs-grid td.mk-S{background:#fde68a;font-weight:700}
        .abs-grid td.mk-I{background:#bfdbfe;font-weight:700}
        .abs-grid td.mk-A{background:#fecaca;font-weight:700}
        .abs-grid td.ok{color:#047857;font-weight:700}
        .abs-grid tr.grp-end td{border-bottom:2px solid #111827}
    `,

    // ===================================================================== INIT
    init() {
        if (!document.getElementById("presensi-css")) {
            const st = document.createElement("style");
            st.id = "presensi-css";
            st.textContent = this.GRID_CSS;
            document.head.appendChild(st);
        }
        this.buildTabs();
        this.switchTab(this.firstAllowedTab());
    },

    onShow() {
        this.buildTabs();
        if (!this.isAllowed(this.tab)) this.tab = this.firstAllowedTab();
        this.switchTab(this.tab);
    },

    isAllowed(id) { const t = this.TABS.find(x => x.id === id); return !!t && Auth.canDo(t.need); },
    firstAllowedTab() { const t = this.TABS.find(x => Auth.canDo(x.need)); return t ? t.id : "harian"; },

    buildTabs() {
        const bar = document.getElementById("abs-tabs");
        if (!bar) return;
        bar.innerHTML = this.TABS.filter(t => Auth.canDo(t.need)).map(t => `
            <button type="button" data-abs-tab="${t.id}" onclick="ModulPresensi.switchTab('${t.id}')"
                class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ${this.tab === t.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}">
                <i class="fa-solid ${t.icon}"></i> ${t.label}
            </button>`).join("");
    },

    switchTab(id) {
        if (!this.isAllowed(id)) id = this.firstAllowedTab();
        if (this.tab === "scan" && id !== "scan") this.stopCamera();
        this.tab = id;
        this.buildTabs();

        this.TABS.forEach(t => {
            const el = document.getElementById(`abs-tab-${t.id}`);
            if (el) el.classList.toggle("hidden", t.id !== id);
        });
        const actions = document.getElementById("abs-harian-actions");
        if (actions) actions.classList.toggle("hidden", id !== "harian");

        if (id === "scan") this.renderScan();
        else if (id === "tendik") this.renderTendik();
        else if (id === "siswa") this.renderSiswa();
        else if (id === "qr") this.renderQR();
    },

    // ===================================================================== UTIL KALENDER
    libur() {
        const map = {};
        (DataStore.getConfig().hariLibur || []).forEach(h => { map[h.tanggal] = h.ket || "Libur"; });
        return map;
    },

    // daftar hari dalam sebulan beserta penanda libur (Minggu / libur nasional)
    hariBulan(bulanKey) {
        const [y, m] = bulanKey.split("-").map(Number);
        const libur = this.libur();
        const n = Util.daysInMonth(y, m);
        const out = [];
        for (let d = 1; d <= n; d++) {
            const tgl = `${y}-${Util.pad(m)}-${Util.pad(d)}`;
            const minggu = new Date(y, m - 1, d).getDay() === 0;
            out.push({ d, dd: Util.pad(d), tgl, off: minggu || !!libur[tgl], ket: minggu ? "Minggu" : (libur[tgl] || "") });
        }
        return out;
    },

    kop(judulBaris) {
        const c = DataStore.getConfig();
        const sekolah = String(c.namaSekolah || "").toUpperCase().replace(/^SD\b/, "SEKOLAH DASAR");
        const logo = new URL("assets/img/logo-brebes.svg", location.href).href;
        return `
            <div class="kop">
                <img src="${logo}" onerror="this.onerror=null;this.src='https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Seal_of_Brebes_Regency.svg/330px-Seal_of_Brebes_Regency.svg.png'" alt="Logo">
                <div class="kt">
                    <div>PEMERINTAH ${Sec.esc(String(c.kabupatenKota || "KABUPATEN BREBES").toUpperCase())}</div>
                    <div>DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA</div>
                    <div>${Sec.esc(sekolah)}</div>
                    <div>${Sec.esc(String(c.kecamatan || "").toUpperCase())}</div>
                    <div style="font-weight:400;font-size:11px">Alamat : ${Sec.esc(c.alamat || "")}</div>
                </div>
            </div>
            <div class="jud">${judulBaris.map(Sec.esc).join("<br>")}</div>`;
    },

    printHtml(title, bodyHtml, landscape = true) {
        const w = window.open("", "_blank");
        if (!w) { App.showToast("Pop-up diblokir browser. Izinkan pop-up untuk mencetak.", "warning"); return; }
        w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${Sec.esc(title)}</title>
            <style>
                @page{size:A4 ${landscape ? "landscape" : "portrait"};margin:8mm}
                *{box-sizing:border-box}
                body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0}
                .kop{display:flex;align-items:center;justify-content:center;gap:14px}
                .kop img{width:58px;height:58px;object-fit:contain}
                .kt{text-align:center;font-weight:700;font-size:13px;line-height:1.35}
                hr{border:0;border-top:3px double #000;margin:6px 0}
                .jud{text-align:center;font-weight:700;font-size:12px;margin:8px 0;line-height:1.5}
                ${this.GRID_CSS}
                .abs-grid{width:100%;font-size:9px}
                .abs-grid th,.abs-grid td{-webkit-print-color-adjust:exact;print-color-adjust:exact}
                .ttd{display:flex;justify-content:space-between;margin-top:14px;font-size:11px;page-break-inside:avoid}
                .ttd div{text-align:center;min-width:220px}
                .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}
                .card{border:1px solid #111;border-radius:6px;padding:5mm;text-align:center;page-break-inside:avoid;width:100%}
                .card img{width:34mm;height:34mm}
                .card .n{font-weight:700;font-size:12px;margin-top:2mm}
                .card .j{font-size:10px}
                .card .id{font-family:monospace;font-size:9px;margin-top:1mm}
                .card .s{font-size:9px;font-weight:700;border-bottom:1px solid #111;margin-bottom:2mm;padding-bottom:1mm}
            </style></head><body>${bodyHtml}
            <script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>`);
        w.document.close();
    },

    ttdBlok(kiriLabel) {
        const c = DataStore.getConfig();
        return `<div class="ttd">
            <div>${kiriLabel ? `${Sec.esc(kiriLabel)}<br><br><br><br>(................................)` : ""}</div>
            <div>Mengetahui,<br>Kepala Sekolah<br><br><br><br><b><u>${Sec.esc(c.namaKepalaSekolah || "")}</u></b><br>NIP. ${Sec.esc(c.nipKepalaSekolah || "")}</div>
        </div>`;
    },

    beep(ok) {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = this._ctx || (this._ctx = new Ctx());
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.frequency.value = ok ? 880 : 220;
            g.gain.value = 0.08;
            o.connect(g); g.connect(ctx.destination);
            o.start(); o.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
        } catch (e) { /* audio opsional */ }
    },

    // ===================================================================== 1. SCAN QR
    renderScan() {
        const el = document.getElementById("abs-tab-scan");
        if (!el) return;
        if (!el.dataset.built) {
            el.dataset.built = "1";
            el.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">
                    <div class="lg:col-span-2 space-y-4">
                        <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                            <div>
                                <h3 class="font-bold text-sm text-slate-900"><i class="fa-solid fa-qrcode text-indigo-600 mr-1"></i> Scan Kartu ID Guru / Tendik</h3>
                                <p class="text-xs text-slate-400 mt-0.5">Scan pertama = jam DATANG, scan berikutnya = jam PULANG. Waktu dicatat otomatis.</p>
                            </div>
                            <div id="scan-reader" class="hidden rounded-xl overflow-hidden bg-slate-900 min-h-[240px]"></div>
                            <div class="flex gap-2">
                                <button type="button" id="btn-scan-camera" onclick="ModulPresensi.toggleCamera()" class="flex-1 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition">
                                    <i class="fa-solid fa-camera"></i> Aktifkan Kamera
                                </button>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Atau gunakan alat scan barcode USB / ketik kode</label>
                                <input type="text" id="scan-input" autocomplete="off" placeholder="Arahkan scanner ke sini lalu scan… (Enter)"
                                    class="w-full px-3.5 py-2.5 text-sm border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono">
                                <p class="text-[11px] text-slate-400 mt-1">Barcode berbasis teks: <span class="font-mono">SIMTAS|T|&lt;NIP&gt;</span></p>
                            </div>
                        </div>
                        <div id="scan-result" class="hidden rounded-2xl p-5 text-center border-2"></div>
                    </div>
                    <div class="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div class="p-4 border-b border-slate-100 flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-700"><i class="fa-regular fa-clock mr-1"></i> Kehadiran Hari Ini <span id="scan-today-label" class="font-mono text-slate-400"></span></span>
                            <span id="scan-clock" class="font-mono font-bold text-indigo-700 text-sm"></span>
                        </div>
                        <div class="overflow-x-auto max-h-[460px]"><table class="w-full text-left"><tbody id="scan-today-body"></tbody></table></div>
                    </div>
                </div>`;

            const inp = el.querySelector("#scan-input");
            inp.addEventListener("keydown", (e) => {
                if (e.key === "Enter") { e.preventDefault(); const v = inp.value; inp.value = ""; this.handleCode(v); }
            });
            // jam digital
            this._clock = setInterval(() => {
                const c = document.getElementById("scan-clock");
                if (c) c.textContent = Util.nowTime();
            }, 1000);
        }
        document.getElementById("scan-today-label").textContent = Util.today();
        this.renderTodayLog();
        setTimeout(() => { const i = document.getElementById("scan-input"); if (i) i.focus(); }, 80);
    },

    async handleCode(raw) {
        const code = String(raw || "").trim();
        if (!code) return;
        const now = Date.now();
        if (code === this._lastCode && now - this._lastAt < 4000) return; // abaikan pembacaan ganda beruntun
        this._lastCode = code; this._lastAt = now;

        const res = await ApiClient.request("scanTendik", { code });
        this.showScanResult(res);
        if (res.success && res.data) {
            this.sessionLog.unshift({ ...res.data });
            this.sessionLog = this.sessionLog.slice(0, 30);
        }
        this.renderTodayLog();
        const i = document.getElementById("scan-input"); if (i) i.focus();
    },

    showScanResult(res) {
        const box = document.getElementById("scan-result");
        if (!box) return;
        let cls, icon, title, sub;
        if (!res.success) {
            cls = "bg-rose-50 border-rose-300 text-rose-800"; icon = "fa-circle-xmark text-rose-500"; title = "Gagal"; sub = Sec.esc(res.message);
            this.beep(false);
        } else if (res.data.tipe === "datang") {
            cls = "bg-emerald-50 border-emerald-300 text-emerald-900"; icon = "fa-right-to-bracket text-emerald-600"; title = "DATANG"; sub = `${Sec.esc(res.data.nama)}<br><span class="text-xs">${Sec.esc(res.data.jabatan || "")}</span>`;
            this.beep(true);
        } else if (res.data.tipe === "pulang") {
            cls = "bg-blue-50 border-blue-300 text-blue-900"; icon = "fa-right-from-bracket text-blue-600"; title = "PULANG"; sub = `${Sec.esc(res.data.nama)}<br><span class="text-xs">${Sec.esc(res.data.jabatan || "")}</span>`;
            this.beep(true);
        } else {
            cls = "bg-amber-50 border-amber-300 text-amber-900"; icon = "fa-hand text-amber-500"; title = "Sudah Tercatat"; sub = Sec.esc(res.message);
            this.beep(false);
        }
        const jam = res.success && res.data ? (res.data.tipe === "pulang" ? res.data.jamPulang : res.data.jamDatang || res.data.jam) : "";
        box.className = `rounded-2xl p-5 text-center border-2 ${cls}`;
        box.innerHTML = `
            <i class="fa-solid ${icon} text-4xl mb-2"></i>
            <div class="text-lg font-black tracking-wide">${title}</div>
            <div class="text-sm font-semibold mt-1">${sub}</div>
            ${jam ? `<div class="font-mono text-3xl font-black mt-2">${Sec.esc(String(jam).substring(0, 5))}</div>` : ""}`;
        clearTimeout(this._resultTimer);
        this._resultTimer = setTimeout(() => box.classList.add("hidden"), 7000);
    },

    async renderTodayLog() {
        const body = document.getElementById("scan-today-body");
        if (!body) return;

        if (Auth.canDo("getAbsensiTendikBulan")) {
            const res = await ApiClient.request("getAbsensiTendikBulan", { bulan: Util.monthKey() });
            const today = Util.today();
            const rows = (res.success ? res.data : []).filter(r => r.tanggal === today);
            const tendik = DataStore.getTendik().filter(t => t.aktif !== false);
            body.innerHTML = tendik.map((t, i) => {
                const r = rows.find(x => x.nip === Util.cleanId(t.nip));
                const st = r && r.status && r.status !== "Hadir" ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">${Sec.esc(r.status)}</span>` : "";
                return `<tr class="border-b border-slate-100">
                    <td class="px-4 py-2 text-xs text-slate-400 w-8">${i + 1}</td>
                    <td class="px-2 py-2"><div class="text-xs font-bold text-slate-800">${Sec.esc(t.nama)}</div><div class="text-[10px] text-slate-400">${Sec.esc(t.jabatan || "")}</div></td>
                    <td class="px-2 py-2 text-xs font-mono ${r && r.jamDatang ? "text-emerald-700 font-bold" : "text-slate-300"}">${r && r.jamDatang ? "▶ " + Sec.esc(r.jamDatang.substring(0, 5)) : "—"}</td>
                    <td class="px-2 py-2 text-xs font-mono ${r && r.jamPulang ? "text-blue-700 font-bold" : "text-slate-300"}">${r && r.jamPulang ? "◀ " + Sec.esc(r.jamPulang.substring(0, 5)) : "—"}</td>
                    <td class="px-2 py-2 text-right">${st}${!r ? `<span class="text-[10px] text-slate-300">Belum scan</span>` : ""}</td>
                </tr>`;
            }).join("") || `<tr><td class="p-6 text-center text-xs text-slate-400">Belum ada data guru/tendik.</td></tr>`;
        } else {
            body.innerHTML = this.sessionLog.map(l => `<tr class="border-b border-slate-100">
                <td class="px-4 py-2 text-xs font-bold text-slate-800">${Sec.esc(l.nama)}</td>
                <td class="px-2 py-2 text-xs"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${l.tipe === "datang" ? "bg-emerald-100 text-emerald-800" : l.tipe === "pulang" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}">${Sec.esc(l.tipe)}</span></td>
                <td class="px-2 py-2 text-xs font-mono text-slate-600">${Sec.esc(String(l.jam).substring(0, 5))}</td></tr>`).join("")
                || `<tr><td class="p-6 text-center text-xs text-slate-400">Belum ada pemindaian pada sesi ini.</td></tr>`;
        }
    },

    // ---- kamera (html5-qrcode dimuat saat dibutuhkan) ----
    loadScannerLib() {
        if (window.Html5Qrcode) return Promise.resolve();
        if (this._libPromise) return this._libPromise;
        this._libPromise = new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
            s.crossOrigin = "anonymous";
            s.onload = resolve;
            s.onerror = () => { this._libPromise = null; reject(new Error("Gagal memuat library kamera.")); };
            document.head.appendChild(s);
        });
        return this._libPromise;
    },

    async toggleCamera() {
        if (this.scannerRunning) { await this.stopCamera(); return; }
        const reader = document.getElementById("scan-reader");
        const btn = document.getElementById("btn-scan-camera");
        try {
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan kamera…`;
            await this.loadScannerLib();
            reader.classList.remove("hidden");
            this.scanner = new Html5Qrcode("scan-reader");
            await this.scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 230, height: 230 } },
                (text) => this.handleCode(text), () => { });
            this.scannerRunning = true;
            btn.innerHTML = `<i class="fa-solid fa-stop"></i> Matikan Kamera`;
        } catch (err) {
            reader.classList.add("hidden");
            btn.innerHTML = `<i class="fa-solid fa-camera"></i> Aktifkan Kamera`;
            App.showToast(`Kamera tidak dapat diakses: ${err.message || err}. Kamera memerlukan HTTPS & izin pengguna.`, "error");
        }
    },

    async stopCamera() {
        try { if (this.scanner && this.scannerRunning) { await this.scanner.stop(); this.scanner.clear(); } } catch (e) { /* abaikan */ }
        this.scannerRunning = false;
        const reader = document.getElementById("scan-reader");
        const btn = document.getElementById("btn-scan-camera");
        if (reader) reader.classList.add("hidden");
        if (btn) btn.innerHTML = `<i class="fa-solid fa-camera"></i> Aktifkan Kamera`;
    },

    // ===================================================================== 2. REKAP GURU & TENDIK
    async renderTendik() {
        const el = document.getElementById("abs-tab-tendik");
        if (!el) return;
        const canEdit = Auth.canDo("saveAbsensiTendikManual");
        if (!el.dataset.built) {
            el.dataset.built = "1";
            el.innerHTML = `
                <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-end justify-between gap-3">
                    <div class="flex items-end gap-3 flex-wrap">
                        <div><label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bulan</label>
                            <input type="month" id="rt-bulan" class="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-medium"></div>
                        <div class="text-[11px] text-slate-500 pb-1.5"><span class="inline-block w-3 h-3 align-middle bg-[#7f7f7f] mr-1"></span> Minggu / libur nasional
                            <span class="mx-2">•</span> <b>S</b>akit <b>I</b>zin <b>A</b>lpa, <b>JML</b> = S+I+A</div>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button type="button" onclick="ModulPresensi.cetakTendik()" class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-2"><i class="fa-solid fa-print text-blue-600"></i> Cetak / PDF</button>
                        <button type="button" onclick="ModulPresensi.exportTendikCSV()" class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-2"><i class="fa-solid fa-file-excel text-emerald-600"></i> Ekspor CSV</button>
                    </div>
                </div>
                <p id="rt-hint" class="text-[11px] text-slate-400 mt-2"></p>
                <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-auto mt-3" style="max-height:70vh"><div id="rt-grid" class="p-3"></div></div>`;
            el.querySelector("#rt-bulan").addEventListener("change", (e) => { if (e.target.value) { this.bulanTendik = e.target.value; this.renderTendik(); } });
        }
        document.getElementById("rt-bulan").value = this.bulanTendik;
        document.getElementById("rt-hint").textContent = canEdit ? "Klik sel tanggal untuk koreksi manual (lupa scan, sakit, izin, alpa)." : "Mode lihat saja.";

        const grid = document.getElementById("rt-grid");
        grid.innerHTML = `<div class="p-6 text-center text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin"></i> Memuat rekap…</div>`;
        const res = await ApiClient.request("getAbsensiTendikBulan", { bulan: this.bulanTendik });
        this.tendikRows = res.success ? res.data : [];
        if (!res.success) App.showToast(res.message || "Gagal memuat rekap.", "error");
        grid.innerHTML = this.buildTendikTable(canEdit);
        grid.onclick = canEdit ? (e) => {
            const td = e.target.closest("td[data-nip]");
            if (td) this.openKoreksi(td.dataset.nip, td.dataset.tgl);
        } : null;
    },

    buildTendikTable(interactive) {
        const hari = this.hariBulan(this.bulanTendik);
        const tendik = DataStore.getTendik().filter(t => t.aktif !== false);
        const rowsBy = {};
        this.tendikRows.forEach(r => { rowsBy[`${r.nip}|${r.tanggal}`] = r; });

        const offCls = h => h.off ? " off" : "";
        let html = `<table class="abs-grid"><thead>
            <tr><th rowspan="2">NO</th><th rowspan="2" style="min-width:190px">NAMA</th><th rowspan="2" colspan="2">JAM</th><th colspan="${hari.length}">TANGGAL</th><th rowspan="2">S</th><th rowspan="2">I</th><th rowspan="2">A</th><th rowspan="2">JML</th></tr>
            <tr>${hari.map(h => `<th class="${offCls(h).trim()}" title="${Sec.esc(h.ket)}">${h.dd}</th>`).join("")}</tr></thead><tbody>`;

        if (tendik.length === 0) html += `<tr><td colspan="${hari.length + 8}" style="padding:18px">Belum ada data guru/tendik.</td></tr>`;

        tendik.forEach((t, i) => {
            const nip = Util.cleanId(t.nip);
            let S = 0, I = 0, A = 0;
            const cells = (kind) => hari.map(h => {
                const r = rowsBy[`${nip}|${h.tgl}`];
                const attrs = interactive && !h.off ? ` class="cell${h.off ? " off" : ""}" data-nip="${Sec.esc(nip)}" data-tgl="${h.tgl}"` : (h.off ? ` class="off"` : "");
                let inner = "", extra = "";
                if (r && r.status && r.status !== "Hadir") {
                    const L = r.status === "Sakit" ? "S" : r.status === "Izin" ? "I" : "A";
                    if (kind === "dp") inner = L;
                    extra = ` mk-${L}`;
                } else if (r) {
                    if (kind === "dp") inner = r.jamDatang ? r.jamDatang.substring(0, 5) : "";
                    if (kind === "da") inner = r.jamDatang ? "✓" : "";
                    if (kind === "pp") inner = r.jamPulang ? r.jamPulang.substring(0, 5) : "";
                    if (kind === "pa") inner = r.jamPulang ? "✓" : "";
                }
                const tcls = (kind === "dp" || kind === "pp") ? " t" : (inner === "✓" ? " ok" : "");
                let a = attrs;
                if (a.includes('class="')) a = a.replace('class="', `class="${(tcls + extra).trim()} `);
                else a = ` class="${(tcls + extra).trim()}"` + a;
                return `<td${a}>${inner}</td>`;
            }).join("");

            hari.forEach(h => {
                const r = rowsBy[`${nip}|${h.tgl}`];
                if (r && !h.off) { if (r.status === "Sakit") S++; else if (r.status === "Izin") I++; else if (r.status === "Alpa") A++; }
            });

            html += `
                <tr><td rowspan="4">${i + 1}</td>
                    <td rowspan="4" class="nama" style="vertical-align:middle"><div>${Sec.esc(t.nama)}</div><div style="font-weight:400;font-size:9px;margin-top:6px">NIP. ${Sec.esc(t.nip)}</div></td>
                    <td rowspan="2" class="sub">Datang</td><td class="sub">Pukul</td>${cells("dp")}
                    <td rowspan="4">${S || ""}</td><td rowspan="4">${I || ""}</td><td rowspan="4">${A || ""}</td><td rowspan="4"><b>${(S + I + A) || ""}</b></td></tr>
                <tr><td class="sub">parap</td>${cells("da")}</tr>
                <tr><td rowspan="2" class="sub">Pulang</td><td class="sub">Pukul</td>${cells("pp")}</tr>
                <tr class="grp-end"><td class="sub">parap</td>${cells("pa")}</tr>`;
        });
        return html + `</tbody></table>`;
    },

    cetakTendik() {
        const body = this.kop(["ABSENSI GURU DAN TENAGA KEPENDIDIKAN", `BULAN : ${Util.labelBulan(this.bulanTendik)}`])
            + this.buildTendikTable(false) + this.ttdBlok("");
        this.printHtml(`Absensi Tendik ${this.bulanTendik}`, body, true);
    },

    exportTendikCSV() {
        const hari = this.hariBulan(this.bulanTendik);
        const rowsBy = {};
        this.tendikRows.forEach(r => { rowsBy[`${r.nip}|${r.tanggal}`] = r; });
        const head = ["No", "Nama", "NIP", "Jenis", ...hari.map(h => h.dd), "S", "I", "A"];
        const lines = [head.map(Sec.csvCell).join(",")];
        DataStore.getTendik().filter(t => t.aktif !== false).forEach((t, i) => {
            const nip = Util.cleanId(t.nip);
            let S = 0, I = 0, A = 0;
            const dt = [], pl = [];
            hari.forEach(h => {
                const r = rowsBy[`${nip}|${h.tgl}`];
                if (r && r.status === "Sakit") { S++; dt.push("S"); pl.push(""); }
                else if (r && r.status === "Izin") { I++; dt.push("I"); pl.push(""); }
                else if (r && r.status === "Alpa") { A++; dt.push("A"); pl.push(""); }
                else { dt.push(r && r.jamDatang ? r.jamDatang.substring(0, 5) : ""); pl.push(r && r.jamPulang ? r.jamPulang.substring(0, 5) : ""); }
            });
            lines.push([i + 1, t.nama, t.nip, "Datang", ...dt, S, I, A].map(Sec.csvCell).join(","));
            lines.push(["", "", "", "Pulang", ...pl, "", "", ""].map(Sec.csvCell).join(","));
        });
        this.download(`ABSENSI_TENDIK_${this.bulanTendik}.csv`, "\uFEFF" + lines.join("\n"));
    },

    download(name, content, type = "text/csv;charset=utf-8;") {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([content], { type }));
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    // ---- koreksi manual tendik ----
    openKoreksi(nip, tgl) {
        const t = DataStore.getTendik().find(x => Util.cleanId(x.nip) === nip);
        if (!t) return;
        const r = this.tendikRows.find(x => x.nip === nip && x.tanggal === tgl) || {};
        let m = document.getElementById("modal-koreksi-tendik");
        if (!m) {
            m = document.createElement("div");
            m.id = "modal-koreksi-tendik";
            m.className = "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 hidden";
            document.body.appendChild(m);
        }
        m.innerHTML = `
            <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                <div class="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div><h3 class="font-bold text-sm text-slate-900">Koreksi Presensi</h3>
                        <p class="text-xs text-slate-500 mt-0.5">${Sec.esc(t.nama)} • <span class="font-mono">${tgl}</span></p></div>
                    <button type="button" onclick="document.getElementById('modal-koreksi-tendik').classList.add('hidden')" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-lg"></i></button>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div class="col-span-2"><label class="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                        <select id="kor-status" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg">
                            ${["Hadir", "Sakit", "Izin", "Alpa"].map(s => `<option ${((r.status || "Hadir") === s) ? "selected" : ""}>${s}</option>`).join("")}
                            <option value="Hapus">Hapus data hari ini</option>
                        </select></div>
                    <div><label class="block text-xs font-semibold text-slate-700 mb-1">Jam Datang</label>
                        <input type="time" id="kor-datang" value="${Sec.esc((r.jamDatang || "").substring(0, 5))}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"></div>
                    <div><label class="block text-xs font-semibold text-slate-700 mb-1">Jam Pulang</label>
                        <input type="time" id="kor-pulang" value="${Sec.esc((r.jamPulang || "").substring(0, 5))}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"></div>
                    <div class="col-span-2"><label class="block text-xs font-semibold text-slate-700 mb-1">Keterangan</label>
                        <input type="text" id="kor-ket" maxlength="120" value="${Sec.esc(r.keterangan || "")}" placeholder="mis. lupa scan / surat dokter" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"></div>
                </div>
                <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onclick="document.getElementById('modal-koreksi-tendik').classList.add('hidden')" class="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold">Batal</button>
                    <button type="button" onclick="ModulPresensi.saveKoreksi('${Sec.esc(nip)}','${tgl}')" class="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold">Simpan</button>
                </div>
            </div>`;
        m.classList.remove("hidden");
    },

    async saveKoreksi(nip, tgl) {
        const status = document.getElementById("kor-status").value;
        const res = await ApiClient.request("saveAbsensiTendikManual", {
            nip, tanggal: tgl, status,
            jamDatang: status === "Hadir" ? document.getElementById("kor-datang").value : "",
            jamPulang: status === "Hadir" ? document.getElementById("kor-pulang").value : "",
            keterangan: document.getElementById("kor-ket").value
        });
        if (res.success) {
            document.getElementById("modal-koreksi-tendik").classList.add("hidden");
            App.showToast(res.message, "success");
            this.renderTendik();
        } else {
            App.showToast(res.message || "Gagal menyimpan koreksi", "error");
        }
    },

    // ===================================================================== 3. REKAP SISWA BULANAN
    kelasOptions() {
        const set = new Set();
        DataStore.getSiswa().forEach(s => set.add(String(s.rombel || s.kelas)));
        return Array.from(set).sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
    },

    siswaKelas() {
        const opt = this.kelasOptions();
        if (!opt.includes(this.kelasSiswa)) this.kelasSiswa = opt[0] || "";
        return DataStore.getSiswa().filter(s => String(s.rombel || s.kelas) === this.kelasSiswa)
            .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    },

    async renderSiswa() {
        const el = document.getElementById("abs-tab-siswa");
        if (!el) return;
        const canEdit = Auth.canDo("saveAbsensiSiswaBulan");
        const opts = this.kelasOptions();
        if (!opts.includes(this.kelasSiswa)) this.kelasSiswa = opts[0] || "";

        if (!el.dataset.built) {
            el.dataset.built = "1";
            el.innerHTML = `
                <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-end justify-between gap-3">
                    <div class="flex items-end gap-3 flex-wrap">
                        <div><label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kelas / Rombel</label>
                            <select id="rs-kelas" class="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-medium"></select></div>
                        <div><label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bulan</label>
                            <input type="month" id="rs-bulan" class="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-medium"></div>
                        <div class="text-[11px] text-slate-500 pb-1.5"><span class="inline-block w-3 h-3 align-middle bg-[#7f7f7f] mr-1"></span> Minggu / libur
                            <span class="mx-2">•</span> kosong = hadir; klik sel: <b>S</b> → <b>I</b> → <b>A</b> → kosong</div>
                    </div>
                    <div class="flex gap-2 flex-wrap">
                        <button type="button" id="rs-save" onclick="ModulPresensi.simpanSiswa()" class="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"><i class="fa-solid fa-cloud-arrow-up"></i> Simpan Absensi</button>
                        <button type="button" onclick="ModulPresensi.cetakSiswa()" class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-2"><i class="fa-solid fa-print text-blue-600"></i> Cetak / PDF</button>
                        <button type="button" onclick="ModulPresensi.exportSiswaCSV()" class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-2"><i class="fa-solid fa-file-excel text-emerald-600"></i> CSV</button>
                    </div>
                </div>
                <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-auto mt-3" style="max-height:70vh"><div id="rs-grid" class="p-3"></div></div>`;
            el.querySelector("#rs-kelas").addEventListener("change", (e) => { this.kelasSiswa = e.target.value; this.renderSiswa(); });
            el.querySelector("#rs-bulan").addEventListener("change", (e) => { if (e.target.value) { this.bulanSiswa = e.target.value; this.renderSiswa(); } });
        }
        const sel = document.getElementById("rs-kelas");
        sel.innerHTML = opts.map(k => `<option value="${Sec.esc(k)}" ${k === this.kelasSiswa ? "selected" : ""}>Kelas ${Sec.esc(k)}</option>`).join("") || `<option value="">(belum ada siswa)</option>`;
        document.getElementById("rs-bulan").value = this.bulanSiswa;
        document.getElementById("rs-save").classList.toggle("hidden", !canEdit);

        const grid = document.getElementById("rs-grid");
        grid.innerHTML = `<div class="p-6 text-center text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin"></i> Memuat…</div>`;
        const res = await ApiClient.request("getAbsensiSiswaBulan", { tahunAjaran: DataStore.getActiveTA(), bulan: this.bulanSiswa, kelas: this.kelasSiswa });
        this.siswaMarks = {};
        (res.success ? res.data : []).forEach(r => { this.siswaMarks[r.nisn] = r.marks || {}; });
        this.siswaDirty = false;
        grid.innerHTML = this.buildSiswaTable(canEdit);
        grid.onclick = canEdit ? (e) => {
            const td = e.target.closest("td.cell");
            if (td) this.cycleMark(td);
        } : null;
    },

    buildSiswaTable() {
        const hari = this.hariBulan(this.bulanSiswa);
        const siswa = this.siswaKelas();
        const canEdit = Auth.canDo("saveAbsensiSiswaBulan");
        let html = `<table class="abs-grid"><thead>
            <tr><th rowspan="2">NO</th><th rowspan="2" style="min-width:210px">NAMA</th><th rowspan="2">NISN</th><th colspan="${hari.length}">TANGGAL</th><th rowspan="2">S</th><th rowspan="2">I</th><th rowspan="2">A</th><th rowspan="2">JML</th></tr>
            <tr>${hari.map(h => `<th class="${h.off ? "off" : ""}" title="${Sec.esc(h.ket)}">${h.dd}</th>`).join("")}</tr></thead><tbody>`;

        if (siswa.length === 0) html += `<tr><td colspan="${hari.length + 7}" style="padding:18px">Belum ada siswa pada kelas/TA ini. Impor data siswa terlebih dahulu.</td></tr>`;

        siswa.forEach((s, i) => {
            const marks = this.siswaMarks[s.nisn] || {};
            let S = 0, I = 0, A = 0;
            const tds = hari.map(h => {
                const mk = h.off ? "" : (marks[h.dd] || "");
                if (mk === "S") S++; else if (mk === "I") I++; else if (mk === "A") A++;
                if (h.off) return `<td class="off"></td>`;
                return `<td class="${canEdit ? "cell" : ""}${mk ? " mk-" + mk : ""}" data-nisn="${s.nisn}" data-d="${h.dd}">${mk}</td>`;
            }).join("");
            html += `<tr><td>${i + 1}</td><td class="nama">${Sec.esc(s.nama)}</td><td style="font-size:9px">${Sec.esc(s.nisn)}</td>${tds}
                <td data-sum="S">${S || ""}</td><td data-sum="I">${I || ""}</td><td data-sum="A">${A || ""}</td><td data-sum="J"><b>${(S + I + A) || ""}</b></td></tr>`;
        });
        return html + `</tbody></table>`;
    },

    cycleMark(td) {
        const nisn = td.dataset.nisn, d = td.dataset.d;
        const order = ["", "S", "I", "A"];
        const cur = (this.siswaMarks[nisn] || {})[d] || "";
        const next = order[(order.indexOf(cur) + 1) % order.length];
        if (!this.siswaMarks[nisn]) this.siswaMarks[nisn] = {};
        if (next) this.siswaMarks[nisn][d] = next; else delete this.siswaMarks[nisn][d];

        td.textContent = next;
        td.className = `cell${next ? " mk-" + next : ""}`;
        this.siswaDirty = true;

        // perbarui total baris
        const tr = td.parentElement;
        const marks = this.siswaMarks[nisn];
        const cnt = k => Object.values(marks).filter(v => v === k).length;
        const [S, I, A] = [cnt("S"), cnt("I"), cnt("A")];
        tr.querySelector('[data-sum="S"]').textContent = S || "";
        tr.querySelector('[data-sum="I"]').textContent = I || "";
        tr.querySelector('[data-sum="A"]').textContent = A || "";
        tr.querySelector('[data-sum="J"]').innerHTML = `<b>${(S + I + A) || ""}</b>`;
    },

    async simpanSiswa() {
        const siswa = this.siswaKelas();
        if (siswa.length === 0) { App.showToast("Tidak ada siswa untuk disimpan.", "warning"); return; }
        const btn = document.getElementById("rs-save");
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan…`;
        const res = await ApiClient.request("saveAbsensiSiswaBulan", {
            tahunAjaran: DataStore.getActiveTA(), bulan: this.bulanSiswa, kelas: this.kelasSiswa,
            rows: siswa.map(s => ({ nisn: s.nisn, nama: s.nama, marks: this.siswaMarks[s.nisn] || {} }))
        });
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Simpan Absensi`;
        if (res.success) { this.siswaDirty = false; App.showToast(res.message, "success"); }
        else App.showToast(res.message || "Gagal menyimpan absensi.", "error");
    },

    cetakSiswa() {
        const body = this.kop(["ABSENSI GURU KELAS", `KELAS ${this.kelasSiswa}`, `BULAN : ${Util.labelBulan(this.bulanSiswa)}`])
            + this.buildSiswaTable() + this.ttdBlok("Guru Kelas");
        this.printHtml(`Absensi Kelas ${this.kelasSiswa} ${this.bulanSiswa}`, body, true);
    },

    exportSiswaCSV() {
        const hari = this.hariBulan(this.bulanSiswa);
        const lines = [["No", "Nama", "NISN", ...hari.map(h => h.dd), "S", "I", "A", "JML"].map(Sec.csvCell).join(",")];
        this.siswaKelas().forEach((s, i) => {
            const marks = this.siswaMarks[s.nisn] || {};
            let S = 0, I = 0, A = 0;
            const cells = hari.map(h => {
                const m = h.off ? "" : (marks[h.dd] || "");
                if (m === "S") S++; else if (m === "I") I++; else if (m === "A") A++;
                return m;
            });
            lines.push([i + 1, s.nama, s.nisn, ...cells, S, I, A, S + I + A].map(Sec.csvCell).join(","));
        });
        this.download(`ABSENSI_KELAS_${this.kelasSiswa}_${this.bulanSiswa}.csv`, "\uFEFF" + lines.join("\n"));
    },

    // ===================================================================== 4. KARTU ID QR
    qrPayload(t) { return `SIMTAS|T|${Util.cleanId(t.nip)}`; },

    // Hasilkan PNG (data URL) dari teks QR
    qrDataUrl(text, size = 256) {
        return new Promise((resolve) => {
            if (typeof QRCode === "undefined") { resolve(""); return; }
            const holder = document.createElement("div");
            holder.style.cssText = "position:fixed;left:-9999px;top:0";
            document.body.appendChild(holder);
            new QRCode(holder, { text, width: size, height: size, correctLevel: QRCode.CorrectLevel.H });
            setTimeout(() => {
                const canvas = holder.querySelector("canvas");
                const img = holder.querySelector("img");
                const url = canvas ? canvas.toDataURL("image/png") : (img ? img.src : "");
                holder.remove();
                resolve(url);
            }, 60);
        });
    },

    async renderQR() {
        const el = document.getElementById("abs-tab-qr");
        if (!el) return;
        const list = DataStore.getTendik();
        el.innerHTML = `
            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div><h3 class="font-bold text-sm text-slate-900"><i class="fa-solid fa-id-card text-indigo-600 mr-1"></i> Kartu ID QR Guru & Tendik</h3>
                    <p class="text-xs text-slate-400 mt-0.5">QR tergenerate otomatis dari NIP (teks: <span class="font-mono">SIMTAS|T|NIP</span>). Cetak sebagai kartu, atau simpan ke Google Drive.</p></div>
                <div class="flex gap-2 flex-wrap">
                    <button type="button" onclick="ModulPresensi.openTendikForm()" class="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"><i class="fa-solid fa-user-plus"></i> Tambah Guru/Tendik</button>
                    <button type="button" onclick="ModulPresensi.cetakKartu()" class="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-2"><i class="fa-solid fa-print text-blue-600"></i> Cetak Semua Kartu</button>
                    <button type="button" id="btn-qr-drive" onclick="ModulPresensi.simpanQrDrive()" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"><i class="fa-brands fa-google-drive"></i> Simpan Semua QR ke Google Drive</button>
                </div>
            </div>
            <div id="qr-cards" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4"></div>`;

        const wrap = el.querySelector("#qr-cards");
        for (const t of list) {
            const url = await this.qrDataUrl(this.qrPayload(t), 200);
            const card = document.createElement("div");
            card.className = `bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-xs ${t.aktif === false ? "opacity-50" : ""}`;
            card.innerHTML = `
                <img src="${url}" alt="QR ${Sec.esc(t.nama)}" class="w-36 h-36 mx-auto">
                <div class="font-bold text-xs text-slate-900 mt-2">${Sec.esc(t.nama)}</div>
                <div class="text-[11px] text-slate-500">${Sec.esc(t.jabatan || "")}</div>
                <div class="font-mono text-[10px] text-slate-400 mt-0.5">${Sec.esc(this.qrPayload(t))}</div>
                <div class="flex justify-center gap-1.5 mt-3">
                    <a href="${url}" download="QR_${Sec.esc(Util.cleanId(t.nip))}.png" class="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg"><i class="fa-solid fa-download"></i> PNG</a>
                    <button type="button" onclick="ModulPresensi.openTendikForm('${Sec.esc(Util.cleanId(t.nip))}')" class="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg"><i class="fa-solid fa-pen"></i> Ubah</button>
                </div>`;
            wrap.appendChild(card);
        }
        if (list.length === 0) wrap.innerHTML = `<div class="col-span-full p-8 text-center text-xs text-slate-400">Belum ada guru/tendik. Klik "Tambah Guru/Tendik".</div>`;
    },

    async cetakKartu() {
        const c = DataStore.getConfig();
        const aktif = DataStore.getTendik().filter(t => t.aktif !== false);
        if (aktif.length === 0) { App.showToast("Belum ada data guru/tendik.", "warning"); return; }
        const cards = [];
        for (const t of aktif) {
            const url = await this.qrDataUrl(this.qrPayload(t), 300);
            cards.push(`<div class="card"><div class="s">${Sec.esc(String(c.namaSekolah || "").toUpperCase())}<br>KARTU PRESENSI</div>
                <img src="${url}" alt="QR"><div class="n">${Sec.esc(t.nama)}</div><div class="j">${Sec.esc(t.jabatan || "")}</div>
                <div class="id">${Sec.esc(this.qrPayload(t))}</div></div>`);
        }
        this.printHtml("Kartu ID QR", `<div class="cards">${cards.join("")}</div>`, false);
    },

    async simpanQrDrive() {
        const aktif = DataStore.getTendik().filter(t => t.aktif !== false);
        if (aktif.length === 0) return;
        const btn = document.getElementById("btn-qr-drive");
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan ke Drive…`;
        const files = [];
        for (const t of aktif) files.push({ nip: Util.cleanId(t.nip), nama: t.nama, base64: await this.qrDataUrl(this.qrPayload(t), 400) });
        const res = await ApiClient.request("saveQrFiles", { files });
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-brands fa-google-drive"></i> Simpan Semua QR ke Google Drive`;
        App.showToast(res.message || (res.success ? "QR tersimpan di Google Drive." : "Gagal menyimpan QR."), res.success ? "success" : "error");
    },

    // ---- form tambah/ubah guru & tendik ----
    openTendikForm(nip = "") {
        const t = nip ? DataStore.getTendik().find(x => Util.cleanId(x.nip) === nip) : null;
        let m = document.getElementById("modal-tendik");
        if (!m) {
            m = document.createElement("div");
            m.id = "modal-tendik";
            m.className = "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 hidden";
            document.body.appendChild(m);
        }
        const v = k => Sec.esc(t ? (t[k] || "") : "");
        m.innerHTML = `
            <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-3">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 class="font-bold text-sm text-slate-900">${t ? "Ubah" : "Tambah"} Guru / Tendik</h3>
                    <button type="button" onclick="document.getElementById('modal-tendik').classList.add('hidden')" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-lg"></i></button>
                </div>
                <div><label class="block text-xs font-semibold text-slate-700 mb-1">NIP / ID Pegawai <span class="text-red-500">*</span></label>
                    <input id="td-nip" ${t ? "readonly" : ""} value="${v("nip")}" maxlength="40" placeholder="19680512 199303 1 004" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono ${t ? "bg-slate-50" : ""}">
                    <p class="text-[10px] text-slate-400 mt-0.5">4–40 karakter huruf/angka (spasi diabaikan pada QR). Guru honorer tanpa NIP: gunakan ID unik, mis. GTT001.</p></div>
                <div><label class="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap <span class="text-red-500">*</span></label>
                    <input id="td-nama" value="${v("nama")}" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"></div>
                <div><label class="block text-xs font-semibold text-slate-700 mb-1">Jabatan</label>
                    <input id="td-jabatan" value="${v("jabatan")}" placeholder="Guru Kelas 3" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                        <select id="td-jk" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"><option ${t && t.jk === "Perempuan" ? "" : "selected"}>Laki-laki</option><option ${t && t.jk === "Perempuan" ? "selected" : ""}>Perempuan</option></select></div>
                    <div><label class="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                        <input id="td-status" value="${v("statusKepegawaian")}" placeholder="PNS / PPPK / Honorer" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"></div>
                </div>
                <label class="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" id="td-aktif" ${!t || t.aktif !== false ? "checked" : ""}> Aktif (ikut presensi)</label>
                <div class="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onclick="document.getElementById('modal-tendik').classList.add('hidden')" class="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold">Batal</button>
                    <button type="button" onclick="ModulPresensi.saveTendikForm()" class="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold">Simpan</button>
                </div>
            </div>`;
        m.classList.remove("hidden");
    },

    async saveTendikForm() {
        const g = id => document.getElementById(id).value.trim();
        const nip = g("td-nip");
        if (!/^[A-Za-z0-9._\- ]{4,50}$/.test(nip) || !/^[A-Za-z0-9._-]{4,40}$/.test(Util.cleanId(nip))) {
            App.showToast("NIP/ID harus 4–40 karakter huruf, angka, titik, atau strip.", "error");
            return;
        }
        if (!g("td-nama")) { App.showToast("Nama wajib diisi.", "error"); return; }
        const res = await ApiClient.request("saveTendik", {
            nip, nama: g("td-nama"), jabatan: g("td-jabatan"), jk: g("td-jk"),
            statusKepegawaian: g("td-status"), aktif: document.getElementById("td-aktif").checked
        });
        if (res.success) {
            document.getElementById("modal-tendik").classList.add("hidden");
            App.showToast(res.message, "success");
            this.renderQR();
        } else {
            App.showToast(res.message || "Gagal menyimpan.", "error");
        }
    }
};
