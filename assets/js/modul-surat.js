/* ==========================================================================
   SIM-TAS-SD: MODUL 2 - PENOMORAN & PENGARSIPAN SURAT (ADOPSI SRIKANDI)
   Fitur: Registrasi Surat Keluar (Anti Double-Numbering) & Agenda Surat Masuk
   ========================================================================== */

const ModulSurat = {
    activeSubTab: "keluar", // "keluar" atau "masuk"
    searchQueryKeluar: "",
    searchQueryMasuk: "",
    filterKlasifikasi: "Semua",

    init() {
        this.renderSubTab();
        this.renderSuratKeluarTable();
        this.renderSuratMasukTable();
        this.populateKlasifikasiDropdowns();
        this.bindEvents();
    },

    bindEvents() {
        const searchKeluar = document.getElementById("search-surat-keluar");
        if (searchKeluar) {
            searchKeluar.addEventListener("input", (e) => {
                this.searchQueryKeluar = e.target.value.toLowerCase();
                this.renderSuratKeluarTable();
            });
        }

        const filterKlasifikasi = document.getElementById("filter-klasifikasi-surat");
        if (filterKlasifikasi) {
            filterKlasifikasi.addEventListener("change", (e) => {
                this.filterKlasifikasi = e.target.value;
                this.renderSuratKeluarTable();
            });
        }

        const searchMasuk = document.getElementById("search-surat-masuk");
        if (searchMasuk) {
            searchMasuk.addEventListener("input", (e) => {
                this.searchQueryMasuk = e.target.value.toLowerCase();
                this.renderSuratMasukTable();
            });
        }

        // Live nomor preview when selecting classification / date in modal
        const selectKode = document.getElementById("sk-kode-klasifikasi");
        if (selectKode) {
            selectKode.addEventListener("change", () => {
                this.updateLiveNomorSuratPreview();
            });
        }
        const inputTgl = document.getElementById("sk-tanggal");
        if (inputTgl) {
            inputTgl.addEventListener("change", () => {
                this.updateLiveNomorSuratPreview();
            });
        }
    },

    populateKlasifikasiDropdowns() {
        const filterEl = document.getElementById("filter-klasifikasi-surat");
        const modalSelect = document.getElementById("sk-kode-klasifikasi");

        if (filterEl) {
            filterEl.innerHTML = `<option value="Semua">Semua Klasifikasi</option>` + 
                KODE_KLASIFIKASI_SURAT.map(k => `<option value="${k.kode}">${k.kode} - ${k.nama}</option>`).join("");
        }

        if (modalSelect) {
            modalSelect.innerHTML = KODE_KLASIFIKASI_SURAT.map(k => 
                `<option value="${k.kode}">${k.kode} - ${k.nama}</option>`
            ).join("");
        }
    },

    switchSubTab(tab) {
        this.activeSubTab = tab;
        this.renderSubTab();
    },

    renderSubTab() {
        const btnKeluar = document.getElementById("btn-tab-surat-keluar");
        const btnMasuk = document.getElementById("btn-tab-surat-masuk");
        const viewKeluar = document.getElementById("view-surat-keluar");
        const viewMasuk = document.getElementById("view-surat-masuk");

        if (this.activeSubTab === "keluar") {
            btnKeluar?.classList.add("bg-white", "text-blue-700", "shadow-sm");
            btnKeluar?.classList.remove("text-slate-600");
            btnMasuk?.classList.remove("bg-white", "text-blue-700", "shadow-sm");
            btnMasuk?.classList.add("text-slate-600");
            viewKeluar?.classList.remove("hidden");
            viewMasuk?.classList.add("hidden");
            this.renderSuratKeluarTable();
        } else {
            btnMasuk?.classList.add("bg-white", "text-blue-700", "shadow-sm");
            btnMasuk?.classList.remove("text-slate-600");
            btnKeluar?.classList.remove("bg-white", "text-blue-700", "shadow-sm");
            btnKeluar?.classList.add("text-slate-600");
            viewMasuk?.classList.remove("hidden");
            viewKeluar?.classList.add("hidden");
            this.renderSuratMasukTable();
        }
    },

    // ==================== SURAT KELUAR ====================
    renderSuratKeluarTable() {
        const container = document.getElementById("table-surat-keluar-body");
        if (!container) return;

        const list = DataStore.getSuratKeluar();
        const filtered = list.filter(s => {
            const matchSearch = !this.searchQueryKeluar ||
                s.nomorSurat.toLowerCase().includes(this.searchQueryKeluar) ||
                s.perihal.toLowerCase().includes(this.searchQueryKeluar) ||
                s.tujuan.toLowerCase().includes(this.searchQueryKeluar);

            const matchKlas = this.filterKlasifikasi === "Semua" || s.kodeKlasifikasi === this.filterKlasifikasi;
            return matchSearch && matchKlas;
        });

        const countEl = document.getElementById("total-surat-keluar-count");
        if (countEl) countEl.textContent = `${filtered.length} Surat Terdaftar`;

        if (filtered.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="py-12 text-center text-slate-400">
                        <div class="flex flex-col items-center justify-center">
                            <i class="fa-solid fa-envelope-open-text text-4xl mb-3 text-slate-300"></i>
                            <p class="font-medium text-slate-600">Tidak ada surat keluar yang sesuai kriteria</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = filtered.map(s => {
            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    <td class="px-4 py-3.5">
                        <span class="font-mono font-bold text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            ${s.nomorSurat}
                        </span>
                        <div class="text-[11px] text-slate-400 mt-0.5">Klas: ${s.kodeKlasifikasi} • Urut #${s.noUrut}</div>
                    </td>
                    <td class="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                        <i class="fa-regular fa-calendar-days text-slate-400 mr-1"></i>
                        ${s.tanggalSurat}
                    </td>
                    <td class="px-4 py-3.5 text-xs font-semibold text-slate-800 max-w-xs">
                        ${s.tujuan}
                    </td>
                    <td class="px-4 py-3.5 text-xs text-slate-700 max-w-sm">
                        <div class="font-medium line-clamp-2">${s.perihal}</div>
                    </td>
                    <td class="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        <div><i class="fa-solid fa-pen-nib text-slate-400 mr-1"></i> ${s.pengonsep}</div>
                        <div class="text-[11px] text-slate-400">TTD: ${s.penandatangan}</div>
                    </td>
                    <td class="px-4 py-3.5 text-center">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <i class="fa-solid fa-shield-check"></i> Teregistrasi
                        </span>
                    </td>
                    <td class="px-4 py-3.5 text-right whitespace-nowrap">
                        <button onclick="ModulSurat.salinNomor('${s.nomorSurat}')" class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Salin Nomor Surat">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                        <a href="${Sec.safeUrl(s.fileDriveUrl)}" target="_blank" rel="noopener noreferrer" class="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition inline-block" title="Lihat Berkas / Drive">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                        <button onclick="ModulSurat.hapusSuratKeluar('${s.id}', '${s.nomorSurat}')" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition inline-block" title="Hapus Nomor Surat">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    },

    salinNomor(nomor) {
        navigator.clipboard.writeText(nomor);
        App.showToast(`Nomor surat ${nomor} disalin ke clipboard!`, "success");
    },

    toggleManualNomor(isManual) {
        const manualBox = document.getElementById("sk-manual-container");
        const previewBox = document.getElementById("sk-preview-container");
        const manualInput = document.getElementById("sk-nomor-manual");
        if (manualBox) manualBox.classList.toggle("hidden", !isManual);
        if (previewBox) previewBox.classList.toggle("hidden", isManual);
        if (isManual && manualInput) {
            if (!manualInput.value) {
                manualInput.value = document.getElementById("sk-preview-nomor")?.textContent.trim() || "";
            }
            manualInput.focus();
        }
    },

    async updateLiveNomorSuratPreview() {
        const kodeEl = document.getElementById("sk-kode-klasifikasi");
        const previewEl = document.getElementById("sk-preview-nomor");
        if (!kodeEl || !previewEl) return;

        const tanggal = document.getElementById("sk-tanggal")?.value || Util.today();
        const res = await ApiClient.request("getNextNomorSuratKeluar", { kodeKlasifikasi: kodeEl.value, tanggalSurat: tanggal });
        previewEl.textContent = res.success ? res.data.nomorSurat : "(gagal memuat nomor)";
    },

    openModalSuratKeluar() {
        const modal = document.getElementById("modal-tambah-surat-keluar");
        if (!modal) return;

        document.getElementById("sk-tanggal").value = Util.today();
        document.getElementById("sk-tujuan").value = "";
        document.getElementById("sk-perihal").value = "";
        document.getElementById("sk-keterangan").value = "";

        const chkManual = document.getElementById("sk-is-manual");
        if (chkManual) chkManual.checked = false;
        const manualInput = document.getElementById("sk-nomor-manual");
        if (manualInput) manualInput.value = "";
        this.toggleManualNomor(false);

        const fileInput = document.getElementById("sk-file");
        if (fileInput) fileInput.value = "";

        const config = DataStore.getConfig();
        document.getElementById("sk-penandatangan").value = config.namaKepalaSekolah;

        this.updateLiveNomorSuratPreview();
        modal.classList.remove("hidden");
    },

    closeModalSuratKeluar() {
        const modal = document.getElementById("modal-tambah-surat-keluar");
        if (modal) modal.classList.add("hidden");
    },

    async submitSuratKeluar(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (this._submittingSK) return; // cegah klik ganda -> nomor ganda

        const kode = document.getElementById("sk-kode-klasifikasi").value;
        const tanggal = document.getElementById("sk-tanggal").value || Util.today();
        const tujuan = document.getElementById("sk-tujuan").value.trim();
        const perihal = document.getElementById("sk-perihal").value.trim();
        const pengonsep = document.getElementById("sk-pengonsep").value.trim() || "Staf TU";
        const penandatangan = document.getElementById("sk-penandatangan").value.trim();
        const keterangan = document.getElementById("sk-keterangan").value.trim();

        const isManual = document.getElementById("sk-is-manual")?.checked;
        const nomorManual = isManual ? (document.getElementById("sk-nomor-manual")?.value.trim() || "") : "";

        if (isManual && !nomorManual) {
            App.showToast("Nomor surat manual wajib diisi jika mode manual dicentang!", "error");
            return;
        }

        if (!tujuan || !perihal) {
            App.showToast("Tujuan dan Perihal surat wajib diisi!", "error");
            return;
        }

        const fileInput = document.getElementById("sk-file");
        let fileBase64 = null;
        let fileExt = "pdf";

        const btn = document.getElementById("btn-submit-sk");
        this._submittingSK = true;
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan Surat...`;

        try {
            if (fileInput && fileInput.files && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                if (file.size > 8 * 1024 * 1024) throw new Error("Ukuran berkas surat keluar maksimal 8 MB.");
                const nameParts = file.name.split(".");
                fileExt = nameParts.length > 1 ? nameParts.pop() : "pdf";
                fileBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error("Gagal membaca berkas lampiran surat keluar."));
                    reader.readAsDataURL(file);
                });
            }

            const res = await ApiClient.request("saveSuratKeluar", {
                kodeKlasifikasi: kode,
                tanggalSurat: tanggal,
                tujuan: tujuan,
                perihal: perihal,
                pengonsep: pengonsep,
                penandatangan: penandatangan,
                keterangan: keterangan,
                nomorSuratManual: nomorManual,
                fileBase64: fileBase64,
                fileExt: fileExt
            });

            if (res && res.success) {
                App.showToast(res.message, "success");
                this.closeModalSuratKeluar();
                this.switchSubTab("keluar");
                this.renderSuratKeluarTable();
                App.updateDashboardStats();
            } else {
                App.showToast((res && res.message) || "Gagal menerbitkan nomor surat", "error");
            }
        } catch (err) {
            console.error("submitSuratKeluar:", err);
            App.showToast(`Terjadi kesalahan: ${err.message}`, "error");
        } finally {
            this._submittingSK = false;
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-check"></i> Terbitkan Nomor Surat`;
        }
    },

    async hapusSuratKeluar(id, nomor) {
        if (!confirm(`Apakah Anda yakin ingin menghapus nomor surat keluar "${nomor}"?\nNomor ini akan dihapus dari buku register arsip.`)) return;
        try {
            const res = await ApiClient.request("deleteSuratKeluar", { id, nomorSurat: nomor });
            if (res && res.success) {
                App.showToast(res.message || `Nomor surat ${nomor} berhasil dihapus!`, "success");
                this.renderSuratKeluarTable();
                App.updateDashboardStats();
            } else {
                App.showToast((res && res.message) || "Gagal menghapus surat keluar.", "error");
            }
        } catch (err) {
            App.showToast(`Error: ${err.message}`, "error");
        }
    },

    // ==================== SURAT MASUK ====================
    renderSuratMasukTable() {
        const container = document.getElementById("table-surat-masuk-body");
        if (!container) return;

        const list = DataStore.getSuratMasuk();
        const filtered = list.filter(s => {
            return !this.searchQueryMasuk ||
                s.noAgenda.toLowerCase().includes(this.searchQueryMasuk) ||
                s.noSuratAsli.toLowerCase().includes(this.searchQueryMasuk) ||
                s.pengirim.toLowerCase().includes(this.searchQueryMasuk) ||
                s.perihal.toLowerCase().includes(this.searchQueryMasuk);
        });

        const countEl = document.getElementById("total-surat-masuk-count");
        if (countEl) countEl.textContent = `${filtered.length} Surat Masuk`;

        if (filtered.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="7" class="py-12 text-center text-slate-400">
                        <div class="flex flex-col items-center justify-center">
                            <i class="fa-solid fa-inbox text-4xl mb-3 text-slate-300"></i>
                            <p class="font-medium text-slate-600">Tidak ada surat masuk yang tercatat</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = filtered.map(s => {
            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    <td class="px-4 py-3.5">
                        <span class="font-mono font-bold text-xs px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            ${s.noAgenda}
                        </span>
                        <div class="text-[11px] text-slate-400 mt-1 font-mono">Asli: ${s.noSuratAsli}</div>
                    </td>
                    <td class="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                        <div><i class="fa-regular fa-calendar text-slate-400 mr-1"></i> ${s.tglSurat}</div>
                        <div class="text-[11px] text-slate-400">Diterima: ${s.tglTerima}</div>
                    </td>
                    <td class="px-4 py-3.5 text-xs font-semibold text-slate-800 max-w-xs">
                        ${s.pengirim}
                    </td>
                    <td class="px-4 py-3.5 text-xs text-slate-700 max-w-sm">
                        <div class="font-medium line-clamp-2">${s.perihal}</div>
                    </td>
                    <td class="px-4 py-3.5 text-xs text-slate-600">
                        <div class="font-medium text-blue-700"><i class="fa-solid fa-user-tag mr-1 text-[10px]"></i> ${s.disposisiKe}</div>
                        <div class="text-[11px] text-slate-500 italic mt-0.5">${s.instruksiDisposisi}</div>
                    </td>
                    <td class="px-4 py-3.5 text-center">
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s.status === 'Selesai Disposisi' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                            <i class="fa-solid ${s.status === 'Selesai Disposisi' ? 'fa-circle-check' : 'fa-clock'}"></i> ${s.status}
                        </span>
                    </td>
                    <td class="px-4 py-3.5 text-right whitespace-nowrap">
                        <a href="${Sec.safeUrl(s.fileScanUrl)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg inline-flex items-center gap-1.5 transition">
                            <i class="fa-solid fa-file-pdf text-red-500"></i> Scan Fisik
                        </a>
                        <button onclick="ModulSurat.hapusSuratMasuk('${s.id}', '${s.noAgenda}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition ml-1 inline-block" title="Hapus Surat Masuk">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    },

    async hapusSuratMasuk(id, agenda) {
        if (!confirm(`Apakah Anda yakin ingin menghapus surat masuk agenda "${agenda}"?\nData agenda ini akan dihapus dari buku arsip surat masuk.`)) return;
        try {
            const res = await ApiClient.request("deleteSuratMasuk", { id, noAgenda: agenda });
            if (res && res.success) {
                App.showToast(res.message || `Surat masuk ${agenda} berhasil dihapus!`, "success");
                this.renderSuratMasukTable();
                App.updateDashboardStats();
            } else {
                App.showToast((res && res.message) || "Gagal menghapus surat masuk.", "error");
            }
        } catch (err) {
            App.showToast(`Error: ${err.message}`, "error");
        }
    },

    openModalSuratMasuk() {
        const modal = document.getElementById("modal-tambah-surat-masuk");
        if (!modal) return;

        const today = new Date().toISOString().split('T')[0];
        document.getElementById("form-tambah-surat-masuk").reset();
        document.getElementById("sm-tgl-terima").value = today;
        document.getElementById("sm-tgl-surat").value = today;

        const count = DataStore.getSuratMasuk().length + 1;
        const autoAgenda = `SM/${new Date().getFullYear()}/${String(count).padStart(3, '0')}`;
        document.getElementById("sm-preview-agenda").textContent = autoAgenda;

        modal.classList.remove("hidden");
    },

    closeModalSuratMasuk() {
        const modal = document.getElementById("modal-tambah-surat-masuk");
        if (modal) modal.classList.add("hidden");
    },

    async submitSuratMasuk(e) {
        e.preventDefault();
        const noSuratAsli = document.getElementById("sm-no-asli").value.trim();
        const tglSurat = document.getElementById("sm-tgl-surat").value;
        const tglTerima = document.getElementById("sm-tgl-terima").value;
        const pengirim = document.getElementById("sm-pengirim").value.trim();
        const perihal = document.getElementById("sm-perihal").value.trim();
        const disposisiKe = document.getElementById("sm-disposisi-ke").value.trim();
        const instruksi = document.getElementById("sm-instruksi").value.trim();
        const fileInput = document.getElementById("sm-scan-file");

        if (!noSuratAsli || !pengirim || !perihal) {
            App.showToast("Nomor Surat Asli, Pengirim, dan Perihal wajib diisi!", "error");
            return;
        }

        const btn = document.getElementById("btn-submit-sm");
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengarsipkan...`;

        try {
            let scanBase64 = null;
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                if (file.size > 8 * 1024 * 1024) throw new Error("Ukuran scan maksimal 8 MB.");
                scanBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject(new Error("Gagal membaca berkas scan."));
                    reader.readAsDataURL(file);
                });
            }

            const res = await ApiClient.request("saveSuratMasuk", {
                noSuratAsli: noSuratAsli,
                tglSurat: tglSurat,
                tglTerima: tglTerima,
                pengirim: pengirim,
                perihal: perihal,
                disposisiKe: disposisiKe,
                instruksiDisposisi: instruksi,
                scanBase64: scanBase64
            });

            if (res.success) {
                App.showToast(res.message, "success");
                this.closeModalSuratMasuk();
                this.renderSuratMasukTable();
                App.updateDashboardStats();
            } else {
                App.showToast(res.message || "Gagal mencatat surat masuk", "error");
            }
        } catch (err) {
            App.showToast(`Terjadi kesalahan: ${err.message}`, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-check"></i> Catat Surat Masuk`;
        }
    }
};
