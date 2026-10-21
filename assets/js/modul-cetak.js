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
        } else if (type === "pip_pencairan") {
            judulSurat = "SURAT REKOMENDASI PENCAIRAN DANA PIP";
            const pipRec = (DataStore.getPIPPenerima ? DataStore.getPIPPenerima() : []).find(p => p.nisn === student.nisn) || {};
            const noRek = pipRec.nomorRekening || student.noRekSimpel || "0109-01-xxxxxx-50-x";
            const noSK = pipRec.nomorSK || "0345/P3KE/PIP/2026";
            const bank = pipRec.bankPenyalur || "BRI";
            kalimatIsi = `Menerangkan bahwa siswa tersebut di atas adalah benar-benar peserta didik aktif di satuan pendidikan kami dan tercatat secara sah sebagai <strong>Penerima Bantuan Program Indonesia Pintar (PIP) Tahun 2026</strong> sesuai Surat Keputusan Puslapdik Kemendikbudristek Nomor: <strong>${noSK}</strong> dengan Nomor Rekening SimPel: <strong>${noRek}</strong> pada <strong>Bank Penyalur (${bank})</strong>.<br><br>Surat rekomendasi ini diterbitkan resmi dari satuan pendidikan untuk kelengkapan administrasi <strong>Aktivasi Rekening / Pencairan Dana Bantuan PIP</strong> bagi siswa yang bersangkutan.`;
        } else if (type === "pip_aktif") {
            judulSurat = "SURAT KETERANGAN AKTIF BELAJAR (PERSYARATAN PIP)";
            kalimatIsi = `Adalah benar-benar siswa aktif terdaftar pada satuan pendidikan kami di <strong>Kelas ${student.kelas}</strong> pada Tahun Ajaran 2025/2026 dan berasal dari keluarga layak menerima bantuan sosial pendidikan. Surat keterangan ini diterbitkan sebagai pemenuhan berkas usulan / aktivasi <strong>Program Indonesia Pintar (PIP) Kemendikbudristek</strong>.`;
        }

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

        // REKAYASA ULANG QR CODE: Menggunakan Minimal Lightweight Query Parameter
        // Menghindari enkripsi JSON ratusan karakter yang membuat modul QR terlalu padat dan sulit dibaca kamera HP
        const verifyUrl = `${baseUrl}?no=${encodeURIComponent(this.generatedNomorSurat)}&nisn=${encodeURIComponent(student.nisn)}`;

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

        // Render QR Code di dalam Dokumen (Rekayasa Ulang: Ukuran 105px x 105px, Warna Hitam Maksimum #000000)
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

