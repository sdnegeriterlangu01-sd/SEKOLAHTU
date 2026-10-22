/* ==========================================================================
   SIM-TAS-SD: MODUL 3 - CETAK SURAT OTOMATIS (SELF-SERVICE LETTER < 5 DETIK)
   Fitur: Autocomplete Data Siswa, Placeholder Injection, QR-Code Keabsahan, Instant PDF
   ========================================================================== */

const ModulCetak = {
    selectedStudent: null,
    generatedNomorSurat: "",
    currentTemplateType: "aktif", // "aktif", "mutasi", "rekomendasi", "kelakuan"
    nomorMode: "terbit", // "terbit" | "baru" | "manual"
    selectedNomorTerbit: "",
    manualNomorSurat: "",
    activePermohonanId: null,
    activePermohonan: null,

    init() {
        this.populateStudentSelect();
        this.populateTASelect();
        this.populateNomorTerbitSelect();
        this.bindEvents();
        this.cleanupTruncatedNomorSurat();
        this.selectDefaultStudent();
    },

    cleanupTruncatedNomorSurat() {
        try {
            const pList = DataStore.getPermohonanSurat();
            let changed = false;
            pList.forEach(p => {
                if (p.nomorSuratTerbit === "421" || p.nomorSuratTerbit === "421.") {
                    const rawKet = p.keteranganTindak || p.keterangan || "";
                    const mS = rawKet.match(/SRIKANDI:\s*([^<>\r\n]+?)(?:\.?(?:\s+Silakan|\s*$|\.\s))/i);
                    if (mS) {
                        p.nomorSuratTerbit = mS[1].trim().replace(/\.+$/, "");
                        changed = true;
                    }
                }
            });
            if (changed) DataStore.savePermohonanSurat(pList);
        } catch (e) {}
    },

    bindEvents() {
        const selectStudent = document.getElementById("cetak-select-siswa");
        if (selectStudent) {
            selectStudent.addEventListener("change", (e) => {
                this.loadStudentData(e.target.value);
            });
        }

        const selectType = document.getElementById("cetak-jenis-surat");
        if (selectType) {
            selectType.addEventListener("change", (e) => {
                this.currentTemplateType = e.target.value;
                this.updateFormFieldsByTemplate();
                this.generatePreview();
            });
        }

        const inputKeperluan = document.getElementById("cetak-keperluan");
        if (inputKeperluan) {
            inputKeperluan.addEventListener("input", () => {
                this.generatePreview();
            });
        }
    },

    populateNomorTerbitSelect() {
        const select = document.getElementById("cetak-select-nomor-terbit");
        if (!select) return;

        const list = DataStore.getSuratKeluar();
        if (list.length === 0) {
            select.innerHTML = `<option value="">Belum ada nomor di buku register (Pilih 'Nomor Baru')</option>`;
            this.selectedNomorTerbit = "";
            return;
        }

        select.innerHTML = list.map(s => `
            <option value="${s.nomorSurat}">
                ${s.nomorSurat} - [${s.tujuan || 'Tanpa Tujuan'}] (${s.perihal || 'Tanpa Perihal'})
            </option>
        `).join("");

        if (!this.selectedNomorTerbit && list.length > 0) {
            this.selectedNomorTerbit = list[0].nomorSurat;
        }
        select.value = this.selectedNomorTerbit;
    },

    async setNomorMode(mode) {
        this.nomorMode = mode;
        if (window.VueStore) VueStore.cetakNomorMode = mode;
        const btnTerbit = document.getElementById("btn-mode-terbit");
        const btnBaru = document.getElementById("btn-mode-baru");
        const btnManual = document.getElementById("btn-mode-manual");

        const boxTerbit = document.getElementById("cetak-box-terbit");
        const boxBaru = document.getElementById("cetak-box-baru");
        const boxManual = document.getElementById("cetak-box-manual");

        [btnTerbit, btnBaru, btnManual].forEach(b => {
            if (b) {
                b.classList.remove("bg-white", "text-blue-700", "shadow-xs", "font-bold");
                b.classList.add("text-slate-600");
            }
        });

        boxTerbit?.classList.add("hidden");
        boxBaru?.classList.add("hidden");
        boxManual?.classList.add("hidden");

        if (mode === "terbit") {
            if (btnTerbit) {
                btnTerbit.classList.add("bg-white", "text-blue-700", "shadow-xs", "font-bold");
                btnTerbit.classList.remove("text-slate-600");
            }
            boxTerbit?.classList.remove("hidden");
            this.populateNomorTerbitSelect();
        } else if (mode === "baru") {
            if (btnBaru) {
                btnBaru.classList.add("bg-white", "text-blue-700", "shadow-xs", "font-bold");
                btnBaru.classList.remove("text-slate-600");
            }
            boxBaru?.classList.remove("hidden");
            try {
                const resNomor = await ApiClient.handleLocalFallback("getNextNomorSuratKeluar", { kodeKlasifikasi: "421.2" });
                this.generatedNomorSurat = resNomor.data.nomorSurat;
                const previewEl = document.getElementById("cetak-preview-baru");
                if (previewEl) previewEl.textContent = this.generatedNomorSurat;
            } catch (e) {
                console.warn("Gagal generate nomor baru:", e);
            }
        } else if (mode === "manual") {
            if (btnManual) {
                btnManual.classList.add("bg-white", "text-blue-700", "shadow-xs", "font-bold");
                btnManual.classList.remove("text-slate-600");
            }
            boxManual?.classList.remove("hidden");
            const inputManual = document.getElementById("cetak-input-manual");
            if (inputManual && !inputManual.value) {
                inputManual.value = this.manualNomorSurat || "421.2/001/SD/2026";
                this.manualNomorSurat = inputManual.value;
            }
        }

        if (this.selectedStudent) {
            this.generatePreview();
        }
    },

    onSelectNomorTerbit(val) {
        this.selectedNomorTerbit = val;
        this.generatePreview();
    },

    onInputManualNomor(val) {
        this.manualNomorSurat = val.trim();
        this.generatePreview();
    },

    populateStudentSelect() {
        const select = document.getElementById("cetak-select-siswa");
        if (!select) return;

        const students = DataStore.getSiswa();
        select.innerHTML = `<option value="">-- Pilih Siswa dari Database --</option>` +
            students.map(s => `<option value="${s.nisn}">${s.nama} (NISN: ${s.nisn} - Kelas ${s.kelas})</option>`).join("");
    },

    selectDefaultStudent() {
        const students = DataStore.getSiswa();
        if (students.length > 0) {
            this.loadStudentData(students[0].nisn);
            const select = document.getElementById("cetak-select-siswa");
            if (select) select.value = students[0].nisn;
        }
    },

    loadStudentData(nisn) {
        if (!nisn) {
            this.selectedStudent = null;
            return;
        }
        const students = DataStore.getSiswa();
        this.selectedStudent = students.find(s => s.nisn === nisn);
        const selectTA = document.getElementById("cetak-select-ta");
        if (selectTA && this.selectedStudent && this.selectedStudent.tahunAjaran) {
            selectTA.value = this.selectedStudent.tahunAjaran;
        }
        this.updateFormFieldsByTemplate();
        this.generatePreview();
    },

    populateTASelect() {
        const select = document.getElementById("cetak-select-ta");
        if (!select) return;

        const taList = (DataStore.getTAList ? DataStore.getTAList() : []);
        const activeTA = (DataStore.getActiveTA ? DataStore.getActiveTA() : "") || (DataStore.getConfig && DataStore.getConfig().tahunAjaranAktif) || Util.defaultTahunAjaran();
        if (!taList.includes(activeTA)) taList.push(activeTA);

        select.innerHTML = taList.map(ta => `
            <option value="${ta}" ${ta === activeTA ? 'selected' : ''}>Tahun Ajaran ${ta}</option>
        `).join("");

        if (this.selectedStudent && this.selectedStudent.tahunAjaran && taList.includes(this.selectedStudent.tahunAjaran)) {
            select.value = this.selectedStudent.tahunAjaran;
        }
    },

    getTahunAjaranSurat() {
        const select = document.getElementById("cetak-select-ta");
        if (select && select.value) return select.value;
        if (this.selectedStudent && this.selectedStudent.tahunAjaran) return this.selectedStudent.tahunAjaran;
        return (DataStore.getActiveTA ? DataStore.getActiveTA() : "") || (DataStore.getConfig && DataStore.getConfig().tahunAjaranAktif) || Util.defaultTahunAjaran();
    },

    formatFullDateIndo(dateStr) {
        if (!dateStr) return "-";
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        if (typeof dateStr === "string" && dateStr.includes("-")) {
            const parts = dateStr.split("T")[0].split("-");
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 0 && m < 12) {
                    return `${d} ${namaBulan[m]} ${y}`;
                }
            }
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return `${d.getDate()} ${namaBulan[d.getMonth()]} ${d.getFullYear()}`;
        }
        return dateStr;
    },

    formatKelasRomawiDanTeks(kelas) {
        const k = String(kelas || "").replace(/\D/g, "");
        const romawi = { "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V", "6": "VI" };
        const teks = { "1": "Satu", "2": "Dua", "3": "Tiga", "4": "Empat", "5": "Lima", "6": "Enam" };
        if (romawi[k]) {
            return `${romawi[k]} ( ${teks[k]} )`;
        }
        return `Kelas ${kelas || '1'}`;
    },

    renderNssBoxes(nssStr = "101032916052") {
        const digits = String(nssStr).replace(/\s+/g, "").padEnd(12, " ").substring(0, 12).split("");
        return `<span style="display:inline-flex;border-left:1px solid #000;vertical-align:middle;">` +
            digits.map(d => `<span style="display:inline-block;width:19px;height:22px;line-height:22px;border:1px solid #000;border-left:none;text-align:center;font-weight:bold;font-size:11pt;font-family:monospace;background:#fff;">${d === ' ' ? '&nbsp;' : d}</span>`).join("") +
            `</span>`;
    },

    renderBlankNssBoxes(count = 12) {
        return `<span style="display:inline-flex;border-left:1px solid #000;vertical-align:middle;">` +
            Array.from({ length: count }).map(() => `<span style="display:inline-block;width:19px;height:22px;border:1px solid #000;border-left:none;background:#fff;"></span>`).join("") +
            `</span>`;
    },

    onSelectTemplate(type) {
        this.currentTemplateType = type;
        const select = document.getElementById("cetak-jenis-surat") || document.getElementById("cetak-select-template");
        if (select) {
            select.value = type;
        }
        this.updateFormFieldsByTemplate();
        this.generatePreview();
    },

    renderKopHtml(config) {
        const alamatSekolah = config.alamat || "Jl. Raya Terlangu, Desa Terlangu";
        const telpSekolah = config.telepon && config.telepon !== '-' ? ` | Telp: ${config.telepon}` : '';
        const kodePosSekolah = config.kodePos ? ` | Kode Pos: ${config.kodePos}` : '';
        const npsnSekolah = config.npsn || "20326713";
        const akreditasiSekolah = config.akreditasi ? ` • Akreditasi: ${config.akreditasi}` : '';
        const websiteSekolah = config.website && config.website.trim() ? ` • Website: ${config.website.trim()}` : '';
        const emailSekolah = config.email && config.email.trim() ? ` • Email: ${config.email.trim()}` : '';

        return `
            <div class="kop-header">
                <!-- Logo Resmi Kabupaten Brebes -->
                <img src="assets/img/logo-brebes.svg" 
                    onerror="this.onerror=null; this.src='https://id.wikipedia.org/wiki/Berkas:Seal_of_Brebes_Regency.svg';"
                    alt="Logo Kabupaten Brebes" class="kop-logo">
                <div class="kop-teks">
                    <h4 class="instansi-1">PEMERINTAH KABUPATEN BREBES</h4>
                    <h3 class="instansi-2">DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA</h3>
                    <h4 class="instansi-3">UPT SATUAN PENDIDIKAN</h4>
                    <h2 class="sekolah-nama">${(config.namaSekolah || "SD NEGERI TERLANGU 01").toUpperCase()}</h2>
                    <h5 class="sekolah-kec">KECAMATAN BREBES</h5>
                    <p class="kop-alamat">Alamat: ${alamatSekolah}${telpSekolah}${kodePosSekolah}</p>
                    <p class="kop-kontak">NPSN: ${npsnSekolah}${akreditasiSekolah}${websiteSekolah}${emailSekolah}</p>
                </div>
            </div>
        `;
    },

    updateFormFieldsByTemplate() {
        const type = this.currentTemplateType;
        const keperluanInput = document.getElementById("cetak-keperluan");
        const extraFieldContainer = document.getElementById("cetak-extra-fields");

        if (type === "aktif") {
            if (keperluanInput) keperluanInput.value = "Persyaratan Administrasi Siswa Aktif Belajar";
            if (extraFieldContainer) extraFieldContainer.innerHTML = "";
        } else if (type === "mutasi") {
            if (keperluanInput) keperluanInput.value = "Mengikuti Orang Tua";
            if (extraFieldContainer) {
                const defaultSekolahTujuan = "SD Islam Al – Islamiyah Kelurahan Kalibaru Kecamatan Cilincing Kota Jakarta Utara";
                extraFieldContainer.innerHTML = `
                    <div class="space-y-2.5 mt-3 pt-3 border-t border-slate-200">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">Sekolah Tujuan Pindah</label>
                            <input type="text" id="cetak-sekolah-tujuan" value="${defaultSekolahTujuan}" oninput="ModulCetak.generatePreview()"
                                placeholder="Nama & alamat sekolah tujuan"
                                class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">Alasan Pindah</label>
                            <input type="text" id="cetak-alasan-pindah" value="Mengikuti Orang Tua" oninput="ModulCetak.generatePreview()"
                                placeholder="Contoh: Mengikuti Orang Tua"
                                class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">NSS Sekolah Asal (12 Digit)</label>
                            <input type="text" id="cetak-nss-sekolah" value="101032916052" maxlength="12" oninput="ModulCetak.generatePreview()"
                                class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold">
                        </div>
                    </div>
                `;
            }
        } else if (type === "rekomendasi") {
            if (keperluanInput) keperluanInput.value = "Mengikuti Seleksi Olimpiade Sains Nasional (OSN) / O2SN Tingkat Kota";
            if (extraFieldContainer) {
                extraFieldContainer.innerHTML = `
                    <div class="mt-3">
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Bidang / Prestasi Rekomendasi</label>
                        <input type="text" id="cetak-prestasi" value="Matematika & IPA Tingkat Sekolah Dasar" oninput="ModulCetak.generatePreview()"
                            class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                `;
            }
        } else if (type === "kelakuan") {
            if (keperluanInput) keperluanInput.value = "Persyaratan Pendaftaran Sekolah Lanjutan Tingkat Pertama (SMP)";
            if (extraFieldContainer) extraFieldContainer.innerHTML = "";
        } else if (type === "pip_pencairan") {
            if (keperluanInput) keperluanInput.value = "Aktivasi Rekening / Pencairan Dana Bantuan Program Indonesia Pintar (PIP)";
            if (extraFieldContainer && this.selectedStudent) {
                const pipRec = (DataStore.getPIPPenerima ? DataStore.getPIPPenerima() : []).find(p => p.nisn === this.selectedStudent.nisn) || {};
                extraFieldContainer.innerHTML = `
                    <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl mt-3 text-xs space-y-1.5">
                        <div class="font-bold text-blue-900 flex items-center gap-1.5">
                            <i class="fa-solid fa-database text-blue-600"></i> Data SK PIP Siswa (Otomatis):
                        </div>
                        <div class="text-[11px] text-slate-700">No. SK: <strong>${pipRec.nomorSK || '0345/P3KE/PIP/2026'}</strong></div>
                        <div class="text-[11px] text-slate-700">Tgl SK: <strong>${pipRec.tanggalSK || '2026-01-15'}</strong> • Tahap: <strong>${pipRec.tahap || 'Tahap 1'}</strong></div>
                        <div class="text-[11px] text-slate-700 font-mono">No. Rek: <strong>${pipRec.nomorRekening || this.selectedStudent.noRekSimpel || '0109-01-029384-50-8'}</strong> (${pipRec.bankPenyalur || 'BRI'})</div>
                        <div class="text-[11px] text-slate-700 font-mono">VA: <strong>${pipRec.virtualAcc || '8801090102938450'}</strong></div>
                    </div>
                `;
            }
        }
    },

    async generatePreview() {
        if (!this.selectedStudent) return;

        const config = DataStore.getConfig();
        const student = this.selectedStudent;
        const type = this.currentTemplateType;
        const keperluan = document.getElementById("cetak-keperluan")?.value || "-";

        // Tentukan Nomor Surat Berdasarkan Mode
        if (this.nomorMode === "terbit") {
            const list = DataStore.getSuratKeluar();
            if (this.selectedNomorTerbit) {
                this.generatedNomorSurat = this.selectedNomorTerbit;
            } else if (list.length > 0) {
                this.selectedNomorTerbit = list[0].nomorSurat;
                this.generatedNomorSurat = list[0].nomorSurat;
            } else {
                const resNomor = await ApiClient.handleLocalFallback("getNextNomorSuratKeluar", { kodeKlasifikasi: type === "mutasi" ? "041.2" : "421.2" });
                this.generatedNomorSurat = resNomor.data.nomorSurat;
            }
        } else if (this.nomorMode === "manual") {
            this.generatedNomorSurat = this.manualNomorSurat || (type === "mutasi" ? "041.2 / 025 / IX / 2026" : "421.2/001/SD/2026");
        } else {
            // Mode "baru" (otomatis increment mengikuti nomor surat tertinggi terakhir)
            const resNomor = await ApiClient.handleLocalFallback("getNextNomorSuratKeluar", { kodeKlasifikasi: type === "mutasi" ? "041.2" : "421.2" });
            this.generatedNomorSurat = resNomor.data.nomorSurat;
            const previewEl = document.getElementById("cetak-preview-baru");
            if (previewEl) previewEl.textContent = this.generatedNomorSurat;
        }

        // Tanggal Format Indonesia Lengkap
        const today = new Date();
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const tglStr = `${today.getDate()} ${namaBulan[today.getMonth()]} ${today.getFullYear()}`;

        // Format Tanggal Lahir Siswa Full Date (Contoh: 15 Agustus 2012)
        const tglLahirFull = this.formatFullDateIndo(student.tanggalLahir);

        // Basis URL Verifikasi Publik Online
        const PUBLIC_ONLINE_URL = "https://sdnegeriterlangu01-sd.github.io/SIM-TAS-SD/verifikasi.html";
        let baseUrl = PUBLIC_ONLINE_URL;
        try {
            if (window.location.protocol.startsWith("http") && !window.location.hostname.includes("localhost") && !window.location.hostname.includes("127.0.0.1")) {
                baseUrl = new URL("verifikasi.html", window.location.href).href.split("?")[0].split("#")[0];
            } else if (config.website && config.website.startsWith("http")) {
                baseUrl = `${config.website.replace(/\/+$/, '')}/verifikasi.html`;
            }
        } catch (e) {
            baseUrl = PUBLIC_ONLINE_URL;
        }

        const container = document.getElementById("kop-surat-print-area");
        if (!container) return;

        // Tentukan Judul Surat dan Konten Tambahan Berdasarkan Template
        const tahunAjaranSurat = this.getTahunAjaranSurat();
        let judulSurat = "SURAT KETERANGAN AKTIF BELAJAR";
        let kalimatIsi = `Adalah benar-benar siswa aktif terdaftar pada satuan pendidikan kami di <strong>Kelas ${student.kelas}</strong> pada Tahun Ajaran ${tahunAjaranSurat} dan bertingkah laku baik. Surat keterangan ini diterbitkan atas permintaan yang bersangkutan untuk keperluan: <strong>${keperluan}</strong>.`;
        let extraPipHtml = "";

        if (type === "pip_pencairan") {
            // Revisi Item 4: Judul Surat & Injeksi Data PIP Lengkap
            judulSurat = "SURAT KETERANGAN AKTIF BELAJAR DAN REKOMENDASI PENCAIRAN DANA PIP";
            const pipRec = (DataStore.getPIPPenerima ? DataStore.getPIPPenerima() : []).find(p => p.nisn === student.nisn) || {};
            const noRek = pipRec.nomorRekening || student.noRekSimpel || "0109-01-029384-50-8";
            const noSK = pipRec.nomorSK || "0345/P3KE/PIP/2026";
            const tglSK = pipRec.tanggalSK ? this.formatFullDateIndo(pipRec.tanggalSK) : "15 Januari 2026";
            const tahap = pipRec.tahap || "Tahap 1";
            const va = pipRec.virtualAcc || "8801090102938450";
            const bank = pipRec.bankPenyalur || "BRI";

            kalimatIsi = `Adalah benar-benar peserta didik aktif terdaftar pada satuan pendidikan kami di <strong>Kelas ${student.kelas}</strong> pada Tahun Ajaran ${tahunAjaranSurat}, serta tercatat secara sah sebagai <strong>Penerima Bantuan Program Indonesia Pintar (PIP)</strong> dengan data rincian sebagai berikut:`;

            extraPipHtml = `
                <table class="surat-table-data" style="margin-left: 20px; width: 95%; margin-top: 6px; margin-bottom: 8px;">
                    <tr>
                        <td style="width: 200px;">Nomor SK PIP</td>
                        <td style="width: 15px;">:</td>
                        <td><strong>${noSK}</strong></td>
                    </tr>
                    <tr>
                        <td>Tanggal SK PIP</td>
                        <td>:</td>
                        <td>${tglSK}</td>
                    </tr>
                    <tr>
                        <td>Tahap / Periode</td>
                        <td>:</td>
                        <td><strong>${tahap}</strong></td>
                    </tr>
                    <tr>
                        <td>Nomor Rekening</td>
                        <td>:</td>
                        <td><span class="font-mono font-bold">${noRek}</span> (Bank Penyalur: <strong>${bank}</strong>)</td>
                    </tr>
                    <tr>
                        <td>Virtual Account (VA)</td>
                        <td>:</td>
                        <td><span class="font-mono font-bold">${va}</span></td>
                    </tr>
                </table>
                <p class="surat-paragraf" style="margin-top: 8px; margin-bottom: 8px; text-indent: 32px; line-height: 1.5;">
                    Surat Keterangan Aktif Belajar dan Rekomendasi ini diterbitkan resmi dari satuan pendidikan untuk kelengkapan administrasi <strong>Aktivasi Rekening / Pencairan Dana Bantuan PIP</strong> bagi siswa yang bersangkutan.
                </p>
            `;
        } else if (type === "mutasi") {
            judulSurat = "SURAT KETERANGAN PINDAH SEKOLAH";
        } else if (type === "rekomendasi") {
            judulSurat = "SURAT REKOMENDASI SEKOLAH";
            const bidangPrestasi = document.getElementById("cetak-prestasi")?.value || "Bidang Akademik";
            kalimatIsi = `Diberikan rekomendasi resmi untuk mengikuti kegiatan / seleksi <strong>${bidangPrestasi}</strong> berdasarkan prestasi akademik, keaktifan belajar pada Tahun Ajaran ${tahunAjaranSurat}, dan integritas kepribadian yang bersangkutan selama menempuh pendidikan di sekolah kami.`;
        } else if (type === "kelakuan") {
            judulSurat = "SURAT KETERANGAN KELAKUAN BAIK";
            kalimatIsi = `Selama menempuh pendidikan di satuan pendidikan kami pada Tahun Ajaran ${tahunAjaranSurat}, siswa yang bersangkutan senantiasa berkelakuan baik, mematuhi tata tertib sekolah, dan tidak pernah terlibat dalam tindakan kriminalitas atau pelanggaran disiplin berat. Surat ini diterbitkan untuk: <strong>${keperluan}</strong>.`;
        }

        // Payload ringkas verifikasi mandiri QR
        const compactPayload = encodeURIComponent(JSON.stringify({
            no: this.generatedNomorSurat,
            nama: student.nama,
            nisn: student.nisn,
            kelas: student.kelas,
            perihal: `${judulSurat} an. ${student.nama}`,
            jenis: judulSurat,
            tgl: new Date().toISOString().split('T')[0],
            sekolah: config.namaSekolah || "SD NEGERI TERLANGU 01",
            npsn: config.npsn || "20326713",
            kepsek: config.namaKepalaSekolah,
            nipKepsek: config.nipKepalaSekolah
        }));
        const verifyUrl = `${baseUrl}?no=${encodeURIComponent(this.generatedNomorSurat)}&d=${compactPayload}`;

        // =========================================================================
        // TEMPLATE 1: SURAT KETERANGAN PINDAH SEKOLAH (DENGAN KOP RESMI)
        // =========================================================================
        if (type === "mutasi") {
            const sekolahTujuan = document.getElementById("cetak-sekolah-tujuan")?.value || "SD Islam Al – Islamiyah Kelurahan Kalibaru Kecamatan Cilincing Kota Jakarta Utara";
            const alasanPindah = document.getElementById("cetak-alasan-pindah")?.value || document.getElementById("cetak-keperluan")?.value || "Mengikuti Orang Tua";
            const nssSekolah = document.getElementById("cetak-nss-sekolah")?.value || config.nss || "101032916052";
            const nssBoxes = this.renderNssBoxes(nssSekolah);
            const blankNssBoxes = this.renderBlankNssBoxes(12);

            const kecClean = (config.kecamatan || "Kecamatan Brebes").replace(/^Kecamatan\s*/i, "");
            const kabClean = (config.kabupatenKota || "Kabupaten Brebes").replace(/^(Kabupaten|Kota)\s*/i, "");

            container.innerHTML = `
                <!-- Kop Surat Resmi (Sesuai Template Surat Lainnya) -->
                ${this.renderKopHtml(config)}

                <div style="font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.4; padding: 0 5px; font-size: 10.5pt;">
                    <!-- NSS Pojok Kanan Atas Sesuai Format Kedinasan -->
                    <div style="text-align: right; margin-bottom: 6px; font-size: 10pt;">
                        <span style="font-weight: normal; margin-right: 4px;">NSS : </span>
                        ${nssBoxes}
                    </div>

                    <!-- Judul Surat Mutasi -->
                    <div style="text-align: center; margin-bottom: 12px;">
                        <h3 style="font-size: 12.5pt; font-weight: bold; margin: 0; padding: 0; text-decoration: underline; letter-spacing: 0.5px;">SURAT KETERANGAN PINDAH SEKOLAH</h3>
                        <p style="font-size: 10.5pt; margin: 3px 0 0 0;">Nomor : <span class="font-bold font-mono">${this.generatedNomorSurat}</span></p>
                    </div>

                    <!-- Paragraf Pembuka -->
                    <p style="text-align: justify; margin-bottom: 6px; line-height: 1.4; text-indent: 0; font-size: 10.5pt;">
                        Yang bertanda tangan di bawah ini Kepala ${config.namaSekolah} Dinas Pendidikan Pemuda dan Olahraga Kecamatan ${kecClean} Kabupaten ${kabClean} Provinsi ${config.provinsi || "Jawa Tengah"}, menerangkan bahwa :
                    </p>

                    <!-- Identitas Siswa -->
                    <table style="width: 100%; border-collapse: collapse; margin-left: 0; margin-bottom: 4px; font-size: 10.5pt; line-height: 1.35;">
                        <tr>
                            <td style="width: 175px; vertical-align: top;">Nama</td>
                            <td style="width: 18px; vertical-align: top;">:</td>
                            <td style="vertical-align: top;"><strong>${student.nama}</strong></td>
                        </tr>
                        <tr>
                            <td style="vertical-align: top;">Kelas</td>
                            <td style="vertical-align: top;">:</td>
                            <td style="vertical-align: top;">${this.formatKelasRomawiDanTeks(student.kelas)}</td>
                        </tr>
                        <tr>
                            <td style="vertical-align: top;">NISN / NIS</td>
                            <td style="vertical-align: top;">:</td>
                            <td style="vertical-align: top;"><span class="font-mono">${student.nisn}</span> ${student.nis ? `/ <span class="font-mono">${student.nis}</span>` : ''}</td>
                        </tr>
                        <tr>
                            <td style="vertical-align: top;">Jenis Kelamin</td>
                            <td style="vertical-align: top;">:</td>
                            <td style="vertical-align: top;">${student.jk}</td>
                        </tr>
                        <tr>
                            <td style="vertical-align: top;">Alamat</td>
                            <td style="vertical-align: top;">:</td>
                            <td style="vertical-align: top;">${student.alamat || '-'}</td>
                        </tr>
                        <tr>
                            <td colspan="3" style="padding-top: 4px; vertical-align: top;">Sesuai permohonan pindah orang tuanya :</td>
                        </tr>
                        <tr>
                            <td style="vertical-align: top;">Nama</td>
                            <td style="vertical-align: top;">:</td>
                            <td style="vertical-align: top;">${student.namaOrtu || '-'}</td>
                        </tr>
                        <tr>
                            <td style="vertical-align: top;">Pekerjaan</td>
                            <td style="vertical-align: top;">:</td>
                            <td style="vertical-align: top;">${student.pekerjaanOrtu || 'Ibu Rumah Tangga'}</td>
                        </tr>
                    </table>

                    <!-- Keterangan Pindah & Buku Raport -->
                    <p style="text-align: justify; margin-top: 4px; margin-bottom: 3px; line-height: 1.35; font-size: 10.5pt;">
                        Telah mengajukan pindah ke <strong>${sekolahTujuan}</strong> dengan alasan <strong>${alasanPindah}</strong>.
                    </p>
                    <p style="margin-top: 3px; margin-bottom: 8px; line-height: 1.35; font-size: 10.5pt;">
                        Bersama ini kami sertakan Buku Raport yang bersangkutan.
                    </p>

                    <!-- Tanda Tangan & QR Code Keabsahan Mutasi -->
                    <div class="surat-ttd-container" style="margin-top: 4px; margin-bottom: 8px;">
                        <div class="qr-verification-badge" style="display: flex; align-items: center; gap: 8px;">
                            <div id="qrcode-container" style="background: #ffffff; padding: 3px; border: 1px solid #cbd5e1; border-radius: 6px; width: 85px; height: 85px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"></div>
                            <div class="qr-text" style="max-width: 150px; text-align: left;">
                                <strong style="color: #0f172a; display: block; font-size: 8pt;">DOKUMEN TERVERIFIKASI</strong>
                                <span style="font-size: 6.5pt; color: #475569; display: block; margin-top: 1px;">Pindai QR-Code untuk verifikasi keaslian surat mutasi.</span>
                                <span style="font-family: monospace; font-size: 6.5pt; color: #1e3a8a; font-weight: bold; display: block; margin-top: 2px;">No: ${this.generatedNomorSurat}</span>
                            </div>
                        </div>

                        <div class="surat-ttd-box" style="text-align: left; width: 250px;">
                            <p style="margin: 0 0 2px 0; font-size: 10.5pt;">${kabClean}, ${tglStr}</p>
                            <p style="margin: 0 0 45px 0; font-weight: bold; font-size: 10.5pt;">Kepala Sekolah,</p>
                            <p style="font-weight: bold; text-decoration: underline; margin: 0 0 1px 0; font-size: 10.5pt;">${config.namaKepalaSekolah}</p>
                            <p style="margin: 0; font-size: 10pt; font-family: 'Times New Roman';">NIP. ${config.nipKepalaSekolah}</p>
                        </div>
                    </div>

                    <!-- Garis Gunting Potongan Sesuai Format Resmi -->
                    <div style="margin-top: 6px; padding-top: 3px; border-top: 1px dashed #000;">
                        <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 3px;">
                            <span style="font-size: 11pt;">✂</span>
                            <span style="border-top: 1px dotted #555; flex-grow: 1;"></span>
                        </div>
                        <p style="font-size: 9.5pt; font-style: italic; margin: 0 0 4px 0;">
                            Setelah anak diterima di sekolah ini, isian di bawah ini harap dikirim kembali pada kami.
                        </p>

                        <!-- NSS Sekolah Penerima -->
                        <div style="text-align: right; margin-bottom: 4px; font-size: 9.5pt;">
                            <span style="margin-right: 4px;">NSS : </span>
                            ${blankNssBoxes}
                        </div>

                        <!-- Form Isian Sekolah Penerima -->
                        <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; line-height: 1.3;">
                            <tr>
                                <td style="width: 150px; padding: 1px 0;">Nama Sekolah</td>
                                <td style="width: 15px; padding: 1px 0;">:</td>
                                <td style="padding: 1px 0; letter-spacing: 1px;">...........................................................................................</td>
                            </tr>
                            <tr>
                                <td style="padding: 1px 0;">Status Sekolah</td>
                                <td style="padding: 1px 0;">:</td>
                                <td style="padding: 1px 0; letter-spacing: 1px;">...........................................................................................</td>
                            </tr>
                            <tr>
                                <td style="padding: 1px 0;">Alamat</td>
                                <td style="padding: 1px 0;">:</td>
                                <td style="padding: 1px 0; letter-spacing: 1px;">...........................................................................................</td>
                            </tr>
                            <tr>
                                <td style="padding: 1px 0;">Desa</td>
                                <td style="padding: 1px 0;">:</td>
                                <td style="padding: 1px 0; letter-spacing: 1px;">...........................................................................................</td>
                            </tr>
                            <tr>
                                <td style="padding: 1px 0;">Kecamatan</td>
                                <td style="padding: 1px 0;">:</td>
                                <td style="padding: 1px 0; letter-spacing: 1px;">...........................................................................................</td>
                            </tr>
                            <tr>
                                <td style="padding: 1px 0;">Kabupaten</td>
                                <td style="padding: 1px 0;">:</td>
                                <td style="padding: 1px 0; letter-spacing: 1px;">...........................................................................................</td>
                            </tr>
                            <tr>
                                <td style="padding: 1px 0;">Nama Siswa</td>
                                <td style="padding: 1px 0;">:</td>
                                <td style="padding: 1px 0; letter-spacing: 1px;">...........................................................................................</td>
                            </tr>
                            <tr>
                                <td style="padding: 1px 0;">Diterima di kelas</td>
                                <td style="padding: 1px 0;">:</td>
                                <td style="padding: 1px 0; letter-spacing: 1px;">...........................................................................................</td>
                            </tr>
                            <tr>
                                <td style="padding: 1px 0;">Diterima tanggal</td>
                                <td style="padding: 1px 0;">:</td>
                                <td style="padding: 1px 0; letter-spacing: 1px;">...........................................................................................</td>
                            </tr>
                        </table>

                        <!-- Tanda Tangan Sekolah Penerima -->
                        <div style="float: right; text-align: center; width: 230px; margin-top: 4px;">
                            <p style="margin: 0; letter-spacing: 1px; font-size: 9.5pt;">....................................................</p>
                            <p style="margin: 2px 0 35px 0; font-size: 9.5pt;">Kepala Sekolah</p>
                            <p style="margin: 0; letter-spacing: 1px; font-size: 9.5pt;">....................................................</p>
                            <p style="margin: 2px 0 0 0; text-align: left; padding-left: 20px; font-size: 9pt;">NIP. ..............................................</p>
                        </div>
                        <div style="clear: both;"></div>
                    </div>
                </div>
            `;
        } else {
            // =========================================================================
            // TEMPLATE SURAT STANDAR: AKTIF BELAJAR, REKOMENDASI PENCAIRAN PIP, DLL.
            // =========================================================================
            container.innerHTML = `
                <!-- Kop Surat Resmi -->
                ${this.renderKopHtml(config)}

            <div class="surat-title">
                <h3>${judulSurat}</h3>
                <p>Nomor: <span class="font-mono font-bold">${this.generatedNomorSurat}</span></p>
            </div>

            <div class="surat-body">
                <p class="surat-paragraf" style="margin-bottom: 8px; text-indent: 32px;">
                    Yang bertanda tangan di bawah ini Kepala ${config.namaSekolah}, menerangkan dengan sesungguhnya bahwa:
                </p>

                <!-- Revisi Item 2: Hapus NIK, Pekerjaan Ortu, dan Alamat Tempat Tinggal -->
                <table class="surat-table-data" style="margin-left: 20px; width: 95%;">
                    <tr>
                        <td style="width: 200px;">Nama Lengkap</td>
                        <td style="width: 15px;">:</td>
                        <td><strong>${student.nama}</strong></td>
                    </tr>
                    <tr>
                        <td>NISN / NIS</td>
                        <td>:</td>
                        <td><span class="font-mono">${student.nisn}</span> ${student.nis ? `/ <span class="font-mono">${student.nis}</span>` : ''}</td>
                    </tr>
                    <tr>
                        <td>Tempat, Tanggal Lahir</td>
                        <td>:</td>
                        <!-- Revisi Item 1: Full Date Format (contoh: 15 Agustus 2012) -->
                        <td>${student.tempatLahir}, ${tglLahirFull}</td>
                    </tr>
                    <tr>
                        <td>Jenis Kelamin</td>
                        <td>:</td>
                        <td>${student.jk}</td>
                    </tr>
                    <tr>
                        <td>Tingkat / Kelas</td>
                        <td>:</td>
                        <td>Kelas ${student.kelas}</td>
                    </tr>
                    <tr>
                        <td>Nama Orang Tua / Wali</td>
                        <td>:</td>
                        <td>${student.namaOrtu || '-'}</td>
                    </tr>
                </table>

                <p class="surat-paragraf" style="margin-top: 8px; margin-bottom: 8px; text-indent: 32px; line-height: 1.5;">
                    ${kalimatIsi}
                </p>

                ${extraPipHtml}

                <p class="surat-paragraf" style="margin-bottom: 12px; text-indent: 32px;">
                    Demikian surat keterangan ini kami buat dengan sebenarnya dan penuh rasa tanggung jawab untuk dapat dipergunakan sebagaimana mestinya.
                </p>
            </div>

            <!-- Tanda Tangan & QR Code -->
            <div class="surat-ttd-container">
                <!-- QR Code Verifikasi Standar Dokumen Elektronik -->
                <div class="qr-verification-badge" style="display: flex; align-items: center; gap: 10px;">
                    <div id="qrcode-container" style="background: #ffffff; padding: 4px; border: 1px solid #cbd5e1; border-radius: 8px; width: 110px; height: 110px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"></div>
                    <div class="qr-text" style="max-width: 160px; text-align: left;">
                        <strong style="color: #0f172a; display: block; font-size: 8.5pt;">DOKUMEN RESMI TERVERIFIKASI</strong>
                        <span style="font-size: 7.5pt; color: #475569; display: block; margin-top: 2px;">Pindai QR-Code dengan kamera HP untuk cek keaslian surat pada portal resmi.</span>
                        <span style="font-family: monospace; font-size: 7pt; color: #1e3a8a; font-weight: bold; display: block; margin-top: 4px;">No: ${this.generatedNomorSurat}</span>
                    </div>
                </div>

                <!-- Box Tanda Tangan Kepala Sekolah -->
                <div class="surat-ttd-box">
                    <p style="margin-bottom: 4px;">${config.kabupatenKota || "Brebes"}, ${tglStr}</p>
                    <p style="font-weight: bold; margin-bottom: 8px;">Kepala Sekolah,</p>

                    <!-- Area Tanda Tangan & Stempel Basah Manual -->
                    <div style="height: 75px; margin: 4px 0;"></div>

                    <p style="font-weight: bold; text-decoration: underline; margin-bottom: 2px;">
                        ${config.namaKepalaSekolah}
                    </p>
                    <p style="font-size: 9.5pt; font-family: 'Times New Roman';">
                        NIP. ${config.nipKepalaSekolah}
                    </p>
                    <p style="font-size: 8.5pt; color: #475569; font-style: italic;">
                        ${config.pangkatGolongan}
                    </p>
                </div>
            </div>
        `;
        }

        // Render QR Code di dalam Dokumen
        const qrBox = document.getElementById("qrcode-container");
        if (qrBox && typeof QRCode !== "undefined") {
            qrBox.innerHTML = "";
            new QRCode(qrBox, {
                text: verifyUrl,
                width: 102,
                height: 102,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
        }
    },

    async processPrintAndSave() {
        if (!this.selectedStudent) {
            App.showToast("Silakan pilih siswa terlebih dahulu!", "error");
            return;
        }

        const btn = document.getElementById("btn-cetak-pdf-direct");
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan Dokumen...`;

        // 1. Simpan ke DB_SuratKeluar jika mode baru atau manual
        const config = DataStore.getConfig();
        const student = this.selectedStudent;
        const judulSurat = document.getElementById("cetak-jenis-surat")?.selectedOptions[0]?.text || "Surat Keterangan";

        if (this.nomorMode !== "terbit") {
            await ApiClient.request("saveSuratKeluar", {
                nomorSurat: this.generatedNomorSurat,
                nomorSuratManual: this.nomorMode === "manual" ? this.generatedNomorSurat : null,
                kodeKlasifikasi: "421.2",
                tanggalSurat: new Date().toISOString().split('T')[0],
                tujuan: `Orang Tua / Wali Siswa (${student.nama})`,
                perihal: `${judulSurat} an. ${student.nama} (NISN: ${student.nisn})`,
                pengonsep: "Staf TU (Sistem Mandiri)",
                penandatangan: config.namaKepalaSekolah,
                keterangan: `Diterbitkan instan via Modul Cetak Mandiri (${this.nomorMode === 'manual' ? 'Nomor Manual' : 'Nomor Baru'})`
            });
            App.showToast(`Surat ${this.generatedNomorSurat} siap dicetak & nomor terarsip di SRIKANDI!`, "success");
        } else {
            App.showToast(`Mencetak surat dengan Nomor Terbit: ${this.generatedNomorSurat}`, "success");
        }

        // 2. Hubungkan otomatis ke Surat Permohonan Orang Tua jika ada
        const noSurat = this.generatedNomorSurat;
        const permohonanList = DataStore.getPermohonanSurat();
        let targetPermohonan = null;
        if (this.activePermohonanId) {
            targetPermohonan = permohonanList.find(p => p.id === this.activePermohonanId);
        }
        if (!targetPermohonan && student && student.nisn) {
            targetPermohonan = permohonanList.find(p => p.nisn === student.nisn && (p.status || "").toLowerCase() !== "selesai" && (p.status || "").toLowerCase() !== "ditolak");
        }

        if (targetPermohonan && noSurat) {
            const ketTindak = `Surat Anda telah selesai diterbitkan dengan Nomor Registrasi SRIKANDI: ${noSurat}.`;
            targetPermohonan.status = "Siap Diambil";
            targetPermohonan.nomorSuratTerbit = noSurat;
            targetPermohonan.keteranganTindak = ketTindak;
            targetPermohonan.keterangan = ketTindak;
            DataStore.savePermohonanSurat(permohonanList);

            try {
                await ApiClient.request("updatePermohonanSurat", {
                    id: targetPermohonan.id,
                    status: "Siap Diambil",
                    nomorSuratTerbit: noSurat,
                    keteranganTindak: ketTindak,
                    keterangan: ketTindak
                });
            } catch (err) {
                console.warn("Gagal update cloud permohonan:", err);
            }

            App.showToast(`Permohonan ${targetPermohonan.id} status: Siap Diambil. No. Registrasi SRIKANDI: ${noSurat}`, "success");
            this.activePermohonanId = null;
            this.activePermohonan = null;
            if (window.ModulSurat) ModulSurat.renderPermohonanTable();
        }

        // 3. Trigger Print Window (< 5 detik)
        setTimeout(() => {
            document.body.classList.add('is-printing-letter');
            window.print();
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-print"></i> Cetak / Unduh PDF Sekarang`;
            // Refresh data surat keluar & permohonan
            ModulSurat.renderSuratKeluarTable();
            ModulSurat.renderPermohonanTable();
            App.updateDashboardStats();
        }, 300);
    }
};

window.addEventListener('afterprint', () => {
    document.body.classList.remove('is-printing-letter');
});

