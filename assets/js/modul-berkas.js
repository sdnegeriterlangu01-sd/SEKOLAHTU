/* ==========================================================================
   SIM-TAS-SD: MODUL 1 - PENGARSIPAN BERKAS POKOK SISWA (BANGKAS DIGITAL)
   Fitur: Upload berkas, Auto-renaming, Search instant NISN/Nama, Filter & Preview
   ========================================================================== */

const ModulBerkas = {
    selectedStudent: null,
    currentFilterKelas: "Semua",
    currentFilterStatus: "Semua",
    searchQuery: "",

    init() {
        this.renderTable();
        this.bindEvents();
    },

    bindEvents() {
        const searchInput = document.getElementById("search-berkas-siswa");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.renderTable();
            });
        }

        const filterKelas = document.getElementById("filter-kelas-berkas");
        if (filterKelas) {
            filterKelas.addEventListener("change", (e) => {
                this.currentFilterKelas = e.target.value;
                this.renderTable();
            });
        }

        const filterStatus = document.getElementById("filter-status-berkas");
        if (filterStatus) {
            filterStatus.addEventListener("change", (e) => {
                this.currentFilterStatus = e.target.value;
                this.renderTable();
            });
        }
    },

    getFilteredData() {
        const students = DataStore.getSiswa();
        return students.filter(s => {
            // Filter Search
            const matchSearch = !this.searchQuery ||
                s.nisn.toLowerCase().includes(this.searchQuery) ||
                s.nama.toLowerCase().includes(this.searchQuery) ||
                (s.nis && s.nis.toLowerCase().includes(this.searchQuery));

            // Filter Kelas
            const matchKelas = this.currentFilterKelas === "Semua" || s.kelas === this.currentFilterKelas;

            // Filter Status Berkas
            const isComplete = s.berkas && s.berkas.kk?.uploaded && s.berkas.akta?.uploaded;
            let matchStatus = true;
            if (this.currentFilterStatus === "Lengkap") {
                matchStatus = isComplete;
            } else if (this.currentFilterStatus === "Belum Lengkap") {
                matchStatus = !isComplete;
            }

            return matchSearch && matchKelas && matchStatus;
        });
    },

    renderTable() {
        const container = document.getElementById("table-berkas-siswa-body");
        if (!container) return;

        const data = this.getFilteredData();
        const totalCountEl = document.getElementById("total-siswa-count");
        if (totalCountEl) totalCountEl.textContent = `${data.length} Siswa Terdaftar`;

        if (data.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="py-12 text-center text-slate-400">
                        <div class="flex flex-col items-center justify-center">
                            <i class="fa-solid fa-folder-open text-4xl mb-3 text-slate-300"></i>
                            <p class="font-medium text-slate-600">Tidak ada berkas siswa yang sesuai kriteria</p>
                            <p class="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter kelas.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = data.map((s, index) => {
            const berkas = s.berkas || {};
            const kk = berkas.kk?.uploaded;
            const akta = berkas.akta?.uploaded;
            const kip = berkas.kip?.uploaded;
            const foto = berkas.foto?.uploaded;

            const totalUploaded = [kk, akta, kip, foto].filter(Boolean).length;
            const isFull = kk && akta; // Syarat wajib minimal KK + Akta

            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    <td class="px-4 py-3.5 text-xs font-semibold text-slate-500">${index + 1}</td>
                    <td class="px-4 py-3.5">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                ${foto && berkas.foto.url ? `
                                    <img src="${berkas.foto.url}" alt="${s.nama}" class="w-full h-full object-cover">
                                ` : `
                                    <span class="font-bold text-xs text-slate-600">${s.nama.substring(0, 2).toUpperCase()}</span>
                                `}
                            </div>
                            <div>
                                <div class="font-bold text-slate-800 text-sm hover:text-blue-600 cursor-pointer" onclick="ModulBerkas.openDetailModal('${s.nisn}')">
                                    ${s.nama}
                                </div>
                                <div class="text-xs text-slate-400 font-mono">NISN: ${s.nisn} ${s.nis ? `• NIS: ${s.nis}` : ''}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3.5">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Kelas ${s.rombel && String(s.rombel) !== String(s.kelas) ? s.rombel : s.kelas}
                        </span>
                    </td>
                    <td class="px-4 py-3.5">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <!-- KK Tag -->
                            <button onclick="ModulBerkas.previewOrUpload('${s.nisn}', 'kk')" 
                                class="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${kk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 border border-dashed border-slate-300 hover:bg-slate-200'}" title="${kk ? berkas.kk.filename : 'Klik untuk unggah KK'}">
                                <i class="fa-solid ${kk ? 'fa-circle-check text-emerald-600' : 'fa-circle-plus'}"></i> KK
                            </button>

                            <!-- Akta Tag -->
                            <button onclick="ModulBerkas.previewOrUpload('${s.nisn}', 'akta')" 
                                class="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${akta ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 border border-dashed border-slate-300 hover:bg-slate-200'}" title="${akta ? berkas.akta.filename : 'Klik untuk unggah Akta'}">
                                <i class="fa-solid ${akta ? 'fa-circle-check text-emerald-600' : 'fa-circle-plus'}"></i> Akta
                            </button>

                            <!-- KIP Tag -->
                            <button onclick="ModulBerkas.previewOrUpload('${s.nisn}', 'kip')" 
                                class="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${kip ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100' : 'bg-slate-100 text-slate-400 border border-dashed border-slate-300 hover:bg-slate-200'}" title="${kip ? berkas.kip.filename : 'Opsional: KIP/PKH'}">
                                <i class="fa-solid ${kip ? 'fa-circle-check text-indigo-600' : 'fa-circle-plus'}"></i> KIP
                            </button>

                            <!-- Foto Tag -->
                            <button onclick="ModulBerkas.previewOrUpload('${s.nisn}', 'foto')" 
                                class="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${foto ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' : 'bg-slate-100 text-slate-400 border border-dashed border-slate-300 hover:bg-slate-200'}" title="${foto ? berkas.foto.filename : 'Pas Foto Siswa'}">
                                <i class="fa-solid ${foto ? 'fa-circle-check text-amber-600' : 'fa-circle-plus'}"></i> Foto
                            </button>
                        </div>
                    </td>
                    <td class="px-4 py-3.5 text-center">
                        ${isFull ? `
                            <span class="badge-status badge-complete">
                                <i class="fa-solid fa-check-double"></i> Wajib Lengkap
                            </span>
                        ` : `
                            <span class="badge-status badge-incomplete">
                                <i class="fa-solid fa-circle-exclamation"></i> Belum Lengkap
                            </span>
                        `}
                    </td>
                    <td class="px-4 py-3.5 text-xs text-slate-600">
                        <div>${s.namaOrtu || '-'}</div>
                        <div class="text-slate-400 text-[11px] font-mono">${s.noHp || '-'}</div>
                    </td>
                    <td class="px-4 py-3.5 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                            ${Auth.canDo("uploadStudentDoc") ? `<button onclick="ModulBerkas.openUploadModal('${s.nisn}')" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Unggah / Perbarui Berkas">
                                <i class="fa-solid fa-cloud-arrow-up"></i>
                            </button>` : ""}
                            <button onclick="ModulBerkas.openDetailModal('${s.nisn}')" class="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition" title="Lihat Profil Lengkap">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button onclick="App.pindahKeCetakSurat('${s.nisn}')" class="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition" title="Cetak Surat Keterangan Siswa">
                                <i class="fa-solid fa-file-invoice"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    },

    previewOrUpload(nisn, docType) {
        const students = DataStore.getSiswa();
        const student = students.find(s => s.nisn === nisn);
        if (!student) return;

        const doc = student.berkas && student.berkas[docType];
        if (doc && doc.uploaded) {
            this.showPreviewModal(student, docType, doc);
        } else if (Auth.canDo("uploadStudentDoc")) {
            this.openUploadModal(nisn, docType);
        } else {
            App.showToast("Berkas belum diunggah. Anda tidak memiliki izin untuk mengunggah.", "warning");
        }
    },

    showPreviewModal(student, docType, doc) {
        const modal = document.getElementById("modal-preview-berkas");
        if (!modal) return;

        document.getElementById("preview-modal-title").textContent = `Pratinjau Berkas: ${docType.toUpperCase()}`;
        document.getElementById("preview-modal-subtitle").textContent = `${student.nama} (${student.nisn}) • File: ${doc.filename}`;

        const viewerContainer = document.getElementById("preview-modal-body");
        const isImage = doc.url.includes("images.unsplash.com") || doc.url.startsWith("data:image/") || doc.filename.endsWith(".jpg") || doc.filename.endsWith(".png");

        if (isImage) {
            viewerContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl max-h-[60vh] overflow-auto">
                    <img src="${doc.url}" alt="${doc.filename}" class="max-h-[50vh] object-contain rounded-lg shadow-lg">
                </div>
            `;
        } else {
            viewerContainer.innerHTML = `
                <div class="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
                    <div class="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
                        <i class="fa-solid fa-file-pdf"></i>
                    </div>
                    <h4 class="font-bold text-slate-800 text-base mb-1">${doc.filename}</h4>
                    <p class="text-xs text-slate-500 mb-6">Tersimpan aman di Google Drive: <span class="font-mono text-slate-700">/SIM-TAS/Berkas_Siswa/${doc.filename}</span></p>
                    <div class="flex items-center justify-center gap-3">
                        <a href="${doc.url}" target="_blank" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka di Google Drive
                        </a>
                        <button onclick="App.showToast('Fitur unduh langsung dokumen aktif', 'success')" class="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition">
                            <i class="fa-solid fa-download"></i> Unduh File
                        </button>
                    </div>
                </div>
            `;
        }

        modal.classList.remove("hidden");
    },

    closePreviewModal() {
        const modal = document.getElementById("modal-preview-berkas");
        if (modal) modal.classList.add("hidden");
    },

    openUploadModal(nisn, defaultDocType = "kk") {
        const students = DataStore.getSiswa();
        const student = students.find(s => s.nisn === nisn);
        if (!student) return;

        this.selectedStudent = student;
        const modal = document.getElementById("modal-upload-berkas");
        if (!modal) return;

        document.getElementById("upload-student-info").textContent = `${student.nama} (NISN: ${student.nisn}) - Kelas ${student.kelas}`;
        document.getElementById("upload-doc-type").value = defaultDocType;
        document.getElementById("upload-file-input").value = "";
        document.getElementById("upload-preview-area").innerHTML = `
            <div class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 transition cursor-pointer" onclick="document.getElementById('upload-file-input').click()">
                <i class="fa-solid fa-cloud-arrow-up text-3xl text-slate-400 mb-2"></i>
                <p class="text-sm font-semibold text-slate-700">Pilih berkas dari perangkat Anda</p>
                <p class="text-xs text-slate-400 mt-1">Format PDF, JPG, atau PNG (Maks 5 MB)</p>
            </div>
        `;

        this.updateAutoFilenamePreview();
        modal.classList.remove("hidden");
    },

    closeUploadModal() {
        const modal = document.getElementById("modal-upload-berkas");
        if (modal) modal.classList.add("hidden");
        this.selectedStudent = null;
    },

    updateAutoFilenamePreview() {
        if (!this.selectedStudent) return;
        const docType = document.getElementById("upload-doc-type").value.toUpperCase();
        const year = new Date().getFullYear();
        const autoName = `${this.selectedStudent.nisn}_${docType}_${year}.pdf`;
        const label = document.getElementById("auto-filename-badge");
        if (label) label.textContent = autoName;
    },

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const previewArea = document.getElementById("upload-preview-area");
        const docType = document.getElementById("upload-doc-type").value.toUpperCase();
        const year = new Date().getFullYear();
        const ext = file.name.split('.').pop() || "pdf";
        const autoName = `${this.selectedStudent.nisn}_${docType}_${year}.${ext}`;

        previewArea.innerHTML = `
            <div class="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                        ${ext}
                    </div>
                    <div class="text-left">
                        <div class="text-xs font-mono font-bold text-slate-800">${autoName}</div>
                        <div class="text-[11px] text-slate-500">Ukuran: ${(file.size / 1024).toFixed(1)} KB • Otomatis direname standar SRIKANDI</div>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('upload-file-input').value = ''; ModulBerkas.openUploadModal('${this.selectedStudent.nisn}')" class="text-slate-400 hover:text-red-500 text-sm">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    },

    async submitUpload() {
        if (!this.selectedStudent) return;
        const fileInput = document.getElementById("upload-file-input");
        const file = fileInput.files[0];
        const docType = document.getElementById("upload-doc-type").value;

        if (!file) {
            App.showToast("Silakan pilih file dokumen terlebih dahulu!", "error");
            return;
        }

        const submitBtn = document.getElementById("btn-submit-upload");
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan ke Drive...`;

        try {
            // Read as Base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = reader.result;
                const ext = file.name.split('.').pop() || "pdf";

                const res = await ApiClient.request("uploadStudentDoc", {
                    nisn: this.selectedStudent.nisn,
                    docType: docType,
                    fileExt: ext,
                    mimeType: file.type,
                    fileBase64: base64Data
                });

                if (res.success) {
                    App.showToast(res.message, "success");
                    this.closeUploadModal();
                    this.renderTable();
                    App.updateDashboardStats();
                } else {
                    App.showToast(res.message || "Gagal mengunggah berkas", "error");
                }
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Simpan ke Drive`;
            };
        } catch (err) {
            App.showToast("Terjadi kesalahan saat memproses file", "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Simpan ke Drive`;
        }
    },

    openDetailModal(nisn) {
        const students = DataStore.getSiswa();
        const student = students.find(s => s.nisn === nisn);
        if (!student) return;

        const modal = document.getElementById("modal-detail-siswa");
        if (!modal) return;

        document.getElementById("detail-siswa-nama").textContent = student.nama;
        document.getElementById("detail-siswa-nisn").textContent = `NISN: ${student.nisn} | Kelas ${student.kelas}`;
        document.getElementById("detail-val-nik").textContent = student.nik || "-";
        document.getElementById("detail-val-ttl").textContent = `${student.tempatLahir}, ${student.tanggalLahir}`;
        document.getElementById("detail-val-jk").textContent = student.jk;
        document.getElementById("detail-val-ortu").textContent = student.namaOrtu || "-";
        document.getElementById("detail-val-pekerjaan").textContent = student.pekerjaanOrtu || "-";
        document.getElementById("detail-val-hp").textContent = student.noHp || "-";
        document.getElementById("detail-val-alamat").textContent = student.alamat || "-";

        // Data periodik & data lengkap hasil impor (format Dapodik)
        const extra = document.getElementById("detail-extra");
        if (extra) {
            const row = (label, val) => `<div class="p-3 bg-slate-50 rounded-xl"><span class="text-slate-400 text-[11px] block">${label}</span><span class="font-bold text-slate-800">${val || "-"}</span></div>`;
            const wil = [student.dusun, student.rt ? `RT ${student.rt}` : "", student.rw ? `RW ${student.rw}` : "", student.kelurahan, student.kecamatan, student.kodePos].filter(Boolean).join(", ");
            extra.innerHTML = [
                row("Tahun Ajaran / Rombel", `${student.tahunAjaran || DataStore.getActiveTA()} • ${student.rombel || student.kelas}`),
                row("NIPD / Agama", `${student.nipd || student.nis || "-"} / ${student.agama || "-"}`),
                row("Ayah", [student.ayahNama, student.ayahTahunLahir, student.ayahPendidikan, student.ayahPekerjaan].filter(Boolean).join(" • ")),
                row("Ibu", [student.ibuNama, student.ibuTahunLahir, student.ibuPendidikan, student.ibuPekerjaan].filter(Boolean).join(" • ")),
                `<div class="col-span-2 p-3 bg-slate-50 rounded-xl"><span class="text-slate-400 text-[11px] block">Wilayah (Dusun/RT/RW/Kelurahan/Kecamatan/Kode Pos)</span><span class="font-medium text-slate-800">${wil || "-"}</span></div>`
            ].join("");
        }

        modal.classList.remove("hidden");
    },

    closeDetailModal() {
        const modal = document.getElementById("modal-detail-siswa");
        if (modal) modal.classList.add("hidden");
    },

    openAddModal() {
        const modal = document.getElementById("modal-tambah-siswa");
        if (modal) {
            document.getElementById("form-tambah-siswa").reset();
            modal.classList.remove("hidden");
        }
    },

    closeAddModal() {
        const modal = document.getElementById("modal-tambah-siswa");
        if (modal) modal.classList.add("hidden");
    },

    async submitTambahSiswa(e) {
        e.preventDefault();
        const val = id => (document.getElementById(id)?.value || "").trim();
        const nisn = val("tambah-nisn");
        const nama = val("tambah-nama");
        const kelas = val("tambah-kelas");

        if (!nisn || !nama) {
            App.showToast("NISN dan Nama Lengkap wajib diisi!", "error");
            return;
        }
        if (!/^\d{10}$/.test(nisn)) {
            App.showToast("NISN harus berupa 10 digit angka.", "error");
            return;
        }

        const newStudent = {
            nisn: nisn,
            nis: val("tambah-nis"),
            nipd: val("tambah-nis"),
            nama: nama,
            nik: val("tambah-nik"),
            tempatLahir: val("tambah-tempat-lahir") || "-",
            tanggalLahir: val("tambah-tgl-lahir") || "2015-01-01",
            jk: val("tambah-jk"),
            kelas: kelas,
            rombel: kelas,
            namaOrtu: val("tambah-ortu") || "-",
            pekerjaanOrtu: val("tambah-pekerjaan") || "-",
            noHp: val("tambah-hp") || "-",
            alamat: val("tambah-alamat") || "-"
        };

        const res = await ApiClient.request("saveStudent", newStudent);
        if (res.success) {
            App.showToast(res.message, "success");
            this.closeAddModal();
            this.renderTable();
            App.updateDashboardStats();
        } else {
            App.showToast(res.message || "Gagal menambah data siswa", "error");
        }
    },

    exportCSV() {
        const data = this.getFilteredData();
        if (data.length === 0) {
            App.showToast("Tidak ada data untuk diekspor", "warning");
            return;
        }

        const head = ["NISN", "NIPD", "Nama", "JK", "NIK", "Tempat Lahir", "Tanggal Lahir", "Agama", "Alamat", "RT", "RW", "Dusun", "Kelurahan", "Kecamatan", "Kode Pos",
            "Ayah-Nama", "Ayah-Tahun Lahir", "Ayah-Pendidikan", "Ayah-Pekerjaan", "Ibu-Nama", "Ibu-Tahun Lahir", "Ibu-Pendidikan", "Ibu-Pekerjaan", "Rombel", "Kelas", "Tahun Ajaran", "Status Berkas"];
        let csv = head.map(Sec.csvCell).join(",") + "\n";
        data.forEach(s => {
            const isComplete = s.berkas && s.berkas.kk?.uploaded && s.berkas.akta?.uploaded ? "Lengkap" : "Belum Lengkap";
            csv += [s.nisn, s.nipd || s.nis, s.nama, s.jk, s.nik, s.tempatLahir, s.tanggalLahir, s.agama, s.alamat, s.rt, s.rw, s.dusun, s.kelurahan, s.kecamatan, s.kodePos,
                s.ayahNama, s.ayahTahunLahir, s.ayahPendidikan, s.ayahPekerjaan, s.ibuNama, s.ibuTahunLahir, s.ibuPendidikan, s.ibuPekerjaan,
                s.rombel || s.kelas, s.kelas, s.tahunAjaran || DataStore.getActiveTA(), isComplete].map(Sec.csvCell).join(",") + "\n";
        });

        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `DATA_SISWA_SD_TA_${DataStore.getActiveTA().replace("/", "-")}_${Util.today()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        App.showToast("Data siswa berhasil diekspor ke CSV!", "success");
    }
};
