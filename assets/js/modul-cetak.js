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

    init() {
        this.populateStudentSelect();
        this.populateNomorTerbitSelect();
        this.bindEvents();
        this.selectDefaultStudent();
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

        const checkTtd = document.getElementById("cetak-toggle-ttd");
        if (checkTtd) {
            checkTtd.addEventListener("change", () => {
                this.generatePreview();
            });
        }

        const checkStempel = document.getElementById("cetak-toggle-stempel");
        if (checkStempel) {
            checkStempel.addEventListener("change", () => {
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

    setNomorMode(mode) {
        this.nomorMode = mode;
        if (window.VueStore) VueStore.cetakNomorMode = mode;
        const btnTerbit = document.getElementById("btn-mode-terbit");
        const btnBaru = document.getElementById("btn-mode-baru");
        const btnManual = document.getElementById("btn-mode-manual");

        const boxTerbit = document.getElementById("cetak-box-terbit");
        const boxBaru = document.getElementById("cetak-box-baru");
        const boxManual = document.getElementById("cetak-box-manual");

        [btnTerbit, btnBaru, btnManual].forEach(b => {
            b?.classList.remove("bg-white", "text-blue-700", "shadow-xs");
            b?.classList.add("text-slate-600");
        });

        boxTerbit?.classList.add("hidden");
        boxBaru?.classList.add("hidden");
        boxManual?.classList.add("hidden");

        if (mode === "terbit") {
            btnTerbit?.classList.add("bg-white", "text-blue-700", "shadow-xs");
            btnTerbit?.classList.remove("text-slate-600");
            boxTerbit?.classList.remove("hidden");
            this.populateNomorTerbitSelect();
        } else if (mode === "baru") {
            btnBaru?.classList.add("bg-white", "text-blue-700", "shadow-xs");
            btnBaru?.classList.remove("text-slate-600");
            boxBaru?.classList.remove("hidden");
        } else if (mode === "manual") {
            btnManual?.classList.add("bg-white", "text-blue-700", "shadow-xs");
            btnManual?.classList.remove("text-slate-600");
            boxManual?.classList.remove("hidden");
        }

        this.generatePreview();
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
        this.updateFormFieldsByTemplate();
        this.generatePreview();
    },

    updateFormFieldsByTemplate() {
        const type = this.currentTemplateType;
        const keperluanInput = document.getElementById("cetak-keperluan");
        const extraFieldContainer = document.getElementById("cetak-extra-fields");

        if (type === "aktif") {
            if (keperluanInput) keperluanInput.value = "Persyaratan Administrasi Pengajuan Program Indonesia Pintar (PIP) / Beasiswa";
            if (extraFieldContainer) extraFieldContainer.innerHTML = "";
        } else if (type === "mutasi") {
            if (keperluanInput) keperluanInput.value = "Pindah Sekolah mengikuti domisili tempat tinggal orang tua";
            if (extraFieldContainer) {
                extraFieldContainer.innerHTML = `
                    <div class="mt-3">
                        <label class="block text-xs font-semibold text-slate-700 mb-1">Sekolah Tujuan Pindah</label>
                        <input type="text" id="cetak-sekolah-tujuan" value="SD Negeri Terdekat di Kota Tujuan" oninput="ModulCetak.generatePreview()"
                            class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500">
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
        }
    },

    async generatePreview() {
        if (!this.selectedStudent) return;

        const config = DataStore.getConfig();
        const student = this.selectedStudent;
        const type = this.currentTemplateType;
        const keperluan = document.getElementById("cetak-keperluan")?.value || "-";
        const withTtd = document.getElementById("cetak-toggle-ttd")?.checked ?? true;
        const withStempel = document.getElementById("cetak-toggle-stempel")?.checked ?? true;

        // Tentukan Nomor Surat Berdasarkan Mode
        if (this.nomorMode === "terbit") {
            const list = DataStore.getSuratKeluar();
            if (this.selectedNomorTerbit) {
                this.generatedNomorSurat = this.selectedNomorTerbit;
            } else if (list.length > 0) {
                this.selectedNomorTerbit = list[0].nomorSurat;
                this.generatedNomorSurat = list[0].nomorSurat;
            } else {
                const resNomor = await ApiClient.handleLocalFallback("getNextNomorSuratKeluar", { kodeKlasifikasi: "421.2" });
                this.generatedNomorSurat = resNomor.data.nomorSurat;
            }
        } else if (this.nomorMode === "manual") {
            this.generatedNomorSurat = this.manualNomorSurat || "421.2/001/SD/2026";
        } else {
            // Mode "baru" (otomatis increment)
            const resNomor = await ApiClient.handleLocalFallback("getNextNomorSuratKeluar", { kodeKlasifikasi: "421.2" });
            this.generatedNomorSurat = resNomor.data.nomorSurat;
            const previewEl = document.getElementById("cetak-preview-baru");
            if (previewEl) previewEl.textContent = this.generatedNomorSurat;
        }

        // Tanggal Format Indonesia
        const today = new Date();
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const tglStr = `${today.getDate()} ${namaBulan[today.getMonth()]} ${today.getFullYear()}`;

        // Judul Surat
        let judulSurat = "SURAT KETERANGAN AKTIF BELAJAR";
        let kalimatIsi = `Adalah benar-benar siswa aktif terdaftar pada satuan pendidikan kami di <strong>Kelas ${student.kelas}</strong> pada Tahun Ajaran 2025/2026 dan bertingkah laku baik. Surat keterangan ini diterbitkan atas permintaan yang bersangkutan untuk keperluan: <strong>${keperluan}</strong>.`;

        if (type === "mutasi") {
            judulSurat = "SURAT KETERANGAN PINDAH SEKOLAH";
            const sekolahTujuan = document.getElementById("cetak-sekolah-tujuan")?.value || "sekolah tujuan";
            kalimatIsi = `Telah mengajukan permohonan pindah sekolah dari satuan pendidikan kami ke <strong>${sekolahTujuan}</strong> dengan alasan: <em>${keperluan}</em>. Segala hak dan kewajiban administrasi siswa yang bersangkutan telah diselesaikan.`;
        } else if (type === "rekomendasi") {
            judulSurat = "SURAT REKOMENDASI SEKOLAH";
            const bidangPrestasi = document.getElementById("cetak-prestasi")?.value || "Bidang Akademik";
            kalimatIsi = `Diberikan rekomendasi resmi untuk mengikuti kegiatan / seleksi <strong>${bidangPrestasi}</strong> berdasarkan prestasi akademik, keaktifan belajar, dan integritas kepribadian yang bersangkutan selama menempuh pendidikan di sekolah kami.`;
        } else if (type === "kelakuan") {
            judulSurat = "SURAT KETERANGAN KELAKUAN BAIK";
            kalimatIsi = `Selama menempuh pendidikan di satuan pendidikan kami, siswa yang bersangkutan senantiasa berkelakuan baik, mematuhi tata tertib sekolah, dan tidak pernah terlibat dalam tindakan kriminalitas atau pelanggaran disiplin berat. Surat ini diterbitkan untuk: <strong>${keperluan}</strong>.`;
        }

        // URL Verifikasi Dokumen untuk QR Code (Mendukung file://, localhost, dan domain online)
        let baseUrl = "verifikasi.html";
        try {
            baseUrl = new URL("verifikasi.html", window.location.href).href.split("?")[0].split("#")[0];
        } catch (e) {
            baseUrl = `${window.location.origin}${window.location.pathname.replace("index.html", "")}verifikasi.html`;
        }

        const verifyPayload = {
            no: this.generatedNomorSurat,
            nama: student.nama,
            nisn: student.nisn,
            nik: student.nik || "-",
            kelas: student.rombel || student.kelas || "1",
            jenis: judulSurat,
            keperluan: keperluan || "-",
            tgl: tglStr,
            sekolah: config.namaSekolah || "SD NEGERI TERLANGU 01",
            npsn: config.npsn || "20326713",
            kepsek: config.namaKepalaSekolah || "-",
            nipKepsek: config.nipKepalaSekolah || "-"
        };

        const encodedData = encodeURIComponent(JSON.stringify(verifyPayload));
        const verifyUrl = `${baseUrl}?d=${encodedData}&no=${encodeURIComponent(this.generatedNomorSurat)}&nisn=${encodeURIComponent(student.nisn)}`;

        // Format alamat dan kontak kop surat
        const alamatSekolah = config.alamat || "Jl. Raya Terlangu, Desa Terlangu";
        const telpSekolah = config.telepon && config.telepon !== '-' ? ` | Telp: ${config.telepon}` : '';
        const kodePosSekolah = config.kodePos ? ` | Kode Pos: ${config.kodePos}` : '';
        const npsnSekolah = config.npsn || "20326713";
        const akreditasiSekolah = config.akreditasi ? ` • Akreditasi: ${config.akreditasi}` : '';
        const websiteSekolah = config.website && config.website.trim() ? ` • Website: ${config.website.trim()}` : '';
        const emailSekolah = config.email && config.email.trim() ? ` • Email: ${config.email.trim()}` : '';

        // Render Lembar Surat
        const container = document.getElementById("kop-surat-print-area");
        if (!container) return;

        container.innerHTML = `
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

            <div class="surat-title">
                <h3>${judulSurat}</h3>
                <p>Nomor: <span class="font-mono font-bold">${this.generatedNomorSurat}</span></p>
            </div>

            <div class="surat-body">
                <p class="surat-paragraf" style="margin-bottom: 8px; text-indent: 32px;">
                    Yang bertanda tangan di bawah ini Kepala ${config.namaSekolah}, menerangkan dengan sesungguhnya bahwa:
                </p>

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
                        <td>NIK</td>
                        <td>:</td>
                        <td><span class="font-mono">${student.nik || '-'}</span></td>
                    </tr>
                    <tr>
                        <td>Tempat, Tanggal Lahir</td>
                        <td>:</td>
                        <td>${student.tempatLahir}, ${student.tanggalLahir}</td>
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
                        <td>${student.namaOrtu}</td>
                    </tr>
                    <tr>
                        <td>Pekerjaan Orang Tua</td>
                        <td>:</td>
                        <td>${student.pekerjaanOrtu || '-'}</td>
                    </tr>
                    <tr>
                        <td>Alamat Tempat Tinggal</td>
                        <td>:</td>
                        <td>${student.alamat}</td>
                    </tr>
                </table>

                <p class="surat-paragraf" style="margin-top: 8px; margin-bottom: 8px; text-indent: 32px; line-height: 1.5;">
                    ${kalimatIsi}
                </p>

                <p class="surat-paragraf" style="margin-bottom: 12px; text-indent: 32px;">
                    Demikian surat keterangan ini kami buat dengan sebenarnya dan penuh rasa tanggung jawab untuk dapat dipergunakan sebagaimana mestinya.
                </p>
            </div>

            <!-- Tanda Tangan & QR Code -->
            <div class="surat-ttd-container">
                <!-- QR Code Verifikasi Standar Dokumen Elektronik -->
                <div class="qr-verification-badge">
                    <div id="qrcode-container"></div>
                    <div class="qr-text">
                        <strong style="color: #1e3a8a; display: block; font-size: 8.5pt;">DOKUMEN RESMI TERVERIFIKASI</strong>
                        Pindai QR-Code untuk memvalidasi keabsahan data surat pada SIM-TAS-SD.<br>
                        <span style="font-family: monospace; font-size: 7.5pt; color: #64748b;">ID: ${this.generatedNomorSurat}</span>
                    </div>
                </div>

                <!-- Box Tanda Tangan Kepala Sekolah -->
                <div class="surat-ttd-box">
                    <p style="margin-bottom: 4px;">${config.kabupatenKota || "Brebes"}, ${tglStr}</p>
                    <p style="font-weight: bold; margin-bottom: 8px;">Kepala Sekolah,</p>

                    <div style="height: 75px; position: relative; display: flex; align-items: center; justify-content: center;">
                        <!-- Stempel Sekolah Digital -->
                        ${withStempel ? `
                            <svg class="ttd-digital-stamp" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="80" cy="80" r="72" stroke="#1d4ed8" stroke-width="3" stroke-dasharray="6 3"/>
                                <circle cx="80" cy="80" r="64" stroke="#1d4ed8" stroke-width="2"/>
                                <path id="textPath" d="M 25 80 A 55 55 0 0 1 135 80" fill="none"/>
                                <text fill="#1d4ed8" font-size="8.5" font-weight="bold" letter-spacing="1">
                                    <textPath href="#textPath" startOffset="50%" text-anchor="middle">PEMERINTAH KAB. BREBES • DINDIKPORA</textPath>
                                </text>
                                <text x="80" y="83" fill="#1d4ed8" font-size="9" font-weight="900" text-anchor="middle">SDN TERLANGU 01</text>
                                <text x="80" y="96" fill="#1d4ed8" font-size="7.5" font-weight="bold" text-anchor="middle">KECAMATAN BREBES</text>
                                <path id="textPathBottom" d="M 135 85 A 55 55 0 0 1 25 85" fill="none"/>
                                <text fill="#1d4ed8" font-size="8" font-weight="bold" letter-spacing="1">
                                    <textPath href="#textPathBottom" startOffset="50%" text-anchor="middle">★ UPT SATUAN PENDIDIKAN ★</textPath>
                                </text>
                            </svg>
                        ` : ''}

                        <!-- Tanda Tangan Digital -->
                        ${withTtd ? `
                            <svg class="ttd-digital-sign" viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 50 Q 50 10, 70 45 T 110 30 T 140 60 Q 160 75, 185 40" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
                                <path d="M60 40 Q 80 80, 100 20" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                                <path d="M30 65 L 170 65" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        ` : '<div style="height: 60px;"></div>'}
                    </div>

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

        // Render QR Code di dalam Dokumen
        const qrBox = document.getElementById("qrcode-container");
        if (qrBox && typeof QRCode !== "undefined") {
            qrBox.innerHTML = "";
            new QRCode(qrBox, {
                text: verifyUrl,
                width: 60,
                height: 60,
                colorDark: "#1e3a8a",
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

        // 3. Trigger Print Window (< 5 detik)
        setTimeout(() => {
            document.body.classList.add('is-printing-letter');
            window.print();
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-print"></i> Cetak / Unduh PDF Sekarang`;
            // Refresh data surat keluar
            ModulSurat.renderSuratKeluarTable();
            App.updateDashboardStats();
        }, 300);
    }
};

window.addEventListener('afterprint', () => {
    document.body.classList.remove('is-printing-letter');
});

