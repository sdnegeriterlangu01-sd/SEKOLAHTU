/* ==========================================================================
   SIM-TAS-SD: IMPOR DATA SISWA (EXCEL / CSV) + PERIODIK TAHUN AJARAN

   Format kolom mengikuti tabel referensi (Dapodik):
   No | Nama | NIPD | JK | NISN | Tempat Lahir | Tanggal Lahir | NIK | Agama | Alamat | RT | RW |
   Alamat (Dusun) | Kelurahan | Kecamatan | Kode Pos |
   Data Ayah: Nama, Tahun Lahir, Jenjang Pendidikan, Pekerjaan |
   Data Ibu : Nama, Tahun Lahir, Jenjang Pendidikan, Pekerjaan | Rombel Saat Ini

   - Judul kolom dikenali otomatis (urutan kolom bebas; mendukung header 1 atau 2 baris).
   - Data tersimpan PER TAHUN AJARAN (rombel saat ini = data periodik).
   - Library SheetJS dimuat hanya saat dibutuhkan (menjaga aplikasi tetap ringan).
   ========================================================================== */

const ModulImport = {
    XLSX_URL: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    BATCH: 150,
    parsed: null,
    _xlsxPromise: null,

    TEMPLATE_HEADERS: ["No", "Nama", "NIPD", "JK", "NISN", "Tempat Lahir", "Tanggal Lahir", "NIK", "Agama", "Alamat", "RT", "RW", "Alamat",
        "Kelurahan", "Kecamatan", "Kode Pos", "Nama", "Tahun Lahir", "Jenjang Pendidikan", "Pekerjaan", "Nama", "Tahun Lahir", "Jenjang Pendidikan", "Pekerjaan", "Rombel Saat Ini"],

    // alias judul kolom (sudah dinormalisasi: huruf kecil tanpa spasi/simbol) -> kunci kanonik
    ALIAS: {
        no: "no", nomor: "no",
        nama: "nama", namalengkap: "nama", namasiswa: "nama", namapesertadidik: "nama",
        nipd: "nipd", nis: "nipd",
        jk: "jk", jeniskelamin: "jk", lp: "jk",
        nisn: "nisn",
        tempatlahir: "tempatLahir",
        tanggallahir: "tanggalLahir", tgllahir: "tanggalLahir",
        nik: "nik",
        agama: "agama", agamakepercayaan: "agama",
        alamat: "alamat", alamatjalan: "alamat",
        rt: "rt", rw: "rw",
        dusun: "dusun", namadusun: "dusun",
        kelurahan: "kelurahan", desakelurahan: "kelurahan", desa: "kelurahan",
        kecamatan: "kecamatan",
        kodepos: "kodePos",
        tahunlahir: "tahunlahir", thnlahir: "tahunlahir",
        jenjangpendidikan: "pendidikan", pendidikan: "pendidikan",
        pekerjaan: "pekerjaan",
        rombelsaatini: "rombel", rombel: "rombel", rombonganbelajar: "rombel", kelas: "rombel",
        namaayah: "ayahNama", tahunlahirayah: "ayahTahunLahir", jenjangpendidikanayah: "ayahPendidikan", pekerjaanayah: "ayahPekerjaan",
        namaibu: "ibuNama", tahunlahiribu: "ibuTahunLahir", jenjangpendidikanibu: "ibuPendidikan", pekerjaanibu: "ibuPekerjaan"
    },

    // kolom yang berulang (Ayah lalu Ibu) dipetakan menurut urutan kemunculan
    ORDERED: {
        nama: ["nama", "ayahNama", "ibuNama"],
        tahunlahir: ["ayahTahunLahir", "ibuTahunLahir"],
        pendidikan: ["ayahPendidikan", "ibuPendidikan"],
        pekerjaan: ["ayahPekerjaan", "ibuPekerjaan"],
        alamat: ["alamat", "dusun"]
    },

    norm(s) { return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, ""); },

    // ===================================================== PEMUAT LIBRARY
    loadXlsx() {
        if (window.XLSX) return Promise.resolve(window.XLSX);
        if (this._xlsxPromise) return this._xlsxPromise;
        this._xlsxPromise = new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = this.XLSX_URL;
            s.crossOrigin = "anonymous";
            s.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error("Library Excel gagal dimuat."));
            s.onerror = () => { this._xlsxPromise = null; reject(new Error("Tidak dapat memuat library Excel (periksa koneksi internet).")); };
            document.head.appendChild(s);
        });
        return this._xlsxPromise;
    },

    // ===================================================== SELEKTOR TAHUN AJARAN
    renderTASelect() {
        const sel = document.getElementById("ta-select");
        if (!sel) return;
        const aktif = DataStore.getActiveTA();
        sel.innerHTML = DataStore.getTAList().map(t => `<option value="${t}" ${t === aktif ? "selected" : ""}>TA ${t}</option>`).join("")
            + (Auth.canDo("importStudents") ? `<option value="__new__">+ Tambah tahun ajaran…</option>` : "");
        sel.onchange = () => this.onTAChange(sel.value);

        document.querySelectorAll(".ta-aktif-text").forEach(el => el.textContent = aktif);
    },

    onTAChange(value) {
        if (value === "__new__") {
            const input = prompt("Masukkan tahun ajaran baru (format 2027/2028):", "");
            const ta = (input || "").trim();
            if (!ta) { this.renderTASelect(); return; }
            if (!this.validTA(ta)) { App.showToast("Format tahun ajaran harus seperti 2027/2028.", "error"); this.renderTASelect(); return; }
            DataStore.addTA(ta);
            value = ta;
        }
        DataStore.setActiveTA(value);
        this.renderTASelect();
        App.refreshAll();
        App.showToast(`Tahun ajaran aktif: ${value}`, "info");
    },

    validTA(ta) {
        const m = /^(\d{4})\/(\d{4})$/.exec(ta);
        return !!m && Number(m[2]) === Number(m[1]) + 1;
    },

    nextTA(ta) {
        const m = /^(\d{4})\/(\d{4})$/.exec(ta || "");
        return m ? `${Number(m[1]) + 1}/${Number(m[2]) + 1}` : "";
    },

    // ===================================================== MODAL IMPOR
    ensureModal() {
        if (document.getElementById("modal-import-siswa")) return;
        const div = document.createElement("div");
        div.id = "modal-import-siswa";
        div.className = "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 hidden";
        div.innerHTML = `
            <div class="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                        <h3 class="font-bold text-sm text-slate-900"><i class="fa-solid fa-file-import text-blue-600 mr-1"></i> Impor Data Siswa dari Excel / CSV</h3>
                        <p class="text-xs text-slate-400 mt-0.5">Tanpa input manual — unggah tabel data siswa yang sudah Anda miliki.</p>
                    </div>
                    <button type="button" onclick="ModulImport.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark text-lg"></i></button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Tahun Ajaran Tujuan</label>
                        <select id="imp-ta" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"></select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Jika NISN sudah ada</label>
                        <select id="imp-mode" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg">
                            <option value="update">Perbarui datanya</option>
                            <option value="skip">Lewati (jangan ubah)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Kelas bila Rombel kosong</label>
                        <select id="imp-kelas-default" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg">
                            <option value="">— Tandai sebagai kesalahan —</option>
                            ${[1, 2, 3, 4, 5, 6].map(k => `<option value="${k}">Kelas ${k}</option>`).join("")}
                        </select>
                    </div>
                </div>

                <div class="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition cursor-pointer" onclick="document.getElementById('imp-file').click()">
                    <i class="fa-solid fa-cloud-arrow-up text-3xl text-slate-400 mb-2"></i>
                    <p class="text-sm font-semibold text-slate-700" id="imp-file-label">Pilih berkas .xlsx / .xls / .csv</p>
                    <p class="text-xs text-slate-400 mt-1">Judul kolom dikenali otomatis sesuai format tabel siswa (No, Nama, NIPD, JK, NISN, … Rombel Saat Ini)</p>
                </div>
                <input type="file" id="imp-file" accept=".xlsx,.xls,.csv" class="hidden" onchange="ModulImport.handleFile(event)">

                <div class="flex items-center justify-between text-xs">
                    <button type="button" onclick="ModulImport.downloadTemplate()" class="text-blue-600 hover:underline font-semibold"><i class="fa-solid fa-download mr-1"></i> Unduh template kolom</button>
                    <span class="text-slate-400">Maks. 2.000 baris per berkas</span>
                </div>

                <div id="imp-preview" class="hidden space-y-3"></div>

                <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button type="button" onclick="ModulImport.closeModal()" class="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50">Tutup</button>
                    <button type="button" id="imp-submit" disabled onclick="ModulImport.commit()" class="px-5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-2">
                        <i class="fa-solid fa-database"></i> Impor ke Sistem
                    </button>
                </div>
            </div>`;
        document.body.appendChild(div);
    },

    openModal() {
        if (!Auth.canDo("importStudents")) { App.showToast("Anda tidak memiliki izin mengimpor data siswa.", "error"); return; }
        this.ensureModal();
        this.parsed = null;

        const taSel = document.getElementById("imp-ta");
        const aktif = DataStore.getActiveTA();
        const list = DataStore.getTAList();
        const next = this.nextTA(list[list.length - 1]);
        if (next && !list.includes(next)) list.push(next);
        taSel.innerHTML = list.map(t => `<option value="${t}" ${t === aktif ? "selected" : ""}>${t}</option>`).join("");

        document.getElementById("imp-file").value = "";
        document.getElementById("imp-file-label").textContent = "Pilih berkas .xlsx / .xls / .csv";
        document.getElementById("imp-preview").classList.add("hidden");
        document.getElementById("imp-submit").disabled = true;
        document.getElementById("modal-import-siswa").classList.remove("hidden");
    },

    closeModal() {
        const m = document.getElementById("modal-import-siswa");
        if (m) m.classList.add("hidden");
    },

    // ===================================================== TEMPLATE
    async downloadTemplate() {
        const sample = ["1", "Contoh Nama Siswa", "2026001", "L", "0123456789", "Brebes", "2015-05-12", "3329011205150001", "Islam", "Jl. Raya Terlangu No. 1", "01", "02", "Dusun I",
            "Terlangu", "Brebes", "52212", "Nama Ayah", "1985", "SMA / sederajat", "Wiraswasta", "Nama Ibu", "1988", "SMP / sederajat", "Ibu Rumah Tangga", "3A"];
        try {
            const X = await this.loadXlsx();
            const ws = X.utils.aoa_to_sheet([this.TEMPLATE_HEADERS, sample]);
            ws["!cols"] = this.TEMPLATE_HEADERS.map(() => ({ wch: 18 }));
            const wb = X.utils.book_new();
            X.utils.book_append_sheet(wb, ws, "Data Siswa");
            X.writeFile(wb, "Template_Impor_Siswa_SIM-TAS-SD.xlsx");
        } catch (e) {
            const csv = [this.TEMPLATE_HEADERS, sample].map(r => r.map(Sec.csvCell).join(",")).join("\n");
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
            a.download = "Template_Impor_Siswa_SIM-TAS-SD.csv";
            a.click();
        }
    },

    // ===================================================== PARSING
    async handleFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { App.showToast("Ukuran berkas maksimal 10 MB.", "error"); return; }
        document.getElementById("imp-file-label").textContent = file.name;
        const prev = document.getElementById("imp-preview");
        prev.classList.remove("hidden");
        prev.innerHTML = `<div class="p-4 text-center text-xs text-slate-500"><i class="fa-solid fa-spinner fa-spin"></i> Membaca berkas...</div>`;

        try {
            const X = await this.loadXlsx();
            const buf = await file.arrayBuffer();
            const wb = X.read(buf, { type: "array", cellDates: true });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const aoa = X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "", blankrows: false });
            this.parsed = this.parseRows(aoa);
            this.renderPreview(file.name);
        } catch (err) {
            console.error(err);
            this.parsed = null;
            prev.innerHTML = `<div class="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">${Sec.esc(err.message)}</div>`;
            document.getElementById("imp-submit").disabled = true;
        }
    },

    parseRows(aoa) {
        if (!aoa || aoa.length === 0) throw new Error("Berkas kosong.");
        if (aoa.length > 2005) throw new Error("Jumlah baris melebihi 2.000. Bagi berkas menjadi beberapa bagian.");

        // 1. cari baris judul (mengandung NISN & Nama)
        let h = -1;
        for (let i = 0; i < Math.min(aoa.length, 15); i++) {
            const n = aoa[i].map(c => this.norm(c));
            if (n.includes("nisn") && n.some(x => x.startsWith("nama"))) { h = i; break; }
        }
        if (h < 0) throw new Error("Baris judul tidak ditemukan. Pastikan ada kolom 'NISN' dan 'Nama' (lihat template).");

        // 2. judul 2 baris? (sub-judul: Nama / Tahun Lahir / Jenjang Pendidikan / Pekerjaan)
        let dataStart = h + 1;
        let sub = null;
        if (aoa[h + 1]) {
            const n = aoa[h + 1].map(c => this.norm(c));
            if (n.some(x => ["tahunlahir", "jenjangpendidikan", "pekerjaan"].includes(x))) { sub = aoa[h + 1]; dataStart = h + 2; }
        }

        // 3. petakan kolom -> field
        const width = Math.max(aoa[h].length, sub ? sub.length : 0);
        const colMap = {};
        const seen = {};
        for (let c = 0; c < width; c++) {
            const label = this.norm(sub && sub[c] !== "" && sub[c] != null ? sub[c] : aoa[h][c]);
            let key = this.ALIAS[label];
            if (!key) continue;
            if (this.ORDERED[key]) {
                const idx = seen[key] || 0;
                seen[key] = idx + 1;
                key = this.ORDERED[key][idx];
                if (!key) continue;
            }
            if (!(key in colMap)) colMap[key] = c;
        }
        if (!("nisn" in colMap) || !("nama" in colMap)) throw new Error("Kolom NISN atau Nama tidak terbaca.");

        // 4. baca data
        const rows = [], errors = [], warnings = [];
        const nisnSeen = new Set();
        for (let r = dataStart; r < aoa.length; r++) {
            const line = aoa[r];
            const get = k => (k in colMap ? line[colMap[k]] : "");
            if (line.every(c => String(c).trim() === "")) continue;

            const excelRow = r + 1;
            const nama = Sec.clean(this.text(get("nama")));
            let nisn = this.digits(get("nisn"));
            if (!nama && !nisn) continue;
            if (nisn && nisn.length < 10) nisn = nisn.padStart(10, "0");

            if (!nama) { errors.push({ row: excelRow, msg: "Nama kosong." }); continue; }
            if (!/^\d{10}$/.test(nisn)) { errors.push({ row: excelRow, msg: `NISN tidak valid (${nisn || "kosong"}) — harus 10 digit.` }); continue; }
            if (nisnSeen.has(nisn)) { errors.push({ row: excelRow, msg: `NISN ${nisn} ganda di dalam berkas.` }); continue; }
            nisnSeen.add(nisn);

            const rombel = Sec.clean(this.text(get("rombel")));
            const kelasMatch = /([1-6])/.exec(rombel);
            const nik = this.digits(get("nik"));
            if (nik && nik.length !== 16) warnings.push(`Baris ${excelRow}: NIK ${nama} tidak 16 digit (cek format sel Excel — gunakan format Teks).`);

            const tgl = this.parseDate(get("tanggalLahir"));
            if (get("tanggalLahir") !== "" && !tgl) warnings.push(`Baris ${excelRow}: tanggal lahir ${nama} tidak terbaca.`);

            const rec = {
                nisn, nama,
                nipd: this.text(get("nipd")), nis: this.text(get("nipd")),
                jk: this.parseJK(get("jk")),
                tempatLahir: this.text(get("tempatLahir")),
                tanggalLahir: tgl || "",
                nik,
                agama: this.text(get("agama")),
                alamat: this.text(get("alamat")),
                rt: this.text(get("rt")), rw: this.text(get("rw")),
                dusun: this.text(get("dusun")),
                kelurahan: this.text(get("kelurahan")), kecamatan: this.text(get("kecamatan")),
                kodePos: this.digits(get("kodePos")),
                ayahNama: this.text(get("ayahNama")), ayahTahunLahir: this.parseYear(get("ayahTahunLahir")),
                ayahPendidikan: this.text(get("ayahPendidikan")), ayahPekerjaan: this.text(get("ayahPekerjaan")),
                ibuNama: this.text(get("ibuNama")), ibuTahunLahir: this.parseYear(get("ibuTahunLahir")),
                ibuPendidikan: this.text(get("ibuPendidikan")), ibuPekerjaan: this.text(get("ibuPekerjaan")),
                rombel,
                kelas: kelasMatch ? kelasMatch[1] : ""
            };
            rec.namaOrtu = rec.ayahNama || rec.ibuNama || "";
            rec.pekerjaanOrtu = rec.ayahPekerjaan || rec.ibuPekerjaan || "";

            // bersihkan semua string
            Object.keys(rec).forEach(k => { if (typeof rec[k] === "string") rec[k] = Sec.clean(rec[k]); });
            rec._row = excelRow;
            rows.push(rec);
        }

        if (rows.length === 0 && errors.length === 0) throw new Error("Tidak ada baris data siswa yang terbaca.");
        return { rows, errors, warnings, colMap };
    },

    // ----- konversi nilai -----
    text(v) {
        if (v == null) return "";
        if (typeof v === "number") return Number.isInteger(v) ? v.toFixed(0) : String(v);
        if (v instanceof Date) return Util.today(v);
        return String(v).trim();
    },
    digits(v) { return this.text(v).replace(/\D/g, ""); },
    parseJK(v) {
        const s = this.norm(v);
        if (s === "l" || s.startsWith("laki")) return "Laki-laki";
        if (s === "p" || s.startsWith("perem")) return "Perempuan";
        return "";
    },
    parseYear(v) {
        if (v instanceof Date) return String(v.getFullYear());
        const m = /(19|20)\d{2}/.exec(this.text(v));
        return m ? m[0] : "";
    },
    parseDate(v) {
        if (v === "" || v == null) return "";
        const fmt = (y, m, d) => (y >= 1980 && y <= 2035 && m >= 1 && m <= 12 && d >= 1 && d <= 31) ? `${y}-${Util.pad(m)}-${Util.pad(d)}` : "";
        if (v instanceof Date) {
            const d = new Date(v.getTime() + 12 * 3600 * 1000); // kompensasi pergeseran zona waktu SheetJS
            return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate());
        }
        if (typeof v === "number") {
            const d = new Date(Math.round((v - 25569) * 86400000));
            return fmt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
        }
        const s = String(v).trim();
        let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
        if (m) return fmt(+m[1], +m[2], +m[3]);
        m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s);
        if (m) return fmt(+m[3], +m[2], +m[1]);
        m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(s);
        if (m) {
            const idx = Util.NAMA_BULAN.findIndex(n => n.toLowerCase().startsWith(m[2].toLowerCase().substring(0, 3)));
            if (idx >= 0) return fmt(+m[3], idx + 1, +m[1]);
        }
        return "";
    },

    // ===================================================== PRATINJAU
    renderPreview() {
        const p = this.parsed;
        const el = document.getElementById("imp-preview");
        const ta = document.getElementById("imp-ta").value;
        const existing = new Set(DataStore.getSiswa(ta).map(s => s.nisn));
        const baru = p.rows.filter(r => !existing.has(r.nisn)).length;
        const ada = p.rows.length - baru;

        const chip = (label, val, cls) => `<div class="p-3 rounded-xl border ${cls}"><div class="text-[10px] font-bold uppercase opacity-70">${label}</div><div class="text-xl font-black">${val}</div></div>`;
        const colInfo = Object.keys(p.colMap).length;

        el.innerHTML = `
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                ${chip("Baris valid", p.rows.length, "bg-emerald-50 border-emerald-200 text-emerald-800")}
                ${chip("Siswa baru", baru, "bg-blue-50 border-blue-200 text-blue-800")}
                ${chip("Sudah ada", ada, "bg-amber-50 border-amber-200 text-amber-800")}
                ${chip("Bermasalah", p.errors.length, p.errors.length ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-slate-50 border-slate-200 text-slate-500")}
            </div>
            <p class="text-[11px] text-slate-500"><i class="fa-solid fa-table-columns mr-1"></i> ${colInfo} kolom dikenali otomatis. Baris bermasalah tidak diimpor.</p>

            <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-left text-[11px]">
                    <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider">
                        <tr><th class="px-3 py-2">NISN</th><th class="px-3 py-2">Nama</th><th class="px-3 py-2">JK</th><th class="px-3 py-2">Tempat, Tgl Lahir</th><th class="px-3 py-2">Ayah / Ibu</th><th class="px-3 py-2">Rombel</th><th class="px-3 py-2">Kelas</th></tr>
                    </thead>
                    <tbody>
                        ${p.rows.slice(0, 8).map(r => `
                            <tr class="border-t border-slate-100">
                                <td class="px-3 py-1.5 font-mono">${r.nisn}</td><td class="px-3 py-1.5 font-semibold">${r.nama}</td><td class="px-3 py-1.5">${r.jk || "-"}</td>
                                <td class="px-3 py-1.5">${r.tempatLahir || "-"}, ${r.tanggalLahir || "-"}</td>
                                <td class="px-3 py-1.5">${r.ayahNama || "-"} / ${r.ibuNama || "-"}</td>
                                <td class="px-3 py-1.5">${r.rombel || "-"}</td><td class="px-3 py-1.5">${r.kelas || "-"}</td>
                            </tr>`).join("")}
                    </tbody>
                </table>
                ${p.rows.length > 8 ? `<div class="px-3 py-1.5 text-[11px] text-slate-400 border-t border-slate-100">… dan ${p.rows.length - 8} baris lainnya</div>` : ""}
            </div>

            ${p.errors.length ? `
                <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 max-h-32 overflow-y-auto space-y-0.5">
                    <div class="font-bold mb-1">Baris yang dilewati:</div>
                    ${p.errors.slice(0, 30).map(e => `<div>Baris ${e.row}: ${Sec.esc(e.msg)}</div>`).join("")}
                    ${p.errors.length > 30 ? `<div>… ${p.errors.length - 30} lainnya</div>` : ""}
                </div>` : ""}
            ${p.warnings.length ? `
                <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 max-h-24 overflow-y-auto space-y-0.5">
                    <div class="font-bold mb-1">Peringatan (tetap diimpor):</div>
                    ${p.warnings.slice(0, 15).map(w => `<div>${Sec.esc(w)}</div>`).join("")}
                    ${p.warnings.length > 15 ? `<div>… ${p.warnings.length - 15} lainnya</div>` : ""}
                </div>` : ""}`;

        document.getElementById("imp-submit").disabled = p.rows.length === 0;
        document.getElementById("imp-ta").onchange = () => this.parsed && this.renderPreview();
    },

    // ===================================================== EKSEKUSI
    async commit() {
        if (!this.parsed || this.parsed.rows.length === 0) return;
        const ta = document.getElementById("imp-ta").value;
        const mode = document.getElementById("imp-mode").value;
        const kelasDefault = document.getElementById("imp-kelas-default").value;

        // tentukan kelas final
        const rows = [];
        const unresolved = [];
        this.parsed.rows.forEach(r => {
            const rec = { ...r };
            delete rec._row;
            if (!rec.kelas && kelasDefault) { rec.kelas = kelasDefault; if (!rec.rombel) rec.rombel = kelasDefault; }
            if (!rec.kelas) { unresolved.push(r); return; }
            if (!rec.rombel) rec.rombel = rec.kelas;
            rows.push(rec);
        });
        if (unresolved.length) {
            const contoh = unresolved.slice(0, 3).map(r => `baris ${r._row}`).join(", ");
            App.showToast(`${unresolved.length} siswa tanpa Rombel/Kelas (${contoh}…). Isi kolom Rombel atau pilih 'Kelas bila Rombel kosong'.`, "error");
            return;
        }
        if (!this.validTA(ta)) { App.showToast("Tahun ajaran tujuan tidak valid.", "error"); return; }

        const btn = document.getElementById("imp-submit");
        btn.disabled = true;
        let added = 0, updated = 0, skipped = 0, failed = 0;

        for (let i = 0; i < rows.length; i += this.BATCH) {
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengimpor ${Math.min(i + this.BATCH, rows.length)} / ${rows.length}…`;
            const res = await ApiClient.request("importStudents", { tahunAjaran: ta, mode, rows: rows.slice(i, i + this.BATCH) });
            if (res.success) {
                added += (res.data && res.data.added) || 0;
                updated += (res.data && res.data.updated) || 0;
                skipped += (res.data && res.data.skipped) || 0;
            } else {
                failed += Math.min(this.BATCH, rows.length - i);
                App.showToast(res.message || "Sebagian data gagal diimpor.", "error");
                break;
            }
        }

        btn.innerHTML = `<i class="fa-solid fa-database"></i> Impor ke Sistem`;
        btn.disabled = false;

        if (failed === 0) {
            DataStore.addTA(ta);
            DataStore.setActiveTA(ta);
            this.closeModal();
            this.renderTASelect();
            App.refreshAll();
            App.showToast(`Impor selesai (TA ${ta}): ${added} baru, ${updated} diperbarui, ${skipped} dilewati.`, "success");
        }
    },

    // ===================================================== KENAIKAN KELAS (TA BARU)
    // Menyalin siswa dari TA sumber ke TA tujuan dengan kelas +1 (kelas 6 dianggap lulus & tidak disalin).
    async promote(fromTA, toTA) {
        if (!Auth.canDo("importStudents")) { App.showToast("Tidak memiliki izin.", "error"); return; }
        if (!this.validTA(fromTA) || !this.validTA(toTA) || fromTA === toTA) { App.showToast("Tahun ajaran sumber/tujuan tidak valid.", "error"); return; }

        const source = DataStore.getSiswa(fromTA);
        if (source.length === 0) { App.showToast(`Tidak ada siswa pada TA ${fromTA}.`, "warning"); return; }

        let lulus = 0;
        const rows = [];
        source.forEach(s => {
            const k = parseInt(s.kelas, 10);
            if (!k || k >= 6) { lulus++; return; }
            const baru = String(k + 1);
            const rombelLama = String(s.rombel || s.kelas);
            const rombelBaru = rombelLama.startsWith(String(k)) ? baru + rombelLama.slice(String(k).length) : baru;
            const copy = JSON.parse(JSON.stringify(s));
            copy.kelas = baru;
            copy.rombel = rombelBaru;
            delete copy.tahunAjaran;
            rows.push(copy);
        });

        if (!confirm(`Salin ${rows.length} siswa dari TA ${fromTA} ke TA ${toTA} dengan kenaikan kelas otomatis?\n${lulus} siswa kelas 6 dianggap lulus dan tidak disalin.\n\nSiswa yang sudah ada di TA ${toTA} tidak diubah.`)) return;

        const res = await ApiClient.request("importStudents", { tahunAjaran: toTA, mode: "skip", rows });
        if (res.success) {
            DataStore.addTA(toTA);
            this.renderTASelect();
            App.refreshAll();
            App.showToast(`${res.message} (${lulus} siswa lulus tidak disalin). Atur siswa tinggal kelas dengan menyunting data siswa.`, "success");
        } else {
            App.showToast(res.message || "Gagal menaikkan kelas.", "error");
        }
    }
};
