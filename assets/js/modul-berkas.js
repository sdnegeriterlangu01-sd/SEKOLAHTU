/* ==========================================================================
   SIM-TAS-SD: MODUL 1 - PENGARSIPAN BERKAS POKOK SISWA (BANGKAS DIGITAL)
   Fitur: Upload berkas, Auto-renaming, Search instant NISN/Nama, Filter & Preview
   ========================================================================== */

const ModulBerkas = {
    selectedStudent: null,
    currentFilterKelas: "Semua",
    currentFilterStatus: "Semua",
    searchQuery: "",

    detectGuruKelas() {
        if (Auth.role() !== "guru") return null;
        const u = Auth.user();
        if (!u) return null;
        const tendik = DataStore.getTendik().find(t => 
            (u.nama && t.nama && t.nama.toLowerCase().includes(u.nama.toLowerCase())) ||
            (u.email && t.nip && t.nip.includes(u.email.split("@")[0]))
        );
        if (tendik && tendik.jabatan) {
            const m = tendik.jabatan.match(/kelas\s*(\d+)/i);
            if (m) return m[1];
        }
        return null;
    },

    showKontakColumn: true,
    filterKontak: "Semua", // Semua, Ada, Belum

    populateKelasFilter() {
        const filterEl = document.getElementById("filter-kelas-berkas");
        if (!filterEl) return;
        const role = Auth.role();
        const gInfo = Auth.getGuruInfo ? Auth.getGuruInfo() : null;

        // Isolasi Rombel Akun Guru Kelas
        if (role === "guru" && gInfo && gInfo.isGuruKelas) {
            const rawK = String(gInfo.kelas || "1").replace(/kelas\s*/i, "").trim();
            const rombels = DataStore.getRombels();
            const matched = rombels.find(r => r.toLowerCase() === rawK.toLowerCase()) || rawK;
            const label = matched.toLowerCase().startsWith("kelas") ? matched : `Kelas ${matched}`;
            filterEl.innerHTML = `<option value="${Sec.esc(matched)}">${Sec.esc(label)} (Rombel Binaan)</option>`;
            filterEl.value = matched;
            filterEl.disabled = true;
            this.currentFilterKelas = matched;
            return;
        }

        filterEl.disabled = false;
        const rombels = DataStore.getRombels();
        const curVal = filterEl.value || this.currentFilterKelas || "Semua";
        filterEl.innerHTML = `<option value="Semua">Semua Tingkat Kelas</option>` +
            rombels.map(r => {
                const label = r.toLowerCase().startsWith("kelas") ? r : `Kelas ${r}`;
                return `<option value="${Sec.esc(r)}">${Sec.esc(label)}</option>`;
            }).join("");

        if (curVal && Array.from(filterEl.options).some(o => o.value === curVal)) {
            filterEl.value = curVal;
            this.currentFilterKelas = curVal;
        } else {
            filterEl.value = "Semua";
            this.currentFilterKelas = "Semua";
        }
    },

    populateTambahKelasSelect() {
        const sel = document.getElementById("tambah-kelas");
        if (!sel) return;
        const rombels = DataStore.getRombels();
        const curVal = sel.value;
        sel.innerHTML = rombels.map(r => {
            const label = r.toLowerCase().startsWith("kelas") ? r : `Kelas ${r}`;
            return `<option value="${Sec.esc(r)}">${Sec.esc(label)}</option>`;
        }).join("");
        if (curVal && Array.from(sel.options).some(o => o.value === curVal)) {
            sel.value = curVal;
        }
    },

    init() {
        this.populateKelasFilter();
        this.populateTambahKelasSelect();
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

        const filterKontakEl = document.getElementById("filter-kontak-berkas");
        if (filterKontakEl) {
            filterKontakEl.addEventListener("change", (e) => {
                this.filterKontak = e.target.value;
                this.renderTable();
            });
        }
    },

    toggleKontakColumn() {
        this.showKontakColumn = !this.showKontakColumn;
        const btn = document.getElementById("btn-toggle-kontak-col");
        if (btn) {
            btn.classList.toggle("bg-blue-900", this.showKontakColumn);
            btn.classList.toggle("text-white", this.showKontakColumn);
            btn.classList.toggle("bg-slate-100", !this.showKontakColumn);
            btn.classList.toggle("text-slate-700", !this.showKontakColumn);
        }
        this.renderTable();
    },

    getFilteredData() {
        const students = DataStore.getSiswa();
        const role = Auth.role();
        const gInfo = Auth.getGuruInfo ? Auth.getGuruInfo() : null;

        // 1. Isolasi Data Rombel
        let baseStudents = students;
        if (role === "guru" && gInfo) {
            if (gInfo.isGuruKelas) {
                const kStr = String(gInfo.kelas).replace(/\D/g, "");
                baseStudents = students.filter(s => {
                    const sk = String(s.rombel || s.kelas || "").replace(/\D/g, "");
                    return sk === kStr || String(s.rombel || s.kelas || "").toLowerCase().includes(gInfo.kelas.toLowerCase());
                });
            } else if (gInfo.isGuruMapel && this.currentFilterKelas !== "Semua") {
                const targetKls = String(this.currentFilterKelas).replace(/\D/g, "");
                baseStudents = students.filter(s => {
                    const sk = String(s.rombel || s.kelas || "").replace(/\D/g, "");
                    return sk === targetKls;
                });
            }
        }

        return baseStudents.filter(s => {
            // Filter Search
            const matchSearch = !this.searchQuery ||
                s.nisn.toLowerCase().includes(this.searchQuery) ||
                s.nama.toLowerCase().includes(this.searchQuery) ||
                (s.nis && s.nis.toLowerCase().includes(this.searchQuery)) ||
                (s.namaOrtu && s.namaOrtu.toLowerCase().includes(this.searchQuery)) ||
                (s.noHp && s.noHp.includes(this.searchQuery));

            // Filter Kelas (jika admin/tu atau guru mapel)
            const targetKls = String(this.currentFilterKelas || "Semua").trim();
            let matchKelas = targetKls === "Semua";
            if (!matchKelas) {
                const normTarget = targetKls.replace(/^kelas\s*/i, "").trim().toLowerCase();
                const k1 = String(s.kelas || "").replace(/^kelas\s*/i, "").trim().toLowerCase();
                const k2 = String(s.rombel || "").replace(/^kelas\s*/i, "").trim().toLowerCase();
                if (k1 === normTarget || k2 === normTarget) {
                    matchKelas = true;
                } else if (!/[a-z]/i.test(normTarget)) {
                    const dTarget = normTarget.replace(/\D/g, "");
                    const d1 = k1.replace(/\D/g, "");
                    const d2 = k2.replace(/\D/g, "");
                    if (dTarget && (d1 === dTarget || d2 === dTarget)) matchKelas = true;
                }
            }

            // Filter Status Berkas Diperluas
            const berkas = s.berkas || {};
            const kk = !!berkas.kk?.uploaded;
            const akta = !!berkas.akta?.uploaded;
            const kip = !!berkas.kip?.uploaded;
            const foto = !!berkas.foto?.uploaded;
            const isFull = kk && akta;

            let matchStatus = true;
            if (this.currentFilterStatus === "Lengkap") {
                matchStatus = isFull;
            } else if (this.currentFilterStatus === "Belum Lengkap") {
                matchStatus = !isFull;
            } else if (this.currentFilterStatus === "Belum KK") {
                matchStatus = !kk;
            } else if (this.currentFilterStatus === "Belum Akta") {
                matchStatus = !akta;
            } else if (this.currentFilterStatus === "Ada KIP") {
                matchStatus = kip;
            } else if (this.currentFilterStatus === "Belum Foto") {
                matchStatus = !foto;
            }

            // Filter Nomor HP Ortu
            let matchKontak = true;
            const hasPhone = !!(s.noHp && s.noHp !== "-" && s.noHp.trim().length >= 8);
            if (this.filterKontak === "Ada") matchKontak = hasPhone;
            else if (this.filterKontak === "Belum") matchKontak = !hasPhone;

            return matchSearch && matchKelas && matchStatus && matchKontak;
        });
    },

    getWhatsAppReminderLink(student) {
        if (!student.noHp || student.noHp === "-") return "#";
        const cleanPhone = String(student.noHp).replace(/\D/g, "");
        const intlPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.substring(1) : cleanPhone;
        const missing = [];
        if (!student.berkas?.kk?.uploaded) missing.push("Kartu Keluarga (KK)");
        if (!student.berkas?.akta?.uploaded) missing.push("Akta Kelahiran");
        
        const namaSekolah = DataStore.getConfig().namaSekolah || "SD Negeri Terlangu 01";
        const msg = `Yth. Bapak/Ibu Wali dari Ananda *${student.nama}* (Kelas ${student.rombel || student.kelas} ${namaSekolah}).\n\nBerdasarkan rekap data bangkas sekolah, berkas *${missing.join(" dan ") || "kelengkapan administrasi"}* ananda belum terunggah di sistem SEKOLAHTU. Mohon kesediaannya mengirimkan foto/scan berkas fisik tersebut demi kelancaran administrasi Dapodik dan verifikasi bantuan sosial PIP.\n\nTerima kasih atas kerja samanya.\n*${namaSekolah}*`;
        return `https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`;
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
            const kta = (berkas.kta?.uploaded) || !!s.nta;
            const isFull = kk && akta;
            const hasPhone = s.noHp && s.noHp !== "-" && s.noHp.trim().length >= 8;

            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    <td class="px-4 py-3.5 text-xs font-semibold text-slate-500">${index + 1}</td>
                    <td class="px-4 py-3.5">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                ${foto && berkas.foto.url ? `
                                    <img src="${Util.formatDriveImageUrl(berkas.foto.url)}" alt="${Sec.esc(s.nama)}" class="w-full h-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'font-bold text-xs text-slate-600\\'>${Sec.esc(s.nama.substring(0, 2).toUpperCase())}</span>'">
                                ` : `
                                    <span class="font-bold text-xs text-slate-600">${Sec.esc(s.nama.substring(0, 2).toUpperCase())}</span>
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

                            <!-- KTA Pramuka Tag (Revisi Item 10) -->
                            <button onclick="ModulBerkas.previewOrUpload('${s.nisn}', 'kta')" 
                                class="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${kta ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200' : 'bg-slate-100 text-slate-400 border border-dashed border-slate-300 hover:bg-slate-200'}" title="${kta ? ((berkas.kta?.filename || 'KTA Pramuka') + (s.nta ? ` (NTA: ${s.nta})` : '')) : 'Klik untuk unggah KTA Pramuka'}">
                                <i class="fa-solid ${kta ? 'fa-circle-check text-amber-700' : 'fa-circle-plus'}"></i> KTA${s.nta ? ` <span class="font-mono text-[9px] bg-amber-200 text-amber-900 px-1 rounded font-bold ml-0.5">NTA</span>` : ''}
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
                    ${this.showKontakColumn ? `
                        <td class="px-4 py-3.5 text-xs text-slate-600">
                            <div class="font-semibold text-slate-800 flex items-center justify-between">
                                <span>${s.namaOrtu || '-'}</span>
                                <button onclick="ModulBerkas.openEditKontakModal('${s.nisn}')" class="text-slate-400 hover:text-blue-600 ml-1 p-0.5" title="Edit Kontak Ortu">
                                    <i class="fa-solid fa-pencil text-[10px]"></i>
                                </button>
                            </div>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <span class="font-mono text-[11px] ${hasPhone ? 'text-blue-900 font-bold' : 'text-slate-400 italic'}">${s.noHp || 'Belum ada'}</span>
                                ${hasPhone && !isFull ? `
                                    <a href="${this.getWhatsAppReminderLink(s)}" target="_blank" class="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition text-[11px]" title="Kirim Pengingat Berkas via WhatsApp">
                                        <i class="fa-brands fa-whatsapp font-bold"></i>
                                    </a>
                                ` : ''}
                            </div>
                        </td>
                    ` : ''}
                    <td class="px-4 py-3.5 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                            <button onclick="ModulOCR.openScanModal('${s.nisn}', 'kk')" class="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Pindai & Ekstrak Data KK (OCR)">
                                <i class="fa-solid fa-wand-magic-sparkles"></i>
                            </button>
                            <button onclick="ModulOCR.openScanModal('${s.nisn}', 'kta')" class="p-2 text-amber-700 hover:bg-amber-50 rounded-lg transition" title="Pindai & Ekstrak No. NTA KTA Pramuka (OCR)">
                                <i class="fa-solid fa-id-badge"></i>
                            </button>
                            <button onclick="ModulBerkas.openEditKontakModal('${s.nisn}')" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Kontak Orang Tua">
                                <i class="fa-solid fa-phone"></i>
                            </button>
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

    // Modal Edit Cepat Kontak Orang Tua
    openEditKontakModal(nisn) {
        const student = DataStore.getSiswa().find(s => s.nisn === nisn);
        if (!student) return;

        this.selectedStudent = student;
        const modal = document.getElementById("modal-edit-kontak-ortu");
        if (!modal) return;

        document.getElementById("modal-kontak-student-name").textContent = `${student.nama} (Kelas ${student.rombel || student.kelas})`;
        document.getElementById("modal-kontak-nama-ortu").value = student.namaOrtu || "";
        document.getElementById("modal-kontak-pekerjaan-ortu").value = student.pekerjaanOrtu || "";
        document.getElementById("modal-kontak-no-hp").value = student.noHp || "";

        modal.classList.remove("hidden");
    },

    closeEditKontakModal() {
        const modal = document.getElementById("modal-edit-kontak-ortu");
        if (modal) modal.classList.add("hidden");
    },

    async saveKontakOrtu() {
        if (!this.selectedStudent) return;
        const namaOrtu = document.getElementById("modal-kontak-nama-ortu")?.value?.trim() || "-";
        const pekerjaanOrtu = document.getElementById("modal-kontak-pekerjaan-ortu")?.value?.trim() || "-";
        const noHp = document.getElementById("modal-kontak-no-hp")?.value?.trim() || "-";

        const res = await ApiClient.request("updateStudentFields", {
            nisn: this.selectedStudent.nisn,
            fields: { namaOrtu, pekerjaanOrtu, noHp }
        });

        if (res && res.success) {
            App.showToast("Kontak orang tua berhasil diperbarui!", "success");
            this.closeEditKontakModal();
            this.renderTable();
        } else {
            App.showToast("Gagal memperbarui kontak", "error");
        }
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
        const isImage = docType === "foto" || (doc.url && (doc.url.includes("images.unsplash.com") || doc.url.startsWith("data:image/"))) || (doc.filename && (doc.filename.endsWith(".jpg") || doc.filename.endsWith(".png") || doc.filename.endsWith(".jpeg")));

        if (isImage) {
            const imgUrl = Util.formatDriveImageUrl(doc.url);
            viewerContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl max-h-[60vh] overflow-auto">
                    <img src="${imgUrl}" alt="${Sec.esc(doc.filename)}" class="max-h-[50vh] object-contain rounded-lg shadow-lg" onerror="this.onerror=null; this.src='${doc.url}';">
                    <div class="mt-3 flex items-center gap-3">
                        <a href="${doc.url}" target="_blank" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Foto di Google Drive
                        </a>
                    </div>
                </div>
            `;
        } else {
            viewerContainer.innerHTML = `
                <div class="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
                    <div class="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">
                        <i class="fa-solid fa-file-pdf"></i>
                    </div>
                    <h4 class="font-bold text-slate-800 text-base mb-1">${doc.filename}</h4>
                    <p class="text-xs text-slate-500 mb-6">Tersimpan aman di Google Drive: <span class="font-mono text-slate-700">/SEKOLAHTU/Berkas_Siswa/${doc.filename}</span></p>
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
                row("Nomor Kartu Keluarga (KK)", student.noKk || '<em class="text-amber-600 font-normal">Belum direkam (Pindai OCR)</em>'),
                row("Nomor NTA Pramuka", student.nta ? `<span class="font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">${student.nta}</span>` : '<em class="text-amber-600 font-normal">Belum direkam (Pindai OCR KTA)</em>'),
                row("Tanggal Terbit KK", student.tglTerbitKk || "-"),
                row("Tahun Ajaran / Rombel", `${student.tahunAjaran || DataStore.getActiveTA()} • ${student.rombel || student.kelas}`),
                row("NIPD / Agama", `${student.nipd || student.nis || "-"} / ${student.agama || "-"}`),
                row("Ayah", [student.ayahNama, student.ayahTahunLahir, student.ayahPendidikan, student.ayahPekerjaan].filter(Boolean).join(" • ")),
                row("Ibu", [student.ibuNama, student.ibuTahunLahir, student.ibuPendidikan, student.ibuPekerjaan].filter(Boolean).join(" • ")),
                `<div class="col-span-2 p-3 bg-slate-50 rounded-xl flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <span class="text-slate-400 text-[11px] block">Otomasi Cerdas Berkas</span>
                        <span class="font-bold text-xs text-slate-800">Ekstraksi Teks Otomatis via AI/OCR</span>
                    </div>
                    <div class="flex gap-2">
                        <button type="button" onclick="ModulBerkas.closeDetailModal(); ModulOCR.openScanModal('${student.nisn}', 'kk')" 
                            class="px-3 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs">
                            <i class="fa-solid fa-wand-magic-sparkles text-amber-400"></i> Pindai KK (OCR)
                        </button>
                        <button type="button" onclick="ModulBerkas.closeDetailModal(); ModulOCR.openScanModal('${student.nisn}', 'kta')" 
                            class="px-3 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs">
                            <i class="fa-solid fa-id-badge"></i> Pindai KTA Pramuka (OCR)
                        </button>
                    </div>
                </div>`,
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
            this.populateTambahKelasSelect();
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

        const kelasNum = kelas.replace(/\D/g, "") || kelas;
        const newStudent = {
            nisn: nisn,
            nis: val("tambah-nis"),
            nipd: val("tambah-nis"),
            nama: nama,
            nik: val("tambah-nik"),
            tempatLahir: val("tambah-tempat-lahir") || "-",
            tanggalLahir: val("tambah-tgl-lahir") || "2015-01-01",
            jk: val("tambah-jk"),
            kelas: kelasNum,
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
            if (window.App && App.syncAllKelasDropdowns) App.syncAllKelasDropdowns();
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
